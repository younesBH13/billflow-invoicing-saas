import express from 'express';
import {
    getAllQuotes,
    getQuoteById,
    createQuote,
    updateQuote,
    deleteQuote
} from '../controllers/quoteController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/quotes - Get all quotes
router.get('/', getAllQuotes);

// GET /api/quotes/:id - Get single quote
router.get('/:id', getQuoteById);

// POST /api/quotes - Create new quote
router.post('/', createQuote);

// PUT /api/quotes/:id - Update quote
router.put('/:id', updateQuote);

// DELETE /api/quotes/:id - Delete quote
router.delete('/:id', deleteQuote);

export default router;
