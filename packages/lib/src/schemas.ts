import { z } from 'zod';
import {
  USER_ROLES,
  TASK_PRIORITY,
  TASK_STATUS,
  SENTIMENT,
  MOOD_RANGE,
  VALIDATION,
} from './constants';

// Auth Schemas
export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(VALIDATION.MIN_PASSWORD_LENGTH),
  age: z.number().int().min(VALIDATION.MIN_AGE).max(VALIDATION.MAX_AGE),
  school: z.string().optional(),
  guardianConsent: z.boolean().optional(),
  role: z.enum([USER_ROLES.STUDENT, USER_ROLES.COUNSELOR]).default(USER_ROLES.STUDENT),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Task Schemas
export const createTaskSchema = z.object({
  title: z.string().min(1).max(VALIDATION.MAX_TASK_TITLE_LENGTH),
  subject: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.string().optional()
  ),
  dueAt: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      // Convert datetime-local format to ISO datetime
      if (typeof val === 'string' && !val.includes('T')) {
        return undefined; // Invalid format
      }
      // If it's already a valid date string, ensure it has timezone
      if (typeof val === 'string' && val.includes('T')) {
        // datetime-local format: 2025-01-15T14:30
        // Add seconds and timezone if missing
        if (!val.includes('Z') && !val.includes('+') && !val.includes(':00.')) {
          return val + ':00.000Z';
        }
      }
      return val;
    },
    z.string().optional()
  ),
  priority: z.enum([TASK_PRIORITY.LOW, TASK_PRIORITY.MED, TASK_PRIORITY.HIGH]).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(VALIDATION.MAX_TASK_TITLE_LENGTH).optional(),
  subject: z.string().optional(),
  dueAt: z.string().datetime().optional().nullable(),
  priority: z.enum([TASK_PRIORITY.LOW, TASK_PRIORITY.MED, TASK_PRIORITY.HIGH]).optional(),
  status: z.enum([TASK_STATUS.TODO, TASK_STATUS.DOING, TASK_STATUS.DONE]).optional(),
});

// Chat Schemas
export const chatMessageSchema = z.object({
  text: z.string().min(1).max(VALIDATION.MAX_MESSAGE_LENGTH),
});

// Check-in Schemas
export const checkInSchema = z.object({
  mood: z.number().int().min(MOOD_RANGE.MIN).max(MOOD_RANGE.MAX),
  note: z.string().max(VALIDATION.MAX_NOTE_LENGTH).optional(),
});

// Profile Update Schema
export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  school: z.string().optional(),
  preferences: z
    .object({
      pomodoro: z
        .object({
          focusDuration: z.number().int().min(5).max(60).optional(),
          breakDuration: z.number().int().min(1).max(30).optional(),
          longBreakDuration: z.number().int().min(5).max(60).optional(),
          cyclesBeforeLongBreak: z.number().int().min(2).max(10).optional(),
        })
        .optional(),
      notifications: z.boolean().optional(),
    })
    .optional(),
});

// Goal Schema
export const goalSchema = z.object({
  title: z.string().min(1).max(200),
  why: z.string().max(500).optional(),
  firstStep: z.string().max(200).optional(),
  blockers: z.string().max(500).optional(),
  dueAt: z.string().datetime().optional(),
});

// AI Response Types
export const aiClassificationSchema = z.object({
  sentiment: z.enum([SENTIMENT.POSITIVE, SENTIMENT.NEUTRAL, SENTIMENT.NEGATIVE]),
  riskTags: z.array(z.string()),
  severity: z.number().int().min(1).max(3),
});

export type AIClassification = z.infer<typeof aiClassificationSchema>;

// Export all inferred types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
