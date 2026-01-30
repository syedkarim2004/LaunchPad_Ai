import { Router, Request, Response } from 'express';
import ruleEngine from '../utils/ruleEngine';
import { businessProfileRepo, complianceResultRepo } from '../database/repositories';
import { asyncHandler, authMiddleware } from '../middleware';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/compliance/check
 * Check applicable compliances for user's business profile
 */
router.get(
  '/check',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    const profile = await businessProfileRepo.getProfileByUserId(userId);

    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Business profile not found. Please create a profile first.'
      });
    }

    // Get applicable compliances
    const compliances = ruleEngine.getApplicableCompliances(profile);
    const mandatory = compliances.filter(c => c.mandatory);
    const optional = compliances.filter(c => !c.mandatory);

    // Calculate costs
    const costEstimate = ruleEngine.calculateTotalCost(compliances);

    logger.info('Compliance check performed', {
      userId,
      profileId: profile.id,
      totalCompliances: compliances.length
    });

    res.json({
      success: true,
      data: {
        mandatory_compliances: mandatory.map(c => ({
          id: c.id,
          name: c.name,
          level: c.level,
          authority: c.authority,
          timeline: c.estimated_timeline,
          cost: c.estimated_cost,
          penalty: c.penalty,
          documents_required: c.documents_required
        })),
        optional_compliances: optional.map(c => ({
          id: c.id,
          name: c.name,
          level: c.level,
          description: c.description,
          timeline: c.estimated_timeline,
          cost: c.estimated_cost
        })),
        summary: {
          total: compliances.length,
          mandatory: mandatory.length,
          optional: optional.length,
          estimated_cost: costEstimate
        }
      }
    });
  })
);

/**
 * GET /api/compliance/:id
 * Get details of a specific compliance
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const compliance = ruleEngine.getComplianceById(id);

    if (!compliance) {
      return res.status(404).json({
        success: false,
        error: 'Compliance not found'
      });
    }

    res.json({
      success: true,
      data: compliance
    });
  })
);

/**
 * GET /api/compliance/timeline
 * Get implementation timeline for compliances
 */
router.get(
  '/timeline/generate',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    const profile = await businessProfileRepo.getProfileByUserId(userId);

    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Business profile not found'
      });
    }

    const compliances = ruleEngine.getApplicableCompliances(profile);
    const timeline = ruleEngine.generateTimeline(compliances);

    res.json({
      success: true,
      data: {
        timeline,
        total_weeks: Math.max(...timeline.map(t => t.week), 0),
        total_compliances: compliances.length
      }
    });
  })
);

/**
 * GET /api/compliance/search
 * Search compliances by keyword
 */
router.get(
  '/search/:keyword',
  asyncHandler(async (req: Request, res: Response) => {
    const { keyword } = req.params;

    const results = ruleEngine.searchRules(keyword);

    res.json({
      success: true,
      data: {
        results: results.map(r => ({
          id: r.id,
          name: r.name,
          level: r.level,
          description: r.description,
          authority: r.authority
        })),
        count: results.length
      }
    });
  })
);

/**
 * GET /api/compliance/status
 * Get user's compliance status (saved results)
 */
router.get(
  '/status/all',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    const profile = await businessProfileRepo.getProfileByUserId(userId);

    if (!profile) {
      return res.json({
        success: true,
        data: {
          message: 'No business profile found',
          results: []
        }
      });
    }

    const results = await complianceResultRepo.getComplianceResultsByProfile(profile.id);

    res.json({
      success: true,
      data: {
        results: results.map(r => ({
          id: r.id,
          compliance_id: r.compliance_id,
          compliance_name: r.compliance_name,
          level: r.level,
          is_mandatory: r.is_mandatory,
          status: r.status,
          documents_required: r.documents_required
        })),
        summary: {
          total: results.length,
          completed: results.filter(r => r.status === 'completed').length,
          in_progress: results.filter(r => r.status === 'in_progress').length,
          pending: results.filter(r => r.status === 'pending').length
        }
      }
    });
  })
);

/**
 * PUT /api/compliance/status/:id
 * Update compliance status
 */
router.put(
  '/status/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'in_progress', 'completed', 'not_applicable'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updated = await complianceResultRepo.updateComplianceStatus(id, status);

    res.json({
      success: true,
      data: updated
    });
  })
);

export default router;
