import { OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { notify } from './notification.service';
import { emitToUser } from '../realtime/bus';

/** The delivery timeline, in order. Drives the UI and validates transitions. */
export const ORDER_FLOW: OrderStatus[] = [
  OrderStatus.PAYMENT_PENDING,
  OrderStatus.ORDER_CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.IN_TRANSIT,
  OrderStatus.OUT_FOR_DELIVERY,
  OrderStatus.DELIVERED,
];

export const ORDER_STATUS_COPY: Record<OrderStatus, { label: string; note: string }> = {
  PAYMENT_PENDING: { label: 'Payment pending', note: 'Waiting for the buyer to complete checkout.' },
  ORDER_CONFIRMED: { label: 'Order confirmed', note: 'Payment received. The seller has been notified.' },
  PREPARING: { label: 'Seller preparing item', note: 'The item is being packed and checked.' },
  SHIPPED: { label: 'Shipped', note: 'The parcel has been handed to the courier.' },
  IN_TRANSIT: { label: 'In transit', note: 'Moving through the courier network.' },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', note: 'With the delivery agent today.' },
  DELIVERED: { label: 'Delivered', note: 'Handed over to the buyer.' },
  CANCELLED: { label: 'Cancelled', note: 'This order was cancelled.' },
};

function reference(): string {
  return `BN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createOrderForAuction(
  auctionId: string,
  buyerId: string,
  sellerId: string,
  itemTotal: number,
  shippingCost: number,
) {
  const existing = await prisma.order.findUnique({ where: { auctionId } });
  if (existing) return existing;

  return prisma.order.create({
    data: {
      reference: reference(),
      auctionId,
      buyerId,
      sellerId,
      itemTotal,
      shippingCost,
      total: itemTotal + shippingCost,
      status: OrderStatus.PAYMENT_PENDING,
      events: {
        create: { status: OrderStatus.PAYMENT_PENDING, note: ORDER_STATUS_COPY.PAYMENT_PENDING.note },
      },
    },
  });
}

export function nextStatus(current: OrderStatus): OrderStatus | null {
  const index = ORDER_FLOW.indexOf(current);
  if (index === -1 || index === ORDER_FLOW.length - 1) return null;
  return ORDER_FLOW[index + 1];
}

/**
 * Advance an order. Only forward moves along ORDER_FLOW are allowed, so a
 * replayed or forged request cannot walk a delivered parcel back to "shipped".
 */
export async function advanceOrder(params: {
  orderId: string;
  actorId: string;
  actorIsAdmin: boolean;
  to?: OrderStatus;
  note?: string;
  location?: string;
  courier?: string;
  trackingNumber?: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: { auction: { select: { title: true } } },
  });
  if (!order) return { ok: false as const, code: 'NOT_FOUND' };

  const isSeller = order.sellerId === params.actorId;
  if (!isSeller && !params.actorIsAdmin) return { ok: false as const, code: 'FORBIDDEN' };

  const target = params.to ?? nextStatus(order.status);
  if (!target) return { ok: false as const, code: 'ALREADY_DELIVERED' };

  const from = ORDER_FLOW.indexOf(order.status);
  const to = ORDER_FLOW.indexOf(target);
  if (from === -1 || to <= from) return { ok: false as const, code: 'INVALID_TRANSITION' };

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: target,
      courier: params.courier ?? order.courier,
      trackingNumber: params.trackingNumber ?? order.trackingNumber,
      estimatedDelivery:
        target === OrderStatus.SHIPPED && !order.estimatedDelivery
          ? new Date(Date.now() + 4 * 86_400_000)
          : order.estimatedDelivery,
      events: {
        create: {
          status: target,
          note: params.note ?? ORDER_STATUS_COPY[target].note,
          location: params.location,
        },
      },
    },
    include: { events: { orderBy: { createdAt: 'asc' } } },
  });

  await notify({
    userId: order.buyerId,
    type: 'ORDER_UPDATE',
    title: ORDER_STATUS_COPY[target].label,
    body: `${order.auction.title}: ${ORDER_STATUS_COPY[target].note}`,
    auctionId: order.auctionId,
  });
  emitToUser(order.buyerId, 'order:update', { orderId: order.id, status: target });

  return { ok: true as const, order: updated };
}
