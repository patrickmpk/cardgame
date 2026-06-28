import { useState, useEffect } from 'react'
import { Crown, Sparkles, X } from 'lucide-react'

type PackCard = {
  code: string
  name: string
  rarity: string
  element: string
  image: string
}

type OpenResult = {
  cards: PackCard[]
}

const rarityColors: Record<string, string> = {
  common: '#94a3b8',
  rare: '#60a5fa',
  epic: '#c084fc',
}

export function PackOpening({ result, onClose }: { result: OpenResult; onClose: () => void }) {
  const [revealed, setRevealed] = useState<number>(-1)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (revealed >= result.cards.length - 1) {
      const t = setTimeout(() => setDone(true), 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setRevealed((r) => r + 1), 400)
    return () => clearTimeout(t)
  }, [revealed, result.cards.length])

  useEffect(() => {
    const t = setTimeout(() => setRevealed(0), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="pack-opening">
      <div className="pack-backdrop" onClick={done ? onClose : undefined} />
      <div className="pack-content">
        {!done && (
          <div className="pack-intro">
            <Sparkles size={32} className="pack-sparkle" />
            <h2>Opening Pack...</h2>
          </div>
        )}

        <div className="pack-cards">
          {result.cards.map((card, index) => {
            const isRevealed = index <= revealed
            return (
              <div
                key={card.code}
                className={`pack-card ${isRevealed ? 'revealed' : 'hidden'}`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                {isRevealed ? (
                  <>
                    <div className="pack-card-glow" style={{ background: `radial-gradient(circle, ${rarityColors[card.rarity] || rarityColors.common}33, transparent 70%)` }} />
                    <img src={card.image} alt={card.name} />
                    <div className="pack-card-info">
                      <strong>{card.name}</strong>
                      <span style={{ color: rarityColors[card.rarity] || rarityColors.common }}>
                        {card.rarity.toUpperCase()} · {card.element.toUpperCase()}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="pack-card-back">
                    <Crown size={24} />
                    <span>?</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {done && (
          <button className="primary pack-close" onClick={onClose}>
            <X size={18} /> Close
          </button>
        )}
      </div>
    </section>
  )
}
