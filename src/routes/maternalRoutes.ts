import { Router, Request, Response } from 'express';
import { MaternalService } from '../services/maternalService';

const router = Router();

// POST /api/v1/maternal/anc-schedule
router.post('/anc-schedule', (req: Request, res: Response) => {
  try {
    const { gestationalWeeks, dueDate } = req.body;
    const schedule = MaternalService.generateANCSchedule(gestationalWeeks || 8, dueDate);
    res.json({ success: true, count: schedule.length, data: schedule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/maternal/immunization-schedule
router.post('/immunization-schedule', (req: Request, res: Response) => {
  try {
    const { childBirthDate } = req.body;
    if (!childBirthDate) {
      return res.status(400).json({ success: false, error: 'childBirthDate is required (YYYY-MM-DD)' });
    }
    const schedule = MaternalService.generateImmunizationSchedule(childBirthDate);
    res.json({ success: true, count: schedule.length, data: schedule });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/v1/maternal/user-schedules/:userId
router.get('/user-schedules/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const schedules = MaternalService.getUserSchedules(userId);
    res.json({ success: true, count: schedules.length, data: schedules });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
