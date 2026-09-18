import { Router } from 'express';
import { authRouter } from './auth.routes';
import { auctionRouter } from './auction.routes';
import { bidRouter } from './bid.routes';
import { userRouter } from './user.routes';
import { watchlistRouter } from './watchlist.routes';
import { notificationRouter } from './notification.routes';
import { orderRouter } from './order.routes';
import { liveRouter } from './live.routes';
import { aiRouter } from './ai.routes';
import { adminRouter } from './admin.routes';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'bidnova-api', time: new Date().toISOString() });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/auctions', auctionRouter);
apiRouter.use('/bids', bidRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/watchlist', watchlistRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/orders', orderRouter);
apiRouter.use('/live', liveRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/admin', adminRouter);
