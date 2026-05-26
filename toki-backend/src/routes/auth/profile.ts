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

router.post('/complete-profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, location, latitude, longitude, bio, termsAccepted } = req.body;

    // Validate terms acceptance
    if (!termsAccepted) {
      return res.status(400).json({
        success: false,
        error: 'Terms not accepted',
        message: 'You must accept the Terms of Use and Privacy Policy'
      });
    }

    // Validate coordinates
    const latProvided = latitude !== undefined && latitude !== null && latitude !== '';
    const lngProvided = longitude !== undefined && longitude !== null && longitude !== '';
    let latNumber: number | null = null;
    let lngNumber: number | null = null;

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
      // Geocode location if coordinates not provided
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
        logger.error('Error geocoding location in /complete-profile:', e);
      }
    }

    // Require coordinates
    if (!latNumber || !lngNumber) {
      return res.status(400).json({
        success: false,
        error: 'Location required',
        message: 'Please provide a valid location with coordinates'
      });
    }

    // Update user profile
    const result = await pool.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           location = $2,
           latitude = $3,
           longitude = $4,
           bio = COALESCE($5, bio),
           profile_completed = true,
           terms_accepted_at = NOW(),
           terms_version = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, email, name, bio, location, latitude, longitude, avatar_url, verified, rating, member_since, has_password`,
      [name || null, location || null, latNumber, lngNumber, bio || null, CURRENT_TERMS_VERSION, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];

    logger.info(`✅ [AUTH] User ${userId} completed profile`);

    return res.json({
      success: true,
      message: 'Profile completed successfully',
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
          profileCompleted: true
        }
      }
    });
  } catch (error) {
    logger.error('Complete profile error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to complete profile',
      message: 'Internal server error'
    });
  }
});

// Accept terms endpoint - updates user's terms acceptance and issues tokens
router.post('/accept-terms', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    await pool.query(
      `UPDATE users 
       SET terms_accepted_at = NOW(), terms_version = $1 
       WHERE id = $2`,
      [CURRENT_TERMS_VERSION, userId]
    );
    
    // Generate tokens now that terms are accepted
    const userResult = await pool.query(
      `SELECT id, email, name FROM users WHERE id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    const tokens = generateTokenPair({ id: user.id, email: user.email, name: user.name });
    
    logger.info(`✅ [AUTH] User ${user.id} accepted terms version ${CURRENT_TERMS_VERSION}`);
    
    return res.json({
      success: true,
      message: 'Terms accepted successfully',
      data: {
        tokens
      }
    });
  } catch (error) {
    logger.error('Accept terms error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to accept terms',
      message: 'Internal server error'
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
         AND tp.status = 'approved'
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
    const { name, bio, location, latitude, longitude, socialLinks } = req.body as {
      name?: string;
      bio?: string | null;
      location?: string | null;
      latitude?: number | string;
      longitude?: number | string;
      socialLinks?: { [key: string]: string };
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

    // Validate social links if provided
    if (socialLinks !== undefined) {
      if (typeof socialLinks !== 'object' || Array.isArray(socialLinks)) {
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
        if (url !== null && url !== undefined && (typeof url !== 'string' || url.length > 255)) {
          return res.status(400).json({
            success: false,
            error: 'Invalid URL',
            message: `Invalid URL for ${platform}`
          });
        }
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

    // Check if we have anything to update (user fields OR social links)
    const hasUserFieldsToUpdate = updateFields.length > 0;
    const hasSocialLinksToUpdate = socialLinks !== undefined;

    if (!hasUserFieldsToUpdate && !hasSocialLinksToUpdate) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update',
        message: 'Provide at least one updatable field'
      });
    }

    // Use transaction to ensure atomicity
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update user table if there are fields to update
      if (hasUserFieldsToUpdate) {
        // Always update updated_at
        paramCount++;
        updateFields.push(`updated_at = $${paramCount}`);
        updateValues.push(new Date());

        // WHERE clause param
        paramCount++;
        updateValues.push(req.user!.id);

        await client.query(
          `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
          updateValues
        );
      }

      // Update social links if provided
      if (hasSocialLinksToUpdate) {
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

        // Update updated_at if we haven't already
        if (!hasUserFieldsToUpdate) {
          await client.query(
            'UPDATE users SET updated_at = $1 WHERE id = $2',
            [new Date(), req.user!.id]
          );
        }
      }

      await client.query('COMMIT');

      // Get updated user data with social links
      const userResult = await client.query(
        `SELECT 
          u.id, u.email, u.name, u.bio, u.location, u.avatar_url, 
          u.verified, u.rating, u.member_since, u.updated_at, u.latitude, u.longitude,
          json_object_agg(usl.platform, usl.username) FILTER (WHERE usl.platform IS NOT NULL) as social_links
        FROM users u
        LEFT JOIN user_social_links usl ON u.id = usl.user_id
        WHERE u.id = $1
        GROUP BY u.id`,
        [req.user!.id]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'User not found',
          message: 'User profile not found'
        });
      }

      const user = userResult.rows[0];
      const socialLinksData = user.social_links || {};

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
            updatedAt: user.updated_at,
            socialLinks: socialLinksData
          }
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
      error: 'Failed to update profile',
      message: 'Internal server error'
    });
  }
});

// Refresh token

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

router.delete('/me', authenticateToken, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const userId = req.user!.id;
    
    // Verify user exists
    const userCheck = await client.query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [userId]
    );
    
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User account not found'
      });
    }

    // Start transaction
    await client.query('BEGIN');

    // Log deletion event before deletion
    try {
      await client.query(
        'INSERT INTO user_activity_logs (user_id, event_type) VALUES ($1, $2)',
        [userId, 'account_deleted']
      );
      logger.info(`📊 [ACTIVITY] Logged account deletion event for user ${userId}`);
    } catch (logError) {
      logger.error('Error logging account deletion event:', logError);
      // Don't fail deletion if logging fails
    }

    // Delete user (cascade will handle all related data)
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    // Commit transaction
    await client.query('COMMIT');

    logger.info(`🗑️ [AUTH] User account deleted: ${userId} (${userCheck.rows[0].email})`);

    return res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Delete account error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete account',
      message: 'Internal server error during account deletion'
    });
  } finally {
    client.release();
  }
});


export default router;
