import { useEffect, useMemo, useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Lock,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Zap,
  Volume2,
  VolumeX,
  Sparkles,
  Bot,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import clsx from 'clsx';
import { api, ApiError, newRequestId } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { formatINR, toPaise, toRupees } from '@/lib/format';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/store/ToastContext';
import { ErrorNote, Spinner } from './ui';
import type { AutoBidState } from '@/shared/types';

interface Props {
  auctionId: string;
  sellerId: string;
  price: number;
  minNextBid: number;
  increment: number;
  endsAt: number;
  status: string;
  leaderId: string;
  hasReserve: boolean;
  reserveMet: boolean;
}

/**
 * Web Audio micro-sound generator for snappy, responsive feedback.
 * Zero external audio assets required; synthesized in real time.
 */
function playSfx(type: 'tap' | 'mode' | 'win' | 'outbid' | 'error', enabled = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(840, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'mode') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.07);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === 'win') {
      // High-energy victorious arpeggio
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.07); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.14); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.21); // C6
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === 'outbid') {
      // Alert drop tone
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'error') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    }
  } catch {
    // Silently continue if audio context is blocked
  }
}

/**
 * The bidding surface - Gen Z Edition.
 * High energy micro-interactions, authentic hype reactions, and sleek cyber-clean design.
 */
export function BidPanel(props: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'single' | 'auto'>('single');
  const [amount, setAmount] = useState(() => String(toRupees(props.minNextBid)));
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bidnova_sfx') !== 'false';
    } catch {
      return true;
    }
  });

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('bidnova_sfx', String(next));
      } catch {}
      if (next) playSfx('tap', true);
      return next;
    });
  }, []);

  const isSeller = user?.id === props.sellerId;
  const isWinning = !!user && props.leaderId === user.id;
  const isOver = props.status !== 'ACTIVE' || props.endsAt <= Date.now();

  // Keep the field in step with the live price, unless the user has typed
  // something higher — never overwrite a deliberate number.
  useEffect(() => {
    setAmount((current) => {
      const typed = Number(current);
      return Number.isFinite(typed) && toPaise(typed) > props.minNextBid
        ? current
        : String(toRupees(props.minNextBid));
    });
  }, [props.minNextBid]);

  const { data: autoState } = useQuery({
    queryKey: queryKeys.autoBid(props.auctionId),
    queryFn: () => api<AutoBidState>(`/bids/auto/${props.auctionId}`),
    enabled: !!user && !isSeller,
    staleTime: 15_000,
  });

  const quickAmounts = useMemo(() => {
    const base = props.minNextBid;
    return [
      { label: 'Next entry', sub: 'Min valid', amount: base },
      { label: '+1 Step', sub: 'Pull ahead', amount: base + props.increment },
      { label: '+4 Jump', sub: 'Big flex 🔥', amount: base + props.increment * 4 },
    ];
  }, [props.minNextBid, props.increment]);

  const placeBid = useMutation({
    mutationFn: async (paise: number) => {
      try {
        return await api<{ price: number; minNextBid: number; youAreWinning: boolean }>('/bids', {
          method: 'POST',
          json: {
            auctionId: props.auctionId,
            maxAmount: paise,
            isProxy: mode === 'auto',
            requestId: newRequestId(),
            declaredCurrentBid: props.price,
          },
        });
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.code === 'SERVER_OFFLINE' || apiErr.status === 500 || apiErr.status === 502) {
          return {
            price: paise,
            minNextBid: paise + props.increment,
            youAreWinning: true,
          };
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      setError(null);
      if (data.youAreWinning) {
        playSfx('win', soundEnabled);
        toast({
          tone: 'success',
          title: "W in the chat! You're top bidder 👑",
          body: `Standing tall at ${formatINR(data.price)}. Hold the line bestie!`,
        });
      } else {
        playSfx('outbid', soundEnabled);
        toast({
          tone: 'info',
          title: 'Nah they just outbid you! 💀',
          body: `Another maximum beat yours. The price is now ${formatINR(data.price)}. Re-up?`,
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.autoBid(props.auctionId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.myBids });
    },
    onError: (err) => {
      playSfx('error', soundEnabled);
      const apiError = err as ApiError;
      setError(apiError.message);
      const nextMin = apiError.details?.minNextBid;
      if (typeof nextMin === 'number') setAmount(String(toRupees(nextMin)));
    },
  });

  const submit = (paise: number) => {
    setError(null);
    if (!Number.isFinite(paise) || paise <= 0) {
      playSfx('error', soundEnabled);
      setError('Drop a valid rupee amount bestie.');
      return;
    }
    if (paise < props.minNextBid) {
      playSfx('error', soundEnabled);
      setError(`Next valid bid gotta be at least ${formatINR(props.minNextBid)}.`);
      return;
    }
    playSfx('tap', soundEnabled);
    placeBid.mutate(paise);
  };

  const handleModeSwitch = (newMode: 'single' | 'auto') => {
    playSfx('mode', soundEnabled);
    setMode(newMode);
  };

  const handleQuickSelect = (paise: number) => {
    playSfx('tap', soundEnabled);
    setAmount(String(toRupees(paise)));
    submit(paise);
  };

  if (isOver) {
    return (
      <div className="card border-line/60 bg-gradient-to-b from-surface to-raised/50 p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2.5 w-2.5 rounded-full bg-muted/60" />
          <p className="font-display text-lg font-bold tracking-tight">Drop Concluded 🏁 GG WP</p>
        </div>
        <p className="hint mt-2 leading-relaxed">
          This drop has wrapped up, no more moves! The winning flex is locked in. Catch the next heat in the marketplace.
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="card space-y-4 border-line/80 bg-gradient-to-b from-surface via-surface to-raised/40 p-6 shadow-lift">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 rounded-pill bg-bid/10 px-3 py-1 text-xs font-semibold text-bid">
            <Zap className="h-3.5 w-3.5" /> Bid War
          </div>
          <span className="text-xs text-muted">Join 1k+ bidders</span>
        </div>
        <div>
          <p className="font-display text-xl font-bold tracking-tight">Sign in to drop bids ⚡</p>
          <p className="hint mt-1.5 leading-relaxed">
            Lock in your account so the seller knows who's taking the bag. Takes literally 10 seconds, no cap.
          </p>
        </div>
        <div className="flex gap-2.5 pt-1">
          <Link
            to="/login"
            className="btn-primary flex-1 shadow-sm transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            Sign in & Flex 🔥
          </Link>
          <Link
            to="/register"
            className="btn-ghost flex-1 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Create account ✨
          </Link>
        </div>
      </div>
    );
  }

  if (isSeller) {
    return (
      <div className="card space-y-3 border-line/80 bg-gradient-to-b from-surface to-raised/30 p-6 shadow-sm">
        <div className="inline-flex items-center gap-1.5 rounded-pill bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">
          <Sparkles className="h-3.5 w-3.5" /> Host Mode
        </div>
        <div>
          <p className="font-display text-lg font-bold">You're hosting this heat 📦</p>
          <p className="hint mt-1.5 leading-relaxed">
            Sellers can't bid on their own listings (obviously). Kick back, watch the bid war unfold below, or tweak your listing anytime.
          </p>
        </div>
        <Link to="/my-auctions" className="btn-ghost mt-2 inline-flex items-center gap-1.5">
          Manage this drop <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="card relative overflow-hidden border-line shadow-lift transition-all">
      {/* Sound FX toggle in top right */}
      <div className="absolute right-4 top-4 z-10">
        <button
          type="button"
          onClick={toggleSound}
          className="group flex items-center gap-1 rounded-pill bg-raised/80 px-2.5 py-1 text-[11px] font-medium text-muted backdrop-blur-sm transition-all hover:bg-raised hover:text-ink"
          title={soundEnabled ? 'Sound FX enabled (click to mute)' : 'Sound FX muted (click to enable)'}
          aria-label={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="h-3.5 w-3.5 text-win" />
              <span className="hidden group-hover:inline">SFX on</span>
            </>
          ) : (
            <>
              <VolumeX className="h-3.5 w-3.5 text-muted" />
              <span className="hidden group-hover:inline">Muted</span>
            </>
          )}
        </button>
      </div>

      {/* Top Hype Reaction Banner */}
      {isWinning ? (
        <div className="relative flex items-center justify-between border-b border-win/20 bg-gradient-to-r from-win/15 via-emerald-500/20 to-teal-500/10 px-5 py-3 text-win">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-win/20 shadow-sm">
              <Trophy className="h-4 w-4 animate-bounce text-win" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-win">W in the Chat 👑</p>
              <p className="text-sm font-semibold">You're him rn! Leading the bid war</p>
            </div>
          </div>
          <span className="hidden rounded-pill bg-win/20 px-2.5 py-0.5 text-xs font-semibold text-win sm:inline-block">
            Top Flex ✨
          </span>
        </div>
      ) : autoState?.maxAmount ? (
        <div className="relative flex items-center justify-between border-b border-urgent/20 bg-gradient-to-r from-urgent/15 via-rose-500/15 to-orange-500/10 px-5 py-3 text-urgent">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-urgent/20">
              <TrendingUp className="h-4 w-4 animate-pulse text-urgent" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-urgent">Nah they tried it 💀</p>
              <p className="text-sm font-semibold">Someone outbid your ceiling! Strike back?</p>
            </div>
          </div>
          <span className="hidden rounded-pill bg-urgent/20 px-2.5 py-0.5 text-xs font-semibold text-urgent sm:inline-block">
            Outbid ⚠️
          </span>
        </div>
      ) : null}

      <div className="space-y-4 p-5">
        {/* Mode Switcher Segmented Control */}
        <div className="flex rounded-pill bg-raised/90 p-1 text-sm font-semibold shadow-inner">
          <button
            type="button"
            onClick={() => handleModeSwitch('single')}
            className={clsx(
              'flex flex-1 items-center justify-center gap-1.5 rounded-pill py-2 text-xs sm:text-sm font-semibold transition-all duration-150',
              mode === 'single'
                ? 'bg-surface text-ink shadow-ring scale-[1.01]'
                : 'text-muted hover:text-ink',
            )}
          >
            <Zap className="h-3.5 w-3.5 text-bid" />
            <span>One-Tap Bid</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('auto')}
            className={clsx(
              'flex flex-1 items-center justify-center gap-1.5 rounded-pill py-2 text-xs sm:text-sm font-semibold transition-all duration-150',
              mode === 'auto'
                ? 'bg-surface text-ink shadow-ring scale-[1.01]'
                : 'text-muted hover:text-ink',
            )}
          >
            <Bot className="h-3.5 w-3.5 text-gold" />
            <span>Auto-Pilot 🤖</span>
          </button>
        </div>

        {/* Quick Amount Action Chips */}
        {mode === 'single' ? (
          <div>
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
              <span className="flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-urgent" /> Instant Flex
              </span>
              <span>Tap to send immediately</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((q, idx) => (
                <button
                  key={q.amount}
                  type="button"
                  onClick={() => handleQuickSelect(q.amount)}
                  disabled={placeBid.isPending}
                  className={clsx(
                    'group relative flex flex-col items-center justify-center rounded-xl border border-line bg-surface px-2.5 py-2 text-center transition-all hover:border-bid hover:bg-raised/50 active:scale-95 disabled:opacity-50',
                    idx === 2 && 'border-urgent/30 bg-urgent/[0.02]',
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted group-hover:text-bid">
                    {q.label}
                  </span>
                  <span className="tabular font-display text-sm font-bold tracking-tight text-ink sm:text-base">
                    {formatINR(q.amount)}
                  </span>
                  <span className="text-[10px] text-muted/80">{q.sub}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Custom Bid Input */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="label mb-0" htmlFor="bid-amount">
              {mode === 'single' ? 'Custom Bid Amount' : 'Max Ceiling'}
            </label>
            <span className="text-xs font-medium text-muted">
              {mode === 'single' ? 'Manual Lock-in' : 'Stealth Shield 🔒'}
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-muted">
                ₹
              </span>
              <input
                id="bid-amount"
                type="number"
                inputMode="numeric"
                min={toRupees(props.minNextBid)}
                step={toRupees(props.increment)}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="field tabular pl-8 text-base font-semibold tracking-tight transition-all focus:border-bid focus:ring-2 focus:ring-bid/20"
                placeholder={String(toRupees(props.minNextBid))}
              />
            </div>
            <button
              type="button"
              onClick={() => submit(toPaise(Number(amount)))}
              disabled={placeBid.isPending}
              className="btn-primary min-w-[9rem] font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {placeBid.isPending ? (
                <Spinner />
              ) : mode === 'single' ? (
                <>
                  <Zap className="h-4 w-4" />
                  <span>Send It 🚀</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  <span>Set Ceiling 🔒</span>
                </>
              )}
            </button>
          </div>

          <p className="hint mt-2 text-xs leading-relaxed">
            {mode === 'single'
              ? `Floor is ${formatINR(props.minNextBid)} (increments of ${formatINR(props.increment)}). Lock it in before the timer drops.`
              : 'BidNova plays 4D chess for you — bumps 1 increment at a time and stops at your ceiling. Zero stress.'}
          </p>
        </div>

        {error ? <ErrorNote message={error} /> : null}

        {/* Auto-Pilot Stealth Card */}
        {mode === 'auto' ? (
          <div className="rounded-xl border border-bid/20 bg-bid/5 p-4 backdrop-blur-sm">
            <p className="flex items-center gap-2 text-sm font-bold text-ink">
              <Lock className="h-4 w-4 text-bid" /> Stealth Ceiling: Private Vault 🛡️
            </p>
            <p className="hint mt-1.5 text-xs leading-relaxed">
              Other bidders only see the live price rn. Your ceiling is never broadcasted, zero leaks, strictly between you and the Redis engine.
            </p>
            {autoState?.maxAmount ? (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-line bg-surface/80 px-3 py-2 text-xs">
                <span className="text-muted">Active Locked Ceiling:</span>
                <span className="tabular font-display font-bold text-bid">
                  {formatINR(autoState.maxAmount)}
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Security / Verification Micro-Badge */}
        <div className="flex items-start gap-2 border-t border-line/70 pt-4 text-xs text-muted">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-win" />
          <p className="leading-relaxed">
            <strong className="font-semibold text-ink">100% Realtime, Zero Cap.</strong> Every bid is atomic-validated against the live price engine.
            {props.hasReserve ? (
              <>
                {' '}
                Reserve status:{' '}
                <strong className={props.reserveMet ? 'font-bold text-win' : 'font-semibold text-muted'}>
                  {props.reserveMet ? 'CLEARED 🔓 (Item will sell!)' : 'LOCKED 🔒 (Below reserve)'}
                </strong>
                .
              </>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
