import { Router, Request, Response } from 'express';
import llmProvider from '../utils/llmProvider';
import ruleEngine from '../utils/ruleEngine';
import { asyncHandler } from '../middleware';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    // Check LLM providers
    const llmHealth = await llmProvider.healthCheck();

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        api: 'healthy',
        grok_llm: llmHealth.grok ? 'healthy' : 'unhealthy',
        ollama_llm: llmHealth.ollama ? 'healthy' : 'unhealthy',
        rule_engine: 'healthy' // Rule engine is always available if server starts
      },
      response_time_ms: Date.now() - startTime
    };

    // Determine overall status
    const hasLLM = llmHealth.grok || llmHealth.ollama;
    
    if (!hasLLM) {
      healthStatus.status = 'degraded';
    }

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      data: healthStatus
    });
  })
);

/**
 * GET /api/health/detailed
 * Detailed health check
 */
router.get(
  '/detailed',
  asyncHandler(async (req: Request, res: Response) => {
    const llmHealth = await llmProvider.healthCheck();

    res.json({
      success: true,
      data: {
        node_version: process.version,
        memory_usage: process.memoryUsage(),
        env: process.env.NODE_ENV,
        llm_providers: {
          grok: {
            available: llmHealth.grok,
            url: process.env.GROK_API_URL || 'not configured'
          },
          ollama: {
            available: llmHealth.ollama,
            url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
          }
        },
        database: {
          type: 'Supabase',
          configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
        }
      }
    });
  })
);

export default router;
