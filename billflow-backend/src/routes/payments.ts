import { Router } from 'express';
import {
  getAllPayments,
  getPaymentsByInvoice,
  createPayment,
  updatePayment,
  deletePayment
} from '../controllers/paymentController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validatePayment } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/payments - Get all payments
router.get('/', getAllPayments);

// GET /api/payments/invoice/:invoiceId - Get payments for specific invoice
router.get('/invoice/:invoiceId', getPaymentsByInvoice);

// POST /api/payments - Record new payment
router.post('/', validatePayment, createPayment);

// PUT /api/payments/:id - Update payment
router.put('/:id', updatePayment);

// DELETE /api/payments/:id - Delete payment (admin only)
router.delete('/:id', requireRole(['admin']), deletePayment);

export default router;

