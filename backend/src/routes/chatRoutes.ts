import { Router, Request, Response } from 'express';
import agentOrchestrator from '../orchestrator/agentOrchestrator';
import { masterAgent } from '../agents';
import llmProvider from '../utils/llmProvider';
import { asyncHandler, authMiddleware, validateChatRequest } from '../middleware';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/chat/simple
 * Simple chat endpoint without database - uses LLM directly
 */
router.post(
  '/simple',
  asyncHandler(async (req: Request, res: Response) => {
    const { message } = req.body;
    const userId = req.headers['x-user-id'] as string || 'guest';

    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    logger.info('Simple chat request received', { userId, messagePreview: message.substring(0, 50) });

    try {
      // For simple chat, just call LLM directly with business-focused system prompt
      let systemPrompt = `You are a helpful AI assistant for Indian MSMEs (Micro, Small and Medium Enterprises). 
You help with business registration, compliance requirements, platform onboarding (Amazon, Flipkart, Swiggy, Zomato, etc.), 
and general business guidance. Provide practical, actionable advice specific to the Indian business landscape.

Be conversational, helpful, and encourage users to take next steps. Use emojis sparingly for friendliness.

Focus areas:
- Business registration (MSME, GST, Shop & Establishment)
- Required licenses (FSSAI for food, Trade License, etc.)
- E-commerce platform onboarding
- Document requirements
- Compliance timelines
- Cost estimates

Always ask follow-up questions to better understand the user's business needs.`;

      // Call LLM directly
      const llmResponse = await llmProvider.generateText(
        message,
        systemPrompt,
        { temperature: 0.7, max_tokens: 800 }
      );

      res.json({
        success: true,
        data: {
          message: llmResponse.content,
          agent_used: 'master',
          intent: 'GENERAL_CHAT',
          provider: llmResponse.provider,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      logger.error('Simple chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message',
        message: error.message
      });
    }
  })
);

/**
 * POST /api/chat
 * Main chat endpoint - sends message to AI agent system
 */
router.post(
  '/',
  authMiddleware,
  validateChatRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { message, session_id } = req.body;

    logger.info('Chat request received', { userId, messagePreview: message.substring(0, 50) });

    // Get or create session
    let sessionId = session_id;
    if (!sessionId) {
      sessionId = await agentOrchestrator.getOrCreateSession(userId);
    }

    // Process message through agent orchestrator
    const response = await agentOrchestrator.processMessage(
      userId,
      sessionId,
      message
    );

    res.json({
      success: true,
      data: {
        session_id: sessionId,
        message: response.message,
        agent_used: response.agent_used,
        intent: response.intent,
        timestamp: new Date().toISOString(),
        metadata: response.metadata
      }
    });
  })
);

/**
 * GET /api/chat/history/:sessionId
 * Get conversation history for a session
 */
router.get(
  '/history/:sessionId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    const messages = await agentOrchestrator.getConversationHistory(sessionId);

    res.json({
      success: true,
      data: {
        session_id: sessionId,
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          agent_used: msg.agent_used,
          intent: msg.intent,
          timestamp: msg.timestamp
        })),
        count: messages.length
      }
    });
  })
);

/**
 * POST /api/chat/session/new
 * Create a new chat session
 */
router.post(
  '/session/new',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    const sessionId = await agentOrchestrator.getOrCreateSession(userId);

    res.json({
      success: true,
      data: {
        session_id: sessionId,
        message: 'New session created'
      }
    });
  })
);

/**
 * POST /api/chat/session/end
 * End the current chat session
 */
router.post(
  '/session/end',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { session_id } = req.body;

    if (!session_id) {
      return res.status(400).json({
        success: false,
        error: 'session_id is required'
      });
    }

    await agentOrchestrator.endSession(session_id);

    res.json({
      success: true,
      message: 'Session ended successfully'
    });
  })
);

export default router;
