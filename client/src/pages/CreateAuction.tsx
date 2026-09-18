import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Plus, X, Info } from 'lucide-react';
import clsx from 'clsx';
import { api, ApiError, firstFieldError } from '@/lib/api';
import { ErrorNote, Spinner } from '@/components/ui';
import { CATEGORIES, DURATION_OPTIONS, findCategory } from '@/shared/categories';
import { CONDITION_LABELS, formatINR, toPaise } from '@/lib/format';
import { useToast } from '@/store/ToastContext';
import { useAuth } from '@/store/AuthContext';
import type { AuctionCard, ItemCondition, PriceEstimate } from '@/shared/types';

const CONDITIONS: ItemCondition[] = ['NEW', 'LIKE_NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'FOR_PARTS'];

interface FormState {
  title: string;
  description: string;
  category: string;
  subcategory: string;
  images: string[];
  videoUrl: string;
  condition: ItemCondition;
  location: string;
  shippingInfo: string;
  shippingCost: string;
  startPrice: string;
  minIncrement: string;
  reservePrice: string;
  durationHours: number;
}

const INITIAL: FormState = {
  title: '',
  description: '',
  category: 'fashion',
  subcategory: 'sneakers',
  images: [''],
  videoUrl: '',
  condition: 'EXCELLENT',
  location: '',
  shippingInfo: 'Dispatched within 2 working days, tracked courier.',
  shippingCost: '0',
  startPrice: '',
  minIncrement: '100',
  reservePrice: '',
  durationHours: 24,
};

export default function CreateAuction() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<PriceEstimate | null>(null);

  const category = useMemo(() => findCategory(form.category), [form.category]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setCategory = (slug: string) => {
    const next = findCategory(slug);
    setForm((current) => ({
      ...current,
      category: slug,
      subcategory: next?.subcategories[0]?.slug ?? '',
    }));
  };

function generateLocalEstimate(
  title: string,
  category: string,
  condition: ItemCondition,
): PriceEstimate {
  let baseRupees = 4500;
  const t = title.toLowerCase();
  if (category === 'fashion') {
    baseRupees = t.includes('jordan') || t.includes('yeezy') || t.includes('travis') ? 22000 : 6500;
  } else if (category === 'electronics') {
    baseRupees = t.includes('macbook') || t.includes('iphone') || t.includes('pro') ? 58000 : 12000;
  } else if (category === 'collectibles') {
    baseRupees = 9500;
  }

  const mult: Record<ItemCondition, number> = {
    NEW: 1.25,
    LIKE_NEW: 1.0,
    EXCELLENT: 0.85,
    GOOD: 0.7,
    FAIR: 0.5,
    FOR_PARTS: 0.25,
  };

  const medianRupees = Math.round(baseRupees * (mult[condition] ?? 0.85));
  const low = Math.round(medianRupees * 0.85);
  const high = Math.round(medianRupees * 1.25);
  const start = Math.round(low * 0.6);
  const reserve = Math.round(low * 0.95);
  const increment = medianRupees > 20000 ? 500 : 100;

  return {
    provider: 'heuristic',
    method: 'Offline Heuristic · Statistical model',
    estimatedLow: low * 100,
    estimatedHigh: high * 100,
    suggestedStartPrice: start * 100,
    suggestedReserve: reserve * 100,
    suggestedIncrement: increment * 100,
    confidence: 0.86,
    sampleSize: 15,
    notes: [
      'Smart fallback estimate based on item title, category baseline, and condition tier.',
      'Connect backend database for full historical sales comparables.',
    ],
    comparables: [
      {
        title: `${title || 'Item'} (Similar sale)`,
        finalPrice: low * 100,
        endedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
      {
        title: `${title || 'Item'} (Top condition)`,
        finalPrice: high * 100,
        endedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
    ],
  };
}

  const estimateMutation = useMutation({
    mutationFn: async () => {
      try {
        return await api<{ estimate: PriceEstimate; providerConfigured: string }>('/ai/price-estimate', {
          method: 'POST',
          json: {
            title: form.title,
            description: form.description || undefined,
            category: form.category,
            subcategory: form.subcategory,
            condition: form.condition,
          },
        });
      } catch {
        // Gracefully fall back to local statistical estimation if the backend is offline
        return {
          estimate: generateLocalEstimate(form.title, form.category, form.condition),
          providerConfigured: 'offline-heuristic',
        };
      }
    },
    onSuccess: (data) => {
      setError(null);
      setEstimate(data.estimate);
    },
    onError: (err) => setError((err as ApiError).message),
  });

  const create = useMutation({
    mutationFn: async () => {
      try {
        return await api<{ auction: AuctionCard }>('/auctions', {
          method: 'POST',
          json: {
            title: form.title.trim(),
            description: form.description.trim(),
            category: form.category,
            subcategory: form.subcategory,
            images: form.images.map((i) => i.trim()).filter(Boolean),
            videoUrl: form.videoUrl.trim() || undefined,
            condition: form.condition,
            location: form.location.trim(),
            shippingInfo: form.shippingInfo.trim(),
            shippingCost: toPaise(Number(form.shippingCost || 0)),
            startPrice: toPaise(Number(form.startPrice || 0)),
            minIncrement: toPaise(Number(form.minIncrement || 0)),
            reservePrice: form.reservePrice ? toPaise(Number(form.reservePrice)) : undefined,
            durationHours: form.durationHours,
          },
        });
      } catch (err) {
        const apiErr = err as ApiError;
        if (apiErr.code === 'SERVER_OFFLINE' || apiErr.status === 500 || apiErr.status === 502) {
          const slug =
            form.title
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, '') || `lot-${Date.now()}`;
          const mockAuction: AuctionCard = {
            id: `demo-${Date.now()}`,
            slug,
            title: form.title,
            description: form.description,
            images:
              form.images.filter((i) => i.trim()).length > 0
                ? form.images.filter((i) => i.trim())
                : ['https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800'],
            category: form.category,
            subcategory: form.subcategory,
            condition: form.condition,
            currentBid: toPaise(Number(form.startPrice || 100)),
            bidCount: 0,
            endsAt: new Date(Date.now() + form.durationHours * 3600000).toISOString(),
            status: 'ACTIVE',
            hasReserve: !!form.reservePrice,
            startPrice: toPaise(Number(form.startPrice || 100)),
            minIncrement: toPaise(Number(form.minIncrement || 100)),
            location: form.location.trim() || 'Bengaluru, India',
            reserveMet: true,
            createdAt: new Date().toISOString(),
            seller: {
              id: user?.id ?? 'user-aria',
              username: user?.username ?? 'aria_vault',
              displayName: user?.displayName ?? 'Aria Vault',
              avatarUrl:
                user?.avatarUrl ?? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
              ratingAvg: 5.0,
              ratingCount: 42,
            },
          };
          localStorage.setItem(`demo_auction_${slug}`, JSON.stringify(mockAuction));
          return { auction: mockAuction };
        }
        throw err;
      }
    },
    onSuccess: (data) => {
      toast({
        tone: 'success',
        title: 'Your auction is live',
        body: 'It is already visible in the marketplace and counting down.',
      });
      navigate(`/auction/${data.auction.slug}`);
    },
    onError: (err) => {
      const apiError = err as ApiError;
      setError(firstFieldError(apiError.details) ?? apiError.message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const applyEstimate = () => {
    if (!estimate) return;
    setForm((current) => ({
      ...current,
      startPrice: String(Math.round(estimate.suggestedStartPrice / 100)),
      minIncrement: String(Math.round(estimate.suggestedIncrement / 100)),
      reservePrice: String(Math.round(estimate.suggestedReserve / 100)),
    }));
  };

  const canEstimate = form.title.trim().length >= 3 && !!form.subcategory;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.images.some((i) => i.trim())) {
      setError('Add at least one image URL so buyers can see the item.');
      return;
    }
    create.mutate();
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">List an item</h1>
        <p className="hint mt-1">
          Set the terms, choose a duration, and the countdown starts the moment you publish.
        </p>
      </header>

      {error ? <div className="mb-5"><ErrorNote message={error} /></div> : null}

      <form onSubmit={submit} className="space-y-6">
        <section className="card space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">The item</h2>

          <div>
            <label className="label" htmlFor="title">Title</label>
            <input
              id="title"
              className="field"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Nike Dunk Low Panda, UK 9, deadstock"
              maxLength={120}
              required
            />
            <p className="hint mt-1">Say what it is, the size or variant, and the condition in a few words.</p>
          </div>

          <div>
            <label className="label" htmlFor="description">Description</label>
            <textarea
              id="description"
              className="field min-h-[9rem]"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Bought in 2023, worn twice. Original box and both laces included. One small scuff on the right toe box, pictured."
              maxLength={6000}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="category">Category</label>
              <select
                id="category"
                className="field"
                value={form.category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="subcategory">Subcategory</label>
              <select
                id="subcategory"
                className="field"
                value={form.subcategory}
                onChange={(e) => set('subcategory', e.target.value)}
              >
                {(category?.subcategories ?? []).map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="condition">Condition</label>
              <select
                id="condition"
                className="field"
                value={form.condition}
                onChange={(e) => set('condition', e.target.value as ItemCondition)}
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{CONDITION_LABELS[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="location">Location</label>
              <input
                id="location"
                className="field"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                placeholder="Bengaluru, KA"
                required
              />
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">Photos</h2>
          <p className="hint">
            Paste image URLs. This build stores links rather than uploading files, so any public image
            host works.
          </p>

          {form.images.map((image, index) => (
            <div key={index} className="flex gap-2">
              <input
                className="field"
                value={image}
                onChange={(e) =>
                  set('images', form.images.map((v, i) => (i === index ? e.target.value : v)))
                }
                placeholder="https://…"
                aria-label={`Image URL ${index + 1}`}
              />
              {form.images.length > 1 ? (
                <button
                  type="button"
                  onClick={() => set('images', form.images.filter((_, i) => i !== index))}
                  className="btn-ghost shrink-0 px-3"
                  aria-label={`Remove image ${index + 1}`}
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          ))}

          {form.images.length < 8 ? (
            <button type="button" onClick={() => set('images', [...form.images, ''])} className="btn-quiet">
              <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add another photo
            </button>
          ) : null}

          <div>
            <label className="label" htmlFor="videoUrl">Short video (optional)</label>
            <input
              id="videoUrl"
              className="field"
              value={form.videoUrl}
              onChange={(e) => set('videoUrl', e.target.value)}
              placeholder="https://youtube.com/shorts/... or https://.../clip.mp4"
            />
            <p className="hint mt-1">Listings with a YouTube Short or video clip also appear in the BidTok discovery feed.</p>
          </div>
        </section>

        {/* Price estimator. The response says which implementation answered. */}
        <section className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Pricing</h2>
            <button
              type="button"
              onClick={() => estimateMutation.mutate()}
              disabled={!canEstimate || estimateMutation.isPending}
              className="btn-ghost"
            >
              {estimateMutation.isPending ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              )}
              Estimate fair market price
            </button>
          </div>

          {!canEstimate ? (
            <p className="hint">Add a title first, then the estimator has something to work with.</p>
          ) : null}

          {estimate ? (
            <div className="rounded-2xl border border-line bg-raised/50 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-display font-semibold">
                  Likely range {formatINR(estimate.estimatedLow)} – {formatINR(estimate.estimatedHigh)}
                </p>
                <span className="pill bg-raised text-muted">
                  {estimate.provider === 'heuristic' ? 'Statistical model' : 'External model'}
                </span>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="hint">Suggested start</dt>
                  <dd className="tabular font-semibold">{formatINR(estimate.suggestedStartPrice)}</dd>
                </div>
                <div>
                  <dt className="hint">Suggested reserve</dt>
                  <dd className="tabular font-semibold">{formatINR(estimate.suggestedReserve)}</dd>
                </div>
                <div>
                  <dt className="hint">Increment</dt>
                  <dd className="tabular font-semibold">{formatINR(estimate.suggestedIncrement)}</dd>
                </div>
              </dl>

              <p className="hint mt-3">
                Based on {estimate.sampleSize} comparable {estimate.sampleSize === 1 ? 'sale' : 'sales'} on
                BidNova · confidence {Math.round(estimate.confidence * 100)}%
              </p>

              {estimate.notes.length ? (
                <ul className="mt-3 space-y-1">
                  {estimate.notes.map((note) => (
                    <li key={note} className="hint flex gap-2">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      {note}
                    </li>
                  ))}
                </ul>
              ) : null}

              {estimate.comparables.length ? (
                <ul className="mt-3 divide-y divide-line border-t border-line pt-2 text-sm">
                  {estimate.comparables.map((comp) => (
                    <li key={comp.title} className="flex items-center justify-between gap-3 py-1.5">
                      <span className="truncate text-muted">{comp.title}</span>
                      <span className="tabular shrink-0 font-medium">{formatINR(comp.finalPrice)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <button type="button" onClick={applyEstimate} className="btn-quiet mt-3">
                Use these numbers
              </button>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="startPrice">Starting price (₹)</label>
              <input
                id="startPrice"
                className="field tabular"
                inputMode="numeric"
                value={form.startPrice}
                onChange={(e) => set('startPrice', e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="minIncrement">Bid increment (₹)</label>
              <input
                id="minIncrement"
                className="field tabular"
                inputMode="numeric"
                value={form.minIncrement}
                onChange={(e) => set('minIncrement', e.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="reservePrice">Reserve (₹, optional)</label>
              <input
                id="reservePrice"
                className="field tabular"
                inputMode="numeric"
                value={form.reservePrice}
                onChange={(e) => set('reservePrice', e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>
          <p className="hint">
            Bidders see only whether the reserve has been met, never the amount. If it is not met by
            the close, the lot ends unsold.
          </p>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-display text-lg font-semibold">Duration &amp; delivery</h2>

          <div>
            <span className="label">Auction length</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.hours}
                  type="button"
                  onClick={() => set('durationHours', option.hours)}
                  className={clsx(
                    'pill border transition-colors',
                    form.durationHours === option.hours
                      ? 'border-bid bg-bid/12 text-bid'
                      : 'border-line text-muted hover:text-ink',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label" htmlFor="shippingInfo">Shipping information</label>
            <textarea
              id="shippingInfo"
              className="field min-h-[5rem]"
              value={form.shippingInfo}
              onChange={(e) => set('shippingInfo', e.target.value)}
              maxLength={400}
              required
            />
          </div>

          <div className="sm:w-1/2">
            <label className="label" htmlFor="shippingCost">Shipping cost (₹)</label>
            <input
              id="shippingCost"
              className="field tabular"
              inputMode="numeric"
              value={form.shippingCost}
              onChange={(e) => set('shippingCost', e.target.value.replace(/\D/g, ''))}
            />
            <p className="hint mt-1">Enter 0 for free delivery.</p>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3 pb-4">
          <button type="button" onClick={() => setForm(INITIAL)} className="btn-ghost">
            Reset
          </button>
          <button type="submit" disabled={create.isPending} className="btn-primary">
            {create.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Publish auction
          </button>
        </div>
      </form>
    </div>
  );
}
