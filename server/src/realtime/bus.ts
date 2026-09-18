import type { Server } from 'socket.io';

/**
 * Tiny indirection so services can broadcast without importing the HTTP
 * bootstrap (which would import the services right back).
 */
let io: Server | null = null;

export function setIo(server: Server): void {
  io = server;
}

export function emitToAuction(auctionId: string, event: string, payload: unknown): void {
  io?.to(`auction:${auctionId}`).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitGlobal(event: string, payload: unknown): void {
  io?.emit(event, payload);
}

export function getIo(): Server | null {
  return io;
}
