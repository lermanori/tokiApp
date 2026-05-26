import { Router, Request, Response } from 'express';
import { pool } from '../../config/database';
import { createSystemNotificationAndPush } from '../../utils/notify';
import { sendPushToUsers } from '../../utils/push';
import { authenticateToken, optionalAuth } from '../../middleware/auth';
import { uploadSingleImage, handleUploadError } from '../../middleware/upload';
import { calculateDistance, formatDistance } from '../../utils/distance';
import {
  generateInviteCode,
  deactivateExistingLinks,
  validateInviteLink,
  incrementLinkUsage,
  isUserParticipant,
  addUserToToki
} from '../../utils/inviteLinkUtils';
import { getCategoriesForAPI, CATEGORY_CONFIG } from '../../config/categories';
import logger from '../../utils/logger';
import { ImageService } from '../../services/imageService';
import {
  AlgorithmContext,
  AlgorithmFactory,
  AlgorithmWeights,
  EventData,
} from '../../algorithms';

const router = Router();

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // First get the user's coordinates for distance calculation
    const userResult = await pool.query(
      'SELECT latitude, longitude FROM users WHERE id = $1',
      [userId]
    );

    const userLat = userResult.rows[0]?.latitude;
    const userLng = userResult.rows[0]?.longitude;

    // Build query with distance calculation if user has coordinates
    let query = `
      SELECT
        t.*,
        t.is_paid,
        u.name as host_name,
        u.avatar_url as host_avatar,
        u.bio as host_bio,
        u.location as host_location,
        ARRAY_AGG(tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL) as tags,
        EXISTS(
          SELECT 1 FROM saved_tokis st
          WHERE st.toki_id = t.id AND st.user_id = $2
        ) as is_saved`;

    // Add distance calculation if user has coordinates
    if (userLat && userLng) {
      query += `,
        (
          6371 * acos(
            cos(radians($3)) * 
            cos(radians(t.latitude)) * 
            cos(radians(t.longitude) - radians($4)) + 
            sin(radians($3)) * 
            sin(radians(t.latitude))
          )
        ) as distance_km`;
    }

    query += `
      FROM tokis t
      LEFT JOIN users u ON t.host_id = u.id
      LEFT JOIN toki_tags tt ON t.id = tt.toki_id
      WHERE t.id = $1 AND t.status = 'active'
        AND (
          t.visibility <> 'private'
          OR t.host_id = $2
          OR EXISTS (
            SELECT 1 FROM toki_participants p
            WHERE p.toki_id = t.id AND p.user_id = $2 AND p.status = 'approved'
          )
          OR EXISTS (
            SELECT 1 FROM toki_invites ti
            WHERE ti.toki_id = t.id AND ti.invited_user_id = $2 AND ti.status IN ('invited','accepted')
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM toki_hidden_users hu
          WHERE hu.toki_id = t.id AND hu.user_id = $2
        )
      GROUP BY t.id, u.name, u.avatar_url, u.bio, u.location`;

    // Add latitude and longitude to GROUP BY if calculating distance
    if (userLat && userLng) {
      query += `, t.latitude, t.longitude`;
    }

    const queryParams: any[] = [id, userId];
    if (userLat && userLng) {
      queryParams.push(userLat, userLng);
    }

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    const toki = result.rows[0];

    // Get participant count
    const participantResult = await pool.query(
      'SELECT COUNT(*) as participant_count FROM toki_participants WHERE toki_id = $1 AND status = $2',
      [id, 'approved']
    );

    // Get participants for rating system
    const participantsResult = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.avatar_url,
        tp.status
      FROM toki_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.toki_id = $1 AND tp.status = $2
      ORDER BY tp.joined_at ASC`,
      [id, 'approved']
    );

    // Get current user's join status
    let joinStatus = 'not_joined';
    if (toki.host_id !== userId) {
      const joinResult = await pool.query(
        'SELECT status FROM toki_participants WHERE toki_id = $1 AND user_id = $2',
        [id, userId]
      );

      if (joinResult.rows.length > 0) {
        joinStatus = joinResult.rows[0].status;
      }
    }

    // Calculate current attendees: host (always 1) + approved/joined participants
    const participantCount = parseInt(participantResult.rows[0].participant_count);
    const currentAttendees = 1 + participantCount; // Host + participants

    // Calculate distance if available
    let distance = null;
    if (toki.distance_km !== null && toki.distance_km !== undefined) {
      distance = {
        km: Math.round(toki.distance_km * 10) / 10,
        miles: Math.round((toki.distance_km * 0.621371) * 10) / 10
      };
    }

    const responseData = {
      id: toki.id,
      title: toki.title,
      description: toki.description,
      location: toki.location,
      latitude: toki.latitude,
      longitude: toki.longitude,
      timeSlot: toki.time_slot,
      scheduledTime: toki.scheduled_time ? new Date(toki.scheduled_time).toISOString().replace('T', ' ').slice(0, 16) : null,
      maxAttendees: toki.max_attendees,
      currentAttendees: currentAttendees, // Fixed: includes host
      category: toki.category,
      visibility: toki.visibility,
      autoApprove: toki.auto_approve || false,
      imageUrl: toki.image_urls && toki.image_urls.length > 0 ? toki.image_urls[0] : toki.image_url,
      image_urls: toki.image_urls || [],
      image_public_ids: toki.image_public_ids || [],
      status: toki.status,
      createdAt: toki.created_at,
      updatedAt: toki.updated_at,
      distance: distance,
      externalLink: toki.external_link || null,
      host: {
        id: toki.host_id,
        name: toki.host_name,
        avatar: toki.host_avatar,
        bio: toki.host_bio,
        location: toki.host_location
      },
      tags: toki.tags || [],
      joinStatus: joinStatus,
      is_saved: toki.is_saved || false,
      isPaid: toki.is_paid || false,
      isBoosted: toki.is_boosted || false,
      boostId: toki.active_boost_id || null,
      participants: participantsResult.rows.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar_url,
        status: p.status
      }))
    };

    return res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('Get Toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve Toki'
    });
  }
});

router.get('/:id/public', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    const result = await pool.query(
      `SELECT
        t.id,
        t.title,
        t.description,
        t.location,
        t.latitude,
        t.longitude,
        t.time_slot,
        t.scheduled_time,
        t.max_attendees,
        t.current_attendees,
        t.category,
        t.visibility,
        t.auto_approve,
        t.image_url,
        t.image_urls,
        t.image_public_ids,
        t.status,
        t.created_at,
        t.updated_at,
        t.external_link,
        t.is_paid,
        t.host_id,
        u.name as host_name,
        u.avatar_url as host_avatar,
        u.bio as host_bio,
        u.location as host_location,
        ARRAY_AGG(tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL) as tags
      FROM tokis t
      LEFT JOIN users u ON t.host_id = u.id
      LEFT JOIN toki_tags tt ON t.id = tt.toki_id
      WHERE t.id = $1
        AND t.status = 'active'
        AND t.visibility <> 'private'
      GROUP BY
        t.id,
        u.name,
        u.avatar_url,
        u.bio,
        u.location`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    const toki = result.rows[0];

    const participantResult = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.avatar_url
      FROM toki_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.toki_id = $1 AND tp.status = $2
      ORDER BY tp.joined_at ASC`,
      [id, 'approved']
    );

    let joinStatus = 'not_joined';
    if (userId && toki.host_id !== userId) {
      const joinResult = await pool.query(
        'SELECT status FROM toki_participants WHERE toki_id = $1 AND user_id = $2',
        [id, userId]
      );
      if (joinResult.rows.length > 0) {
        joinStatus = joinResult.rows[0].status;
      }
    }

    const responseData = {
      id: toki.id,
      title: toki.title,
      description: toki.description,
      location: toki.location,
      latitude: toki.latitude,
      longitude: toki.longitude,
      timeSlot: toki.time_slot,
      scheduledTime: toki.scheduled_time ? new Date(toki.scheduled_time).toISOString().replace('T', ' ').slice(0, 16) : null,
      maxAttendees: toki.max_attendees,
      currentAttendees: toki.current_attendees,
      category: toki.category,
      visibility: toki.visibility,
      autoApprove: toki.auto_approve || false,
      imageUrl: toki.image_urls && toki.image_urls.length > 0 ? toki.image_urls[0] : toki.image_url,
      image_urls: toki.image_urls || [],
      image_public_ids: toki.image_public_ids || [],
      status: toki.status,
      createdAt: toki.created_at,
      updatedAt: toki.updated_at,
      externalLink: toki.external_link || null,
      host: {
        id: toki.host_id,
        name: toki.host_name,
        avatar: toki.host_avatar,
        bio: toki.host_bio,
        location: toki.host_location
      },
      tags: toki.tags || [],
      joinStatus,
      is_saved: false,
      isPaid: toki.is_paid || false,
      participants: participantResult.rows.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar_url,
      }))
    };

    return res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    logger.error('Get public Toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve public Toki'
    });
  }
});

// Record a Toki view (publicly accessible)
router.post('/:id/view', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || null;

    await pool.query(
      'INSERT INTO toki_views (toki_id, user_id) VALUES ($1, $2)',
      [id, userId]
    );

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Record toki view error:', error);
    // Don't fail the request if view tracking fails, just return 200
    return res.status(200).json({ success: true });
  }
});


// Get friends (accepted connections) who are attending a toki

router.get('/:id/friends-attending', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const participantsResult = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.avatar_url,
        tp.status,
        EXISTS(
          SELECT 1 FROM user_connections uc 
          WHERE ((uc.requester_id = $1 AND uc.recipient_id = tp.user_id) OR
                 (uc.recipient_id = $1 AND uc.requester_id = tp.user_id))
          AND uc.status = 'accepted'
        ) as is_friend
      FROM toki_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.toki_id = $2 
        AND tp.status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks ub 
          WHERE (ub.blocker_id = $1 AND ub.blocked_user_id = tp.user_id)
            OR (ub.blocker_id = tp.user_id AND ub.blocked_user_id = $1)
        )
      ORDER BY is_friend DESC, tp.joined_at ASC`,
      [userId, id]
    );

    const participants = participantsResult.rows.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar_url,
      isFriend: p.is_friend
    }));

    return res.status(200).json({
      success: true,
      data: participants
    });

  } catch (error) {
    logger.error('Get friends attending toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve friends attending toki'
    });
  }
});

// Update a Toki (only by host)

export default router;
