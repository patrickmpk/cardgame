import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { CARD_BY_CODE, STARTER_DECK } from '../src/data/cards'
import { applyAction, createBattle, toClientState } from '../src/game/engine'
import type { BattleAction, BattleState, CardCode } from '../src/game/types'

const PORT = Number(process.env.PORT ?? 3001)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
const allowedOrigins = CLIENT_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)

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
  setTimeout(() => {
    const bot = battle.players.find((player) => player.id === battle.activePlayerId)
    const rival = battle.players.find((player) => player.id !== battle.activePlayerId)
    if (!bot || !rival || battle.phase === 'finished') return

    const index = bot.hand.findIndex((code) => bot.energy >= CARD_BY_CODE[code].cost)

    if (index >= 0) {
      applyAction(battle, bot.id, { type: 'play', handIndex: index })
    }

    for (const unit of [...bot.board]) {
      if (unit.canAttack) applyAction(battle, bot.id, { type: 'attack', attackerId: unit.instanceId, targetId: rival.board[0]?.instanceId })
    }

    if (battle.phase === 'playing' && battle.activePlayerId === bot.id) {
      applyAction(battle, bot.id, { type: 'endTurn' })
    }
    emitBattle(battle)
  }, 900)
}

io.on('connection', (socket) => {
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
  })

  socket.on('disconnect', () => {
    removeFromQueue(socket.id)
    const battleId = playerBattle.get(socket.id)
    const battle = battleId ? battles.get(battleId) : undefined
    if (battle && battle.phase !== 'finished') {
      applyAction(battle, socket.id, { type: 'surrender' })
      emitBattle(battle)
    }
    playerBattle.delete(socket.id)
  })
})

httpServer.listen(PORT, () => {
  console.log(`Pockemy realtime server listening on http://localhost:${PORT}`)
})
