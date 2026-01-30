import { Router, Request, Response } from 'express';
import { userRepo, sessionRepo } from '../database/repositories';
import { asyncHandler, authMiddleware } from '../middleware';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/users/register
 * Register a new user
 */
router.post(
  '/register',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, name, phone } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        error: 'Email and name are required'
      });
    }

    // Check if user already exists
    const existingUser = await userRepo.getUserByEmail(email);
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    const user = await userRepo.createUser({ email, name, phone });

    logger.info('User registered', { userId: user.id, email });

    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  })
);

/**
 * GET /api/users/me
 * Get current user profile
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    const user = await userRepo.getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        created_at: user.created_at
      }
    });
  })
);

/**
 * PUT /api/users/me
 * Update current user profile
 */
router.put(
  '/me',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { name, phone } = req.body;

    const updates: any = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;

    const user = await userRepo.updateUser(userId, updates);

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone
      }
    });
  })
);

/**
 * GET /api/users/sessions
 * Get user's chat sessions
 */
router.get(
  '/sessions',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    const activeSession = await sessionRepo.getActiveSessionForUser(userId);

    res.json({
      success: true,
      data: {
        active_session: activeSession ? {
          id: activeSession.id,
          started_at: activeSession.started_at
        } : null
      }
    });
  })
);

export default router;
