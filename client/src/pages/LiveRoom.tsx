import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, Radio, Send, VideoOff } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { getSocket } from '@/lib/socket';
import { Countdown } from '@/components/Countdown';
import { BidPanel } from '@/components/BidPanel';
import { BidHistory } from '@/components/BidHistory';
import { Avatar, Spinner } from '@/components/ui';
import { useLiveAuction } from '@/hooks/useLiveAuction';
import { useAuth } from '@/store/AuthContext';
import { formatINR, timeAgo } from '@/lib/format';
import type { BidRecord, LiveChatMessage, LiveSession } from '@/shared/types';

/**
 * A live room.
 *
 * The video surface is deliberately honest: with the default mock streaming
 * provider there is no playback URL, and the panel says so rather than looping
 * a fake feed. Swapping in a real provider (see server/src/services/streaming)
 * fills `playbackUrl` and this same component plays it — no other change.
 */
export default function LiveRoom() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [viewers, setViewers] = useState(0);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [chatNote, setChatNote] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.liveSession(id),
    queryFn: () => api<{ session: LiveSession }>(`/live/${id}`),
  });

  const session = data?.session;
  const auction = session?.auction;

  const live = useLiveAuction(auction?.id, {
    price: auction?.currentBid ?? 0,
    minNextBid:
      auction && auction.currentBid > 0
        ? auction.currentBid + auction.minIncrement
        : auction?.startPrice ?? 0,
    bidCount: auction?.bidCount ?? 0,
    endsAt: auction?.endsAt ?? new Date().toISOString(),
    leaderId: '',
    reserveMet: auction?.reserveMet ?? false,
    status: auction?.status ?? 'ACTIVE',
  });

  // Seed chat from the fetched backlog, then keep it live over the socket.
  useEffect(() => {
    if (session?.messages) setMessages(session.messages);
    if (session) setViewers(session.viewerCount);
  }, [session]);

  useEffect(() => {
    if (!id) return;
    const socket = getSocket();

    const join = () => socket.emit('live:join', id);
    const onChat = (message: LiveChatMessage) => setMessages((current) => [...current.slice(-80), message]);
    const onViewers = (payload: { sessionId: string; viewers: number }) => {
      if (payload.sessionId === id) setViewers(Math.max(0, payload.viewers));
    };
    const onRejected = (payload: { reason: string }) => {
      setChatNote(payload.reason);
      window.setTimeout(() => setChatNote(null), 3000);
    };

    socket.on('connect', join);
    socket.on('live:chat', onChat);
    socket.on('live:viewers', onViewers);
    socket.on('live:chat-rejected', onRejected);
    if (socket.connected) join();

    return () => {
      socket.off('connect', join);
      socket.off('live:chat', onChat);
      socket.off('live:viewers', onViewers);
      socket.off('live:chat-rejected', onRejected);
    };
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: 'nearest' });
  }, [messages.length]);

  const bids: BidRecord[] = useMemo(
    () =>
      live.recent.map((event) => ({
        id: `live-${event.at}-${event.amount}`,
        amount: event.amount,
        isAuto: event.isAuto,
        createdAt: new Date(event.at).toISOString(),
        alias: event.alias,
        isYou: !!user && event.userId === user.id,
      })),
    [live.recent, user],
  );

  const sendChat = (event: React.FormEvent) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    getSocket().emit('live:chat', { sessionId: id, body });
    setDraft('');
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (!session || !auction) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">This room has ended</h1>
        <Link to="/live" className="btn-primary mt-5">See what else is live</Link>
      </div>
    );
  }

  const price = live.price > 0 ? live.price : auction.startPrice;
  const isHost = user?.id === session.host.id;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          {/* Video surface */}
          <div className="relative aspect-video overflow-hidden rounded-card bg-black">
            {session.isLiveVideoAvailable && session.playbackUrl ? (
              <video
                src={session.playbackUrl}
                controls
                autoPlay
                playsInline
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                <img
                  src={session.thumbnailUrl ?? auction.images[0]}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-25"
                />
                <VideoOff className="relative h-8 w-8 text-white/70" aria-hidden />
                <p className="relative font-display text-lg font-semibold text-white">
                  No video feed connected
                </p>
                <p className="relative max-w-sm text-sm text-white/70">
                  This build ships with a mock streaming provider, so there is no real broadcast.
                  Bidding, chat, viewer counts and the countdown below are all fully live. Connect a
                  provider in <code className="text-white/90">server/src/services/streaming</code> and the
                  player appears here.
                </p>
              </div>
            )}

            <div className="absolute left-3 top-3 flex gap-2">
              <span
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-white',
                  session.status === 'LIVE' ? 'bg-urgent' : 'bg-black/60',
                )}
              >
                <Radio className="h-3 w-3" aria-hidden /> {session.status === 'LIVE' ? 'LIVE' : session.status}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
                <Eye className="h-3 w-3" aria-hidden /> {viewers}
              </span>
            </div>
          </div>

          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">{session.title}</h1>
            <Link
              to={`/seller/${session.host.username}`}
              className="mt-3 inline-flex items-center gap-2.5 text-sm hover:text-ink"
            >
              <Avatar src={session.host.avatarUrl} name={session.host.displayName} size={32} />
              <span>
                <span className="font-medium">{session.host.displayName}</span>
                <span className="hint block">
                  @{session.host.username}
                  {session.host.ratingCount > 0 ? ` · ${session.host.ratingAvg.toFixed(1)}★` : ''}
                </span>
              </span>
            </Link>
          </div>

          <div className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <img src={auction.images[0]} alt="" className="h-20 w-20 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <Link to={`/auction/${auction.slug}`} className="block truncate font-display font-semibold hover:text-bid">
                {auction.title}
              </Link>
              <p className="hint mt-0.5">{live.bidCount} bids · {auction.location}</p>
            </div>
            <div className="text-right">
              <p className="hint">Current bid</p>
              <p className="tabular font-display text-xl font-semibold">{formatINR(price)}</p>
            </div>
            <Countdown endsAt={live.endsAt} variant="full" />
          </div>

          <section className="card p-4">
            <h2 className="mb-2 font-display font-semibold">Bids in this room</h2>
            {bids.length === 0 ? (
              <p className="hint py-4 text-center">Bids placed from here appear instantly, for everyone.</p>
            ) : (
              <BidHistory bids={bids} limit={12} />
            )}
          </section>
        </div>

        {/* Bid + chat column */}
        <div className="space-y-4">
          {isHost ? (
            <div className="card p-5">
              <p className="font-display font-semibold">You are hosting</p>
              <p className="hint mt-1">
                Hosts cannot bid on their own lot. {session.ingestUrl ? 'Your ingest URL is below.' : ''}
              </p>
              {session.ingestUrl ? (
                <code className="mt-3 block break-all rounded-xl bg-raised px-3 py-2 text-xs">
                  {session.ingestUrl}
                </code>
              ) : null}
            </div>
          ) : (
            <BidPanel
              auctionId={auction.id}
              sellerId={session.host.id}
              price={price}
              minNextBid={live.minNextBid}
              increment={auction.minIncrement}
              endsAt={live.endsAt}
              status={live.status}
              leaderId={live.leaderId}
              hasReserve={auction.hasReserve}
              reserveMet={live.reserveMet}
            />
          )}

          <section className="card flex h-[26rem] flex-col p-4">
            <h2 className="mb-2 font-display font-semibold">Live chat</h2>

            <div className="rail flex-1 space-y-3 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <p className="hint py-6 text-center">Quiet so far. Say hello.</p>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className="flex gap-2.5 text-sm">
                    <Avatar src={message.user.avatarUrl} name={message.user.displayName} size={26} />
                    <div className="min-w-0">
                      <p className="hint">
                        @{message.user.username} · {timeAgo(message.createdAt)}
                      </p>
                      <p className="break-words">{message.body}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {chatNote ? <p className="hint mt-2 text-gold">{chatNote}</p> : null}

            {user ? (
              <form onSubmit={sendChat} className="mt-3 flex gap-2">
                <input
                  className="field"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Say something"
                  maxLength={240}
                  aria-label="Chat message"
                />
                <button type="submit" className="btn-primary shrink-0 px-3" aria-label="Send message">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <p className="hint mt-3">
                <Link to="/login" className="text-bid">Sign in</Link> to join the chat.
              </p>
            )}
          </section>

          <p className="hint">
            Streaming provider: <span className="font-medium">{session.streamProvider ?? 'mock'}</span>.
            Bids, chat and counts are real; video is not until a provider is connected.
          </p>
        </div>
      </div>
    </div>
  );
}
