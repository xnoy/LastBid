import { Router } from 'express';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { asyncHandler, ApiError } from '../middleware/error';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { advanceOrder, ORDER_FLOW, ORDER_STATUS_COPY } from '../services/order.service';
import { paymentProvider } from '../services/payments';

export const orderRouter = Router();

orderRouter.use(requireAuth);

orderRouter.get('/flow', (_req, res) => {
  res.json({
    flow: ORDER_FLOW.map((status) => ({ status, ...ORDER_STATUS_COPY[status] })),
  });
});

orderRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const role = req.query.role === 'selling' ? 'selling' : 'buying';
    const orders = await prisma.order.findMany({
      where: role === 'selling' ? { sellerId: req.user!.id } : { buyerId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        auction: { select: { id: true, slug: true, title: true, images: true } },
        buyer: { select: { username: true, displayName: true } },
        seller: { select: { username: true, displayName: true } },
      },
    });
    res.json({ items: orders });
  }),
);

orderRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        auction: { select: { id: true, slug: true, title: true, images: true, location: true } },
        buyer: { select: { username: true, displayName: true } },
        seller: { select: { username: true, displayName: true } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'No such order.');
    // Only the two parties (or an admin) can see an order.
    if (order.buyerId !== req.user!.id && order.sellerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'FORBIDDEN', 'This order is not yours.');
    }
    res.json({ order });
  }),
);

const checkoutSchema = z.object({
  shippingName: z.string().min(2).max(80),
  shippingAddress: z.string().min(5).max(200),
  shippingCity: z.string().min(2).max(60),
  shippingPostal: z.string().min(3).max(12),
  shippingPhone: z.string().min(6).max(20),
});

/**
 * Checkout. The payment step goes through the provider abstraction; with the
 * default mock provider nothing is charged and the response says so.
 */
orderRouter.post(
  '/:id/checkout',
  validateBody(checkoutSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof checkoutSchema>;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new ApiError(404, 'NOT_FOUND', 'No such order.');
    if (order.buyerId !== req.user!.id) throw new ApiError(403, 'FORBIDDEN', 'This order is not yours.');
    if (order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new ApiError(409, 'ALREADY_PAID', 'This order has already been confirmed.');
    }

    const intent = await paymentProvider.createIntent({ orderId: order.id, amount: order.total });
    const confirmed = await paymentProvider.confirm(intent.id);

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        ...body,
        status: OrderStatus.ORDER_CONFIRMED,
        events: {
          create: {
            status: OrderStatus.ORDER_CONFIRMED,
            note: ORDER_STATUS_COPY.ORDER_CONFIRMED.note,
          },
        },
      },
      include: { events: { orderBy: { createdAt: 'asc' } } },
    });

    res.json({ order: updated, payment: confirmed });
  }),
);

const advanceSchema = z.object({
  to: z.nativeEnum(OrderStatus).optional(),
  note: z.string().max(200).optional(),
  location: z.string().max(80).optional(),
  courier: z.string().max(60).optional(),
  trackingNumber: z.string().max(60).optional(),
});

/** Seller (or admin) moves the parcel along the timeline. */
orderRouter.post(
  '/:id/advance',
  validateBody(advanceSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof advanceSchema>;
    const result = await advanceOrder({
      orderId: req.params.id,
      actorId: req.user!.id,
      actorIsAdmin: req.user!.role === 'ADMIN',
      ...body,
    });

    if (!result.ok) {
      const map: Record<string, [number, string]> = {
        NOT_FOUND: [404, 'No such order.'],
        FORBIDDEN: [403, 'Only the seller can update this delivery.'],
        ALREADY_DELIVERED: [409, 'This order is already delivered.'],
        INVALID_TRANSITION: [409, 'Delivery states only move forward.'],
      };
      const [status, message] = map[result.code] ?? [400, 'That update was rejected.'];
      throw new ApiError(status, result.code, message);
    }

    res.json({ order: result.order });
  }),
);
