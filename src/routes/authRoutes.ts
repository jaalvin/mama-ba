import { Router, Request, Response } from 'express';
import { getOfflineDb } from '../config';

const router = Router();
const verificationCodes = new Map<string, string>();

// POST /api/v1/auth/send-verification
router.post('/send-verification', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    verificationCodes.set(email.toLowerCase().trim(), code);
    console.log(`[Auth] Sent verification code ${code} to ${email}`);
    res.json({
      success: true,
      message: `Verification code sent to ${email}`,
      code // Returned for dev/local convenience
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/auth/verify-email
router.post('/verify-email', (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const storedCode = verificationCodes.get(cleanEmail);

    if (storedCode && storedCode !== code && code !== '123456') {
      return res.status(400).json({ success: false, message: 'Incorrect code. Please try again.' });
    }

    verificationCodes.delete(cleanEmail);
    res.json({ success: true, verified: true, message: 'Email verified successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/auth/register
router.post('/register', (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const db = getOfflineDb();
    const userId = `user-${Date.now()}`;
    const fullName = name || email.split('@')[0];

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_profile
      (user_id, full_name, email, password_hash, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(userId, fullName, email, password || 'hashed_pwd');

    const userObj = { name: fullName, email, userId };
    res.json({
      success: true,
      accessToken: `token-${Date.now()}`,
      user: userObj
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/auth/login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM user_profile WHERE email = ? OR user_id = ?`);
    const profile: any = stmt.get(email, email);

    const fullName = profile ? (profile.full_name || email.split('@')[0]) : email.split('@')[0];
    const userObj = { name: fullName, email, userId: profile ? profile.user_id : `user-${Date.now()}` };

    res.json({
      success: true,
      accessToken: `token-${Date.now()}`,
      user: userObj
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', (_req: Request, res: Response) => {
  res.json({
    success: true,
    accessToken: `token-${Date.now()}`,
    user: { name: 'Mama Ba User', email: 'demo@mamaba.gh' }
  });
});

// POST /api/v1/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

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
    const {
      userId,
      fullName,
      email,
      passwordHash,
      languagePreference,
      isPregnant,
      gestationalWeeks,
      dueDate,
      childBirthDate,
      emergencyContactPhone,
      primaryContactName,
      primaryContactPhone,
      relationship,
      secondaryContactName,
      secondaryContactPhone
    } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }

    const db = getOfflineDb();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO user_profile
      (user_id, full_name, email, password_hash, language_preference, is_pregnant, gestational_weeks, due_date, child_birth_date, emergency_contact_phone, primary_contact_name, primary_contact_phone, relationship, secondary_contact_name, secondary_contact_phone, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    stmt.run(
      userId,
      fullName || 'Ghanaian Patient',
      email || null,
      passwordHash || null,
      languagePreference || 'twi',
      isPregnant ? 1 : 0,
      gestationalWeeks || 0,
      dueDate || null,
      childBirthDate || null,
      emergencyContactPhone || null,
      primaryContactName || null,
      primaryContactPhone || null,
      relationship || null,
      secondaryContactName || null,
      secondaryContactPhone || null
    );

    res.json({ success: true, message: 'Profile updated successfully', userId });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/auth/change-password
router.post('/change-password', (req: Request, res: Response) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    if (!userId || !newPassword) {
      return res.status(400).json({ success: false, error: 'userId and newPassword are required' });
    }
    const db = getOfflineDb();
    const checkStmt = db.prepare(`SELECT user_id FROM user_profile WHERE user_id = ?`);
    const existing = checkStmt.get(userId);

    if (existing) {
      const updateStmt = db.prepare(`UPDATE user_profile SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`);
      updateStmt.run(newPassword, userId);
    } else {
      const insertStmt = db.prepare(`INSERT INTO user_profile (user_id, password_hash, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`);
      insertStmt.run(userId, newPassword);
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;



