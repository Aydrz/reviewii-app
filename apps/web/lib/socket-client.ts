import { io, Socket } from 'socket.io-client';

const getCleanApiUrl = () => {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
  return raw.replace(/\/+$/, '');
};

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getCleanApiUrl(), {
      path: '/socket.io',
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
