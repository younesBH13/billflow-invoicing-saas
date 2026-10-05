import { Router } from 'express';
import { login, getCurrentUser, logout } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validateLogin } from '../middleware/validation';

const router = Router();

// Public routes
router.post('/login', validateLogin, login);
router.post('/logout', logout);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);

export default router;

