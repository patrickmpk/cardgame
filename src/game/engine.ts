import { CARD_BY_CODE } from '../data/cards'
import type { BattleAction, BattleLog, BattleState, BoardCard, CardCode, ClientBattleState, PlayerState, PublicPlayer } from './types'

const HAND_SIZE = 5
const STARTING_HP = 30
const MAX_BOARD = 3
const PULSE_BURST_CHARGE = 3

const uid = () => Math.random().toString(36).slice(2, 10)

function shuffle(cards: CardCode[]) {
  const next = [...cards]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

function addLog(state: BattleState, text: string, tone: BattleLog['tone'] = 'info') {
  state.log = [{ id: uid(), text, tone }, ...state.log].slice(0, 9)
}

function draw(player: PlayerState, count = 1) {
  for (let index = 0; index < count; index += 1) {
    const card = player.deck.shift()
    if (!card) {
      player.hp -= 2
      continue
    }
    if (player.hand.length < 9) player.hand.push(card)
    else player.discard.push(card)
  }
  player.deckCount = player.deck.length
  player.handCount = player.hand.length
  player.discardCount = player.discard.length
}

function makePlayer(id: string, name: string, deck: CardCode[]): PlayerState {
  const player: PlayerState = {
    id,
    name,
    hp: STARTING_HP,
    energy: 1,
    maxEnergy: 1,
    pulseElement: undefined,
    pulseChain: 0,
    pulseCharge: 0,
    deck: shuffle(deck),
    hand: [],
    discard: [],
    deckCount: deck.length,
    handCount: 0,
    discardCount: 0,
    board: [],
  }
  draw(player, HAND_SIZE)
  return player
}

export function createBattle(id: string, p1: { id: string; name: string; deck: CardCode[] }, p2: { id: string; name: string; deck: CardCode[] }): BattleState {
  const first = Math.random() > 0.5 ? p1.id : p2.id
  const state: BattleState = {
    id,
    players: [makePlayer(p1.id, p1.name, p1.deck), makePlayer(p2.id, p2.name, p2.deck)],
    activePlayerId: first,
    turn: 1,
    phase: 'playing',
    log: [],
  }
  addLog(state, `${state.players.find((p) => p.id === first)?.name} starts the battle.`)
  return state
}

export function toClientState(state: BattleState, viewerId: string): ClientBattleState {
  const viewer = state.players.find((player) => player.id === viewerId)
  return {
    ...state,
    players: state.players.map(toPublic) as [PublicPlayer, PublicPlayer],
    hand: viewer?.hand ?? [],
  }
}

function toPublic(player: PlayerState): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    hp: player.hp,
    energy: player.energy,
    maxEnergy: player.maxEnergy,
    pulseElement: player.pulseElement,
    pulseChain: player.pulseChain,
    pulseCharge: player.pulseCharge,
    deckCount: player.deck.length,
    handCount: player.hand.length,
    discardCount: player.discard.length,
    board: player.board,
  }
}

export function applyAction(state: BattleState, playerId: string, action: BattleAction) {
  if (state.phase === 'finished') return
  const player = state.players.find((candidate) => candidate.id === playerId)
  const rival = state.players.find((candidate) => candidate.id !== playerId)
  if (!player || !rival) return

  if (action.type === 'surrender') {
    finish(state, rival.id, `${player.name} surrendered.`)
    return
  }

  if (state.activePlayerId !== playerId) return

  if (action.type === 'endTurn') {
    endTurn(state)
    return
  }

  if (action.type === 'play') playCard(state, player, rival, action.handIndex, action.targetId)
  if (action.type === 'attack') attack(state, player, rival, action.attackerId, action.targetId)
  checkWinner(state)
}

function playCard(state: BattleState, player: PlayerState, rival: PlayerState, handIndex: number, targetId?: string) {
  const code = player.hand[handIndex]
  const card = CARD_BY_CODE[code]
  if (!card || player.energy < card.cost) return
  if (card.type === 'creature' && player.board.length >= MAX_BOARD) return

  player.energy -= card.cost
  player.hand.splice(handIndex, 1)
  player.discard.push(code)
  applyPulse(state, player, rival, card.element)

  if (card.type === 'creature') {
    player.board.push({
      instanceId: uid(),
      code,
      ownerId: player.id,
      attack: card.attack ?? 1,
      health: card.health ?? 1,
      maxHealth: card.health ?? 1,
      canAttack: false,
    })
    addLog(state, `${player.name} summoned ${card.name}.`)
  } else {
    resolveEffect(state, player, rival, card.effect ?? 'damage', card.amount ?? 1, targetId)
    addLog(state, `${player.name} played ${card.name}.`, card.effect === 'heal' ? 'heal' : 'hit')
  }

  refreshCounts(player)
}

function applyPulse(state: BattleState, player: PlayerState, rival: PlayerState, element: PlayerState['pulseElement']) {
  if (!element) return
  if (player.pulseElement === element) {
    player.pulseChain += 1
    player.pulseCharge = Math.min(PULSE_BURST_CHARGE, player.pulseCharge + 1)
    if (player.pulseChain > 1) {
      player.energy = Math.min(player.maxEnergy, player.energy + 1)
      addLog(state, `${player.name} chained ${element}: +1 energy.`, 'heal')
    }
  } else {
    player.pulseElement = element
    player.pulseChain = 1
    player.pulseCharge = Math.min(PULSE_BURST_CHARGE, player.pulseCharge + 1)
    addLog(state, `${player.name} tuned the arena to ${element}.`)
  }

  if (player.pulseCharge >= PULSE_BURST_CHARGE) {
    const burstDamage = 3 + Math.max(0, player.pulseChain - 2)
    rival.hp -= burstDamage
    player.hp = Math.min(STARTING_HP, player.hp + 2)
    player.pulseCharge = 0
    addLog(state, `PULSE BURST! ${element} deals -${burstDamage} HP and restores +2 HP.`, 'win')
  }
}

function resolveEffect(state: BattleState, player: PlayerState, rival: PlayerState, effect: string, amount: number, targetId?: string) {
  if (effect === 'draw') {
    const cards = Math.min(2, amount - 1)
    draw(player, cards)
    addLog(state, `${player.name} drew ${cards} card${cards === 1 ? '' : 's'}.`)
  }
  if (effect === 'heal') {
    player.hp = Math.min(STARTING_HP, player.hp + amount)
    addLog(state, `+${amount} HP restored to ${player.name}.`, 'heal')
  }
  if (effect === 'guard') {
    const ally = player.board[0]
    if (ally) {
      ally.maxHealth += amount
      ally.health += amount
      addLog(state, `${CARD_BY_CODE[ally.code].name} gained +${amount} HP.`, 'heal')
    }
  }
  if (effect === 'buff') {
    const ally = player.board[0]
    if (ally) {
      ally.attack += amount
      addLog(state, `${CARD_BY_CODE[ally.code].name} gained +${amount} attack.`, 'heal')
    }
  }
  if (effect === 'damage') {
    const target = rival.board.find((unit) => unit.instanceId === targetId)
    if (target) {
      target.health -= amount
      addLog(state, `-${amount} HP to ${CARD_BY_CODE[target.code].name}.`, 'hit')
    } else {
      rival.hp -= amount
      addLog(state, `-${amount} HP to ${rival.name}'s core.`, 'hit')
    }
    clearDefeated(state)
  }
}

function attack(state: BattleState, player: PlayerState, rival: PlayerState, attackerId: string, targetId?: string) {
  const attacker = player.board.find((unit) => unit.instanceId === attackerId)
  if (!attacker?.canAttack) return
  attacker.canAttack = false
  const target = rival.board.find((unit) => unit.instanceId === targetId)
  if (target) {
    target.health -= attacker.attack
    attacker.health -= target.attack
    addLog(state, `${CARD_BY_CODE[attacker.code].name} dealt -${attacker.attack} HP to ${CARD_BY_CODE[target.code].name}.`, 'hit')
    clearDefeated(state)
  } else {
    rival.hp -= attacker.attack
    addLog(state, `${CARD_BY_CODE[attacker.code].name} dealt -${attacker.attack} HP to ${rival.name}'s core.`, 'hit')
  }
}

function clearDefeated(state: BattleState) {
  for (const player of state.players) {
    const defeated = player.board.filter((unit) => unit.health <= 0)
    if (defeated.length) {
      player.discard.push(...defeated.map((unit) => unit.code))
      player.board = player.board.filter((unit) => unit.health > 0)
      defeated.forEach((unit) => addLog(state, `${CARD_BY_CODE[unit.code].name} was knocked out.`, 'hit'))
      refreshCounts(player)
    }
  }
}

function endTurn(state: BattleState) {
  const next = state.players.find((player) => player.id !== state.activePlayerId)
  if (!next) return
  state.activePlayerId = next.id
  state.turn += 1
  next.maxEnergy = Math.min(10, next.maxEnergy + 1)
  next.energy = next.maxEnergy
  next.pulseChain = 0
  next.board.forEach((unit: BoardCard) => {
    unit.canAttack = true
  })
  draw(next)
  addLog(state, `${next.name}'s turn.`)
  checkWinner(state)
}

function refreshCounts(player: PlayerState) {
  player.deckCount = player.deck.length
  player.handCount = player.hand.length
  player.discardCount = player.discard.length
}

function checkWinner(state: BattleState) {
  const defeated = state.players.find((player) => player.hp <= 0)
  if (defeated) {
    const winner = state.players.find((player) => player.id !== defeated.id)
    if (winner) finish(state, winner.id, `${winner.name} wins the match.`)
  }
}

function finish(state: BattleState, winnerId: string, text: string) {
  state.phase = 'finished'
  state.winnerId = winnerId
  addLog(state, text, 'win')
}
