import { createServer } from 'node:http'
import { Server } from 'socket.io'
import { STARTER_DECK } from '../src/data/cards'
import { applyAction, createBattle, toClientState } from '../src/game/engine'
import type { BattleAction, BattleState, CardCode } from '../src/game/types'

const PORT = Number(process.env.PORT ?? 3001)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173'
const allowedOrigins = CLIENT_ORIGIN.split(',').map((origin) => origin.trim())

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
  cors: { origin: allowedOrigins },
})

type QueuedPlayer = {
  id: string
  name: string
  deck: CardCode[]
}

const queue: QueuedPlayer[] = []
const battles = new Map<string, BattleState>()
const playerBattle = new Map<string, string>()

function emitBattle(battle: BattleState) {
  for (const player of battle.players) {
    io.to(player.id).emit('battle:update', toClientState(battle, player.id))
  }
}

function normalizeDeck(deck: CardCode[]) {
  const clean = deck.filter(Boolean)
  return clean.length === 30 ? clean : STARTER_DECK
}

io.on('connection', (socket) => {
  socket.on('matchmaking:join', ({ name, deck }: { name?: string; deck?: CardCode[] }) => {
    const player: QueuedPlayer = {
      id: socket.id,
      name: name?.trim().slice(0, 18) || `Player ${socket.id.slice(0, 4)}`,
      deck: normalizeDeck(deck ?? []),
    }
    const alreadyQueued = queue.find((queued) => queued.id === socket.id)
    if (!alreadyQueued) queue.push(player)
    socket.emit('matchmaking:status', { queued: true, position: queue.findIndex((queued) => queued.id === socket.id) + 1 })

    if (queue.length >= 2) {
      const p1 = queue.shift()
      const p2 = queue.shift()
      if (!p1 || !p2) return
      const battle = createBattle(`battle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, p1, p2)
      battles.set(battle.id, battle)
      playerBattle.set(p1.id, battle.id)
      playerBattle.set(p2.id, battle.id)
      socket.to(p1.id).emit('matchmaking:status', { queued: false, position: 0 })
      socket.to(p2.id).emit('matchmaking:status', { queued: false, position: 0 })
      emitBattle(battle)
    }
  })

  socket.on('matchmaking:leave', () => {
    const index = queue.findIndex((player) => player.id === socket.id)
    if (index >= 0) queue.splice(index, 1)
    socket.emit('matchmaking:status', { queued: false, position: 0 })
  })

  socket.on('battle:action', (action: BattleAction) => {
    const battleId = playerBattle.get(socket.id)
    const battle = battleId ? battles.get(battleId) : undefined
    if (!battle) return
    applyAction(battle, socket.id, action)
    emitBattle(battle)
  })

  socket.on('disconnect', () => {
    const index = queue.findIndex((player) => player.id === socket.id)
    if (index >= 0) queue.splice(index, 1)
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
