import { Router, Request, Response } from 'express';
import { RemindersService } from '../services/remindersService';

const router = Router();

// GET /api/v1/reminders/:userId
router.get('/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const reminders = RemindersService.getUserReminders(userId);
    res.json({ success: true, count: reminders.length, data: reminders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/reminders
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, title, reminderType, scheduledTime, recurrence, dosageInfo } = req.body;
    if (!title || !scheduledTime) {
      return res.status(400).json({ success: false, error: 'title and scheduledTime are required' });
    }
    const result = await RemindersService.createReminder({
      userId,
      title,
      reminderType,
      scheduledTime,
      recurrence,
      dosageInfo
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/v1/reminders/:id
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isCompleted, isActive } = req.body;
    const updated = RemindersService.toggleReminder(id, { isCompleted, isActive });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/v1/reminders/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = RemindersService.deleteReminder(id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
