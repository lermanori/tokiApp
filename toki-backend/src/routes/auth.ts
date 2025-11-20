import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { generateTokenPair } from '../utils/jwt';
import { authenticateToken } from '../middleware/auth';
import jwt from 'jsonwebtoken';
import { sendEmail, generateVerificationEmail, generateWelcomeEmail, generatePasswordResetEmail } from '../utils/email';
import crypto from 'crypto';
import logger from '../utils/logger';
import { issuePasswordResetToken, PasswordLinkPurpose } from '../utils/passwordReset';

const router = Router();

// User registration
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, bio, location } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email, password, and name are required'
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password too short',
        message: 'Password must be at least 6 characters long'
      });
    }
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this email already exists'
      });
    }
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, bio, location)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, bio, location, verified, rating, member_since, created_at`,
      [email, passwordHash, name, bio || null, location || null]
    );
    const user = result.rows[0];
    await pool.query('INSERT INTO user_stats (user_id) VALUES ($1)', [user.id]);
    const tokens = generateTokenPair({ id: user.id, email: user.email, name: user.name });
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
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
    logger.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: 'Internal server error during registration'
    });
  }
});

// Invitation-based registration (skips waitlist)
router.post('/register/invite', async (req: Request, res: Response) => {
  try {
    const { email, password, name, bio, location, latitude, longitude, invitationCode } = req.body;
    
    if (!email || !password || !name || !invitationCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Email, password, name, and invitation code are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password too short',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Validate invitation code
    const invitationResult = await pool.query(
      `SELECT id, invitee_email, expires_at, status 
       FROM invitations 
       WHERE invitation_code = $1`,
      [invitationCode]
    );

    if (invitationResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid invitation',
        message: 'Invalid invitation code'
      });
    }

    const invitation = invitationResult.rows[0];

    // Check if expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      await pool.query(
        'UPDATE invitations SET status = $1 WHERE id = $2',
        ['expired', invitation.id]
      );
      return res.status(400).json({
        success: false,
        error: 'Invitation expired',
        message: 'This invitation has expired'
      });
    }

    // Check if already used
    if (invitation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        error: 'Invitation used',
        message: 'This invitation has already been used'
      });
    }

    // Verify email matches invitation
    if (invitation.invitee_email.toLowerCase() !== email.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: 'Email mismatch',
        message: 'Email does not match the invitation'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this email already exists'
      });
    }

    // Create user (auto-verified since they were invited)
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Validate coordinates (require both if either is present)
    const latProvided = latitude !== undefined && latitude !== null && latitude !== '';
    const lngProvided = longitude !== undefined && longitude !== null && longitude !== '';
    let latNumber: number | null = null;
    let lngNumber: number | null = null;
    
    if (latProvided && lngProvided) {
      const parsedLat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
      const parsedLng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        latNumber = parsedLat;
        lngNumber = parsedLng;
      }
    }
    
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, bio, location, latitude, longitude, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id, email, name, bio, location, verified, rating, member_since, created_at`,
      [email, passwordHash, name, bio || null, location || null, latNumber, lngNumber]
    );

    const user = result.rows[0];
    await pool.query('INSERT INTO user_stats (user_id) VALUES ($1)', [user.id]);

    // Mark invitation as accepted
    await pool.query(
      `UPDATE invitations 
       SET status = 'accepted', accepted_at = NOW(), accepted_user_id = $1 
       WHERE id = $2`,
      [user.id, invitation.id]
    );

    const tokens = generateTokenPair({ id: user.id, email: user.email, name: user.name });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully with invitation',
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
    logger.error('Invitation registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registration failed',
      message: 'Internal server error during registration'
    });
  }
});

// User login
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
      `SELECT id, email, password_hash, name, bio, location, verified, rating, member_since
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
    const tokens = generateTokenPair({ id: user.id, email: user.email, name: user.name });
    
    // Log login event
    try {
      await pool.query(
        'INSERT INTO user_activity_logs (user_id, event_type) VALUES ($1, $2)',
        [user.id, 'login']
      );
      logger.debug(`📊 [ACTIVITY] Logged login event for user ${user.id}`);
    } catch (error) {
      logger.error('Error logging login event:', error);
      // Don't fail login if logging fails
    }
    
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

// Get current user profile
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, email, name, bio, location, avatar_url, verified, rating, member_since, created_at,latitude,longitude
       FROM users WHERE id = $1`,
      [req.user!.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User profile not found'
      });
    }
    const user = result.rows[0];
    
    // Calculate user stats dynamically instead of querying user_stats table
    // Get Tokis created count (with 12-hour filter to match main query)
    const createdResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM tokis 
       WHERE host_id = $1 
         AND status = $2
         AND (scheduled_time IS NULL OR scheduled_time >= NOW() - INTERVAL '12 hours')`,
      [user.id, 'active']
    );

    // Get Tokis joined count (as participant)
    // Count only unique Tokis where user is a participant (not the host)
    // (with 12-hour filter to match main query)
    const joinedResult = await pool.query(
      `SELECT COUNT(DISTINCT tp.toki_id) as count 
       FROM toki_participants tp
       JOIN tokis t ON tp.toki_id = t.id
       WHERE tp.user_id = $1 
         AND tp.status IN ('approved', 'joined')
         AND t.host_id != $1
         AND t.status = 'active'
         AND (t.scheduled_time IS NULL OR t.scheduled_time >= NOW() - INTERVAL '12 hours')`,
      [user.id]
    );

    // Get connections count
    const connectionsResult = await pool.query(
      `SELECT COUNT(*) as count FROM user_connections 
       WHERE status = 'accepted' 
         AND (requester_id = $1 OR recipient_id = $1)`,
      [user.id]
    );

    // Calculate user's rating dynamically from user_ratings table
    const ratingResult = await pool.query(
      `SELECT COALESCE(ROUND(AVG(rating), 1), 0) as average_rating, COUNT(*) as total_ratings
       FROM user_ratings 
       WHERE rated_user_id = $1`,
      [user.id]
    );
    const calculatedRating = ratingResult.rows[0].average_rating;
    const totalRatings = parseInt(ratingResult.rows[0].total_ratings);

    const stats = {
      tokis_created: parseInt(createdResult.rows[0].count),
      tokis_joined: parseInt(joinedResult.rows[0].count),
      connections_count: parseInt(connectionsResult.rows[0].count)
    };
    
    const socialLinksResult = await pool.query(
      'SELECT platform, username FROM user_social_links WHERE user_id = $1',
      [user.id]
    );
    const socialLinks = socialLinksResult.rows.reduce((acc: any, link: any) => {
      acc[link.platform] = link.username;
      return acc;
    }, {});
    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          bio: user.bio,
          location: user.location,
          avatar: user.avatar_url,
          latitude: user.latitude,
          longitude: user.longitude,
          verified: user.verified,
          rating: calculatedRating,
          totalRatings: totalRatings,
          memberSince: user.member_since,
          createdAt: user.created_at,
          stats,
          socialLinks
        }
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get profile',
      message: 'Internal server error'
    });
  }
});

// Update current user profile (single endpoint)
router.put('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, bio, location, latitude, longitude } = req.body as {
      name?: string;
      bio?: string | null;
      location?: string | null;
      latitude?: number | string;
      longitude?: number | string;
    };

    // Validate inputs (only when provided)
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: 'Invalid name',
          message: 'Name must be at least 2 characters long'
        });
      }
    }

    if (location !== undefined) {
      if (location !== null && (typeof location !== 'string' || location.length > 255)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid location',
          message: 'Location must be a string up to 255 characters'
        });
      }
    }

    // Coordinates validation (require both if either is present)
    const latProvided = latitude !== undefined && latitude !== null && latitude !== '';
    const lngProvided = longitude !== undefined && longitude !== null && longitude !== '';
    if ((latProvided && !lngProvided) || (!latProvided && lngProvided)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
        message: 'Both latitude and longitude must be provided together'
      });
    }

    let latNumber: number | undefined;
    let lngNumber: number | undefined;
    if (latProvided && lngProvided) {
      latNumber = typeof latitude === 'number' ? latitude : parseFloat(String(latitude));
      lngNumber = typeof longitude === 'number' ? longitude : parseFloat(String(longitude));
      if (Number.isNaN(latNumber) || Number.isNaN(lngNumber)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid coordinates',
          message: 'Latitude and longitude must be valid numbers'
        });
      }
      if (latNumber < -90 || latNumber > 90 || lngNumber < -180 || lngNumber > 180) {
        return res.status(400).json({
          success: false,
          error: 'Invalid coordinates range',
          message: 'Latitude must be between -90 and 90, longitude between -180 and 180'
        });
      }
    } else if (location && typeof location === 'string' && location.trim().length > 0) {
      // Derive coordinates from location if provided without explicit coords
      try {
        const key = process.env.GOOGLE_MAPS_API_KEY;
        if (key) {
          const params = new URLSearchParams({ address: location.trim(), key, language: 'en' });
          const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
          const resp = await fetch(url);
          const data: any = await resp.json();
          if (data.status === 'OK') {
            const r = (data.results || [])[0];
            const lat = r?.geometry?.location?.lat;
            const lng = r?.geometry?.location?.lng;
            if (typeof lat === 'number' && typeof lng === 'number') {
              latNumber = lat;
              lngNumber = lng;
            }
          } else {
            logger.warn('Geocode on /me update failed:', { status: data.status, message: data.error_message });
          }
        } else {
          logger.warn('GOOGLE_MAPS_API_KEY is not configured; skipping geocode for profile update');
        }
      } catch (e) {
        logger.error('Error geocoding location in /me update:', e);
      }
    }

    // Build dynamic update
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updateFields.push(`name = $${paramCount}`);
      updateValues.push(name.trim());
    }
    if (bio !== undefined) {
      paramCount++;
      updateFields.push(`bio = $${paramCount}`);
      updateValues.push(bio);
    }
    if (location !== undefined) {
      paramCount++;
      updateFields.push(`location = $${paramCount}`);
      updateValues.push(location);
    }
    if (latNumber !== undefined && lngNumber !== undefined) {
      paramCount++;
      updateFields.push(`latitude = $${paramCount}`);
      updateValues.push(latNumber);
      paramCount++;
      updateFields.push(`longitude = $${paramCount}`);
      updateValues.push(lngNumber);
    }

    // If nothing to update, return 400
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
        message: 'Provide at least one updatable field'
      });
    }

    // Always update updated_at
    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    updateValues.push(new Date());

    // WHERE clause param
    paramCount++;
    updateValues.push(req.user!.id);

    const result = await pool.query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}
       RETURNING id, email, name, bio, location, avatar_url, verified, rating, member_since, updated_at, latitude, longitude`,
      updateValues
    );
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User profile not found'
      });
    }
    const user = result.rows[0];
    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          bio: user.bio,
          location: user.location,
          avatar: user.avatar_url,
          latitude: user.latitude,
          longitude: user.longitude,
          verified: user.verified,
          rating: user.rating,
          memberSince: user.member_since,
          updatedAt: user.updated_at
        }
      }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      message: 'Internal server error'
    });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
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
    const result = await pool.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found',
        message: 'User no longer exists'
      });
    }
    const user = result.rows[0];
    const tokens = generateTokenPair({ id: user.id, email: user.email, name: user.name });
    return res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: { tokens }
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
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
router.get('/me/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Get Tokis created count
    const createdResult = await pool.query(
      'SELECT COUNT(*) as count FROM tokis WHERE host_id = $1 AND status = $2',
      [req.user!.id, 'active']
    );

    // Get Tokis joined count (as participant)
    const joinedResult = await pool.query(
      'SELECT COUNT(*) as count FROM toki_participants WHERE user_id = $1 AND status = $2',
      [req.user!.id, 'joined']
    );

    // Get connections count
    const connectionsResult = await pool.query(
      `SELECT COUNT(*) as count FROM user_connections 
       WHERE status = 'accepted' 
         AND (requester_id = $1 OR recipient_id = $1)`,
      [req.user!.id]
    );

    // Get pending connection requests count
    const pendingRequestsResult = await pool.query(
      'SELECT COUNT(*) as count FROM user_connections WHERE recipient_id = $1 AND status = $2',
      [req.user!.id, 'pending']
    );

    // Get sent connection requests count
    const sentRequestsResult = await pool.query(
      'SELECT COUNT(*) as count FROM user_connections WHERE requester_id = $1 AND status = $2',
      [req.user!.id, 'pending']
    );

    const stats = {
      tokisCreated: parseInt(createdResult.rows[0].count),
      tokisJoined: parseInt(joinedResult.rows[0].count),
      connections: parseInt(connectionsResult.rows[0].count),
      pendingRequests: parseInt(pendingRequestsResult.rows[0].count),
      sentRequests: parseInt(sentRequestsResult.rows[0].count),
      totalActivity: parseInt(createdResult.rows[0].count) + parseInt(joinedResult.rows[0].count)
    };

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Get user stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve user statistics'
    });
  }
});

// Update user profile with enhanced information
router.put('/me/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      bio, 
      location, 
      socialLinks 
    } = req.body;

    // Validate input
    if (name && (typeof name !== 'string' || name.trim().length < 2)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid name',
        message: 'Name must be at least 2 characters long'
      });
    }

    if (bio && (typeof bio !== 'string' || bio.length > 500)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid bio',
        message: 'Bio must be less than 500 characters'
      });
    }

    if (location && (typeof location !== 'string' || location.length > 255)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid location',
        message: 'Location must be less than 255 characters'
      });
    }

    // Validate social links if provided
    if (socialLinks) {
      if (typeof socialLinks !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Invalid social links',
          message: 'Social links must be an object'
        });
      }

      const validPlatforms = ['instagram', 'tiktok', 'linkedin', 'facebook'];
      for (const [platform, url] of Object.entries(socialLinks)) {
        if (!validPlatforms.includes(platform)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid platform',
            message: `Invalid social platform: ${platform}`
          });
        }
        if (typeof url !== 'string' || url.length > 255) {
          return res.status(400).json({
            success: false,
            error: 'Invalid URL',
            message: `Invalid URL for ${platform}`
          });
        }
      }
    }

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update user table
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      if (name) {
        updateFields.push(`name = $${paramCount}`);
        updateValues.push(name.trim());
        paramCount++;
      }

      if (bio !== undefined) {
        updateFields.push(`bio = $${paramCount}`);
        updateValues.push(bio);
        paramCount++;
      }

      if (location !== undefined) {
        updateFields.push(`location = $${paramCount}`);
        updateValues.push(location);
        paramCount++;
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = $${paramCount}`);
        updateValues.push(new Date());
        paramCount++;

        await client.query(
          `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
          [...updateValues, req.user!.id]
        );
      }

      // Update social links if provided
      if (socialLinks) {
        // Delete existing social links
        await client.query(
          'DELETE FROM user_social_links WHERE user_id = $1',
          [req.user!.id]
        );

        // Insert new social links
        for (const [platform, url] of Object.entries(socialLinks)) {
          if (url && typeof url === 'string' && url.trim()) {
            await client.query(
              'INSERT INTO user_social_links (user_id, platform, username) VALUES ($1, $2, $3)',
              [req.user!.id, platform, url.trim()]
            );
          }
        }
      }

      await client.query('COMMIT');

      // Get updated user data
      const userResult = await pool.query(
        `SELECT 
          u.id, u.email, u.name, u.bio, u.location, u.avatar_url, 
          u.verified, u.rating, u.member_since, u.created_at, u.updated_at,
          json_object_agg(usl.platform, usl.username) FILTER (WHERE usl.platform IS NOT NULL) as social_links
        FROM users u
        LEFT JOIN user_social_links usl ON u.id = usl.user_id
        WHERE u.id = $1
        GROUP BY u.id`,
        [req.user!.id]
      );

      const user = userResult.rows[0];
      const socialLinksData = user.social_links || {};

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          bio: user.bio,
          location: user.location,
          avatar: user.avatar_url,
          verified: user.verified,
          rating: user.rating,
          memberSince: user.member_since,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          socialLinks: socialLinksData
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to update profile'
    });
  }
});

// Verify user (admin only - simplified for demo)
router.put('/users/:userId/verify', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { verified } = req.body;

    // In a real app, you'd check if the current user is an admin
    // For demo purposes, we'll allow any authenticated user to verify others
    if (typeof verified !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification status',
        message: 'Verified must be a boolean value'
      });
    }

    // Check if target user exists
    const userResult = await pool.query(
      'SELECT id, name, verified FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    // Update verification status
    const result = await pool.query(
      'UPDATE users SET verified = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [verified, new Date(), userId]
    );

    return res.status(200).json({
      success: true,
      message: `User ${verified ? 'verified' : 'unverified'} successfully`,
      data: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        verified: result.rows[0].verified,
        updatedAt: result.rows[0].updated_at
      }
    });

  } catch (error) {
    logger.error('Verify user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to update user verification status'
    });
  }
});

// Search users (public endpoint) - MUST COME BEFORE /users/:userId
router.get('/users/search', async (req: Request, res: Response) => {
  try {
    const { 
      q, 
      page = '1', 
      limit = '20',
      verified,
      hasConnections 
    } = req.query;
    

    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    // Build the query
    let query = `
      SELECT 
        u.id, u.name, u.bio, u.location, u.avatar_url, 
        u.verified, u.member_since,
        COALESCE(ROUND(AVG(ur.rating), 1), 0) as rating,
        COUNT(DISTINCT uc.id) as connections_count,
        COUNT(DISTINCT t.id) as tokis_created,
        false as is_connected
      FROM users u
      LEFT JOIN user_ratings ur ON ur.rated_user_id = u.id
      LEFT JOIN user_connections uc ON (uc.requester_id = u.id OR uc.recipient_id = u.id) 
        AND uc.status = 'accepted'
      LEFT JOIN tokis t ON t.host_id = u.id AND t.status = 'active'
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramCount = 0;

    // Add search term
    if (q && typeof q === 'string') {
      paramCount++;
      query += ` AND (u.name ILIKE $${paramCount} OR u.bio ILIKE $${paramCount} OR u.location ILIKE $${paramCount})`;
      queryParams.push(`%${q}%`);
    }

    // Add verification filter
    if (verified !== undefined) {
      paramCount++;
      query += ` AND u.verified = $${paramCount}`;
      queryParams.push(verified === 'true');
    }

    // Group by user
    query += ` GROUP BY u.id, u.name, u.bio, u.location, u.avatar_url, u.verified, u.member_since, u.created_at`;

    // Add connections filter
    if (hasConnections === 'true') {
      query += ` HAVING COUNT(DISTINCT uc.id) > 0`;
    }

    // Get total count for pagination
    const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(DISTINCT u.id) as total FROM');
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Add ordering and pagination
    query += ` ORDER BY u.verified DESC, u.rating DESC, u.member_since DESC`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    queryParams.push(limitNum, offset);

    
    const result = await pool.query(query, queryParams);
    

    const users = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      bio: row.bio,
      location: row.location,
      avatar: row.avatar_url,
      verified: row.verified,
      rating: row.rating,
      memberSince: row.member_since,
      connectionsCount: parseInt(row.connections_count),
      tokisCreated: parseInt(row.tokis_created),
      isConnected: row.is_connected
    }));

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    logger.error('Search users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to search users'
    });
  }
});

// Get user profile by ID (public profile) - MUST COME AFTER /users/search
router.get('/users/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get user profile
    const userResult = await pool.query(
      `SELECT 
        u.id, u.name, u.bio, u.location, u.avatar_url, 
        u.verified, u.member_since, u.created_at,
        COALESCE(ROUND(AVG(ur.rating), 1), 0) as rating,
        COUNT(DISTINCT ur.id) as total_ratings
      FROM users u
      LEFT JOIN user_ratings ur ON ur.rated_user_id = u.id
      WHERE u.id = $1
      GROUP BY u.id, u.name, u.bio, u.location, u.avatar_url, u.verified, u.member_since, u.created_at`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      logger.info('❌ [AUTH] User not found in database for userId:', userId);
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    const user = userResult.rows[0];

    // Get user statistics
    // Tokis created count
    const createdResult = await pool.query(
      'SELECT COUNT(*) as count FROM tokis WHERE host_id = $1 AND status = $2',
      [userId, 'active']
    );

    // Tokis joined count (as participant)
    const joinedResult = await pool.query(
      `SELECT COUNT(DISTINCT tp.toki_id) as count 
       FROM toki_participants tp
       JOIN tokis t ON tp.toki_id = t.id
       WHERE tp.user_id = $1 
         AND tp.status IN ('approved', 'joined')
         AND t.host_id != $1
         AND t.status = 'active'`,
      [userId]
    );

    // Connections count
    const connectionsResult = await pool.query(
      `SELECT COUNT(*) as count FROM user_connections 
       WHERE status = 'accepted' 
         AND (requester_id = $1 OR recipient_id = $1)`,
      [userId]
    );

    // Get social links
    const socialLinksResult = await pool.query(
      'SELECT platform, username FROM user_social_links WHERE user_id = $1',
      [userId]
    );
    const socialLinks = socialLinksResult.rows.reduce((acc: any, link: any) => {
      acc[link.platform] = link.username;
      return acc;
    }, {});

    const userProfile = {
      id: user.id,
      name: user.name,
      bio: user.bio,
      location: user.location,
      avatar: user.avatar_url,
      verified: user.verified,
      rating: parseFloat(user.rating),
      totalRatings: parseInt(user.total_ratings),
      memberSince: user.member_since,
      createdAt: user.created_at,
      tokisCreated: parseInt(createdResult.rows[0].count),
      tokisJoined: parseInt(joinedResult.rows[0].count),
      connections: parseInt(connectionsResult.rows[0].count),
      socialLinks
    };

    return res.status(200).json({
      success: true,
      data: userProfile
    });

  } catch (error) {
    logger.error('Get user profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve user profile'
    });
  }
});

export default router; 