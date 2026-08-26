import { Router, Request, Response } from 'express';
import { getOfflineDb } from '../config';

const router = Router();

// GET /api/v1/auth/profile/:userId
router.get('/profile/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM user_profile WHERE user_id = ?`);
    const profile = stmt.get(userId);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }
    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/auth/profile
router.post('/profile', (req: Request, res: Response) => {
  try {
    const { userId, fullName, languagePreference, isPregnant, gestationalWeeks, dueDate, childBirthDate, emergencyContactPhone } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    const db = getOfflineDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_profile
      (user_id, full_name, language_preference, is_pregnant, gestational_weeks, due_date, child_birth_date, emergency_contact_phone, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      userId,
      fullName || 'Ghanaian Patient',
      languagePreference || 'twi',
      isPregnant ? 1 : 0,
      gestationalWeeks || 0,
      dueDate || null,
      childBirthDate || null,
      emergencyContactPhone || null
    );

    res.json({ success: true, message: 'Profile updated successfully', userId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
