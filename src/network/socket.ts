import { io, Socket } from 'socket.io-client'

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
export const socketUrl = isLocalHost ? 'http://localhost:3001' : 'https://cardgame-production-54fa.up.railway.app'

type SocketListeners = {
  onConnect: () => void
  onDisconnect: () => void
  onError: (error: Error) => void
  onMatchmaking: (data: { queued: boolean; position: number }) => void
  onBattleUpdate: (state: unknown) => void
}

let currentSocket: Socket | null = null

export function getSocket(): Socket | null {
  return currentSocket
}

export async function connectWithClerk(
  getToken: () => Promise<string | null>,
  listeners: SocketListeners,
): Promise<Socket> {
  const token = await getToken()

  if (currentSocket?.connected) {
    currentSocket.removeAllListeners()
    currentSocket.disconnect()
  }

  currentSocket = io(socketUrl, {
    auth: { token },
    autoConnect: true,
    transports: ['websocket'],
  })

  currentSocket.on('connect', listeners.onConnect)
  currentSocket.on('disconnect', listeners.onDisconnect)
  currentSocket.on('connect_error', listeners.onError)
  currentSocket.on('matchmaking:status', listeners.onMatchmaking)
  currentSocket.on('battle:update', listeners.onBattleUpdate)

  return currentSocket
}

export function disconnectSocket() {
  if (currentSocket) {
    currentSocket.removeAllListeners()
    currentSocket.disconnect()
    currentSocket = null
  }
}

