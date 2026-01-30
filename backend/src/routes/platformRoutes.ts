import { Router, Request, Response } from 'express';
import ruleEngine from '../utils/ruleEngine';
import { businessProfileRepo } from '../database/repositories';
import { asyncHandler, authMiddleware } from '../middleware';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/platforms
 * Get all available platforms
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const platforms = ruleEngine.getAllPlatforms();

    res.json({
      success: true,
      data: {
        platforms: platforms.map(p => ({
          name: p.platform,
          type: p.type,
          commission: p.estimated_cost.commission,
          timeline: p.estimated_timeline,
          website: p.website
        })),
        count: platforms.length
      }
    });
  })
);

/**
 * GET /api/platforms/:name
 * Get detailed requirements for a specific platform
 */
router.get(
  '/:name',
  asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.params;

    const platform = ruleEngine.getPlatformRequirements(name);

    if (!platform) {
      return res.status(404).json({
        success: false,
        error: `Platform ${name} not found`
      });
    }

    res.json({
      success: true,
      data: platform
    });
  })
);

/**
 * GET /api/platforms/:name/eligibility
 * Check user's eligibility for a platform
 */
router.get(
  '/:name/eligibility',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;
    const { name } = req.params;

    const profile = await businessProfileRepo.getProfileByUserId(userId);

    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Business profile not found. Please create a profile first.'
      });
    }

    const eligibility = ruleEngine.checkPlatformEligibility(name, profile);
    const platformReq = ruleEngine.getPlatformRequirements(name);

    logger.info('Platform eligibility checked', {
      userId,
      platform: name,
      eligible: eligibility.eligible
    });

    res.json({
      success: true,
      data: {
        platform: name,
        eligible: eligibility.eligible,
        missing_compliances: eligibility.missing_compliances,
        message: eligibility.message,
        requirements: platformReq ? {
          documents: platformReq.requirements.documents_required,
          business_types: platformReq.requirements.business_type,
          onboarding_steps: platformReq.onboarding_steps
        } : null,
        next_steps: eligibility.eligible
          ? 'You are ready to start the onboarding process!'
          : `Complete these compliances first: ${eligibility.missing_compliances.join(', ')}`
      }
    });
  })
);

/**
 * GET /api/platforms/compare
 * Compare multiple platforms
 */
router.post(
  '/compare',
  asyncHandler(async (req: Request, res: Response) => {
    const { platforms: platformNames } = req.body;

    if (!platformNames || !Array.isArray(platformNames)) {
      return res.status(400).json({
        success: false,
        error: 'platforms array is required'
      });
    }

    const comparisons = platformNames.map(name => {
      const platform = ruleEngine.getPlatformRequirements(name);
      
      if (!platform) {
        return { name, found: false };
      }

      return {
        name: platform.platform,
        found: true,
        type: platform.type,
        commission: platform.estimated_cost.commission,
        registration_fee: platform.estimated_cost.registration_fee,
        timeline: platform.estimated_timeline,
        mandatory_compliance: platform.requirements.mandatory_compliance,
        documents_count: platform.requirements.documents_required.length
      };
    });

    res.json({
      success: true,
      data: {
        comparisons,
        recommendation: 'Consider starting with platforms that require compliances you already have.'
      }
    });
  })
);

export default router;
