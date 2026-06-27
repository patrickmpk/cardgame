export type Element = 'spark' | 'leaf' | 'tide' | 'ember' | 'void'
export type Rarity = 'common' | 'rare' | 'epic'
export type CardType = 'creature' | 'support' | 'spell'
export type Effect = 'damage' | 'heal' | 'draw' | 'guard' | 'buff'
export type CardCode = `${'PKC' | 'HLC' | 'SLC'}_${string}`

export type Card = {
  code: CardCode
  name: string
  type: CardType
  element: Element
  rarity: Rarity
  cost: number
  text: string
  image: string
  attack?: number
  health?: number
  effect?: Effect
  amount?: number
}

export type PublicPlayer = {
  id: string
  name: string
  hp: number
  energy: number
  maxEnergy: number
  deckCount: number
  handCount: number
  discardCount: number
  board: BoardCard[]
}

export type BoardCard = {
  instanceId: string
  code: CardCode
  ownerId: string
  attack: number
  health: number
  maxHealth: number
  canAttack: boolean
}

export type PlayerState = PublicPlayer & {
  deck: CardCode[]
  hand: CardCode[]
  discard: CardCode[]
}

export type BattleLog = {
  id: string
  text: string
  tone: 'info' | 'hit' | 'heal' | 'win'
}

export type BattleState = {
  id: string
  players: [PlayerState, PlayerState]
  activePlayerId: string
  turn: number
  phase: 'playing' | 'finished'
  winnerId?: string
  log: BattleLog[]
}

export type ClientBattleState = Omit<BattleState, 'players'> & {
  players: [PublicPlayer, PublicPlayer]
  hand: CardCode[]
}

export type BattleAction =
  | { type: 'play'; handIndex: number; targetId?: string }
  | { type: 'attack'; attackerId: string; targetId?: string }
  | { type: 'endTurn' }
  | { type: 'surrender' }
