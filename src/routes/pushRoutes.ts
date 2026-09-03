/**
 * src/routes/pushRoutes.ts
 *
 * Web Push API routes:
 *   POST /api/v1/push/subscribe       — save PushSubscription from browser
 *   DELETE /api/v1/push/unsubscribe   — remove subscription
 *   POST /api/v1/push/schedule        — schedule a reminder push event
 *   DELETE /api/v1/push/schedule/:id  — cancel a scheduled reminder
 *   POST /api/v1/push/test            — send an immediate test push
 *   GET  /api/v1/push/vapid-key       — return the public VAPID key
 */
import { Router, Request, Response } from 'express';
import {
  VAPID_PUBLIC_KEY,
  saveSubscription,
  removeSubscription,
  scheduleReminder,
  cancelReminder,
  sendPushToUser,
} from '../services/pushService';

const router = Router();

// ── GET /vapid-key — return public VAPID key to frontend ─────────────────────
router.get('/vapid-key', (_req: Request, res: Response) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// ── POST /subscribe — save a PushSubscription from the browser ───────────────
router.post('/subscribe', async (req: Request, res: Response) => {
  const { userId, subscription } = req.body;
  if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh) {
    return res.status(400).json({ success: false, error: 'userId and valid subscription are required' });
  }
  try {
    await saveSubscription(userId, subscription);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Push] Subscribe error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to save subscription' });
  }
});

// ── DELETE /unsubscribe — remove a PushSubscription ──────────────────────────
router.delete('/unsubscribe', async (req: Request, res: Response) => {
  const { userId, endpoint } = req.body;
  if (!userId || !endpoint) {
    return res.status(400).json({ success: false, error: 'userId and endpoint required' });
  }
  try {
    await removeSubscription(userId, endpoint);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to remove subscription' });
  }
});

// ── POST /schedule — schedule a recurring or one-time push reminder ───────────
router.post('/schedule', async (req: Request, res: Response) => {
  const { userId, eventId, title, body, scheduledTime, recurrence, tag } = req.body;
  if (!userId || !eventId || !title || !body || !scheduledTime) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  try {
    await scheduleReminder({ userId, eventId, title, body, scheduledTime, recurrence: recurrence || 'daily', tag });
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Push] Schedule error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to schedule reminder' });
  }
});

// ── DELETE /schedule/:id — cancel a scheduled push reminder ─────────────────
router.delete('/schedule/:id', async (req: Request, res: Response) => {
  const eventId = req.params.id;
  if (!eventId) return res.status(400).json({ success: false, error: 'eventId required' });
  try {
    await cancelReminder(eventId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to cancel reminder' });
  }
});

// ── POST /test — send an immediate test push to a user ───────────────────────
router.post('/test', async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'userId required' });
  try {
    await sendPushToUser(userId, '🤱 Mama Ba Test', 'Push notifications are working!', 'test-push');
    res.json({ success: true });
  } catch (err: any) {
    console.error('[Push] Test send error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to send test push' });
  }
});

export default router;
