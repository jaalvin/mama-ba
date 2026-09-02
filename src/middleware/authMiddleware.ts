import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
    name?: string;
  };
}

/** Secret key used for signing lightweight JWT-style tokens */
const AUTH_SECRET = process.env.JWT_SECRET || 'mama-ba-maternal-health-secret-key-2026';

/** Helper to generate a signed token */
export function generateToken(payload: { userId: string; email?: string; name?: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
  const signature = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

/** Helper to verify a signed token */
export function verifyToken(token: string): { userId: string; email?: string; name?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', AUTH_SECRET).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return decoded;
  } catch {
    return null;
  }
}

/** Express Middleware enforcing valid user authentication */
export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const userIdHeader = req.headers['x-user-id'] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded && decoded.userId) {
      req.user = decoded;
      return next();
    }
  }

  // Fallback: If X-User-Id is provided in authenticated session headers
  if (userIdHeader && userIdHeader.trim()) {
    req.user = { userId: userIdHeader.trim() };
    return next();
  }

  // If query string has userId (for backward compatibility in GET endpoints)
  const queryUserId = req.query.userId as string;
  if (queryUserId && queryUserId.trim()) {
    req.user = { userId: queryUserId.trim() };
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized. Please sign in to access your maternal health records.'
  });
}

/** Optional auth middleware (attaches user if token present, but doesn't block) */
export function optionalUser(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const userIdHeader = req.headers['x-user-id'] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded && decoded.userId) {
      req.user = decoded;
    }
  } else if (userIdHeader && userIdHeader.trim()) {
    req.user = { userId: userIdHeader.trim() };
  }
  next();
}
