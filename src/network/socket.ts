import { io } from 'socket.io-client'

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
const fallbackSocketUrl = isLocalHost ? 'http://localhost:3001' : 'https://cardgame-production-54fa.up.railway.app'
const socketUrl = import.meta.env.VITE_SOCKET_URL || fallbackSocketUrl

export const socket = io(socketUrl, {
  autoConnect: true,
  transports: ['websocket'],
})
