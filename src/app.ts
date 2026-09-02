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
const frontendDistPath = path.join(__dirname, '../frontend/dist');
const publicPath = path.join(__dirname, '../public');
const appPath = path.join(__dirname, '../public/app');

import fs from 'fs';

// Dynamically serve static assets from frontend/dist if built, otherwise public/app
app.use((req: Request, res: Response, next: NextFunction) => {
  if (fs.existsSync(frontendDistPath)) {
    return express.static(frontendDistPath)(req, res, next);
  }
  return express.static(appPath)(req, res, next);
});

app.use('/docs', express.static(publicPath));

app.get('/docs', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});
app.get('/openapi.json', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../openapi.json'));
});

// Medical Disclaimer Header Middleware
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Medical-Disclaimer', 'For educational guidance & health companion triage only. Not a medical diagnosis.');
  next();
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
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/docs') && fs.existsSync(frontendDistPath)) {
    return res.sendFile(path.join(frontendDistPath, 'index.html'));
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
