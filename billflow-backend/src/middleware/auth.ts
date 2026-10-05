import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { User } from '../types';
import { getJwtSecret, JwtConfigurationError } from '../utils/jwt';

interface AuthRequest extends Request {
  user?: User;
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    let jwtSecret: string;
    try {
      jwtSecret = getJwtSecret();
    } catch (configError) {
      if (configError instanceof JwtConfigurationError) {
        console.error('JWT configuration error:', configError.message);
        res.status(500).json({ error: 'Authentication service is not properly configured' });
        return;
      }
      throw configError;
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: number };

    // Get user from database
    const user = db.prepare(
      'SELECT id, username, name, role, current_session_token FROM users WHERE id = ?'
    ).get(decoded.userId) as User | undefined;

    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    if (user.current_session_token && user.current_session_token !== token) {
      console.log(`[authMiddleware] Token mismatch for user ${user.username}. Session invalidated by a newer login.`);
      res.status(401).json({ error: 'Session expired: Logged in from another device' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

