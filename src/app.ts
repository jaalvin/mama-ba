import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import herbalRoutes from './routes/herbalRoutes';
import triageRoutes from './routes/triageRoutes';
import maternalRoutes from './routes/maternalRoutes';
import vitalsRoutes from './routes/vitalsRoutes';
import chatRoutes from './routes/chatRoutes';
import syncRoutes from './routes/syncRoutes';
import authRoutes from './routes/authRoutes';
import logisticsRoutes from './routes/logisticsRoutes';
import remindersRoutes from './routes/remindersRoutes';

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve Full Functioning Patient App SPA & Developer Playground UI
const frontendDistPath = path.resolve(process.cwd(), 'frontend/dist');
const publicPath = path.resolve(process.cwd(), 'public');
const appPath = path.resolve(process.cwd(), 'public/app');

import fs from 'fs';

// Dynamically serve static assets from frontend/dist if built, otherwise public/app
app.use(express.static(frontendDistPath));
app.use(express.static(appPath));

app.use('/docs', express.static(publicPath));

app.get('/docs', (_req: Request, res: Response) => {
  res.sendFile(path.resolve(publicPath, 'index.html'));
});
app.get('/openapi.json', (_req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'openapi.json'));
});

// Medical Disclaimer Header Middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Medical-Disclaimer', 'For educational guidance & health companion triage only. Not a medical diagnosis.');
  next();
});

// Root endpoint serving the Web App UI or API Status
app.get('/', (_req: Request, res: Response) => {
  const frontendIndex = path.resolve(frontendDistPath, 'index.html');
  const appIndex = path.resolve(appPath, 'index.html');

  if (fs.existsSync(frontendIndex)) {
    return res.sendFile(frontendIndex);
  }
  if (fs.existsSync(appIndex)) {
    return res.sendFile(appIndex);
  }

  res.json({
    status: 'online',
    system: 'Mama Ba Maternal Health Guided Companion API',
    version: '1.0.0',
    healthCheck: '/api/v1/health',
    docs: '/docs'
  });
});

// Base API v1 endpoint
app.get('/api/v1', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    system: 'The Guided Health Companion (Patient App API v1)',
    healthCheck: '/api/v1/health',
    endpoints: [
      '/api/v1/herbal-safety',
      '/api/v1/triage',
      '/api/v1/maternal',
      '/api/v1/vitals',
      '/api/v1/chat',
      '/api/v1/sync',
      '/api/v1/auth',
      '/api/v1/logistics',
      '/api/v1/reminders'
    ]
  });
});

// Health check endpoint
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    system: 'The Guided Health Companion (Patient App)',
    version: '1.0.0',
    mode: 'Offline-First Cloud-Boosted',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/v1/herbal-safety', herbalRoutes);
app.use('/api/v1/triage', triageRoutes);
app.use('/api/v1/maternal', maternalRoutes);
app.use('/api/v1/vitals', vitalsRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/v1/sync', syncRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/logistics', logisticsRoutes);
app.use('/api/v1/reminders', remindersRoutes);

// SPA Fallback Routing for React Router
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/docs') && !req.path.startsWith('/openapi.json')) {
    const frontendIndex = path.resolve(frontendDistPath, 'index.html');
    const appIndex = path.resolve(appPath, 'index.html');

    if (fs.existsSync(frontendIndex)) {
      return res.sendFile(frontendIndex);
    } else if (fs.existsSync(appIndex)) {
      return res.sendFile(appIndex);
    }
  }
  next();
});

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ServerError]', err);
  res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
});

export default app;
