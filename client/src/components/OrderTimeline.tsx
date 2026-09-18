import clsx from 'clsx';
import { Check } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import type { OrderEvent, OrderStatus } from '@/shared/types';

/** Mirrors ORDER_FLOW on the server. */
const FLOW: Array<{ status: OrderStatus; label: string }> = [
  { status: 'PAYMENT_PENDING', label: 'Payment pending' },
  { status: 'ORDER_CONFIRMED', label: 'Order confirmed' },
  { status: 'PREPARING', label: 'Seller preparing item' },
  { status: 'SHIPPED', label: 'Shipped' },
  { status: 'IN_TRANSIT', label: 'In transit' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { status: 'DELIVERED', label: 'Delivered' },
];

export function OrderTimeline({
  status, events = [],
}: { status: OrderStatus; events?: OrderEvent[] }) {
  const currentIndex = FLOW.findIndex((step) => step.status === status);
  const eventByStatus = new Map(events.map((event) => [event.status, event]));

  if (status === 'CANCELLED') {
    return <p className="rounded-xl bg-urgent/10 px-4 py-3 text-sm font-medium text-urgent">This order was cancelled.</p>;
  }

  return (
    <ol className="relative">
      {FLOW.map((step, index) => {
        const done = index <= currentIndex;
        const current = index === currentIndex;
        const event = eventByStatus.get(step.status);

        return (
          <li key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
            {index < FLOW.length - 1 ? (
              <span
                className={clsx('absolute left-[0.6875rem] top-6 h-full w-0.5', done ? 'bg-win' : 'bg-line')}
                aria-hidden
              />
            ) : null}

            <span
              className={clsx(
                'relative z-10 mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2',
                done ? 'border-win bg-win text-white' : 'border-line bg-surface',
                current && 'ring-4 ring-win/20',
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : null}
            </span>

            <div className="min-w-0 flex-1">
              <p className={clsx('font-medium leading-6', !done && 'text-muted')}>{step.label}</p>
              {event ? (
                <p className="hint mt-0.5">
                  {formatDateTime(event.createdAt)}
                  {event.location ? ` · ${event.location}` : ''}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
