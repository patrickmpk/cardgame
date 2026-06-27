import { io } from 'socket.io-client'

const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
export const socketUrl = isLocalHost ? 'http://localhost:3001' : 'https://cardgame-production-54fa.up.railway.app'

export const socket = io(socketUrl, {
  autoConnect: true,
  transports: ['websocket'],
})
