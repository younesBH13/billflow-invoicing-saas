import { Router } from 'express';
import {
  getAllDeliveryNotes,
  getDeliveryNoteById,
  createDeliveryNote,
  updateDeliveryNote,
  deleteDeliveryNote
} from '../controllers/deliveryNoteController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateDeliveryNote } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/delivery-notes - Get all delivery notes
router.get('/', getAllDeliveryNotes);

// GET /api/delivery-notes/:id - Get specific delivery note
router.get('/:id', getDeliveryNoteById);

// POST /api/delivery-notes - Create new delivery note
router.post('/', validateDeliveryNote, createDeliveryNote);

// PUT /api/delivery-notes/:id - Update delivery note
router.put('/:id', updateDeliveryNote);

// DELETE /api/delivery-notes/:id - Delete delivery note (admin only)
router.delete('/:id', requireRole(['admin']), deleteDeliveryNote);

export default router;

