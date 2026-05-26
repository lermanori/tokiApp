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

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }
    const result = await pool.query(
      `SELECT id, email, password_hash, name, bio, location, verified, rating, member_since, terms_accepted_at, terms_version
       FROM users WHERE email = $1`,
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }
    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }
    
    // Always generate tokens (even if terms not accepted)
    // This allows users to call /accept-terms endpoint
    const tokens = generateTokenPair({ id: user.id, email: user.email, name: user.name });
    
    // Check if user has accepted current terms version
    if (!user.terms_accepted_at || user.terms_version !== CURRENT_TERMS_VERSION) {
      return res.json({
        success: true,
        requiresTermsAcceptance: true,
        message: 'Please accept the updated Terms of Use',
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            bio: user.bio,
            location: user.location,
            verified: user.verified,
            rating: user.rating,
            memberSince: user.member_since
          },
          tokens // Now we include tokens so they can call /accept-terms
        }
      });
    }
    
    await logAuthActivity(user.id, 'login', { provider: 'password' });
    logger.debug(`📊 [ACTIVITY] Logged login event for user ${user.id}`);
    
    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          bio: user.bio,
          location: user.location,
          verified: user.verified,
          rating: user.rating,
          memberSince: user.member_since
        },
        tokens
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed',
      message: 'Internal server error during login'
    });
  }
});

// Apple OAuth login

export default router;
