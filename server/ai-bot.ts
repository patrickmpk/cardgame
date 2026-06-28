import OpenAI from 'openai'
import { CARD_BY_CODE } from '../src/data/cards'
import type { BattleAction, BattleState, BoardCard } from '../src/game/types'

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
  defaultHeaders: {
    'HTTP-Referer': 'https://pockemy-card-battle.vercel.app',
    'X-Title': 'Pockemy Card Battle',
  },
})

type AiDecision = {
  actions: BattleAction[]
  reasoning: string
}

function serializeForAi(state: BattleState, botId: string): string {
  const bot = state.players.find((p) => p.id === botId)
  const rival = state.players.find((p) => p.id !== botId)
  if (!bot || !rival) return ''

  const handCards = bot.hand.map((code) => {
    const card = CARD_BY_CODE[code]
    return {
      code,
      name: card.name,
      type: card.type,
      element: card.element,
      cost: card.cost,
      attack: card.attack,
      health: card.health,
      effect: card.effect,
      amount: card.amount,
      text: card.text,
    }
  })

  return JSON.stringify({
    turn: state.turn,
    you: {
      name: bot.name,
      hp: bot.hp,
      energy: bot.energy,
      maxEnergy: bot.maxEnergy,
      pulseElement: bot.pulseElement,
      pulseCharge: bot.pulseCharge,
      pulseChain: bot.pulseChain,
      deckCount: bot.deckCount,
      handCount: bot.handCount,
      board: bot.board.map((u: BoardCard) => ({
        instanceId: u.instanceId,
        code: u.code,
        name: CARD_BY_CODE[u.code].name,
        attack: u.attack,
        health: u.health,
        maxHealth: u.maxHealth,
        canAttack: u.canAttack,
      })),
    },
    opponent: {
      name: rival.name,
      hp: rival.hp,
      energy: rival.energy,
      maxEnergy: rival.maxEnergy,
      pulseElement: rival.pulseElement,
      pulseCharge: rival.pulseCharge,
      pulseChain: rival.pulseChain,
      board: rival.board.map((u: BoardCard) => ({
        instanceId: u.instanceId,
        code: u.code,
        name: CARD_BY_CODE[u.code].name,
        attack: u.attack,
        health: u.health,
        canAttack: u.canAttack,
      })),
    },
    hand: handCards,
  })
}

const SYSTEM_PROMPT = `You are an AI playing Pockemy, a strategic card battle game.

## GAME RULES
- Each player starts with 30 HP.
- You gain 1 max energy per turn. Energy refills each turn.
- Your hand has at most 9 cards. Max 3 creatures on board.
- **Pulse System**: Playing cards of the same element in a row builds Pulse Chain.
  At 3 Pulse Charge, a Pulse Burst triggers: deals scaling damage to opponent & restores 2 HP to you.
- Cards have types: creature (stay on board & attack), support (one-time effect), spell (damage/buff).
- Cards have elements: spark, leaf, tide, ember, void.
- When you end your turn, Pulse Chain resets to 0.

## YOUR DECISION-MAKING STRATEGY
Analyze the game state and choose the BEST sequence of actions. You can:
1. Play a card from hand (by handIndex). Creatures cost energy and go to board.
2. Attack with a creature that "canAttack: true". Target can be an enemy creature or the opponent's core (no targetId).
3. End your turn, which refills your energy.

Return valid JSON only:
{
  "reasoning": "Brief explanation of your strategy",
  "actions": [
    { "type": "play", "handIndex": <number> },
    { "type": "attack", "attackerId": "<id>", "targetId": "<id or undefined>" },
    { "type": "endTurn" }
  ]
}

## TIPS
- Play creatures that build Pulse Chain toward a Burst.
- Attack enemy creatures to clear their board before hitting their core.
- Use spells to finish off low-HP enemy creatures or hit the core directly.
- Manage your energy wisely. Don't over-commit if you need energy next turn.
- If you can't do anything useful, just end turn.`

export async function decideBotActions(state: BattleState, botId: string): Promise<BattleAction[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return fallbackActions(state, botId)
  }

  const stateJson = serializeForAi(state, botId)
  if (!stateJson) return []

  try {
    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.0-flash-001',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: stateJson },
      ],
      temperature: 0.4,
      max_tokens: 600,
      response_format: { type: 'json_object' },
    })

    const content = completion.choices?.[0]?.message?.content
    if (!content) return fallbackActions(state, botId)

    const decision = JSON.parse(content) as AiDecision
    console.log(`[AI Bot] ${decision.reasoning}`)

    if (!Array.isArray(decision?.actions)) return fallbackActions(state, botId)

    const validActions = decision.actions.filter((a) => isValidAction(state, botId, a))
    return validActions.length > 0 ? validActions : fallbackActions(state, botId)
  } catch (error) {
    console.error('[AI Bot] Error:', error instanceof Error ? error.message : error)
    return fallbackActions(state, botId)
  }
}

function isValidAction(state: BattleState, botId: string, action: BattleAction): boolean {
  const bot = state.players.find((p) => p.id === botId)
  if (!bot) return false

  if (action.type === 'play') {
    const card = CARD_BY_CODE[bot.hand[action.handIndex]]
    if (!card) return false
    if (bot.energy < card.cost) return false
    if (card.type === 'creature' && bot.board.length >= 3) return false
    return true
  }

  if (action.type === 'attack') {
    const attacker = bot.board.find((u) => u.instanceId === action.attackerId)
    if (!attacker?.canAttack) return false
    return true
  }

  if (action.type === 'endTurn') {
    return state.activePlayerId === botId
  }

  return false
}

function fallbackActions(state: BattleState, botId: string): BattleAction[] {
  const bot = state.players.find((p) => p.id === botId)
  const rival = state.players.find((p) => p.id !== botId)
  if (!bot || !rival) return []

  const actions: BattleAction[] = []

  const playIndex = bot.hand.findIndex((code) => bot.energy >= CARD_BY_CODE[code].cost)
  if (playIndex >= 0) {
    actions.push({ type: 'play', handIndex: playIndex })
  }

  for (const unit of [...bot.board]) {
    if (unit.canAttack) {
      actions.push({
        type: 'attack',
        attackerId: unit.instanceId,
        targetId: rival.board[0]?.instanceId,
      })
    }
  }

  if (state.activePlayerId === botId) {
    actions.push({ type: 'endTurn' })
  }

  return actions
}
