import { useEffect, useMemo, useState } from 'react'
import { BadgePlus, Boxes, Check, Crown, Flame, Hand, Heart, Hourglass, Library, LogOut, Play, Shield, Swords, Trophy, UserRound, Wifi, WifiOff, Zap } from 'lucide-react'
import './App.css'
import { CARD_BY_CODE, CARDS, STARTER_COLLECTION, STARTER_DECK } from './data/cards'
import type { BattleAction, Card, CardCode, ClientBattleState, PublicPlayer } from './game/types'
import { socket, socketUrl } from './network/socket'

type View = 'battle' | 'collection' | 'deck' | 'inventory'

const deckKey = 'pockemy.deck'
const nameKey = 'pockemy.name'

function loadDeck(): CardCode[] {
  const saved = localStorage.getItem(deckKey)
  if (!saved) return STARTER_DECK
  try {
    const parsed = JSON.parse(saved) as CardCode[]
    return parsed.length === 30 ? parsed : STARTER_DECK
  } catch {
    return STARTER_DECK
  }
}

function App() {
  const [view, setView] = useState<View>('battle')
  const [deck, setDeck] = useState<CardCode[]>(loadDeck)
  const [name, setName] = useState(localStorage.getItem(nameKey) ?? `Trainer ${Math.floor(Math.random() * 900 + 100)}`)
  const [queued, setQueued] = useState(false)
  const [queuePosition, setQueuePosition] = useState(0)
  const [socketConnected, setSocketConnected] = useState(socket.connected)
  const [socketError, setSocketError] = useState('')
  const [battle, setBattle] = useState<ClientBattleState | null>(null)
  const [selectedHand, setSelectedHand] = useState<number | null>(null)
  const [targeting, setTargeting] = useState<BattleAction | null>(null)

  useEffect(() => {
    localStorage.setItem(deckKey, JSON.stringify(deck))
  }, [deck])

  useEffect(() => {
    localStorage.setItem(nameKey, name)
  }, [name])

  useEffect(() => {
    const markConnected = () => {
      setSocketConnected(true)
      setSocketError('')
    }
    const markDisconnected = () => {
      setSocketConnected(false)
    }
    const markError = (error: Error) => {
      setSocketConnected(false)
      setSocketError(error.message)
    }
    socket.on('connect', markConnected)
    socket.on('disconnect', markDisconnected)
    socket.on('connect_error', markError)
    socket.on('matchmaking:status', ({ queued: isQueued, position }) => {
      setQueued(isQueued)
      setQueuePosition(position)
    })
    socket.on('battle:update', (state: ClientBattleState) => {
      setBattle(state)
      setQueued(false)
      setTargeting(null)
      setSelectedHand(null)
      setView('battle')
    })
    return () => {
      socket.off('connect', markConnected)
      socket.off('disconnect', markDisconnected)
      socket.off('connect_error', markError)
      socket.off('matchmaking:status')
      socket.off('battle:update')
    }
  }, [])

  const collectionStats = useMemo(() => {
    const owned = Object.values(STARTER_COLLECTION).reduce((sum, count) => sum + count, 0)
    const deckPower = deck.reduce((sum, code) => sum + CARD_BY_CODE[code].cost, 0)
    return { owned, unique: CARDS.length, deckPower }
  }, [deck])

  const me = battle?.players.find((player) => player.id === socket.id)
  const rival = battle?.players.find((player) => player.id !== socket.id)
  const isMyTurn = Boolean(battle && battle.activePlayerId === socket.id && battle.phase === 'playing')

  function joinMatchmaking() {
    if (!socketConnected) {
      setSocketError('Could not connect to the realtime server.')
      socket.connect()
      return
    }

    setBattle(null)
    setQueued(true)
    setQueuePosition(1)
    setSocketError('')
    socket.emit('matchmaking:join', { name, deck })
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <Crown size={25} />
          <div>
            <strong>POCKEMY</strong>
            <span>Card Battle Online</span>
          </div>
        </div>
        <nav className="nav">
          <Tab active={view === 'battle'} icon={<Swords />} label="Battle" onClick={() => setView('battle')} />
          <Tab active={view === 'collection'} icon={<Library />} label="Cards" onClick={() => setView('collection')} />
          <Tab active={view === 'deck'} icon={<Boxes />} label="Deck" onClick={() => setView('deck')} />
          <Tab active={view === 'inventory'} icon={<Trophy />} label="Profile" onClick={() => setView('inventory')} />
        </nav>
      </header>

      <section className="status-strip">
        <label>
          <UserRound size={16} />
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={18} />
        </label>
        <Stat icon={<Library />} label="Collection" value={`${collectionStats.unique}/45`} />
        <Stat icon={<Hand />} label="Deck" value={`${deck.length}/30`} />
        <Stat icon={<Zap />} label="Curve" value={Math.round(collectionStats.deckPower / deck.length || 0).toString()} />
        <Stat icon={socketConnected ? <Wifi /> : <WifiOff />} label="Server" value={socketConnected ? 'Online' : 'Offline'} />
        <button className="primary" disabled={deck.length !== 30 || queued} onClick={joinMatchmaking}>
          {queued ? <Hourglass size={18} /> : <Play size={18} />}
          {queued ? `Queue ${queuePosition}` : 'Find PvP'}
        </button>
        {queued && (
          <button className="ghost" onClick={() => socket.emit('matchmaking:leave')}>
            <LogOut size={18} />
          </button>
        )}
      </section>
      {(queued || socketError) && (
        <section className="notice">
          {queued ? 'Waiting for another player. A test bot joins automatically after a few seconds.' : `Realtime server offline: ${socketError}. Target: ${socketUrl}`}
        </section>
      )}

      {view === 'battle' && <BattleView battle={battle} me={me} rival={rival} isMyTurn={isMyTurn} selectedHand={selectedHand} setSelectedHand={setSelectedHand} targeting={targeting} setTargeting={setTargeting} />}
      {view === 'collection' && <CollectionView />}
      {view === 'deck' && <DeckBuilder deck={deck} setDeck={setDeck} />}
      {view === 'inventory' && <Inventory stats={collectionStats} name={name} />}
    </main>
  )
}

function Tab({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={active ? 'tab active' : 'tab'} onClick={onClick}>{icon}{label}</button>
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="stat">{icon}<span>{label}</span><strong>{value}</strong></div>
}

function BattleView({ battle, me, rival, isMyTurn, selectedHand, setSelectedHand, targeting, setTargeting }: {
  battle: ClientBattleState | null
  me?: PublicPlayer
  rival?: PublicPlayer
  isMyTurn: boolean
  selectedHand: number | null
  setSelectedHand: (index: number | null) => void
  targeting: BattleAction | null
  setTargeting: (action: BattleAction | null) => void
}) {
  if (!battle || !me || !rival) {
    return (
      <section className="empty-state">
        <div className="empty-orbit">
          <img src={CARD_BY_CODE.PKC_001.image} alt="" />
          <img src={CARD_BY_CODE.HLC_001.image} alt="" />
          <img src={CARD_BY_CODE.SLC_001.image} alt="" />
        </div>
        <Swords size={44} />
        <h1>Enter the arena</h1>
        <p>Choose your deck and start a duel. If no player is online, the arena will summon Pockemy Bot for a quick battle.</p>
      </section>
    )
  }

  const winner = battle.winnerId === me.id ? 'Victory' : battle.winnerId === rival.id ? 'Defeat' : null

  function playHand(index: number) {
    const card = CARD_BY_CODE[battle!.hand[index]]
    if (!isMyTurn || me!.energy < card.cost) return
    setSelectedHand(index)
    if (card.type === 'spell' && card.effect === 'damage') setTargeting({ type: 'play', handIndex: index })
    else socket.emit('battle:action', { type: 'play', handIndex: index } satisfies BattleAction)
  }

  function chooseTarget(targetId?: string) {
    if (!targeting) return
    socket.emit('battle:action', { ...targeting, targetId })
  }

  return (
    <section className="battle-grid">
      <aside className="combat-log">
        <h2>Battle Feed</h2>
        {battle.log.map((item) => <p key={item.id} className={item.tone}>{item.text}</p>)}
      </aside>

      <div className="arena">
        {winner && <div className="result-banner">{winner}</div>}
        <div className="battle-bursts" aria-hidden="true">
          {battle.log.slice(0, 3).map((item, index) => (
            <span key={item.id} className={`burst ${item.tone}`} style={{ animationDelay: `${index * 120}ms` }}>{item.text}</span>
          ))}
        </div>
        <PlayerPanel player={rival} active={battle.activePlayerId === rival.id} />
        <Board cards={rival.board} opponent onTarget={chooseTarget} targeting={targeting} />
        <div className="core-row">
          <button className="core" disabled={!targeting} onClick={() => chooseTarget(undefined)}>
            <Flame size={24} /> Rival Core <strong>{rival.hp} HP</strong>
          </button>
          <div className="turn-pill">{isMyTurn ? 'Your turn' : `${rival.name}'s turn`}</div>
          <button className="ghost" disabled={!isMyTurn} onClick={() => socket.emit('battle:action', { type: 'endTurn' } satisfies BattleAction)}>End Turn</button>
        </div>
        <Board cards={me.board} onTarget={(id) => {
          if (targeting) chooseTarget(id)
          else if (isMyTurn) setTargeting({ type: 'attack', attackerId: id })
        }} targeting={targeting} />
        <PlayerPanel player={me} active={battle.activePlayerId === me.id} />
        <div className="hand-row">
          {battle.hand.map((code, index) => <CardTile key={`${code}-${index}`} card={CARD_BY_CODE[code]} compact selected={selectedHand === index} disabled={!isMyTurn || me.energy < CARD_BY_CODE[code].cost} onClick={() => playHand(index)} />)}
        </div>
      </div>
    </section>
  )
}

function PlayerPanel({ player, active }: { player: PublicPlayer; active: boolean }) {
  const hpPercent = Math.max(0, Math.min(100, (player.hp / 30) * 100))
  return (
    <div className={active ? 'player-panel active' : 'player-panel'}>
      <div className="avatar-core"><Crown size={18} /></div>
      <div className="player-main">
        <strong>{player.name}</strong>
        <div className="hp-track"><i style={{ width: `${hpPercent}%` }} /></div>
      </div>
      <span className="vital hp"><Heart size={16} /> {player.hp}</span>
      <span className="vital energy"><Zap size={16} /> {player.energy}/{player.maxEnergy}</span>
      <span className="vital"><Library size={16} /> {player.deckCount}</span>
      <span className="vital"><Hand size={16} /> {player.handCount}</span>
    </div>
  )
}

function Board({ cards, opponent, targeting, onTarget }: { cards: PublicPlayer['board']; opponent?: boolean; targeting: BattleAction | null; onTarget: (id: string) => void }) {
  return (
    <div className={opponent ? 'board opponent' : 'board'}>
      {cards.map((unit) => (
        <button key={unit.instanceId} className={`unit ${unit.canAttack ? 'ready' : ''}`} onClick={() => onTarget(unit.instanceId)} disabled={!targeting && opponent}>
          <img src={CARD_BY_CODE[unit.code].image} alt={CARD_BY_CODE[unit.code].name} />
          <span>{CARD_BY_CODE[unit.code].name}</span>
          <b><Swords size={14} /> {unit.attack} <Heart size={14} /> {unit.health}</b>
        </button>
      ))}
      {Array.from({ length: Math.max(0, 3 - cards.length) }).map((_, index) => <div className="slot" key={index}><span>Summon Slot</span></div>)}
    </div>
  )
}

function CollectionView() {
  return <section className="card-wall">{CARDS.map((card) => <CardTile key={card.code} card={card} count={STARTER_COLLECTION[card.code]} />)}</section>
}

function DeckBuilder({ deck, setDeck }: { deck: CardCode[]; setDeck: (deck: CardCode[]) => void }) {
  const counts = deck.reduce<Record<string, number>>((acc, code) => ({ ...acc, [code]: (acc[code] ?? 0) + 1 }), {})
  function add(code: CardCode) {
    if (deck.length >= 30) return
    if ((counts[code] ?? 0) >= STARTER_COLLECTION[code]) return
    setDeck([...deck, code])
  }
  function remove(code: CardCode) {
    const index = deck.indexOf(code)
    if (index >= 0) setDeck(deck.filter((_, cardIndex) => cardIndex !== index))
  }
  return (
    <section className="deck-builder">
      <div className="deck-list">
        <h2>Active Deck {deck.length}/30</h2>
        {Object.entries(counts).map(([code, count]) => (
          <button key={code} onClick={() => remove(code as CardCode)}>
            <img src={CARD_BY_CODE[code as CardCode].image} alt="" />
            <span>{CARD_BY_CODE[code as CardCode].name}</span>
            <b>x{count}</b>
          </button>
        ))}
      </div>
      <div className="builder-cards">
        {CARDS.map((card) => <CardTile key={card.code} card={card} count={(counts[card.code] ?? 0)} onClick={() => add(card.code)} disabled={(counts[card.code] ?? 0) >= STARTER_COLLECTION[card.code] || deck.length >= 30} />)}
      </div>
    </section>
  )
}

function Inventory({ stats, name }: { stats: { owned: number; unique: number; deckPower: number }; name: string }) {
  return (
    <section className="inventory">
      <div className="profile-card">
        <Crown size={40} />
        <h1>{name}</h1>
        <p>Starter league account</p>
      </div>
      <Stat icon={<BadgePlus />} label="Owned cards" value={String(stats.owned)} />
      <Stat icon={<Shield />} label="Unique cards" value={`${stats.unique}/45`} />
      <Stat icon={<Zap />} label="Deck energy" value={String(stats.deckPower)} />
      <Stat icon={<Check />} label="Progression" value="Level 1" />
    </section>
  )
}

function CardTile({ card, count, compact, selected, disabled, onClick }: { card: Card; count?: number; compact?: boolean; selected?: boolean; disabled?: boolean; onClick?: () => void }) {
  return (
    <button className={`card-tile ${card.element} ${compact ? 'compact' : ''} ${selected ? 'selected' : ''}`} onClick={onClick} disabled={disabled}>
      <img src={card.image} alt={card.name} loading="lazy" />
      <div>
        <strong>{card.name}</strong>
        <span>{card.element} / {card.rarity}</span>
        <p>{card.text}</p>
      </div>
      <small>{card.cost}</small>
      {card.type === 'creature' && <b>{card.attack}/{card.health}</b>}
      {typeof count === 'number' && <em>x{count}</em>}
    </button>
  )
}

export default App
