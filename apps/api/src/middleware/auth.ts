import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@talkitout/lib';

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: UserRole;
}

export interface TokenPayload {
  userId: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

/**
 * Generates access and refresh tokens
 */
export function generateTokens(userId: string, role: UserRole) {
  const accessTTL = parseInt(process.env.ACCESS_TOKEN_TTL_MIN || '15') * 60;
  const refreshTTL = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7') * 24 * 60 * 60;

  const accessToken = jwt.sign({ userId, role, type: 'access' } as TokenPayload, JWT_SECRET, {
    expiresIn: accessTTL,
  });

  const refreshToken = jwt.sign({ userId, role, type: 'refresh' } as TokenPayload, JWT_SECRET, {
    expiresIn: refreshTTL,
  });

  return { accessToken, refreshToken };
}

/**
 * Verifies JWT token
 */
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}

/**
 * Authentication middleware - requires valid access token
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    req.userId = payload.userId;
    req.userRole = payload.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Authorization middleware - requires specific role(s)
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

/**
 * Optional authentication - sets userId if token present but doesn't require it
 */
export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      if (payload.type === 'access') {
        req.userId = payload.userId;
        req.userRole = payload.role;
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
  next();
}
