import { Router, Request, Response } from 'express';
import { HerbalService } from '../services/herbalService';

const router = Router();

// POST /api/v1/herbal-safety/evaluate
router.post('/evaluate', async (req: Request, res: Response) => {
  try {
    const query = req.body.query || req.body.herbName || req.body.foodItem || '';
    if (!query || !query.trim()) {
      return res.status(400).json({ success: false, error: 'Query parameter is required.' });
    }
    const card = await HerbalService.evaluateSafety(query);
    res.json({ success: true, data: card });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/herbal-safety/check-combination
router.post('/check-combination', async (req: Request, res: Response) => {
  try {
    const { item1, item2 } = req.body;
    if (!item1 || !item2 || !item1.trim() || !item2.trim()) {
      return res.status(400).json({ success: false, error: 'Both item1 and item2 parameters are required.' });
    }
    const card = await HerbalService.evaluateCombinationSafety(item1, item2);
    res.json({ success: true, data: card });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/herbal-safety/check
router.post('/check', (req: Request, res: Response) => {
  try {
    const { herbName, pharmaDrugName, foodItem } = req.body;
    const result = HerbalService.checkSafety({ herbName, pharmaDrugName, foodItem });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/herbal-safety/matrix
router.get('/matrix', (_req: Request, res: Response) => {
  try {
    const matrix = HerbalService.listAllMatrixItems();
    res.json({ success: true, count: matrix.length, data: matrix });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
