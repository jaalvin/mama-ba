import { Router, Request, Response } from 'express';
import { TriageService } from '../services/triageService';

const router = Router();

// POST /api/v1/triage/evaluate
router.post('/evaluate', (req: Request, res: Response) => {
  try {
    const { symptomKeys, symptomText, category } = req.body;
    const result = TriageService.evaluateSymptoms({ symptomKeys, symptomText, category });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/triage/rules
router.get('/rules', (_req: Request, res: Response) => {
  try {
    const rules = TriageService.getAllRules();
    res.json({ success: true, count: rules.length, data: rules });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
