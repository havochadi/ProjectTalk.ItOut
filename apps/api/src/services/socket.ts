import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '../middleware/auth';

export function setupSocketIO(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
      ],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const payload = verifyToken(token);
      if (payload.type !== 'access') {
        return next(new Error('Invalid token type'));
      }

      socket.data.userId = payload.userId;
      socket.data.userRole = payload.role;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    const userRole = socket.data.userRole;
    console.log(`User connected: ${userId}`);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Join counselors room if user is a counselor
    if (userRole === 'counselor' || userRole === 'admin') {
      socket.join('counselors');
      console.log(`Counselor connected to notifications: ${userId}`);
    }

    // Pomodoro events
    socket.on('pomodoro:start', (data) => {
      socket.to(`user:${userId}`).emit('pomodoro:start', {
        startedAt: new Date(),
        ...data,
      });
    });

    socket.on('pomodoro:tick', (data) => {
      socket.to(`user:${userId}`).emit('pomodoro:tick', data);
    });

    socket.on('pomodoro:stop', (data) => {
      socket.to(`user:${userId}`).emit('pomodoro:stop', {
        endedAt: new Date(),
        ...data,
      });
    });

    socket.on('pomodoro:pause', (data) => {
      socket.to(`user:${userId}`).emit('pomodoro:pause', data);
    });

    socket.on('pomodoro:resume', (data) => {
      socket.to(`user:${userId}`).emit('pomodoro:resume', data);
    });

    // Task events
    socket.on('task:update', (data) => {
      socket.to(`user:${userId}`).emit('task:update', data);
    });

    socket.on('task:create', (data) => {
      socket.to(`user:${userId}`).emit('task:create', data);
    });

    socket.on('task:delete', (data) => {
      socket.to(`user:${userId}`).emit('task:delete', data);
    });

    // Chat events
    socket.on('chat:typing', () => {
      socket.to(`user:${userId}`).emit('chat:typing');
    });

    socket.on('chat:stop-typing', () => {
      socket.to(`user:${userId}`).emit('chat:stop-typing');
    });

    // Disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
    });
  });

  return io;
}

export function emitToUser(io: SocketIOServer, userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data);
}

export function emitToCounselors(io: SocketIOServer, event: string, data: any) {
  io.to('counselors').emit(event, data);
}
