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
         AND tp.status = 'approved'
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

// Delete current user account

export default router;
