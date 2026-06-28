import { query, getPool } from './db'
import { CARDS, CARD_BY_CODE } from '../src/data/cards'
import type { CardCode } from '../src/game/types'

export type EconomyProfile = {
  coins: number
  gems: number
}

export type ShopItem = {
  id: string
  name: string
  description: string
  price_coins: number
  price_gems: number
  pack_size: number
  guaranteed_rarity: string | null
  guaranteed_element: string | null
  image_url: string
}

export type OpenPackResult = {
  cards: { code: CardCode; name: string; rarity: string; element: string; image: string }[]
  coins_earned: number
}

// Default shop items
const DEFAULT_SHOP: ShopItem[] = [
  {
    id: 'starter_pack',
    name: 'Starter Pack',
    description: '5 random cards to build your collection',
    price_coins: 0,
    price_gems: 0,
    pack_size: 5,
    guaranteed_rarity: null,
    guaranteed_element: null,
    image_url: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/66b61f02-920d-4ba1-8062-36826fb8cc00/public',
  },
  {
    id: 'element_pack',
    name: 'Element Pack',
    description: '5 cards from a single random element',
    price_coins: 200,
    price_gems: 0,
    pack_size: 5,
    guaranteed_rarity: null,
    guaranteed_element: null,
    image_url: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/3b41c1f0-2e66-47ac-8832-a7914ee25f00/public',
  },
  {
    id: 'premium_pack',
    name: 'Premium Pack',
    description: '5 cards — guarantees at least 1 Rare!',
    price_coins: 500,
    price_gems: 10,
    pack_size: 5,
    guaranteed_rarity: 'rare',
    guaranteed_element: null,
    image_url: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/9f312acf-fa0f-4970-3698-3f91b6c57500/public',
  },
  {
    id: 'epic_pack',
    name: 'Epic Pack',
    description: '5 cards — guarantees at least 1 Epic!',
    price_coins: 1000,
    price_gems: 50,
    pack_size: 5,
    guaranteed_rarity: 'epic',
    guaranteed_element: null,
    image_url: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/e8a5e630-bac9-402c-83d6-405e8cd6c600/public',
  },
]

const ELEMENTS = ['spark', 'leaf', 'tide', 'ember', 'void'] as const

function shuffleCards(deck: CardCode[]) {
  const next = [...deck]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

function pickRandomCards(count: number, filter?: { rarity?: string; element?: string }): CardCode[] {
  let pool = [...CARDS]
  if (filter?.rarity) pool = pool.filter((c) => c.rarity === filter.rarity)
  if (filter?.element) pool = pool.filter((c) => c.element === filter.element)
  return shuffleCards(pool.map((c) => c.code)).slice(0, count)
}

export async function getEconomy(playerId: string): Promise<EconomyProfile> {
  const result = await query(
    'SELECT coins, gems FROM players WHERE id = $1',
    [playerId]
  )
  if (result.rows.length === 0) {
    return { coins: 500, gems: 0 }
  }
  return {
    coins: result.rows[0].coins,
    gems: result.rows[0].gems,
  }
}

export async function awardMatchRewards(playerId: string, won: boolean): Promise<EconomyProfile> {
  const coinsEarned = won ? 50 : 15
  const xpEarned = won ? 30 : 10

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE players SET coins = coins + $1, xp = xp + $2, updated_at = NOW() WHERE id = $3 RETURNING coins, gems`,
      [coinsEarned, xpEarned, playerId]
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  return getEconomy(playerId)
}

export async function buyPack(playerId: string, packId: string): Promise<ShopItem | null> {
  const shopItem = DEFAULT_SHOP.find((item) => item.id === packId)
  if (!shopItem) return null

  const economy = await getEconomy(playerId)
  if (economy.coins < shopItem.price_coins || economy.gems < shopItem.price_gems) {
    return null
  }

  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `UPDATE players SET coins = coins - $1, gems = gems - $2, updated_at = NOW() WHERE id = $3`,
      [shopItem.price_coins, shopItem.price_gems, playerId]
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  return shopItem
}

export async function openPack(playerId: string, packId: string): Promise<OpenPackResult | null> {
  const shopItem = DEFAULT_SHOP.find((item) => item.id === packId)
  if (!shopItem) return null

  let cards: CardCode[] = []

  // Guaranteed rarity card
  if (shopItem.guaranteed_rarity) {
    const guaranteed = pickRandomCards(1, { rarity: shopItem.guaranteed_rarity })
    cards.push(...guaranteed)
  }

  // Random element if element pack
  if (packId === 'element_pack') {
    const randomElement = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)]
    const elementCards = pickRandomCards(shopItem.pack_size - cards.length, { element: randomElement })
    cards.push(...elementCards)
  } else {
    const remaining = shopItem.pack_size - cards.length
    const randomCards = pickRandomCards(remaining)
    cards.push(...randomCards)
  }

  // Save cards to player inventory
  const pool = getPool()
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const code of cards) {
      await client.query(
        `INSERT INTO player_cards (player_id, card_code, quantity)
         VALUES ($1, $2, 1)
         ON CONFLICT (player_id, card_code)
         DO UPDATE SET quantity = player_cards.quantity + 1`,
        [playerId, code]
      )
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  return {
    cards: cards.map((code) => {
      const card = CARD_BY_CODE[code]
      return {
        code,
        name: card.name,
        rarity: card.rarity,
        element: card.element,
        image: card.image,
      }
    }),
    coins_earned: 0,
  }
}

export async function getShop(): Promise<ShopItem[]> {
  return DEFAULT_SHOP
}
