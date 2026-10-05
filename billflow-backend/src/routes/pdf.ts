import express from 'express';
import { generateInvoicePDF } from '../controllers/pdfController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Generate PDF from HTML
router.post('/generate-invoice', authenticateToken, generateInvoicePDF);

export default router;
