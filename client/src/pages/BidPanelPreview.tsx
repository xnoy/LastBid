import { useState } from 'react';
import { BidPanel } from '@/components/BidPanel';
import { useAuth } from '@/store/AuthContext';
import { Sparkles, Trophy, Zap, Volume2, ShieldCheck, Flame } from 'lucide-react';
import { formatINR } from '@/lib/format';

export default function BidPanelPreview() {
  const { user, updateUser, signOut } = useAuth();

  const [price, setPrice] = useState(8500000); // 85,000 INR (in paise)
  const [minNextBid, setMinNextBid] = useState(8700000); // 87,000 INR
  const [increment] = useState(200000); // 2,000 INR
  const [status, setStatus] = useState<'ACTIVE' | 'ENDED'>('ACTIVE');
  const [reserveMet, setReserveMet] = useState(true);
  const [isWinning, setIsWinning] = useState(true);

  const mockBuyerId = 'user-buyer-123';
  const mockSellerId = 'user-seller-999';

  const setAsBuyer = () => {
    updateUser({
      id: mockBuyerId,
      username: 'hypebeast_99',
      displayName: 'Devika B',
      email: 'devika_b@bidnova.test',
      role: 'USER',
      ratingAvg: 4.9,
      ratingCount: 18,
    });
  };

  const setAsSeller = () => {
    updateUser({
      id: mockSellerId,
      username: 'aria_vault',
      displayName: 'Aria Vault',
      email: 'aria_vault@bidnova.test',
      role: 'USER',
      ratingAvg: 5.0,
      ratingCount: 42,
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 rounded-2xl border border-bid/20 bg-gradient-to-r from-bid/10 via-surface to-urgent/10 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-bid/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-bid">
              <Sparkles className="h-3.5 w-3.5" /> Interactive Test Lab
            </span>
            <h1 className="font-display mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              BidPanel Gen Z Theme Playground
            </h1>
            <p className="hint mt-1 text-sm">
              Toggle states below to test all Gen Z hype banners, sounds, modes, and reactions in real time.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-surface p-2 border border-line text-xs font-medium">
            <Volume2 className="h-4 w-4 text-win" />
            <span>Web Audio SFX Ready</span>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
        {/* Controls Column */}
        <div className="space-y-6">
          <div className="card space-y-4 p-5">
            <h2 className="font-display flex items-center gap-2 text-base font-bold">
              <Zap className="h-4 w-4 text-bid" /> Simulation Controls
            </h2>

            {/* Auth Simulator */}
            <div>
              <label className="label text-xs uppercase tracking-wider text-muted">User Account State</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={setAsBuyer}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                    user?.id === mockBuyerId ? 'border-bid bg-bid/10 font-bold text-bid' : 'border-line hover:bg-raised'
                  }`}
                >
                  <p className="font-semibold">Buyer (Logged In)</p>
                  <p className="text-[11px] text-muted">@hypebeast_99</p>
                </button>
                <button
                  type="button"
                  onClick={setAsSeller}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                    user?.id === mockSellerId ? 'border-gold bg-gold/10 font-bold text-gold' : 'border-line hover:bg-raised'
                  }`}
                >
                  <p className="font-semibold">Seller View</p>
                  <p className="text-[11px] text-muted">@aria_vault</p>
                </button>
                <button
                  type="button"
                  onClick={() => signOut()}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                    !user ? 'border-urgent bg-urgent/10 font-bold text-urgent' : 'border-line hover:bg-raised'
                  }`}
                >
                  <p className="font-semibold">Logged Out</p>
                  <p className="text-[11px] text-muted">Guest view</p>
                </button>
              </div>
            </div>

            {/* Bidding & Winning Status */}
            <div>
              <label className="label text-xs uppercase tracking-wider text-muted">Leading Status</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsWinning(true)}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                    isWinning ? 'border-win bg-win/10 font-bold text-win' : 'border-line hover:bg-raised'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5" /> You're Him rn (Leading)
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsWinning(false)}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                    !isWinning ? 'border-urgent bg-urgent/10 font-bold text-urgent' : 'border-line hover:bg-raised'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5" /> Someone Outbid You
                  </span>
                </button>
              </div>
            </div>

            {/* Auction Status */}
            <div>
              <label className="label text-xs uppercase tracking-wider text-muted">Auction State</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('ACTIVE')}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                    status === 'ACTIVE' ? 'border-bid bg-bid/10 font-bold text-bid' : 'border-line hover:bg-raised'
                  }`}
                >
                  ACTIVE (Live Bidding)
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('ENDED')}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                    status === 'ENDED' ? 'border-line bg-raised font-bold text-ink' : 'border-line hover:bg-raised'
                  }`}
                >
                  ENDED (Drop Concluded)
                </button>
              </div>
            </div>

            {/* Reserve State */}
            <div>
              <label className="label text-xs uppercase tracking-wider text-muted">Reserve Status</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setReserveMet(true)}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                    reserveMet ? 'border-win bg-win/10 font-bold text-win' : 'border-line hover:bg-raised'
                  }`}
                >
                  Reserve Met (CLEARED 🔓)
                </button>
                <button
                  type="button"
                  onClick={() => setReserveMet(false)}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                    !reserveMet ? 'border-urgent bg-urgent/10 font-bold text-urgent' : 'border-line hover:bg-raised'
                  }`}
                >
                  Reserve Not Met (LOCKED 🔒)
                </button>
              </div>
            </div>

            {/* Price Bump Simulator */}
            <div>
              <label className="label text-xs uppercase tracking-wider text-muted">Simulate Price Movement</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPrice((p) => p + increment);
                    setMinNextBid((m) => m + increment);
                  }}
                  className="btn-ghost flex-1 text-xs"
                >
                  +1 Bid Step (+{formatINR(increment)})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrice(8500000);
                    setMinNextBid(8700000);
                  }}
                  className="btn-ghost text-xs"
                >
                  Reset Price
                </button>
              </div>
            </div>
          </div>

          {/* Guide Card */}
          <div className="card space-y-3 p-5 text-sm">
            <h3 className="font-display flex items-center gap-2 font-bold">
              <ShieldCheck className="h-4 w-4 text-win" /> Testing Checklist
            </h3>
            <ul className="space-y-2 text-muted text-xs leading-relaxed">
              <li>• <strong>Click the SFX icon</strong> in the top-right of the panel to test mute/unmute persistence.</li>
              <li>• <strong>Click Quick Amount Chips</strong> to feel the tactile spring animation and pop sound.</li>
              <li>• <strong>Switch between One-Tap and Auto-Pilot</strong> to hear the harmonic shift sound.</li>
              <li>• <strong>Click "Send It 🚀"</strong> to test live validation feedback and success toasts.</li>
              <li>• <strong>Toggle Leading Status</strong> to view the W in the chat 👑 banner vs Outbid warning 💀.</li>
            </ul>
          </div>
        </div>

        {/* Preview Panel Column */}
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-surface p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">Simulated Drop</span>
            <h3 className="font-display mt-1 text-lg font-bold">
              Travis Scott x Air Jordan 1 Low 'Reverse Mocha' 🔥
            </h3>
            <div className="mt-2 flex items-baseline justify-between border-t border-line/60 pt-2">
              <span className="text-xs text-muted">Current Live Price</span>
              <span className="tabular font-display text-xl font-bold text-ink">
                {formatINR(price)}
              </span>
            </div>
          </div>

          {/* The Live Gen Z Themed BidPanel */}
          <BidPanel
            auctionId="test-auction-uuid"
            sellerId={mockSellerId}
            price={price}
            minNextBid={minNextBid}
            increment={increment}
            endsAt={Date.now() + 3600000}
            status={status}
            leaderId={isWinning && user ? user.id : 'other-user-winner'}
            hasReserve={true}
            reserveMet={reserveMet}
          />
        </div>
      </div>
    </div>
  );
}
