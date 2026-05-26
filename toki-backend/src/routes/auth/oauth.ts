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

router.post('/oauth/apple', async (req: Request, res: Response) => {
  try {
    const { identityToken, authorizationCode, user: appleUser, nonce, isWeb } = req.body;

    if (!identityToken && !authorizationCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Identity token or authorization code is required'
      });
    }

    let appleResult;

    // If we have an identity token (from popup flow or native), verify it directly
    // Only exchange authorization code if we don't have an identity token
    if (identityToken) {
      appleResult = await verifyAppleToken(identityToken, { nonce });
    } else if (authorizationCode) {
      // Fallback: exchange authorization code for tokens (redirect flow)
      const redirectUri = req.body.redirectUri || process.env.APPLE_REDIRECT_URI || `${process.env.FRONTEND_URL}/auth/apple/callback`;
      const tokenResult = await exchangeAppleCode(authorizationCode, redirectUri);

      if (!tokenResult) {
        return res.status(401).json({
          success: false,
          error: 'Apple authentication failed',
          message: 'Failed to exchange authorization code'
        });
      }

      appleResult = await verifyAppleToken(tokenResult.idToken, { nonce });
    } else {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Identity token or authorization code is required'
      });
    }

    if (!appleResult.success || !appleResult.sub) {
      return res.status(401).json({
        success: false,
        error: 'Apple authentication failed',
        message: appleResult.error || 'Invalid Apple token'
      });
    }

    // Get email from token or from user object (Apple only sends user info on first sign-in)
    const email = appleResult.email || appleUser?.email;
    const name = appleUser?.name
      ? `${appleUser.name.firstName || ''} ${appleUser.name.lastName || ''}`.trim()
      : null;

    // Try to find user by Apple sub
    let userResult = await pool.query(
      'SELECT * FROM users WHERE apple_sub = $1',
      [appleResult.sub]
    );

    let user = userResult.rows[0];
    let isNewUser = false;

    if (!user && email) {
      // Try to find user by email for account linking
      userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
      user = userResult.rows[0];

      if (user) {
        // Link Apple account to existing user
        await pool.query(
          `UPDATE users
           SET apple_sub = $1,
               auth_provider = CASE
                 WHEN auth_provider = 'email' THEN 'apple+email'
                 WHEN auth_provider = 'google' THEN 'apple+google'
                 WHEN auth_provider = 'google+email' THEN 'apple+google+email'
                 ELSE auth_provider
               END
           WHERE id = $2`,
          [appleResult.sub, user.id]
        );
        logger.info(`🔗 [AUTH] Linked Apple account to existing user ${user.id}`);
      }
    }

    if (!user) {
      // Create new user
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email required',
          message: 'Email is required for registration. Please try signing in again.'
        });
      }

      const result = await pool.query(
        `INSERT INTO users (
          email, name, apple_sub, auth_provider, has_password,
          profile_completed, verified, terms_accepted_at, terms_version
        )
        VALUES ($1, $2, $3, 'apple', false, false, false, NULL, NULL)
        RETURNING *`,
        [email.toLowerCase(), name || 'Toki User', appleResult.sub]
      );

      user = result.rows[0];
      isNewUser = true;

      // Create user stats record
      await pool.query('INSERT INTO user_stats (user_id) VALUES ($1)', [user.id]);
      logger.info(`✨ [AUTH] Created new user via Apple Sign-In: ${user.id}`);
    }

    // Check if profile is completed (has location)
    const requiresProfileCompletion = !user.latitude || !user.longitude || !user.terms_accepted_at;

    // Generate tokens
    const tokens = generateTokenPair({ id: user.id, email: user.email, name: user.name });

    await logAuthActivity(user.id, 'login', { provider: 'apple', isNewUser });

    return res.json({
      success: true,
      isNewUser,
      requiresProfileCompletion,
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          bio: user.bio,
          location: user.location,
          latitude: user.latitude,
          longitude: user.longitude,
          verified: user.verified,
          rating: user.rating,
          memberSince: user.member_since,
          hasPassword: user.has_password,
          profileCompleted: !requiresProfileCompletion
        },
        tokens
      }
    });
  } catch (error) {
    logger.error('Apple OAuth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Internal server error during Apple authentication'
    });
  }
});

// Google OAuth login
router.post('/oauth/google', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: 'Google ID token is required'
      });
    }

    const googleResult = await verifyGoogleToken(idToken);

    if (!googleResult.success || !googleResult.sub) {
      return res.status(401).json({
        success: false,
        error: 'Google authentication failed',
        message: googleResult.error || 'Invalid Google token'
      });
    }

    if (!googleResult.email) {
      return res.status(400).json({
        success: false,
        error: 'Email required',
        message: 'Email is required for authentication'
      });
    }

    // Try to find user by Google sub
    let userResult = await pool.query(
      'SELECT * FROM users WHERE google_sub = $1',
      [googleResult.sub]
    );

    let user = userResult.rows[0];
    let isNewUser = false;

    if (!user) {
      // Try to find user by email for account linking
      userResult = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [googleResult.email.toLowerCase()]
      );
      user = userResult.rows[0];

      if (user) {
        // Link Google account to existing user
        await pool.query(
          `UPDATE users
           SET google_sub = $1,
               auth_provider = CASE
                 WHEN auth_provider = 'email' THEN 'google+email'
                 WHEN auth_provider = 'apple' THEN 'apple+google'
                 WHEN auth_provider = 'apple+email' THEN 'apple+google+email'
                 ELSE auth_provider
               END
           WHERE id = $2`,
          [googleResult.sub, user.id]
        );
        logger.info(`🔗 [AUTH] Linked Google account to existing user ${user.id}`);
      }
    }

    if (!user) {
      // Create new user
      const name = googleResult.name ||
        `${googleResult.givenName || ''} ${googleResult.familyName || ''}`.trim() ||
        'Toki User';

      const result = await pool.query(
        `INSERT INTO users (
          email, name, google_sub, avatar_url, auth_provider, has_password,
          profile_completed, verified, terms_accepted_at, terms_version
        )
        VALUES ($1, $2, $3, $4, 'google', false, false, false, NULL, NULL)
        RETURNING *`,
        [googleResult.email.toLowerCase(), name, googleResult.sub, googleResult.picture || null]
      );

      user = result.rows[0];
      isNewUser = true;

      // Create user stats record
      await pool.query('INSERT INTO user_stats (user_id) VALUES ($1)', [user.id]);
      logger.info(`✨ [AUTH] Created new user via Google Sign-In: ${user.id}`);
    }

    // Check if profile is completed (has location)
    const requiresProfileCompletion = !user.latitude || !user.longitude || !user.terms_accepted_at;

    // Generate tokens
    const tokens = generateTokenPair({ id: user.id, email: user.email, name: user.name });

    await logAuthActivity(user.id, 'login', { provider: 'google', isNewUser });

    return res.json({
      success: true,
      isNewUser,
      requiresProfileCompletion,
      message: isNewUser ? 'Account created successfully' : 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          bio: user.bio,
          location: user.location,
          latitude: user.latitude,
          longitude: user.longitude,
          avatar: user.avatar_url,
          verified: user.verified,
          rating: user.rating,
          memberSince: user.member_since,
          hasPassword: user.has_password,
          profileCompleted: !requiresProfileCompletion
        },
        tokens
      }
    });
  } catch (error) {
    logger.error('Google OAuth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed',
      message: 'Internal server error during Google authentication'
    });
  }
});

// Complete profile for OAuth users (set location, name, and accept terms)

export default router;
