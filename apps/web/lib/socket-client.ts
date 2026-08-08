import { io, Socket } from 'socket.io-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${API_BASE_URL}/ws`, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
