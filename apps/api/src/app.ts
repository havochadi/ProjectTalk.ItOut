import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFound } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import taskRoutes from './routes/tasks';
import chatRoutes from './routes/chat';
import checkInRoutes from './routes/checkins';
import pomodoroRoutes from './routes/pomodoro';
import riskRoutes from './routes/risk';
import metricsRoutes from './routes/metrics';
import privacyRoutes from './routes/privacy';
import adminRoutes from './routes/admin';
import voiceRoutes from './routes/voice';
import counselorMessagesRoutes from './routes/counselorMessages';

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ];
  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Rate limiting
  app.use(generalLimiter);

  // API Routes
  app.use('/auth', authRoutes);
  app.use('/users', userRoutes);
  app.use('/tasks', taskRoutes);
  app.use('/chat', chatRoutes);
  app.use('/checkins', checkInRoutes);
  app.use('/pomodoro', pomodoroRoutes);
  app.use('/risk', riskRoutes);
  app.use('/metrics', metricsRoutes);
  app.use('/privacy', privacyRoutes);
  app.use('/admin', adminRoutes);
  app.use('/voice', voiceRoutes);
  app.use('/counselor-messages', counselorMessagesRoutes);

  // Health check at root
  app.get('/', (req, res) => {
    res.json({
      name: 'TalkItOut API',
      version: '1.0.0',
      status: 'running',
    });
  });

  // 404 handler
  app.use(notFound);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
