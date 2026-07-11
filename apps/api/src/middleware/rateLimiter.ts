import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '@talkitout/lib';

const isDevelopment = process.env.NODE_ENV === 'development';

export const generalLimiter = rateLimit({
  windowMs: RATE_LIMITS.WINDOW_MS,
  max: RATE_LIMITS.MAX_REQUESTS,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const aiLimiter = rateLimit({
  windowMs: RATE_LIMITS.AI_WINDOW_MS,
  max: RATE_LIMITS.AI_MAX_REQUESTS,
  message: { error: 'Too many AI requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit per user if authenticated
    return (req as any).userId || req.ip || 'anonymous';
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50 : 5,
  skipSuccessfulRequests: true,
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
