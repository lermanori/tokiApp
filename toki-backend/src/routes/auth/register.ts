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

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, bio, location, latitude, longitude, termsAccepted } = req.body;
    
    // Validate terms acceptance
    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        error: 'Terms not accepted',
        message: 'You must accept the Terms of Use and Privacy Policy to register'
      });
    }
    
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

    // Handle coordinates: use provided coordinates or geocode location string
    let latNumber: number | null = null;
    let lngNumber: number | null = null;

    // Validate coordinates if provided
    const latProvided = latitude !== undefined && latitude !== null && latitude !== '';
    const lngProvided = longitude !== undefined && longitude !== null && longitude !== '';

    if (latProvided && lngProvided) {
      const parsedLat = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
      const parsedLng = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        if (parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180) {
          latNumber = parsedLat;
          lngNumber = parsedLng;
        }
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
            logger.warn('Geocode on /register failed:', { status: data.status, message: data.error_message });
          }
        } else {
          logger.warn('GOOGLE_MAPS_API_KEY is not configured; skipping geocode for registration');
        }
      } catch (e) {
        logger.error('Error geocoding location in /register:', e);
      }
    }

    // IMPORTANT: Require coordinates for registration (needed for nearby feature)
    if (!latNumber || !lngNumber) {
      return res.status(400).json({
        success: false,
        error: 'Location required',
        message: 'Please provide a valid location with coordinates. Select from the dropdown or use your current location.'
      });
    }

    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, bio, location, latitude, longitude, terms_accepted_at, terms_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
       RETURNING id, email, name, bio, location, latitude, longitude, verified, rating, member_since, created_at, terms_accepted_at, terms_version`,
      [email, passwordHash, name, bio || null, location || null, latNumber, lngNumber, CURRENT_TERMS_VERSION]
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
          latitude: user.latitude,
          longitude: user.longitude,
          verified: user.verified,
          rating: user.rating,
          memberSince: user.member_since,
          termsAcceptedAt: user.terms_accepted_at,
          termsVersion: user.terms_version
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
    const { email, password, name, bio, location, latitude, longitude, invitationCode, termsAccepted } = req.body;
    
    // Validate terms acceptance
    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        error: 'Terms not accepted',
        message: 'You must accept the Terms of Use and Privacy Policy to register'
      });
    }
    
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

    // Create user (invited users skip waitlist but are not auto-verified)
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
    } else if (location && typeof location === 'string' && location.trim().length > 0) {
      // Try to geocode location if coordinates not provided
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
          }
        }
      } catch (e) {
        logger.error('Error geocoding location in /register/invite:', e);
      }
    }

    // IMPORTANT: Require coordinates for registration (needed for nearby feature)
    if (!latNumber || !lngNumber) {
      return res.status(400).json({
        success: false,
        error: 'Location required',
        message: 'Please provide a valid location with coordinates. Select from the dropdown or use your current location.'
      });
    }

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, bio, location, latitude, longitude, verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
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

export default router;
