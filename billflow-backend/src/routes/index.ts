import { Router } from 'express';
import authRoutes from './auth';
import clientRoutes from './clients';
import invoiceRoutes from './invoices';
import paymentRoutes from './payments';
import deliveryNoteRoutes from './deliveryNotes';
import templateRoutes from './templates';
import reportRoutes from './reports';
import quoteRoutes from './quotes';

const router = Router();

// Mount all route modules
router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/delivery-notes', deliveryNoteRoutes);
router.use('/templates', templateRoutes);
router.use('/reports', reportRoutes);
router.use('/quotes', quoteRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'BillFlow Backend API'
  });
});

export default router;

