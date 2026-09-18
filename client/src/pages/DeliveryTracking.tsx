import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Truck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { OrderTimeline } from '@/components/OrderTimeline';
import { ErrorNote, Skeleton, Spinner } from '@/components/ui';
import { formatDate, formatINR } from '@/lib/format';
import { useAuth } from '@/store/AuthContext';
import { useToast } from '@/store/ToastContext';
import type { Order } from '@/shared/types';

export default function DeliveryTracking() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => api<{ order: Order }>(`/orders/${id}`),
  });

  const order = data?.order;
  const isSeller = !!user && order?.seller?.username === user.username;

  const advance = useMutation({
    mutationFn: () =>
      api<{ order: Order }>(`/orders/${id}/advance`, {
        method: 'POST',
        json: {
          courier: courier || undefined,
          trackingNumber: trackingNumber || undefined,
        },
      }),
    onSuccess: () => {
      setError(null);
      toast({ tone: 'success', title: 'Delivery updated', body: 'The buyer has been notified.' });
      void queryClient.invalidateQueries({ queryKey: queryKeys.order(id) });
    },
    onError: (err) => setError((err as ApiError).message),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Order not found</h1>
        <Link to="/orders" className="btn-primary mt-5">Back to orders</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <nav className="hint mb-4">
        <Link to="/orders" className="hover:text-ink">Orders</Link> / {order.reference}
      </nav>

      <header className="card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <img src={order.auction.images[0]} alt="" className="h-20 w-20 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <Link
            to={`/auction/${order.auction.slug}`}
            className="block truncate font-display text-lg font-semibold hover:text-bid"
          >
            {order.auction.title}
          </Link>
          <p className="hint mt-0.5">
            Ordered {formatDate(order.createdAt)}
            {order.seller ? ` · sold by ${order.seller.displayName}` : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="hint">Total paid</p>
          <p className="tabular font-display text-xl font-semibold">{formatINR(order.total)}</p>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-[1fr_16rem]">
        <section className="card p-5">
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold">
            <Truck className="h-4 w-4 text-muted" aria-hidden /> Delivery progress
          </h2>
          <OrderTimeline status={order.status} events={order.events} />
        </section>

        <aside className="space-y-4">
          <div className="card space-y-2 p-5 text-sm">
            <h3 className="font-display font-semibold">Shipping to</h3>
            {order.shippingName ? (
              <address className="not-italic text-muted">
                {order.shippingName}<br />
                {order.shippingAddress}<br />
                {order.shippingCity} {order.shippingPostal}
              </address>
            ) : (
              <p className="hint">No address yet — the buyer has not completed checkout.</p>
            )}
          </div>

          <div className="card space-y-2 p-5 text-sm">
            <h3 className="font-display font-semibold">Courier</h3>
            {order.courier ? (
              <>
                <p className="text-muted">{order.courier}</p>
                {order.trackingNumber ? (
                  <p className="tabular text-muted">{order.trackingNumber}</p>
                ) : null}
              </>
            ) : (
              <p className="hint">Not dispatched yet.</p>
            )}
            {order.estimatedDelivery ? (
              <p className="hint">Estimated {formatDate(order.estimatedDelivery)}</p>
            ) : null}
          </div>

          <div className="card space-y-2 p-5 text-sm">
            <h3 className="font-display font-semibold">Amounts</h3>
            <div className="flex justify-between text-muted">
              <span>Item</span><span className="tabular">{formatINR(order.itemTotal)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Shipping</span>
              <span className="tabular">{order.shippingCost === 0 ? 'Free' : formatINR(order.shippingCost)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold">
              <span>Total</span><span className="tabular">{formatINR(order.total)}</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Seller controls: the timeline only ever moves forward, one step at a time. */}
      {isSeller && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' ? (
        <section className="card mt-6 space-y-4 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Package className="h-4 w-4 text-muted" aria-hidden /> Update this delivery
          </h2>

          {error ? <ErrorNote message={error} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="courier">Courier (optional)</label>
              <input
                id="courier"
                className="field"
                value={courier}
                onChange={(e) => setCourier(e.target.value)}
                placeholder="Delhivery"
              />
            </div>
            <div>
              <label className="label" htmlFor="tracking">Tracking number (optional)</label>
              <input
                id="tracking"
                className="field tabular"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          </div>

          <button onClick={() => advance.mutate()} disabled={advance.isPending} className="btn-primary">
            {advance.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
            Move to next stage
          </button>

          <p className="hint">
            Deliveries advance one stage at a time and never move backwards, so a repeated or forged
            request cannot walk a delivered parcel back to "shipped".
          </p>
        </section>
      ) : null}
    </div>
  );
}
