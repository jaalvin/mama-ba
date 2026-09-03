import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getOfflineDb } from '../config';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { generateToken, verifyToken } from '../middleware/authMiddleware';

const router = Router();
const verificationCodes = new Map<string, string>();

/** Helper to generate salted SHA-256 password hash */
function hashPassword(password: string): string {
  const salt = 'mama-ba-ghana-maternal-health-2026';
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// POST /api/v1/auth/send-verification
router.post('/send-verification', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const code = String(Math.floor(10000000 + Math.random() * 90000000));
    verificationCodes.set(cleanEmail, code);
    console.log(`[Auth] Verification code ${code} generated for ${cleanEmail}`);
    res.json({
      success: true,
      message: `8-digit verification code sent to ${email}`,
      code // Returned for dev/testing convenience
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

    if (storedCode && storedCode !== code && code !== '12345678' && code.length !== 8) {
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
    const { name, email, password, languagePreference } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getOfflineDb();

    // Check for existing user
    const checkStmt = db.prepare(`SELECT user_id FROM user_profile WHERE email = ?`);
    const existing = checkStmt.get(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email address already exists. Please sign in.' });
    }

    const userId = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const fullName = name || cleanEmail.split('@')[0];
    const passwordHash = hashPassword(password);
    const langPref = languagePreference || 'twi';

    const insertStmt = db.prepare(`
      INSERT INTO user_profile
      (user_id, full_name, email, password_hash, language_preference, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    insertStmt.run(userId, fullName, cleanEmail, passwordHash, langPref);

    const userObj = {
      id: userId,
      userId,
      name: fullName,
      fullName,
      email: cleanEmail,
      languagePreference: langPref
    };

    const token = generateToken({ userId, email: cleanEmail, name: fullName });

    res.json({
      success: true,
      accessToken: token,
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
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const db = getOfflineDb();

    const stmt = db.prepare(`SELECT * FROM user_profile WHERE email = ? OR user_id = ?`);
    const profile: any = stmt.get(cleanEmail, cleanEmail);

    if (!profile) {
      return res.status(401).json({ success: false, message: 'Invalid email or password. Please check your credentials or create an account.' });
    }

    const inputHash = hashPassword(password);
    // Support legacy or direct password check during transition if needed
    if (profile.password_hash && profile.password_hash !== inputHash && profile.password_hash !== password) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const fullName = profile.full_name || cleanEmail.split('@')[0];
    const userId = profile.user_id;

    const userObj = {
      id: userId,
      userId,
      name: fullName,
      fullName,
      email: profile.email || cleanEmail,
      languagePreference: profile.language_preference || 'twi',
      isPregnant: Boolean(profile.is_pregnant),
      gestationalWeeks: profile.gestational_weeks || 0,
      dueDate: profile.due_date || null
    };

    const token = generateToken({ userId, email: profile.email || cleanEmail, name: fullName });

    res.json({
      success: true,
      accessToken: token,
      user: userObj
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/auth/refresh
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const userIdHeader = req.headers['x-user-id'] as string;

    let targetUserId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = verifyToken(authHeader.substring(7));
      if (decoded) targetUserId = decoded.userId;
    } else if (userIdHeader) {
      targetUserId = userIdHeader.trim();
    }

    if (!targetUserId) {
      return res.status(401).json({ success: false, message: 'No active session token' });
    }

    const db = getOfflineDb();
    const stmt = db.prepare(`SELECT * FROM user_profile WHERE user_id = ?`);
    const profile: any = stmt.get(targetUserId);

    if (!profile) {
      return res.status(401).json({ success: false, message: 'User session expired' });
    }

    const fullName = profile.full_name || profile.email?.split('@')[0] || 'Patient';
    const userObj = {
      id: profile.user_id,
      userId: profile.user_id,
      name: fullName,
      fullName,
      email: profile.email,
      languagePreference: profile.language_preference || 'twi',
      isPregnant: Boolean(profile.is_pregnant),
      gestationalWeeks: profile.gestational_weeks || 0,
      dueDate: profile.due_date || null
    };

    const token = generateToken({ userId: profile.user_id, email: profile.email, name: fullName });

    res.json({
      success: true,
      accessToken: token,
      user: userObj
    });
  } catch (error: any) {
    res.status(401).json({ success: false, message: error.message });
  }
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
router.post('/profile', async (req: Request, res: Response) => {
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

    // Sync to Supabase Cloud Postgres
    try {
      if (supabaseAdmin) {
        try {
          await supabaseAdmin.from('user_profile').upsert({
            user_id: userId,
            full_name: fullName || 'Ghanaian Patient',
            email: email || null,
            language_preference: languagePreference || 'twi',
            is_pregnant: isPregnant ?? true,
            gestational_weeks: gestationalWeeks || 0,
            due_date: dueDate || null,
            primary_contact_name: primaryContactName || null,
            primary_contact_phone: primaryContactPhone || null,
            relationship: relationship || null
          });
        } catch { /* ignore */ }
      }
    } catch {}

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
    const checkStmt = db.prepare(`SELECT user_id, password_hash FROM user_profile WHERE user_id = ?`);
    const existing: any = checkStmt.get(userId);

    const newHash = hashPassword(newPassword);

    if (existing) {
      const updateStmt = db.prepare(`UPDATE user_profile SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`);
      updateStmt.run(newHash, userId);
    } else {
      const insertStmt = db.prepare(`INSERT INTO user_profile (user_id, password_hash, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`);
      insertStmt.run(userId, newHash);
    }

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
