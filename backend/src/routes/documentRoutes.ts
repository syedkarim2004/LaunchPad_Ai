import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { documentRepo, businessProfileRepo } from '../database/repositories';
import { documentAgent } from '../agents';
import agentOrchestrator from '../orchestrator/agentOrchestrator';
import { asyncHandler, authMiddleware } from '../middleware';
import logger from '../utils/logger';

const router = Router();

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * POST /api/documents/upload
 * Upload a document and analyze it
 */
router.post(
  '/upload',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    if (!req.files || !req.files.document) {
      return res.status(400).json({
        success: false,
        error: 'No document file provided'
      });
    }

    const file = req.files.document as any;

    // Validate file size
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760');
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: `File size exceeds maximum of ${maxSize / 1024 / 1024}MB`
      });
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Allowed: PDF, JPEG, PNG'
      });
    }

    // Get business profile
    const profile = await businessProfileRepo.getProfileByUserId(userId);
    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Business profile not found. Please create a profile first.'
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${userId}_${timestamp}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    await file.mv(filePath);

    logger.info('Document uploaded', {
      userId,
      fileName: file.name,
      size: file.size,
      type: file.mimetype
    });

    // Analyze document with Document Agent
    const context = {
      user_id: userId,
      session_id: req.body.session_id || '',
      business_profile: profile,
      message_history: []
    };

    const analysis = await documentAgent.process(
      'I have uploaded a document',
      context,
      { name: file.name, size: file.size, mimetype: file.mimetype }
    );

    // Save document to database
    const document = await documentRepo.createDocument({
      user_id: userId,
      business_profile_id: profile.id,
      document_type: analysis.metadata?.document_type || 'Unknown',
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.mimetype,
      extracted_metadata: analysis.metadata,
      compliance_relevance: analysis.metadata?.compliance_relevance || []
    });

    res.status(201).json({
      success: true,
      data: {
        document_id: document.id,
        file_name: file.name,
        document_type: analysis.metadata?.document_type,
        compliance_relevance: analysis.metadata?.compliance_relevance,
        analysis: analysis.message
      }
    });
  })
);

/**
 * GET /api/documents
 * Get all documents for user
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    const documents = await documentRepo.getDocumentsByUserId(userId);

    res.json({
      success: true,
      data: {
        documents: documents.map(doc => ({
          id: doc.id,
          document_type: doc.document_type,
          file_name: doc.file_name,
          file_size: doc.file_size,
          compliance_relevance: doc.compliance_relevance,
          uploaded_at: doc.uploaded_at
        })),
        count: documents.length
      }
    });
  })
);

/**
 * GET /api/documents/:id
 * Get specific document details
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const document = await documentRepo.getDocumentById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    }

    res.json({
      success: true,
      data: document
    });
  })
);

/**
 * GET /api/documents/requirements
 * Get document requirements based on profile
 */
router.get(
  '/requirements/check',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).userId;

    // Get uploaded documents
    const uploadedDocs = await documentRepo.getDocumentsByUserId(userId);
    const uploadedTypes = uploadedDocs.map(d => d.document_type);

    // Get required documents from profile context
    const profile = await businessProfileRepo.getProfileByUserId(userId);
    
    if (!profile) {
      return res.json({
        success: true,
        data: {
          message: 'Create a business profile first to see document requirements'
        }
      });
    }

    // Common required documents
    const commonDocs = [
      { type: 'PAN Card', required: true, description: 'Required for most registrations' },
      { type: 'Aadhaar Card', required: true, description: 'Identity verification' },
      { type: 'Address Proof', required: true, description: 'Business or personal address' },
      { type: 'Bank Statement', required: true, description: 'Required for GST, platform onboarding' }
    ];

    // Mark what's uploaded
    const requirements = commonDocs.map(doc => ({
      ...doc,
      uploaded: uploadedTypes.includes(doc.type),
      status: uploadedTypes.includes(doc.type) ? '✅ Uploaded' : '❌ Missing'
    }));

    res.json({
      success: true,
      data: {
        requirements,
        summary: {
          total: requirements.length,
          uploaded: requirements.filter(r => r.uploaded).length,
          missing: requirements.filter(r => !r.uploaded).length
        }
      }
    });
  })
);

export default router;
