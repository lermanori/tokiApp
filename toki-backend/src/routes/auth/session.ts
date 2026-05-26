import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../../config/database';
import { generateTokenPair } from '../../utils/jwt';
import { authenticateToken } from '../../middleware/auth';
import jwt from 'jsonwebtoken';
import { sendEmail, generateVerificationEmail, generateWelcomeEmail, generatePasswordResetEmail } from '../../utils/email';
import crypto from 'crypto';
import logger from '../../utils/logger';
import { issuePasswordResetToken, PasswordLinkPurpose } from '../../utils/passwordReset';
import { isRefreshTokenRevoked } from '../../lib/tokenRevocation';
import { verifyAppleToken, exchangeAppleCode } from '../../utils/appleAuth';
import { verifyGoogleToken } from '../../utils/googleAuth';
import { CURRENT_TERMS_VERSION, logAuthActivity } from './_shared';

const router = Router();

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  const decodedHint = refreshToken ? (jwt.decode(refreshToken) as any) : null;
  const hintedUserId = typeof decodedHint?.id === 'string' ? decodedHint.id : null;
  try {
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required',
        message: 'Refresh token is required'
      });
    }
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET!) as any;
    if (!decoded || decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'Invalid or expired refresh token'
      });
    }
    if (decoded.id && typeof decoded.iat === 'number' && isRefreshTokenRevoked(decoded.id, decoded.iat)) {
      await logAuthActivity(decoded.id, 'refresh_failure', { reason: 'refresh_token_revoked' });
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'Invalid or expired refresh token'
      });
    }
    const result = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length === 0) {
      if (hintedUserId) {
        await logAuthActivity(hintedUserId, 'refresh_failure', { reason: 'user_not_found' });
      }
      return res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'User no longer exists'
      });
    }
    const user = result.rows[0];
    const tokens = generateTokenPair({ id: user.id, email: user.email, name: user.name });
    await logAuthActivity(user.id, 'refresh_success');
    return res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: { tokens }
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    if (hintedUserId) {
      await logAuthActivity(hintedUserId, 'refresh_failure', { reason: 'invalid_or_expired_refresh_token' });
    }
    return res.status(401).json({
      success: false,
      error: 'Invalid refresh token',
      message: 'Invalid or expired refresh token'
    });
  }
});

// Logout (client-side token invalidation)
router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

// Send email verification

export default router;
