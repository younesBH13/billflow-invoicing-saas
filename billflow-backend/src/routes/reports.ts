import { Router } from 'express';
import {
  getAdvancedReporting,
  getRevenueStatistics,
  getClientPerformanceData
} from '../controllers/reportController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/reports/advanced - Get advanced reporting data
router.get('/advanced', getAdvancedReporting);

// GET /api/reports/revenue - Get revenue statistics
router.get('/revenue', getRevenueStatistics);

// GET /api/reports/clients - Get client performance data
router.get('/clients', getClientPerformanceData);

export default router;

