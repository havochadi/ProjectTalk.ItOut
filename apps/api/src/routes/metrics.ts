import { Router, Response } from 'express';
import { User } from '../models/User';
import { CheckIn } from '../models/CheckIn';
import { Session } from '../models/Session';
import { Message } from '../models/Message';
import { RiskFlag } from '../models/RiskFlag';
import { Task } from '../models/Task';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { USER_ROLES, FLAG_STATUS } from '@talkitout/lib';

const router = Router();

/**
 * GET /metrics/aggregate - Get aggregated metrics (counselor/admin only)
 */
router.get(
  '/aggregate',
  authenticate,
  authorize(USER_ROLES.COUNSELOR, USER_ROLES.ADMIN),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { days = 7 } = req.query;
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

      // Total users
      const totalStudents = await User.countDocuments({ role: USER_ROLES.STUDENT });
      const studentIds = await User.find({ role: USER_ROLES.STUDENT }).distinct('_id');

      // Active users (checked in or messaged in period)
      const activeCheckIns = await CheckIn.distinct('userId', { createdAt: { $gte: daysAgo } });
      const activeMessages = await Message.distinct('userId', { createdAt: { $gte: daysAgo } });
      const activeUsers = new Set([...activeCheckIns, ...activeMessages]);

      // Average mood
      const recentCheckIns = await CheckIn.find({ createdAt: { $gte: daysAgo } });
      const avgMood = recentCheckIns.length > 0
        ? recentCheckIns.reduce((sum, c) => sum + c.mood, 0) / recentCheckIns.length
        : 0;

      // Focus sessions
      const totalSessions = await Session.countDocuments({
        startedAt: { $gte: daysAgo },
        endedAt: { $ne: null },
      });

      const completedCycles = await Session.aggregate([
        {
          $match: {
            startedAt: { $gte: daysAgo },
            endedAt: { $ne: null },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$cyclesCompleted' },
          },
        },
      ]);

      // Risk metrics
      const openFlags = await RiskFlag.countDocuments({
        status: FLAG_STATUS.OPEN,
        userId: { $in: studentIds },
      });
      const recentFlags = await RiskFlag.countDocuments({
        createdAt: { $gte: daysAgo },
        userId: { $in: studentIds },
      });

      const flagsBySeverity = await RiskFlag.aggregate([
        { $match: { status: FLAG_STATUS.OPEN, userId: { $in: studentIds } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]);

      // Sentiment distribution
      const sentimentDist = await Message.aggregate([
        {
          $match: {
            role: 'user',
            createdAt: { $gte: daysAgo },
            sentiment: { $exists: true },
          },
        },
        { $group: { _id: '$sentiment', count: { $sum: 1 } } },
      ]);

      res.json({
        users: {
          total: totalStudents,
          active: activeUsers.size,
        },
        mood: {
          average: Math.round(avgMood * 10) / 10,
          totalCheckIns: recentCheckIns.length,
        },
        focus: {
          sessions: totalSessions,
          completedCycles: completedCycles[0]?.total || 0,
        },
        risk: {
          openFlags,
          recentFlags,
          bySeverity: flagsBySeverity.reduce((acc: any, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
        },
        sentiment: sentimentDist.reduce((acc: any, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /metrics/user/:userId - Get metrics for a specific user
 */
router.get(
  '/user/:userId',
  authenticate,
  authorize(USER_ROLES.COUNSELOR, USER_ROLES.ADMIN),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { userId } = req.params;
      const { days = 30 } = req.query;
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

      // Check-in metrics
      const checkIns = await CheckIn.find({
        userId,
        createdAt: { $gte: daysAgo },
      }).sort({ createdAt: 1 });

      const avgMood = checkIns.length > 0
        ? checkIns.reduce((sum, c) => sum + c.mood, 0) / checkIns.length
        : 0;

      const lastCheckIn = checkIns.length > 0 ? checkIns[checkIns.length - 1].createdAt : null;

      // Task metrics
      const allTasks = await Task.find({ userId, createdAt: { $gte: daysAgo } });
      const taskMetrics = {
        total: allTasks.length,
        completed: allTasks.filter((task) => task.status === 'done').length,
      };

      // Focus sessions
      const sessions = await Session.find({
        userId,
        startedAt: { $gte: daysAgo },
        endedAt: { $ne: null },
      });

      const totalMinutes = sessions.reduce((sum, s) => {
        if (s.endedAt) {
          const duration = (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000 / 60;
          return sum + duration;
        }
        return sum;
      }, 0);

      // Risk flags
      const flags = await RiskFlag.find({ userId }).sort({ createdAt: -1 });

      res.json({
        checkIns: {
          total: checkIns.length,
          averageMood: Math.round(avgMood * 10) / 10,
          lastCheckIn: lastCheckIn,
        },
        tasks: taskMetrics,
        focus: {
          totalSessions: sessions.length,
          totalMinutes: Math.round(totalMinutes),
        },
        riskFlags: flags,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
