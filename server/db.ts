import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    if (!connectionString) {
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
        'Please configure your Neon PostgreSQL connection string.'
      )
    }

    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })

    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err.message)
    })
  }

  return pool
}

export async function query(text: string, params?: unknown[]) {
  const client = await getPool().connect()
  try {
    const result = await client.query(text, params)
    return result
  } finally {
    client.release()
  }
}

export async function testConnection(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()')
    console.log('[DB] Connected to Neon:', result.rows[0].now)
    return true
  } catch (error) {
    console.error('[DB] Connection failed:', error instanceof Error ? error.message : error)
    return false
  }
}

export function closePool() {
  if (pool) {
    pool.end()
    pool = null
  }
}
