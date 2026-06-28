import { query } from './db'

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Trainer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  mmr INTEGER NOT NULL DEFAULT 1000,
  rank_tier TEXT NOT NULL DEFAULT 'bronze',
  rank_stars INTEGER NOT NULL DEFAULT 0,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  deck JSONB NOT NULL DEFAULT '[]'::jsonb,
  collection JSONB NOT NULL DEFAULT '{}'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  coins INTEGER NOT NULL DEFAULT 500,
  gems INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS match_history (
  id TEXT PRIMARY KEY,
  player1_id TEXT NOT NULL REFERENCES players(id),
  player2_id TEXT NOT NULL REFERENCES players(id),
  winner_id TEXT,
  player1_name TEXT NOT NULL DEFAULT '',
  player2_name TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  turns INTEGER NOT NULL DEFAULT 0,
  player1_deck JSONB NOT NULL DEFAULT '[]'::jsonb,
  player2_deck JSONB NOT NULL DEFAULT '[]'::jsonb,
  battle_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_cards (
  id SERIAL PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players(id),
  card_code TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  UNIQUE(player_id, card_code)
);

CREATE INDEX IF NOT EXISTS idx_match_history_player1 ON match_history(player1_id);
CREATE INDEX IF NOT EXISTS idx_match_history_player2 ON match_history(player2_id);
CREATE INDEX IF NOT EXISTS idx_match_history_played_at ON match_history(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_players_mmr ON players(mmr DESC);

CREATE TABLE IF NOT EXISTS shop_listings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_coins INTEGER NOT NULL DEFAULT 0,
  price_gems INTEGER NOT NULL DEFAULT 0,
  pack_size INTEGER NOT NULL DEFAULT 5,
  guaranteed_rarity TEXT,
  guaranteed_element TEXT,
  image_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);
`

export async function runMigrations() {
  try {
    await query(SCHEMA_SQL)
    console.log('[DB] Migrations completed successfully')
    return true
  } catch (error) {
    console.error('[DB] Migration failed:', error instanceof Error ? error.message : error)
    return false
  }
}
