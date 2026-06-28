import { query, getPool } from './db'
import type { CardCode } from '../src/game/types'
import { STARTER_DECK, STARTER_COLLECTION } from '../src/data/cards'

export type PlayerRecord = {
  id: string
  name: string
  created_at: string
  updated_at: string
  wins: number
  losses: number
  draws: number
  mmr: number
  rank_tier: string
  rank_stars: number
  xp: number
  level: number
  deck: CardCode[]
  collection: Record<string, number>
  settings: Record<string, unknown>
}

export async function findOrCreatePlayer(id: string, name: string): Promise<PlayerRecord> {
  const existing = await query(
    'SELECT * FROM players WHERE id = $1',
    [id]
  )

  if (existing.rows.length > 0) {
    const row = existing.rows[0]
    return {
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      mmr: row.mmr,
      rank_tier: row.rank_tier,
      rank_stars: row.rank_stars,
      xp: row.xp,
      level: row.level,
      deck: row.deck ?? STARTER_DECK,
      collection: row.collection ?? STARTER_COLLECTION,
      settings: row.settings ?? {},
    }
  }    const pool = getPool()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `INSERT INTO players (id, name, deck, collection)
         VALUES ($1, $2, $3::jsonb, $4::jsonb)`,
        [id, name, JSON.stringify(STARTER_DECK), JSON.stringify(STARTER_COLLECTION)]
      )

      const cardEntries = Object.entries(STARTER_COLLECTION)
      const batchValues = cardEntries.map((_, i) => `($1, $${i * 2 + 2}, $${i * 2 + 3})`).join(', ')
      const batchParams = [id]
      for (const [code, qty] of cardEntries) {
        batchParams.push(code, qty)
      }
      await client.query(
        `INSERT INTO player_cards (player_id, card_code, quantity)
         VALUES ${batchValues}
         ON CONFLICT (player_id, card_code) DO NOTHING`,
        batchParams
      )

      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      client.release()
      throw error
    }
    client.release()

  return {
    id,
    name,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    wins: 0,
    losses: 0,
    draws: 0,
    mmr: 1000,
    rank_tier: 'bronze',
    rank_stars: 0,
    xp: 0,
    level: 1,
    deck: STARTER_DECK,
    collection: STARTER_COLLECTION,
    settings: {},
  }
}

export async function updatePlayerDeck(id: string, deck: CardCode[]): Promise<void> {
  await query(
    `UPDATE players SET deck = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(deck), id]
  )
}

export async function updatePlayerName(id: string, name: string): Promise<void> {
  await query(
    `UPDATE players SET name = $1, updated_at = NOW() WHERE id = $2`,
    [name, id]
  )
}

export async function recordMatchResult(
  matchId: string,
  player1Id: string,
  player2Id: string,
  winnerId: string | null,
  player1Name: string,
  player2Name: string,
  turns: number,
  player1Deck: CardCode[],
  player2Deck: CardCode[],
  battleLog: unknown[]
) {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(
      `INSERT INTO match_history (id, player1_id, player2_id, winner_id, player1_name, player2_name,
        duration_seconds, turns, player1_deck, player2_deck, battle_log)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb)`,
      [
        matchId, player1Id, player2Id, winnerId,
        player1Name, player2Name, 0, turns,
        JSON.stringify(player1Deck), JSON.stringify(player2Deck),
        JSON.stringify(battleLog),
      ]
    )

    if (winnerId) {
      const loserId = winnerId === player1Id ? player2Id : player1Id

      await client.query(
        `UPDATE players SET wins = wins + 1, mmr = mmr + 15, xp = xp + 50, updated_at = NOW() WHERE id = $1`,
        [winnerId]
      )
      await client.query(
        `UPDATE players SET losses = losses + 1, mmr = GREATEST(100, mmr - 10), xp = xp + 20, updated_at = NOW() WHERE id = $1`,
        [loserId]
      )
    } else {
      await client.query(
        `UPDATE players SET draws = draws + 1, xp = xp + 30, updated_at = NOW() WHERE id = $1`,
        [player1Id]
      )
      await client.query(
        `UPDATE players SET draws = draws + 1, xp = xp + 30, updated_at = NOW() WHERE id = $1`,
        [player2Id]
      )
    }

    await client.query('COMMIT')

    await updateRankTier(winnerId)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('[Match] Transaction failed, rolled back:', error instanceof Error ? error.message : error)
  } finally {
    client.release()
  }
}

async function updateRankTier(playerId: string | null | undefined) {
  if (!playerId) return

  const result = await query('SELECT mmr FROM players WHERE id = $1', [playerId])
  if (result.rows.length === 0) return

  const mmr = result.rows[0].mmr
  let tier = 'bronze'
  if (mmr >= 2000) tier = 'legendary'
  else if (mmr >= 1700) tier = 'diamond'
  else if (mmr >= 1450) tier = 'platinum'
  else if (mmr >= 1250) tier = 'gold'
  else if (mmr >= 1100) tier = 'silver'

  await query('UPDATE players SET rank_tier = $1 WHERE id = $2', [tier, playerId])
}

export async function getLeaderboard(limit = 50): Promise<PlayerRecord[]> {
  const result = await query(
    `SELECT id, name, wins, losses, mmr, rank_tier, level, xp
     FROM players ORDER BY mmr DESC LIMIT $1`,
    [limit]
  )
  return result.rows
}

export async function getMatchHistory(playerId: string, limit = 20): Promise<unknown[]> {
  const result = await query(
    `SELECT * FROM match_history
     WHERE player1_id = $1 OR player2_id = $1
     ORDER BY played_at DESC LIMIT $2`,
    [playerId, limit]
  )
  return result.rows
}
