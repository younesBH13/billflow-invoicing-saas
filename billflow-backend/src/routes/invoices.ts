import { Router } from 'express';
import {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  convertInvoiceType,
  getNextInvoiceNumberEndpoint
} from '../controllers/invoiceController';
import { authenticateToken, requireRole } from '../middleware/auth';
import { validateInvoice } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/invoices - Get all invoices
router.get('/', getAllInvoices);

// GET /api/invoices/next-number/:type - Get next invoice number
router.get('/next-number/:type', getNextInvoiceNumberEndpoint);

// GET /api/invoices/:id - Get specific invoice
router.get('/:id', getInvoiceById);

// POST /api/invoices - Create new invoice
router.post('/', validateInvoice, createInvoice);

// POST /api/invoices/:id/convert - Convert invoice type
router.post('/:id/convert', convertInvoiceType);

// PUT /api/invoices/:id - Update invoice
router.put('/:id', updateInvoice);

// DELETE /api/invoices/:id - Delete invoice (admin only)
router.delete('/:id', requireRole(['admin']), deleteInvoice);

export default router;

