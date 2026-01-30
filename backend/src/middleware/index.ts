import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent')
    });
  });

  next();
};

/**
 * Error handling middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
};

/**
 * Not found middleware
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
};

/**
 * Async handler wrapper to catch errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Simple authentication middleware (mock implementation)
 * In production, use proper JWT verification with NextAuth
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.headers['x-user-id'] as string;
  
  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'User ID required in x-user-id header'
    });
    return;
  }

  // Attach user ID to request
  (req as any).userId = userId;
  next();
};

/**
 * Rate limiting middleware (simple implementation)
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const rateLimiter = (maxRequests: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = (req as any).userId || req.ip;
    const now = Date.now();

    if (!requestCounts.has(userId)) {
      requestCounts.set(userId, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    const userLimit = requestCounts.get(userId)!;
    
    if (now > userLimit.resetTime) {
      userLimit.count = 1;
      userLimit.resetTime = now + windowMs;
      next();
      return;
    }

    if (userLimit.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.'
      });
      return;
    }

    userLimit.count++;
    next();
  };
};

/**
 * CORS configuration
 */
export const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-session-id']
};

/**
 * Request validation middleware
 */
export const validateChatRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { message } = req.body;

  if (!message || typeof message !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Message is required and must be a string'
    });
    return;
  }

  if (message.length > 5000) {
    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Message exceeds maximum length of 5000 characters'
    });
    return;
  }

  next();
};
