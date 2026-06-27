import type { Card, CardCode, Element, Rarity } from '../game/types'

export const CARD_IMAGES: Record<CardCode, string> = {
  PKC_001: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/66b61f02-920d-4ba1-8062-36826fb8cc00/public',
  PKC_002: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/9f312acf-fa0f-4970-3698-3f91b6c57500/public',
  PKC_003: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/fa7a7320-c21c-4c86-9faf-b695f44c0300/public',
  PKC_004: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/e8a5e630-bac9-402c-83d6-405e8cd6c600/public',
  PKC_005: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/f8de738e-24ef-4904-2fdd-2053f99c6e00/public',
  PKC_006: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/3b0c347a-09aa-4678-1ddb-745e1a3e0700/public',
  PKC_007: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/2e881200-1b42-40a3-c9f2-f6a32a266000/public',
  PKC_008: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/5ecba6b6-37d7-4f6a-26dd-504230982200/public',
  PKC_009: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/6c5d5673-6488-4834-bcb3-01b186da6700/public',
  PKC_010: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/3b41c1f0-2e66-47ac-8832-a7914ee25f00/public',
  PKC_011: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/1cdda988-6f29-4e76-f5e2-5f75b0008600/public',
  PKC_012: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/30e9c786-a0ce-480d-bb20-0e3d72cae000/public',
  PKC_013: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/b2e8f4e3-99da-4a20-81c0-585c60b9ed00/public',
  PKC_014: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/b46ef624-281c-4b6c-314c-33aa8e1e7b00/public',
  PKC_015: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/c3c7b149-4334-4083-e114-85b697cd1100/public',
  HLC_001: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/b6f603f8-7a28-4dcf-2118-e5417b45b300/public',
  HLC_002: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/151ef535-81d0-43a1-a7c0-03ee66047a00/public',
  HLC_003: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/319b4722-44d2-4c25-05cb-60dac6300300/public',
  HLC_004: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/90f82c01-1590-48c2-72d9-675c41a5b200/public',
  HLC_005: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/aab0e396-2bce-4af5-849f-d1dd385f0e00/public',
  HLC_006: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/209ac597-d08e-41e6-6a81-360d790f4200/public',
  HLC_007: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/16f732e3-c844-400f-cab6-afc1eb05c400/public',
  HLC_008: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/95620849-26c3-438e-bc1f-556802144700/public',
  HLC_009: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/5164b2ed-189b-4520-9005-f700c25ae200/public',
  HLC_010: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/6f7b32dd-b508-4cf5-a273-db475b53b800/public',
  HLC_011: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/738781fb-7c03-4756-77ca-db841ca85400/public',
  HLC_012: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/3fae5679-48f4-4064-5486-c57391226900/public',
  HLC_013: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/9d743248-5e17-4dfb-7f1d-a0d8c35ae100/public',
  HLC_014: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/61eecd64-5189-4353-4ca8-0fcd8fbd7200/public',
  HLC_015: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/823a45ac-57c8-49ac-5fe1-cbf5c0bde100/public',
  SLC_001: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/5529af24-0ff2-4208-5c4e-ef1552722500/public',
  SLC_002: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/24e3de06-48e2-4360-eff1-d0450c8c4100/public',
  SLC_003: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/be261fe3-310a-45aa-25d4-c2fe30d9b400/public',
  SLC_004: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/c8d6b7e5-a2ff-43cd-05c1-4592f09e4000/public',
  SLC_005: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/f4d68323-c61e-4417-b158-0df99d4b9300/public',
  SLC_006: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/3632cd0b-f5e0-43b7-348b-bfd878c4ec00/public',
  SLC_007: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/6916ad0e-6186-4b79-ea11-e7846f83a500/public',
  SLC_008: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/4cede3ab-9b7c-430e-3050-a419ef007e00/public',
  SLC_009: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/22c0e1b3-9f7a-4a41-1e5f-e232855c9d00/public',
  SLC_010: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/3efd79a6-dfa3-47e3-5588-6029b4b6db00/public',
  SLC_011: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/417d4e3f-bc10-44b7-e572-2c3556708500/public',
  SLC_012: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/943120be-7a59-4cee-833c-73230ae66600/public',
  SLC_013: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/f1be5611-23db-4fa4-53bd-dbabdbf49d00/public',
  SLC_014: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/dd6c716f-9dcb-44cc-14e3-ffc3506eaa00/public',
  SLC_015: 'https://imagedelivery.net/1Eb0Y8yM0vC62KPRL0rQAA/50242184-b08d-40d9-1ab1-fdab6467bd00/public',
}

export function getCardImage(code: string) {
  return CARD_IMAGES[code.replace('-', '_') as CardCode]
}

const elements: Element[] = ['spark', 'leaf', 'tide', 'ember', 'void']
const rarities: Rarity[] = ['common', 'rare', 'epic']
const names = [
  'Volt Cub', 'Moss Mender', 'Bubble Imp', 'Cinder Pup', 'Null Sprite',
  'Storm Lynx', 'Root Guard', 'Reef Drake', 'Ash Runner', 'Umbra Wisp',
  'Thunder Ox', 'Bloom Sage', 'Tsunami Ray', 'Magma Horn', 'Eclipse Fang',
]

const creatureCards: Card[] = Array.from({ length: 15 }, (_, index) => {
  const n = index + 1
  const cost = 1 + (index % 5)
  const code = `PKC_${String(n).padStart(3, '0')}` as CardCode
  return {
    code,
    name: names[index],
    type: 'creature',
    element: elements[index % elements.length],
    rarity: rarities[Math.floor(index / 5)],
    cost,
    attack: cost + 1 + (index % 3),
    health: cost + 2 + ((index + 1) % 3),
    text: 'Can attack enemy cards or the rival core.',
    image: getCardImage(code),
  }
})

const helpCards: Card[] = Array.from({ length: 15 }, (_, index) => {
  const n = index + 1
  const code = `HLC_${String(n).padStart(3, '0')}` as CardCode
  const amount = 2 + (index % 4)
  return {
    code,
    name: ['Pulse Snack', 'Shield Pop', 'Growth Bell', 'Lucky Patch', 'Team Rally'][index % 5],
    type: 'support',
    element: elements[(index + 1) % elements.length],
    rarity: rarities[Math.floor(index / 5)],
    cost: 1 + (index % 4),
    effect: index % 3 === 0 ? 'draw' : index % 3 === 1 ? 'heal' : 'guard',
    amount,
    text: index % 3 === 0 ? `Draw ${Math.min(2, amount - 1)} cards.` : index % 3 === 1 ? `Restore ${amount} core HP.` : `Give your front ally +${amount} health.`,
    image: getCardImage(code),
  }
})

const spellCards: Card[] = Array.from({ length: 15 }, (_, index) => {
  const n = index + 1
  const code = `SLC_${String(n).padStart(3, '0')}` as CardCode
  const amount = 2 + (index % 5)
  return {
    code,
    name: ['Zap Arc', 'Vine Snap', 'Wave Crash', 'Flare Pin', 'Void Mark'][index % 5],
    type: 'spell',
    element: elements[(index + 2) % elements.length],
    rarity: rarities[Math.floor(index / 5)],
    cost: 1 + (index % 5),
    effect: index % 4 === 0 ? 'buff' : 'damage',
    amount,
    text: index % 4 === 0 ? `Give your front ally +${amount} attack.` : `Deal ${amount} damage.`,
    image: getCardImage(code),
  }
})

export const CARDS: Card[] = [...creatureCards, ...helpCards, ...spellCards]
export const CARD_BY_CODE = Object.fromEntries(CARDS.map((card) => [card.code, card])) as Record<CardCode, Card>

export const STARTER_DECK: CardCode[] = [
  ...creatureCards.slice(0, 15).map((card) => card.code),
  ...helpCards.slice(0, 8).map((card) => card.code),
  ...spellCards.slice(0, 7).map((card) => card.code),
]

export const STARTER_COLLECTION: Record<CardCode, number> = Object.fromEntries(
  CARDS.map((card) => [card.code, card.rarity === 'common' ? 3 : card.rarity === 'rare' ? 2 : 1]),
) as Record<CardCode, number>
