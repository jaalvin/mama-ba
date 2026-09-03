import { Router, Response } from 'express';
import { VitalsService } from '../services/vitalsService';
import { optionalUser, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = Router();

const getUserIdFromReq = (req: AuthenticatedRequest): string | null => {
  return (
    req.user?.userId ||
    (req.headers['x-user-id'] as string) ||
    (req.query.userId as string) ||
    req.body?.userId ||
    null
  );
};

const handleLogVitals = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Valid userId is required to log vitals.' });
    }

    const {
      systolicBp, bp_sys,
      diastolicBp, bp_dia,
      bodyTemperature, temp,
      pulseRate, pulse,
      bloodGlucose, sugar,
      weightKg, weight,
      notes
    } = req.body;

    const sys = systolicBp ?? bp_sys;
    const dia = diastolicBp ?? bp_dia;
    const t = bodyTemperature ?? temp;
    const glu = bloodGlucose ?? sugar;
    const w = weightKg ?? weight;
    const p = pulseRate ?? pulse;

    const result = await VitalsService.logVitals({
      userId,
      systolicBp: sys !== undefined && sys !== '' ? Number(sys) : undefined,
      diastolicBp: dia !== undefined && dia !== '' ? Number(dia) : undefined,
      bodyTemperature: t !== undefined && t !== '' ? Number(t) : undefined,
      pulseRate: p !== undefined && p !== '' ? Number(p) : undefined,
      bloodGlucose: glu !== undefined && glu !== '' ? Number(glu) : undefined,
      weightKg: w !== undefined && w !== '' ? Number(w) : undefined,
      notes
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

router.use(optionalUser);

// Accept both POST /api/v1/vitals AND POST /api/v1/vitals/log
router.post('/', handleLogVitals);
router.post('/log', handleLogVitals);

// GET /api/v1/vitals/history/:userId? or GET /api/v1/vitals/history
router.get('/history/:userId?', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.userId || getUserIdFromReq(req);
    if (!userId) {
      return res.json({ success: true, count: 0, data: [] });
    }
    const history = await VitalsService.getVitalsHistory(userId);
    res.json({ success: true, count: history.length, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/vitals/journal
router.post('/journal', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getUserIdFromReq(req);
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Valid userId is required.' });
    }
    const { symptoms, mood, notesText, audioNoteUrl } = req.body;
    const result = VitalsService.saveHealthJournal(userId, symptoms || [], mood || 'good', notesText, audioNoteUrl);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/vitals/journal/:userId
router.get('/journal/:userId?', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.userId || getUserIdFromReq(req);
    if (!userId) {
      return res.json({ success: true, count: 0, data: [] });
    }
    const journal = VitalsService.getJournalHistory(userId);
    res.json({ success: true, count: journal.length, data: journal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
