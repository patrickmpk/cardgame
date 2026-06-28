import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { CARD_BY_CODE, STARTER_DECK } from '../src/data/cards'
import { applyAction, createBattle, toClientState } from '../src/game/engine'
import type { BattleAction, BattleState, CardCode } from '../src/game/types'
import { createClerkClient } from '@clerk/backend'
import { decideBotActions } from './ai-bot'
import { testConnection, query } from './db'
import { runMigrations } from './db-schema'
import {
  findOrCreatePlayer,
  updatePlayerDeck,
  updatePlayerName,
  recordMatchResult,
  getLeaderboard,
  getMatchHistory,
} from './player-service'
import {
  getEconomy,
  awardMatchRewards,
  buyPack,
  openPack,
  getShop,
} from './economy-service'

const PORT = Number(process.env.PORT ?? 3001)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
const allowedOrigins = CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)

let clerk: ReturnType<typeof createClerkClient> | null = null
try {
  if (process.env.CLERK_SECRET_KEY) {
    clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })
  } else {
    console.warn('[Auth] CLERK_SECRET_KEY not set — Socket.io JWT verification disabled')
  }
} catch (error) {
  console.error('[Auth] Failed to initialize Clerk:', error instanceof Error ? error.message : error)
}

function requireClerk(): ReturnType<typeof createClerkClient> {
  if (!clerk) {
    throw new Error('Clerk client not initialized (CLERK_SECRET_KEY missing)')
  }
  return clerk
}

function isAllowedOrigin(origin?: string) {
  if (!origin) return true
  if (process.env.ALLOW_ANY_ORIGIN === 'true') return true
  if (allowedOrigins.includes(origin)) return true
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true
  if (/^http:\/\/localhost:\d+$/i.test(origin)) return true
  return false
}

const httpServer = createServer((request, response) => {
  if (request.url === '/' || request.url === '/health') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ ok: true, service: 'pockemy-realtime' }))
    return
  }

  response.writeHead(404, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ error: 'not_found' }))
})
const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      const allowed = isAllowedOrigin(origin)
      callback(allowed ? null : new Error(`Origin not allowed: ${origin ?? 'unknown'}`), allowed)
    },
    methods: ['GET', 'POST'],
  },
})

type QueuedPlayer = {
  id: string
  name: string
  deck: CardCode[]
  timer?: ReturnType<typeof setTimeout>
}

const queue: QueuedPlayer[] = []
const battles = new Map<string, BattleState>()
const playerBattle = new Map<string, string>()
const botPlayers = new Set<string>()

function emitBattle(battle: BattleState) {
  for (const player of battle.players) {
    io.to(player.id).emit('battle:update', toClientState(battle, player.id))
  }
}

function normalizeDeck(deck: CardCode[]) {
  const clean = deck.filter(Boolean)
  return clean.length === 30 ? clean : STARTER_DECK
}

function removeFromQueue(playerId: string) {
  const index = queue.findIndex((player) => player.id === playerId)
  if (index >= 0) {
    const [player] = queue.splice(index, 1)
    if (player.timer) clearTimeout(player.timer)
  }
}

function startBattle(p1: QueuedPlayer, p2: QueuedPlayer) {
  if (p1.timer) clearTimeout(p1.timer)
  if (p2.timer) clearTimeout(p2.timer)
  const battle = createBattle(`battle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, p1, p2)
  battles.set(battle.id, battle)
  playerBattle.set(p1.id, battle.id)
  playerBattle.set(p2.id, battle.id)
  io.to(p1.id).emit('matchmaking:status', { queued: false, position: 0 })
  io.to(p2.id).emit('matchmaking:status', { queued: false, position: 0 })
  emitBattle(battle)
  scheduleBotTurn(battle)
}

function scheduleBotMatch(player: QueuedPlayer) {
  player.timer = setTimeout(() => {
    if (!queue.find((queued) => queued.id === player.id)) return
    removeFromQueue(player.id)
    const botId = `bot-${Date.now()}`
    botPlayers.add(botId)
    startBattle(player, {
      id: botId,
      name: 'Pockemy Bot',
      deck: STARTER_DECK,
    })
  }, Number(process.env.BOT_MATCH_DELAY_MS ?? 6500))
}

function scheduleBotTurn(battle: BattleState) {
  if (battle.phase === 'finished' || !botPlayers.has(battle.activePlayerId)) return

  setTimeout(async () => {
    const bot = battle.players.find((player) => player.id === battle.activePlayerId)
    const rival = battle.players.find((player) => player.id !== battle.activePlayerId)
    if (!bot || !rival || battle.phase === 'finished') return

    const actions = await decideBotActions(battle, bot.id)

    for (const action of actions) {
      if (battle.phase === 'finished') break
      applyAction(battle, bot.id, action)
    }

    if (battle.phase === 'playing' && battle.activePlayerId === bot.id) {
      applyAction(battle, bot.id, { type: 'endTurn' })
    }

    emitBattle(battle)
  }, 1200)
}

// Clerk JWT authentication middleware for Socket.io
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token

  // Allow bot connections (no token needed)
  if (socket.id.startsWith('bot-')) {
    return next()
  }

  if (!token) {
    return next(new Error('Authentication required: no token provided'))
  }

  try {
    const client = requireClerk()
    const session = await client.verifyToken(token)
    socket.data.userId = session.sub
    socket.data.userName = session.username ?? `Player_${session.sub.slice(0, 6)}`
    next()
  } catch (error) {
    console.error('[Auth] Token verification failed:', error instanceof Error ? error.message : error)
    next(new Error('Authentication failed: invalid token'))
  }
})

io.on('connection', async (socket) => {
  let playerId = socket.data.userId ?? socket.id

  socket.on('player:login', async ({ id, name }: { id?: string; name?: string }) => {
    const userId = id ?? socket.id
    const displayName = name?.trim().slice(0, 18) || `Trainer ${Math.floor(Math.random() * 900 + 100)}`

    try {
      const profile = await findOrCreatePlayer(userId, displayName)
      playerId = userId
      socket.emit('player:profile', profile)
    } catch (error) {
      console.error('[Player] Login error:', error instanceof Error ? error.message : error)
    }
  })

  socket.on('player:update_deck', async ({ deck }: { deck: CardCode[] }) => {
    try {
      await updatePlayerDeck(playerId, normalizeDeck(deck))
    } catch (error) {
      console.error('[Player] Update deck error:', error instanceof Error ? error.message : error)
    }
  })

  socket.on('player:update_name', async ({ name }: { name: string }) => {
    try {
      await updatePlayerName(playerId, name.trim().slice(0, 18))
    } catch (error) {
      console.error('[Player] Update name error:', error instanceof Error ? error.message : error)
    }
  })

  socket.on('player:leaderboard', async () => {
    try {
      const board = await getLeaderboard()
      socket.emit('player:leaderboard', board)
    } catch (error) {
      console.error('[Player] Leaderboard error:', error instanceof Error ? error.message : error)
    }
  })

  socket.on('player:history', async () => {
    try {
      if (!playerId) return socket.emit('player:history', [])
      const history = await getMatchHistory(playerId)
      socket.emit('player:history', history)
    } catch (error) {
      console.error('[Player] History error:', error instanceof Error ? error.message : error)
    }
  })

  socket.on('economy:balance', async () => {
    try {
      const balance = await getEconomy(playerId)
      socket.emit('economy:balance', balance)
    } catch (error) {
      console.error('[Economy] Balance error:', error instanceof Error ? error.message : error)
    }
  })

  socket.on('economy:shop', async () => {
    try {
      const shop = await getShop()
      socket.emit('economy:shop', shop)
    } catch (error) {
      console.error('[Economy] Shop error:', error instanceof Error ? error.message : error)
    }
  })

  socket.on('economy:buy_pack', async ({ packId }: { packId: string }) => {
    try {
      const pack = await buyPack(playerId, packId)
      if (pack) {
        const result = await openPack(playerId, packId)
        const balance = await getEconomy(playerId)
        socket.emit('economy:pack_opened', { pack, result, balance })
      } else {
        socket.emit('economy:error', { message: 'Not enough coins or pack not found' })
      }
    } catch (error) {
      console.error('[Economy] Buy error:', error instanceof Error ? error.message : error)
      socket.emit('economy:error', { message: 'Failed to purchase pack' })
    }
  })

  socket.on('matchmaking:join', ({ name, deck }: { name?: string; deck?: CardCode[] }) => {
    const player: QueuedPlayer = {
      id: socket.id,
      name: name?.trim().slice(0, 18) || `Player ${socket.id.slice(0, 4)}`,
      deck: normalizeDeck(deck ?? []),
    }
    const alreadyQueued = queue.find((queued) => queued.id === socket.id)
    if (!alreadyQueued) {
      queue.push(player)
      scheduleBotMatch(player)
    }
    socket.emit('matchmaking:status', { queued: true, position: queue.findIndex((queued) => queued.id === socket.id) + 1 })

    if (queue.length >= 2) {
      const p1 = queue.shift()
      const p2 = queue.shift()
      if (!p1 || !p2) return
      startBattle(p1, p2)
    }
  })

  socket.on('matchmaking:leave', () => {
    removeFromQueue(socket.id)
    socket.emit('matchmaking:status', { queued: false, position: 0 })
  })

  socket.on('battle:action', (action: BattleAction) => {
    const battleId = playerBattle.get(socket.id)
    const battle = battleId ? battles.get(battleId) : undefined
    if (!battle) return
    applyAction(battle, socket.id, action)
    emitBattle(battle)
    scheduleBotTurn(battle)
    checkSaveMatch(battle)
  })

  socket.on('disconnect', () => {
    removeFromQueue(socket.id)
    const battleId = playerBattle.get(socket.id)
    const battle = battleId ? battles.get(battleId) : undefined
    if (battle && battle.phase !== 'finished') {
      applyAction(battle, socket.id, { type: 'surrender' })
      emitBattle(battle)
      checkSaveMatch(battle)
    }
    playerBattle.delete(socket.id)
  })
})

const savedMatches = new Set<string>()

function checkSaveMatch(battle: BattleState) {
  if (battle.phase !== 'finished') return
  if (savedMatches.has(battle.id)) return

  // Skip saving matches involving bot opponents (no DB record for bots)
  const isBotMatch = battle.players.some((p) => botPlayers.has(p.id))
  if (isBotMatch) return

  savedMatches.add(battle.id)

  const p1 = battle.players[0]
  const p2 = battle.players[1]
  const p1Deck = p1.deck.length > 0
    ? [...p1.deck, ...p1.hand, ...p1.discard].slice(0, 30)
    : STARTER_DECK
  const p2Deck = p2.deck.length > 0
    ? [...p2.deck, ...p2.hand, ...p2.discard].slice(0, 30)
    : STARTER_DECK

  recordMatchResult(
    battle.id,
    p1.id,
    p2.id,
    battle.winnerId ?? null,
    p1.name,
    p2.name,
    battle.turn,
    p1Deck as CardCode[],
    p2Deck as CardCode[],
    battle.log,
  ).catch((error) => console.error('[Match] Save error:', error instanceof Error ? error.message : error))

  // Award coins to both players
  const loserId = battle.winnerId === p1.id ? p2.id : p1.id
  awardMatchRewards(p1.id ?? '', battle.winnerId === p1.id).catch(() => {})
  awardMatchRewards(p2.id ?? '', battle.winnerId === p2.id).catch(() => {})
}

async function init() {
  const dbOk = await testConnection()
  if (dbOk) {
    await runMigrations()
  }

  httpServer.listen(PORT, () => {
    console.log(`Pockemy realtime server listening on http://localhost:${PORT}`)
  })
}

init()
