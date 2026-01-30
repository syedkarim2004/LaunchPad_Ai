import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fileUpload from 'express-fileupload';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes and middleware
import routes from './routes';
import { 
  errorHandler, 
  notFoundHandler, 
  requestLogger,
  corsOptions,
  rateLimiter 
} from './middleware';
import logger from './utils/logger';

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors(corsOptions));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload middleware
app.use(fileUpload({
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
  abortOnLimit: true,
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: '/tmp/'
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}
app.use(requestLogger);

// Rate limiting
app.use(rateLimiter(100, 60000)); // 100 requests per minute

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Compliance Chatbot API',
    version: '1.0.0',
    description: 'Agentic AI Compliance & Business Setup Chatbot for Indian MSMEs',
    documentation: '/api/health',
    endpoints: {
      chat: '/api/chat',
      profile: '/api/profile',
      compliance: '/api/compliance',
      documents: '/api/documents',
      platforms: '/api/platforms',
      users: '/api/users',
      health: '/api/health'
    }
  });
});

// API Routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Log configuration status
    logger.info('Starting Compliance Chatbot Server...');
    
    // Check required environment variables
    const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const missingEnv = requiredEnv.filter(env => !process.env[env]);
    
    if (missingEnv.length > 0) {
      logger.warn(`Missing environment variables: ${missingEnv.join(', ')}`);
      logger.warn('Database operations will fail. Configure these before use.');
    }

    // Check LLM configuration
    if (!process.env.GROQ_API_KEY) {
      logger.warn('GROQ_API_KEY not set. Will fallback to Ollama.');
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api/health`);
      logger.info(`💬 Chat Endpoint: http://localhost:${PORT}/api/chat`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error: any) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection', { reason: reason?.message || reason });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

export default app;
