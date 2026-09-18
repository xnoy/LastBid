import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Lock } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { ErrorNote, Skeleton, Spinner } from '@/components/ui';
import { formatINR } from '@/lib/format';
import { useToast } from '@/store/ToastContext';
import type { Order } from '@/shared/types';

/**
 * Checkout.
 *
 * Payment goes through the provider abstraction on the server. The default
 * provider is a mock: it records the order as confirmed and charges nothing.
 * The notice below says exactly that rather than implying a real payment.
 */
export default function Checkout() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    shippingName: '',
    shippingAddress: '',
    shippingCity: '',
    shippingPostal: '',
    shippingPhone: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => api<{ order: Order }>(`/orders/${id}`),
  });

  const order = data?.order;

  const checkout = useMutation({
    mutationFn: () =>
      api<{ order: Order; payment: { charged: boolean; provider: string } }>(`/orders/${id}/checkout`, {
        method: 'POST',
        json: form,
      }),
    onSuccess: (result) => {
      toast({
        tone: 'success',
        title: 'Order confirmed',
        body: result.payment.charged
          ? 'Payment captured.'
          : 'No payment was taken — this build uses a mock payment provider.',
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.order(id) });
      navigate(`/orders/${id}`);
    },
    onError: (err) => setError((err as ApiError).message),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-72 w-full" />
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

  if (order.status !== 'PAYMENT_PENDING') {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">This order is already confirmed</h1>
        <p className="hint mt-2">You can follow its progress on the tracking page.</p>
        <Link to={`/orders/${order.id}`} className="btn-primary mt-5">Track delivery</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Checkout</h1>
      <p className="hint mt-1">Order {order.reference}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            checkout.mutate();
          }}
          className="card space-y-4 p-5"
        >
          <h2 className="font-display text-lg font-semibold">Delivery address</h2>

          {error ? <ErrorNote message={error} /> : null}

          <div>
            <label className="label" htmlFor="shippingName">Full name</label>
            <input
              id="shippingName"
              className="field"
              value={form.shippingName}
              onChange={(e) => setForm({ ...form, shippingName: e.target.value })}
              required
              minLength={2}
            />
          </div>

          <div>
            <label className="label" htmlFor="shippingAddress">Address</label>
            <textarea
              id="shippingAddress"
              className="field min-h-[5rem]"
              value={form.shippingAddress}
              onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
              required
              minLength={5}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="shippingCity">City</label>
              <input
                id="shippingCity"
                className="field"
                value={form.shippingCity}
                onChange={(e) => setForm({ ...form, shippingCity: e.target.value })}
                required
                minLength={2}
              />
            </div>
            <div>
              <label className="label" htmlFor="shippingPostal">PIN code</label>
              <input
                id="shippingPostal"
                className="field tabular"
                value={form.shippingPostal}
                onChange={(e) => setForm({ ...form, shippingPostal: e.target.value })}
                required
                minLength={3}
                maxLength={12}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="shippingPhone">Phone</label>
            <input
              id="shippingPhone"
              className="field tabular"
              value={form.shippingPhone}
              onChange={(e) => setForm({ ...form, shippingPhone: e.target.value })}
              required
              minLength={6}
              maxLength={20}
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-gold/10 px-3.5 py-3 text-sm text-gold">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              No payment is taken. This build ships with a mock payment provider, so confirming here
              records the order and starts the delivery timeline without charging anything. Card
              details are never collected.
            </p>
          </div>

          <button type="submit" disabled={checkout.isPending} className="btn-primary w-full">
            {checkout.isPending ? <Spinner className="mr-2 h-4 w-4" /> : <Lock className="mr-2 h-4 w-4" aria-hidden />}
            Confirm order
          </button>
        </form>

        <aside className="card h-max space-y-3 p-5 text-sm">
          <img src={order.auction.images[0]} alt="" className="aspect-square w-full rounded-xl object-cover" />
          <p className="font-display font-semibold">{order.auction.title}</p>

          <div className="flex justify-between text-muted">
            <span>Winning bid</span><span className="tabular">{formatINR(order.itemTotal)}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Shipping</span>
            <span className="tabular">{order.shippingCost === 0 ? 'Free' : formatINR(order.shippingCost)}</span>
          </div>
          <div className="flex justify-between border-t border-line pt-3 font-display font-semibold">
            <span>Total</span><span className="tabular">{formatINR(order.total)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
