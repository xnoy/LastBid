import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

/**
 * One socket for the whole tab.
 *
 * Opening a connection per component is the usual way these apps fall over
 * under load, so every hook shares this instance and joins rooms instead.
 * The connection is created lazily on first use and reconnects with backoff.
 */
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL ?? '/', {
      transports: ['websocket'],
      auth: { token: getToken() },
      reconnectionDelay: 400,
      reconnectionDelayMax: 4000,
      autoConnect: true,
    });
  }
  return socket;
}

/** Called after sign-in or sign-out so the server re-reads the identity. */
export function refreshSocketAuth(): void {
  if (!socket) return;
  socket.auth = { token: getToken() };
  socket.disconnect().connect();
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
