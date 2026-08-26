import { Router, Request, Response } from 'express';
import { VitalsService } from '../services/vitalsService';

const router = Router();

// POST /api/v1/vitals/log
router.post('/log', (req: Request, res: Response) => {
  try {
    const { userId, systolicBp, diastolicBp, bodyTemperature, pulseRate, bloodGlucose, weightKg, notes } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const result = VitalsService.logVitals({
      userId,
      systolicBp: systolicBp ? Number(systolicBp) : undefined,
      diastolicBp: diastolicBp ? Number(diastolicBp) : undefined,
      bodyTemperature: bodyTemperature ? Number(bodyTemperature) : undefined,
      pulseRate: pulseRate ? Number(pulseRate) : undefined,
      bloodGlucose: bloodGlucose ? Number(bloodGlucose) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined,
      notes
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/vitals/history/:userId
router.get('/history/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
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
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const result = VitalsService.saveHealthJournal(userId, symptoms || [], mood || 'good', notesText, audioNoteUrl);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/vitals/journal/:userId
router.get('/journal/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const journal = VitalsService.getJournalHistory(userId);
    res.json({ success: true, count: journal.length, data: journal });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
