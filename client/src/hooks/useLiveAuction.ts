import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';

export interface LiveBidEvent {
  alias: string;
  amount: number;
  isAuto: boolean;
  at: number;
  userId: string;
}

export interface LiveAuctionState {
  price: number;
  minNextBid: number;
  bidCount: number;
  endsAt: number;
  version: number;
  leaderId: string;
  reserveMet: boolean;
  status: string;
  /** Rolling window of the newest bids, most recent first. */
  recent: LiveBidEvent[];
  extendedAt: number | null;
  connected: boolean;
}

interface SocketUpdate {
  auctionId: string;
  price: number;
  minNextBid: number;
  bidCount: number;
  endsAt: number;
  version: number;
  reserveMet?: boolean;
  extended?: boolean;
  leaderId: string;
  events?: LiveBidEvent[];
}

/**
 * Subscribes to one auction room and keeps a local mirror of its state.
 *
 * Every payload carries a monotonic `version` from the Lua script. Frames that
 * arrive out of order — reconnects, multiple server instances, a slow tab — are
 * dropped rather than allowed to walk the price backwards.
 */
export function useLiveAuction(
  auctionId: string | undefined,
  initial: {
    price: number; minNextBid: number; bidCount: number; endsAt: string;
    leaderId?: string | null; reserveMet: boolean; status: string;
  },
): LiveAuctionState & { applyLocal: (update: Partial<LiveAuctionState>) => void } {
  const [state, setState] = useState<LiveAuctionState>(() => ({
    price: initial.price,
    minNextBid: initial.minNextBid,
    bidCount: initial.bidCount,
    endsAt: new Date(initial.endsAt).getTime(),
    version: 0,
    leaderId: initial.leaderId ?? '',
    reserveMet: initial.reserveMet,
    status: initial.status,
    recent: [],
    extendedAt: null,
    connected: false,
  }));

  const versionRef = useRef(0);

  const merge = useCallback((update: SocketUpdate) => {
    // Out-of-order guard.
    if (update.version <= versionRef.current) return;
    versionRef.current = update.version;

    setState((current) => ({
      ...current,
      price: update.price,
      minNextBid: update.minNextBid,
      bidCount: update.bidCount,
      endsAt: update.endsAt,
      version: update.version,
      leaderId: update.leaderId,
      reserveMet: update.reserveMet ?? current.reserveMet,
      extendedAt: update.extended ? Date.now() : current.extendedAt,
      recent: update.events?.length
        ? [...[...update.events].reverse(), ...current.recent].slice(0, 30)
        : current.recent,
    }));
  }, []);

  useEffect(() => {
    if (!auctionId) return;
    const socket = getSocket();

    const onConnect = () => {
      setState((s) => ({ ...s, connected: true }));
      // Re-join on every (re)connect, otherwise a dropped socket stops updating.
      socket.emit('auction:join', auctionId);
    };
    const onDisconnect = () => setState((s) => ({ ...s, connected: false }));
    const onUpdate = (payload: SocketUpdate) => {
      if (payload.auctionId === auctionId) merge(payload);
    };
    const onState = (payload: SocketUpdate & { status?: string }) => {
      if (payload.auctionId !== auctionId) return;
      versionRef.current = payload.version;
      setState((current) => ({
        ...current,
        price: payload.price,
        minNextBid: payload.minNextBid,
        bidCount: payload.bidCount,
        endsAt: payload.endsAt,
        version: payload.version,
        leaderId: payload.leaderId,
        status: payload.status ?? current.status,
      }));
    };
    const onEnded = (payload: { auctionId: string; status: string }) => {
      if (payload.auctionId === auctionId) {
        setState((current) => ({ ...current, status: payload.status }));
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('auction:update', onUpdate);
    socket.on('auction:state', onState);
    socket.on('auction:ended', onEnded);

    if (socket.connected) onConnect();

    return () => {
      socket.emit('auction:leave', auctionId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('auction:update', onUpdate);
      socket.off('auction:state', onState);
      socket.off('auction:ended', onEnded);
    };
  }, [auctionId, merge]);

  const applyLocal = useCallback((update: Partial<LiveAuctionState>) => {
    setState((current) => ({ ...current, ...update }));
  }, []);

  return { ...state, applyLocal };
}
