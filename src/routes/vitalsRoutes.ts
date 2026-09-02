import { Router, Request, Response } from 'express';
import { VitalsService } from '../services/vitalsService';

const router = Router();

const handleLogVitals = (req: Request, res: Response) => {
  try {
    const {
      userId,
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

    const result = VitalsService.logVitals({
      userId: userId || 'demo-patient-001',
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

// Accept both POST /api/v1/vitals AND POST /api/v1/vitals/log
router.post('/', handleLogVitals);
router.post('/log', handleLogVitals);

// GET /api/v1/vitals/history/:userId or GET /api/v1/vitals/history
router.get('/history/:userId?', (req: Request, res: Response) => {
  try {
    const userId = req.params.userId || (req.query.userId as string) || 'demo-patient-001';
    const history = VitalsService.getVitalsHistory(userId);
    res.json({ success: true, count: history.length, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/vitals/journal
router.post('/journal', (req: Request, res: Response) => {
  try {
    const { userId, symptoms, mood, notesText, audioNoteUrl } = req.body;
    const uid = userId || (req.query.userId as string) || 'demo-patient-001';
    const result = VitalsService.saveHealthJournal(uid, symptoms || [], mood || 'good', notesText, audioNoteUrl);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/vitals/journal/:userId
router.get('/journal/:userId?', (req: Request, res: Response) => {
  try {
    const userId = req.params.userId || (req.query.userId as string) || 'demo-patient-001';
    const journal = VitalsService.getJournalHistory(userId);
    res.json({ success: true, count: journal.length, data: journal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
