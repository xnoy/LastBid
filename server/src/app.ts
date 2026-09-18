import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { corsOrigins, env } from './config/env';
import { apiRouter } from './routes';
import { optionalAuth } from './middleware/auth';
import { errorHandler, notFound } from './middleware/error';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // correct req.ip behind a load balancer
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (env.NODE_ENV === 'development') app.use(morgan('dev'));

  // Identify the caller once, at the edge; individual routes decide whether
  // authentication is required.
  app.use(optionalAuth);

  app.get('/', (_req, res) => {
    res.redirect('http://localhost:5173');
  });

  app.use('/api', apiRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
