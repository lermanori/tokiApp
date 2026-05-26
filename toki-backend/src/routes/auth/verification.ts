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

router.post('/send-verification', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Store verification token in database
    await pool.query(
      'UPDATE users SET verification_token = $1, verification_token_expires = $2 WHERE id = $3',
      [verificationToken, tokenExpiry, user.id]
    );
    
    // Send verification email
    const emailOptions = generateVerificationEmail(user.name, verificationToken);
    emailOptions.to = user.email;
    
    const emailSent = await sendEmail(emailOptions);
    
    if (emailSent) {
      res.json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send verification email',
        message: 'Please try again later'
      });
    }
  } catch (error) {
    logger.error('Send verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send verification email',
      message: 'Internal server error'
    });
  }
});

// Verify email
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token required',
        message: 'Please provide a verification token'
      });
    }
    const result = await pool.query(
      'SELECT id, email, name, verification_token_expires FROM users WHERE verification_token = $1',
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification token',
        message: 'The verification token is invalid or has expired'
      });
    }
    const user = result.rows[0];
    if (new Date() > new Date(user.verification_token_expires)) {
      return res.status(400).json({
        success: false,
        error: 'Verification token expired',
        message: 'The verification token has expired. Please request a new one.'
      });
    }
    await pool.query(
      'UPDATE users SET verified = true, verification_token = NULL, verification_token_expires = NULL WHERE id = $1',
      [user.id]
    );
    const emailOptions = generateWelcomeEmail(user.name);
    emailOptions.to = user.email;
    await sendEmail(emailOptions);
    return res.json({
      success: true,
      message: 'Email verified successfully! Welcome to Toki!'
    });
  } catch (error) {
    logger.error('Verify email error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify email',
      message: 'Internal server error'
    });
  }
});

// Request password reset or welcome link

export default router;
