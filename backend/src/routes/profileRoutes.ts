import { Router, Request, Response } from 'express';
import { businessProfileRepo } from '../database/repositories';
import { asyncHandler, authMiddleware } from '../middleware';
import { BusinessProfile } from '../types';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/profile
 * Get user's business profile
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    const profile = await businessProfileRepo.getProfileByUserId(userId);

    if (!profile) {
      return res.json({
        success: true,
        data: null,
        message: 'No business profile found. Start chatting to create one!'
      });
    }

    res.json({
      success: true,
      data: profile
    });
  })
);

/**
 * POST /api/profile
 * Create a new business profile
 */
router.post(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const profileData = req.body;

    // Check if profile already exists
    const existingProfile = await businessProfileRepo.getProfileByUserId(userId);
    
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        error: 'Profile already exists. Use PUT to update.'
      });
    }

    const profile = await businessProfileRepo.createProfile({
      user_id: userId,
      ...profileData
    });

    logger.info('Business profile created', { userId, profileId: profile.id });

    res.status(201).json({
      success: true,
      data: profile,
      message: 'Business profile created successfully'
    });
  })
);

/**
 * PUT /api/profile
 * Update business profile
 */
router.put(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const updates = req.body;

    // Get existing profile
    const existingProfile = await businessProfileRepo.getProfileByUserId(userId);
    
    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found. Create one first.'
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.created_at;

    const updatedProfile = await businessProfileRepo.updateProfile(
      existingProfile.id,
      updates
    );

    logger.info('Business profile updated', { userId, profileId: existingProfile.id });

    res.json({
      success: true,
      data: updatedProfile,
      message: 'Business profile updated successfully'
    });
  })
);

/**
 * GET /api/profile/completeness
 * Check profile completeness for compliance checking
 */
router.get(
  '/completeness',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    const profile = await businessProfileRepo.getProfileByUserId(userId);

    if (!profile) {
      return res.json({
        success: true,
        data: {
          completeness: 0,
          missing_fields: ['All fields - no profile exists'],
          ready_for_compliance_check: false
        }
      });
    }

    // Check required fields for compliance checking
    const requiredFields = [
      'business_type',
      'state',
      'city'
    ];

    const optionalButImportant = [
      'business_name',
      'annual_turnover',
      'employee_count',
      'sells_food',
      'online_delivery',
      'has_physical_store'
    ];

    const allFields = [...requiredFields, ...optionalButImportant];
    const presentFields = allFields.filter(field => (profile as any)[field] !== null && (profile as any)[field] !== undefined);
    const missingRequired = requiredFields.filter(field => !(profile as any)[field]);
    const missingOptional = optionalButImportant.filter(field => (profile as any)[field] === null || (profile as any)[field] === undefined);

    const completeness = Math.round((presentFields.length / allFields.length) * 100);

    res.json({
      success: true,
      data: {
        completeness,
        missing_required: missingRequired,
        missing_optional: missingOptional,
        ready_for_compliance_check: missingRequired.length === 0,
        profile_summary: {
          business_name: profile.business_name || 'Not set',
          business_type: profile.business_type || 'Not set',
          location: profile.city && profile.state ? `${profile.city}, ${profile.state}` : 'Not set'
        }
      }
    });
  })
);

export default router;
