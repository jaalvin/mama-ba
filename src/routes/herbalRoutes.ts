import { Router, Request, Response } from 'express';
import { HerbalService } from '../services/herbalService';

const router = Router();

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
