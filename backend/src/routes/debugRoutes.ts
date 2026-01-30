import { Router, Request, Response } from 'express';
import llmProvider from '../utils/llmProvider';
import { masterAgent } from '../agents';
import { asyncHandler } from '../middleware';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/debug/test-llm
 * Test LLM integration directly
 */
router.post('/test-llm', asyncHandler(async (req: Request, res: Response) => {
  const { message = "Hello, I want to start a business in India" } = req.body;

  try {
    logger.info('Testing LLM with message:', message);

    const systemPrompt = `You are a helpful AI assistant for Indian businesses. Provide clear, helpful advice about business registration, compliance, and growth opportunities.`;

    const response = await llmProvider.generateText(
      message,
      systemPrompt,
      { temperature: 0.7, max_tokens: 500 }
    );

    res.json({
      success: true,
      data: {
        message,
        llm_response: response.content,
        provider: response.provider,
        model: response.model,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('LLM test failed:', error);
    res.status(500).json({
      success: false,
      error: 'LLM test failed',
      message: error.message
    });
  }
}));

/**
 * POST /api/debug/test-agent
 * Test master agent directly
 */
router.post('/test-agent', asyncHandler(async (req: Request, res: Response) => {
  const { message = "Hello" } = req.body;

  try {
    logger.info('Testing Master Agent with message:', message);

    const mockContext = {
      user_id: 'test-user',
      session_id: 'test-session',
      message_history: [],
      business_profile: undefined,
      uploaded_documents: [],
      compliance_status: undefined,
      current_intent: undefined
    };

    const response = await masterAgent.processMessage(message, mockContext);

    res.json({
      success: true,
      data: {
        message,
        agent_response: response.reasoning,
        agent_used: response.selected_agent,
        intent: response.intent,
        context_summary: response.context_summary,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    logger.error('Agent test failed:', error);
    res.status(500).json({
      success: false,
      error: 'Agent test failed',
      message: error.message
    });
  }
}));

/**
 * GET /api/debug/config
 * Show configuration status
 */
router.get('/config', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      groq_configured: !!process.env.GROQ_API_KEY,
      groq_url: process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1',
      groq_model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      ollama_configured: !!process.env.OLLAMA_BASE_URL,
      supabase_configured: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      timestamp: new Date().toISOString()
    }
  });
}));

export default router;