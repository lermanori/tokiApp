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

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email required',
        message: 'Please provide your email address'
      });
    }
    const result = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password link has been sent'
      });
    }
    const user = result.rows[0];
    
    // Determine purpose: if no password_hash, it's a welcome link; otherwise reset
    const purpose: PasswordLinkPurpose = user.password_hash ? 'reset' : 'welcome';
    
    // Generate new token and link
    const { token: newToken, link, expiryHours } = await issuePasswordResetToken(user.id, purpose);
    
    // Send email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Email service not configured',
        message: 'Email service is not available. Please contact support.'
      });
    }

    let subject: string;
    let text: string;
    let html: string;

    if (purpose === 'welcome') {
      // For welcome links, create email with set-password link
      subject = 'Welcome to Toki – Set your password';
      text = `Hey ${user.name || ''},\n\nWelcome to Toki! Set your password using the link below (expires in ${expiryHours} hours):\n\n${link}\n\n—\nToki`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Toki! 🎉</h2>
          <p>Hey ${user.name || ''},</p>
          <p>Welcome to Toki! Set your password using the link below (expires in ${expiryHours} hours):</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" 
               style="background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Set Password
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${link}</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This email was sent by Toki. If you have any questions, please contact our support team.
          </p>
        </div>
      `;
    } else {
      // For reset links, use the existing password reset email template
      const resetEmail = generatePasswordResetEmail(user.name, newToken);
      subject = resetEmail.subject;
      text = resetEmail.text || resetEmail.html.replace(/<[^>]*>/g, '');
      html = resetEmail.html;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@toki-app.com",
        to: user.email,
        subject,
        text,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text().catch(() => '');
      logger.error('Resend email failed (forgot-password):', errorText);
      return res.status(500).json({
        success: false,
        error: 'Failed to send email',
        message: 'Please try again later'
      });
    }

    return res.json({
      success: true,
      message: 'If an account with that email exists, a password link has been sent'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      message: 'Internal server error'
    });
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token and new password required',
        message: 'Please provide both the reset token and new password'
      });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password too short',
        message: 'Password must be at least 6 characters long'
      });
    }
    const result = await pool.query(
      'SELECT id, reset_password_expires FROM users WHERE reset_password_token = $1',
      [token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reset token',
        message: 'The reset token is invalid or has expired'
      });
    }
    const user = result.rows[0];
    if (new Date() > new Date(user.reset_password_expires)) {
      return res.status(400).json({
        success: false,
        error: 'Reset token expired',
        message: 'The reset token has expired. Please request a new one.'
      });
    }
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    await pool.query(
      'UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2',
      [passwordHash, user.id]
    );
    return res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset password',
      message: 'Internal server error'
    });
  }
});

// Resend password reset/set link for expired token
router.post('/resend-password-link', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token required',
        message: 'Please provide the reset token'
      });
    }

    // Look up user by token (even if expired, token still exists)
    const result = await pool.query(
      'SELECT id, email, name, password_hash FROM users WHERE reset_password_token = $1',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token',
        message: 'The reset token is invalid'
      });
    }

    const user = result.rows[0];
    
    // Determine purpose: if no password_hash, it's a welcome link; otherwise reset
    const purpose: PasswordLinkPurpose = user.password_hash ? 'reset' : 'welcome';
    
    // Generate new token and link
    const { token: newToken, link, expiryHours } = await issuePasswordResetToken(user.id, purpose);
    
    // Send email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Email service not configured',
        message: 'Email service is not available. Please contact support.'
      });
    }

    let subject: string;
    let text: string;
    let html: string;

    if (purpose === 'welcome') {
      // For welcome links, create email with set-password link
      subject = 'Welcome to Toki – Set your password';
      text = `Hey ${user.name || ''},\n\nWelcome to Toki! Set your password using the link below (expires in ${expiryHours} hours):\n\n${link}\n\n—\nToki`;
      html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Toki! 🎉</h2>
          <p>Hey ${user.name || ''},</p>
          <p>Welcome to Toki! Set your password using the link below (expires in ${expiryHours} hours):</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${link}" 
               style="background-color: #111827; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Set Password
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${link}</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            This email was sent by Toki. If you have any questions, please contact our support team.
          </p>
        </div>
      `;
    } else {
      // For reset links, use the existing password reset email template
      const resetEmail = generatePasswordResetEmail(user.name, newToken);
      subject = resetEmail.subject;
      text = resetEmail.text || resetEmail.html.replace(/<[^>]*>/g, '');
      html = resetEmail.html;
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@toki-app.com",
        to: user.email,
        subject,
        text,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text().catch(() => '');
      logger.error('Resend email failed (resend-password-link):', errorText);
      return res.status(500).json({
        success: false,
        error: 'Failed to send email',
        message: 'Please try again later'
      });
    }

    return res.json({
      success: true,
      message: 'A new password link has been sent to your email'
    });
  } catch (error) {
    logger.error('Resend password link error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process request',
      message: 'Internal server error'
    });
  }
});

// Get user statistics

export default router;
