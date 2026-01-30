import { Router } from 'express';
import chatRoutes from './chatRoutes';
import profileRoutes from './profileRoutes';
import documentRoutes from './documentRoutes';
import complianceRoutes from './complianceRoutes';
import platformRoutes from './platformRoutes';
import userRoutes from './userRoutes';
import healthRoutes from './healthRoutes';
import debugRoutes from './debugRoutes';

const router = Router();

// API Routes
router.use('/chat', chatRoutes);
router.use('/profile', profileRoutes);
router.use('/documents', documentRoutes);
router.use('/compliance', complianceRoutes);
router.use('/platforms', platformRoutes);
router.use('/users', userRoutes);
router.use('/health', healthRoutes);

// Debug routes (only in development)
if (process.env.NODE_ENV === 'development') {
  router.use('/debug', debugRoutes);
}

export default router;
