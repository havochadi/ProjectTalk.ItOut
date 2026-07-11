import { Router, Response } from 'express';
import { Message } from '../models/Message';
import { RiskFlag } from '../models/RiskFlag';
import { User } from '../models/User';
import { chatMessageSchema } from '@talkitout/lib';
import { validateBody } from '../middleware/validation';
import { authenticate, AuthRequest } from '../middleware/auth';
import { aiLimiter } from '../middleware/rateLimiter';
import { analyzeText, generateResponse, addCrisisMessageIfNeeded } from '../services/ai/openaiService';
import { emitToCounselors } from '../services/socket';
import { RISK_SEVERITY, RISK_TAGS, USER_ROLES } from '@talkitout/lib';

const router = Router();

/**
 * POST /chat/message - Send a message and get AI response
 */
router.post(
  '/message',
  authenticate,
  aiLimiter,
  validateBody(chatMessageSchema),
  async (req: AuthRequest, res: Response, next) => {
    try {
      const { text } = req.body;

      // Get user information
      const user = await User.findById(req.userId);
      const isStudentUser = user?.role === USER_ROLES.STUDENT;

      // Analyze user message
      const analysis = await analyzeText(text);
      console.log('📊 Message analysis result:', { severity: analysis.severity, riskTags: analysis.riskTags });
      const riskTagsForFlag =
        analysis.riskTags.length > 0
          ? analysis.riskTags
          : analysis.severity >= RISK_SEVERITY.MEDIUM
          ? [RISK_TAGS.SEVERE_STRESS]
          : [];

      // Save user message
      const userMessage = await Message.create({
        userId: req.userId,
        role: 'user',
        text,
        sentiment: analysis.sentiment,
        riskTags: riskTagsForFlag,
        severity: analysis.severity,
      });

      // Create risk flag if severity is medium or high
      if (isStudentUser && analysis.severity >= RISK_SEVERITY.MEDIUM) {
        console.log('🚨 HIGH RISK MESSAGE DETECTED! Creating risk flag...', {
          severity: analysis.severity,
          tags: riskTagsForFlag,
        });
        const riskFlag = await RiskFlag.create({
          userId: req.userId,
          messageId: userMessage._id,
          tags: riskTagsForFlag,
          severity: analysis.severity,
          status: 'open',
        });
        console.log('✅ Risk flag created successfully');

        // Notify counselors in real-time
        const io = req.app.get('io');
        if (io) {
          emitToCounselors(io, 'riskFlag:created', {
            flagId: riskFlag._id,
            studentId: req.userId,
            studentName: user?.name,
            severity: analysis.severity,
            tags: riskTagsForFlag,
            messageText: text,
            createdAt: new Date(),
          });
          console.log('📢 Risk flag notification sent to counselors');
        }
      } else if (analysis.severity < RISK_SEVERITY.MEDIUM) {
        console.log('✓ Message below risk threshold - severity:', analysis.severity, 'tags:', riskTagsForFlag);
      } else {
        console.log('ℹ️ High-risk content detected for non-student user; risk flag creation skipped');
      }

      // Generate AI response with user's name
      let aiResponseText = await generateResponse(req.userId!, text, {
        userName: user?.name,
        latestSentiment: analysis.sentiment,
        latestSeverity: analysis.severity,
        latestRiskTags: riskTagsForFlag,
      });

      // Add crisis message if needed
      aiResponseText = addCrisisMessageIfNeeded(aiResponseText, analysis.severity);

      // Save AI message
      const aiMessage = await Message.create({
        userId: req.userId,
        role: 'assistant',
        text: aiResponseText,
      });

      res.json({
        userMessage: {
          id: userMessage._id,
          text: userMessage.text,
          sentiment: userMessage.sentiment,
          severity: userMessage.severity,
          createdAt: userMessage.createdAt,
        },
        aiMessage: {
          id: aiMessage._id,
          text: aiMessage.text,
          createdAt: aiMessage.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /chat/history - Get chat history
 */
router.get('/history', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const messages = await Message.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      messages: messages.reverse(), // Return in chronological order
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /chat/history - Clear chat history
 */
router.delete('/history', authenticate, async (req: AuthRequest, res: Response, next) => {
  try {
    await Message.deleteMany({ userId: req.userId });
    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    next(error);
  }
});

export default router;
