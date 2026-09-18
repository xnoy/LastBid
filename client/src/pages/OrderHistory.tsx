import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryClient';
import { EmptyState, Skeleton } from '@/components/ui';
import { formatDate, formatINR } from '@/lib/format';
import type { Order, OrderStatus } from '@/shared/types';

const STATUS_LABEL: Record<OrderStatus, string> = {
  PAYMENT_PENDING: 'Payment pending',
  ORDER_CONFIRMED: 'Order confirmed',
  PREPARING: 'Being prepared',
  SHIPPED: 'Shipped',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_TONE: Partial<Record<OrderStatus, string>> = {
  PAYMENT_PENDING: 'bg-gold/12 text-gold',
  DELIVERED: 'bg-win/12 text-win',
  CANCELLED: 'bg-urgent/12 text-urgent',
};

type Role = 'buying' | 'selling';

export default function OrderHistory() {
  const [role, setRole] = useState<Role>('buying');

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.orders(role),
    queryFn: () => api<{ items: Order[] }>(`/orders?role=${role}`),
  });

  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Orders</h1>
        <p className="hint mt-1">Every won auction becomes an order with its own delivery timeline.</p>
      </header>

      <div className="mb-6 flex gap-2">
        {(['buying', 'selling'] as Role[]).map((key) => (
          <button
            key={key}
            onClick={() => setRole(key)}
            className={clsx(
              'pill border capitalize transition-colors',
              role === key ? 'border-bid bg-bid/12 text-bid' : 'border-line text-muted hover:text-ink',
            )}
          >
            {key === 'buying' ? 'Bought' : 'Sold'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title={role === 'buying' ? 'No purchases yet' : 'No sales yet'}
          body={
            role === 'buying'
              ? 'Win an auction and the order appears here, ready for checkout and tracking.'
              : 'When one of your lots sells, the order and its delivery timeline show up here.'
          }
          action={{ label: role === 'buying' ? 'Browse auctions' : 'List an item', to: role === 'buying' ? '/marketplace' : '/sell' }}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((order) => (
            <li key={order.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <img
                src={order.auction.images[0]}
                alt=""
                loading="lazy"
                className="h-20 w-20 shrink-0 rounded-xl object-cover"
              />

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={clsx('pill', STATUS_TONE[order.status] ?? 'bg-raised text-muted')}>
                    {STATUS_LABEL[order.status]}
                  </span>
                  <span className="tabular hint">{order.reference}</span>
                </div>
                <Link
                  to={`/auction/${order.auction.slug}`}
                  className="mt-1.5 block truncate font-display font-semibold hover:text-bid"
                >
                  {order.auction.title}
                </Link>
                <p className="hint mt-0.5">
                  {formatDate(order.createdAt)}
                  {role === 'buying' && order.seller ? ` · from ${order.seller.displayName}` : ''}
                  {role === 'selling' && order.buyer ? ` · to ${order.buyer.displayName}` : ''}
                </p>
              </div>

              <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                <p className="tabular font-display text-lg font-semibold">{formatINR(order.total)}</p>
                {role === 'buying' && order.status === 'PAYMENT_PENDING' ? (
                  <Link to={`/checkout/${order.id}`} className="btn-primary">Complete checkout</Link>
                ) : (
                  <Link to={`/orders/${order.id}`} className="btn-quiet">Track</Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
