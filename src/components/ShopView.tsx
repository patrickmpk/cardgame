import { useEffect, useState } from 'react'
import { getSocket } from '../network/socket'
import { Crown, Coins, Gem, Package } from 'lucide-react'
import { PackOpening } from './PackOpening'

type ShopItem = {
  id: string
  name: string
  description: string
  price_coins: number
  price_gems: number
  pack_size: number
  image_url: string
}

type OpenResult = {
  cards: { code: string; name: string; rarity: string; element: string; image: string }[]
}

export function ShopView() {
  const [shop, setShop] = useState<ShopItem[]>([])
  const [balance, setBalance] = useState({ coins: 0, gems: 0 })
  const [opening, setOpening] = useState<OpenResult | null>(null)
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return

    const onShop = (items: ShopItem[]) => setShop(items)
    const onBalance = (bal: { coins: number; gems: number }) => setBalance(bal)
    const onPackOpened = (data: { result: OpenResult; balance: { coins: number; gems: number } }) => {
      setOpening(data.result)
      setBalance(data.balance)
      setBuying(null)
    }
    const onError = (err: { message: string }) => {
      setError(err.message)
      setBuying(null)
    }

    socket.on('economy:shop', onShop)
    socket.on('economy:balance', onBalance)
    socket.on('economy:pack_opened', onPackOpened)
    socket.on('economy:error', onError)

    socket.emit('economy:shop')
    socket.emit('economy:balance')

    return () => {
      socket.off('economy:shop', onShop)
      socket.off('economy:balance', onBalance)
      socket.off('economy:pack_opened', onPackOpened)
      socket.off('economy:error', onError)
    }
  }, [])

  function handleBuy(packId: string) {
    setBuying(packId)
    setError('')
    getSocket()?.emit('economy:buy_pack', { packId })
  }

  if (opening) {
    return <PackOpening result={opening} onClose={() => setOpening(null)} />
  }

  return (
    <section className="shop-view">
      <div className="shop-header">
        <h2>Card Shop</h2>
        <div className="shop-balance">
          <span className="balance-chip">
            <Coins size={16} /> {balance.coins}
          </span>
          <span className="balance-chip gems">
            <Gem size={16} /> {balance.gems}
          </span>
        </div>
      </div>

      {error && <section className="notice shop-error">{error}</section>}

      <div className="shop-grid">
        {shop.map((item) => (
          <div key={item.id} className="shop-card">
            <div className="shop-card-image">
              <img src={item.image_url} alt={item.name} />
              <div className="shop-card-overlay">
                <Package size={28} />
              </div>
            </div>
            <div className="shop-card-info">
              <h3>{item.name}</h3>
              <p>{item.description}</p>
            </div>
            <div className="shop-card-footer">
              <span className="pack-size">
                <Crown size={14} /> x{item.pack_size} cards
              </span>
              <div className="shop-prices">
                {item.price_coins > 0 && (
                  <span className="price coins">
                    <Coins size={14} /> {item.price_coins}
                  </span>
                )}
                {item.price_gems > 0 && (
                  <span className="price gems">
                    <Gem size={14} /> {item.price_gems}
                  </span>
                )}
                {item.price_coins === 0 && item.price_gems === 0 && (
                  <span className="price free">FREE</span>
                )}
              </div>
              <button
                className="primary shop-buy-btn"
                disabled={buying === item.id || (item.price_coins > balance.coins) || (item.price_gems > balance.gems)}
                onClick={() => handleBuy(item.id)}
              >
                {buying === item.id ? 'Opening...' : item.price_coins === 0 && item.price_gems === 0 ? 'Claim' : 'Buy'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
