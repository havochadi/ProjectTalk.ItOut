import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { RiskFlag } from '../models/RiskFlag';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { USER_ROLES, FLAG_STATUS } from '@talkitout/lib';
import { AppError } from '../middleware/errorHandler';

const router = Router();

/**
 * GET /risk/flags - Get risk flags (counselor/admin only)
 */
router.get(
  '/flags',
  authenticate,
  authorize(USER_ROLES.COUNSELOR, USER_ROLES.ADMIN),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, severity, userId } = req.query;
      const query: any = {};

      if (status) query.status = status;
      if (severity) query.severity = parseInt(severity as string);

      const studentQuery: any = { role: USER_ROLES.STUDENT };
      if (userId) {
        studentQuery._id = userId;
      }
      const studentIds = await User.find(studentQuery).distinct('_id');
      query.userId = { $in: studentIds };

      const flags = await RiskFlag.find(query)
        .populate('userId', 'name email age school')
        .populate('messageId', 'text createdAt')
        .sort({ severity: -1, createdAt: -1 })
        .limit(100);

      res.json({ flags });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /risk/flags/:id - Get a single risk flag
 */
router.get(
  '/flags/:id',
  authenticate,
  authorize(USER_ROLES.COUNSELOR, USER_ROLES.ADMIN),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const flag = await RiskFlag.findById(req.params.id)
        .populate('userId', 'name email age school')
        .populate('messageId', 'text createdAt');

      if (!flag) {
        throw new AppError(404, 'Risk flag not found');
      }

      const flagUser = await User.findById(flag.userId).select('role').lean();
      if (!flagUser || flagUser.role !== USER_ROLES.STUDENT) {
        throw new AppError(404, 'Risk flag not found');
      }

      // Get context messages (before and after)
      const contextMessages = await Message.find({
        userId: flag.userId,
        createdAt: {
          $gte: new Date(flag.createdAt.getTime() - 60 * 60 * 1000), // 1 hour before
          $lte: new Date(flag.createdAt.getTime() + 60 * 60 * 1000), // 1 hour after
        },
      }).sort({ createdAt: 1 });

      res.json({
        flag,
        context: contextMessages,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /risk/flags/:id - Update risk flag status
 */
router.patch(
  '/flags/:id',
  authenticate,
  authorize(USER_ROLES.COUNSELOR, USER_ROLES.ADMIN),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { status, notes } = req.body;
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        throw new AppError(400, 'Invalid risk flag id');
      }

      const normalizedStatus =
        typeof status === 'string' ? status.trim().toLowerCase().replace(/[\s-]+/g, '_') : undefined;

      if (normalizedStatus && !Object.values(FLAG_STATUS).includes(normalizedStatus as any)) {
        throw new AppError(400, 'Invalid status value');
      }

      if (notes !== undefined && notes !== null && typeof notes !== 'string') {
        throw new AppError(400, 'Notes must be a string');
      }

      const setUpdate: any = {};
      const unsetUpdate: any = {};

      if (normalizedStatus) {
        setUpdate.status = normalizedStatus;
        if (normalizedStatus === FLAG_STATUS.RESOLVED) {
          setUpdate.resolvedAt = new Date();
        } else {
          unsetUpdate.resolvedAt = '';
        }
      }
      if (notes !== undefined) setUpdate.notes = notes;
      if (req.userId) setUpdate.reviewedBy = req.userId;

      if (Object.keys(setUpdate).length === 0 && Object.keys(unsetUpdate).length === 0) {
        throw new AppError(400, 'No fields provided to update');
      }

      const updateDoc: any = {};
      if (Object.keys(setUpdate).length > 0) updateDoc.$set = setUpdate;
      if (Object.keys(unsetUpdate).length > 0) updateDoc.$unset = unsetUpdate;

      const existingFlag = await RiskFlag.findById(id).select('userId').lean();
      if (!existingFlag) {
        throw new AppError(404, 'Risk flag not found');
      }

      const flagUser = await User.findById(existingFlag.userId).select('role').lean();
      if (!flagUser || flagUser.role !== USER_ROLES.STUDENT) {
        throw new AppError(404, 'Risk flag not found');
      }

      const flag = await RiskFlag.findByIdAndUpdate(id, updateDoc, { new: true, runValidators: true })
        .populate('userId', 'name email age school')
        .populate('reviewedBy', 'name');

      if (!flag) {
        throw new AppError(404, 'Risk flag not found');
      }

      res.json(flag);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /risk/flags/:id - Delete a risk flag
 */
router.delete(
  '/flags/:id',
  authenticate,
  authorize(USER_ROLES.COUNSELOR, USER_ROLES.ADMIN),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const existingFlag = await RiskFlag.findById(req.params.id).select('userId').lean();
      if (!existingFlag) {
        throw new AppError(404, 'Risk flag not found');
      }

      const flagUser = await User.findById(existingFlag.userId).select('role').lean();
      if (!flagUser || flagUser.role !== USER_ROLES.STUDENT) {
        throw new AppError(404, 'Risk flag not found');
      }

      const flag = await RiskFlag.findByIdAndDelete(req.params.id);

      if (!flag) {
        throw new AppError(404, 'Risk flag not found');
      }

      res.json({ message: 'Risk flag deleted successfully', flag });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
