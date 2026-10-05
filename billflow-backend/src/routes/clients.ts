import { Router } from 'express';
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientStatistics
} from '../controllers/clientController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateClient } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/clients - Get all clients
router.get('/', getAllClients);

// GET /api/clients/:id - Get specific client
router.get('/:id', getClientById);

// GET /api/clients/:id/statistics - Get client statistics
router.get('/:id/statistics', getClientStatistics);

// POST /api/clients - Create new client
router.post('/', validateClient, createClient);

// PUT /api/clients/:id - Update client
router.put('/:id', validateClient, updateClient);

// DELETE /api/clients/:id - Delete client (admin only)
router.delete('/:id', requireRole(['admin']), deleteClient);

export default router;

