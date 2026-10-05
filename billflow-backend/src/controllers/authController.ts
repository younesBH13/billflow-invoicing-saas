import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';
import { User, LoginRequest } from '../types';
import { getJwtExpiration, getJwtSecret, JwtConfigurationError } from '../utils/jwt';
import { verifyPasswordHash } from '../utils/passwords';

interface AuthRequest extends Request {
  user?: User;
}

export const login = async (req: Request, res: Response): Promise<void> => {
  console.log(`[authController] Login attempt for user: ${req.body?.username}`);
  try {
    const { username, password }: LoginRequest = req.body;

    console.log('[authController] Querying database for user...');
    const user = db.prepare(
      'SELECT id, username, password_hash, name, role FROM users WHERE username = ?'
    ).get(username) as (User & { password_hash: string }) | undefined;

    if (!user) {
      console.log(`[authController] User not found: ${username}`);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    console.log('[authController] User found, verifying password...');
    const passwordCheck = await verifyPasswordHash(password, user.password_hash);

    if (!passwordCheck.valid) {
      console.log(`[authController] Password invalid for user: ${username} (Hint: ${passwordCheck.hint})`);
      const statusCode = passwordCheck.hint?.includes('not installed') ? 500 : 401;
      res.status(statusCode).json({ error: passwordCheck.hint ?? 'Invalid credentials' });
      return;
    }

    console.log('[authController] Password verified, generating token...');
    let jwtSecret: string;
    let expiresIn: string;

    try {
      jwtSecret = getJwtSecret();
      expiresIn = getJwtExpiration();
    } catch (configError) {
      if (configError instanceof JwtConfigurationError) {
        console.error('[authController] JWT configuration error:', configError.message);
        res.status(500).json({ error: 'Authentication service is not properly configured' });
        return;
      }
      throw configError;
    }

    console.log('[authController] Signing JWT...');
    const token = jwt.sign(
      { userId: user.id },
      jwtSecret,
      { expiresIn }
    );

    console.log('[authController] Saving session token to database...');
    db.prepare('UPDATE users SET current_session_token = ? WHERE id = ?').run(token, user.id);

    console.log('[authController] Login successful, sending response');
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[authController] Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        name: req.user.name,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // by removing the token from storage
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
