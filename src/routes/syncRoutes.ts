import { Router, Request, Response } from 'express';
import { SyncService } from '../services/syncService';

const router = Router();

// GET /api/v1/sync/bundle
router.get('/bundle', (_req: Request, res: Response) => {
  try {
    const bundle = SyncService.getOfflineBundle();
    res.json({ success: true, data: bundle });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/sync/upload
router.post('/upload', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload.userId) {
      return res.status(400).json({ success: false, error: 'userId is required in sync payload' });
    }
    const result = SyncService.processSyncPayload(payload);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
