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

router.get('/my-tokis', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get the user's coordinates for distance calculation
    const userResult = await pool.query(
      'SELECT latitude, longitude FROM users WHERE id = $1',
      [userId]
    );

    const userLat = userResult.rows[0]?.latitude;
    const userLng = userResult.rows[0]?.longitude;

    const queryParams: any[] = [];
    let paramCount = 0;

    // Add userId first (will be at position 1)
    queryParams.push(userId);
    const userIdParamPos = paramCount + 1;
    paramCount++;

    // Add distance params if available
    if (userLat && userLng) {
      queryParams.push(userLat, userLng);
      paramCount += 2;
    }

    // Build query to get all tokis where user is host OR participant
    let query = `
      SELECT
        t.*,
        t.is_paid,
        u.name as host_name,
        u.avatar_url as host_avatar,
        ARRAY_AGG(DISTINCT tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL) as tags,
        COALESCE(1 + COUNT(DISTINCT tp.user_id) FILTER (WHERE tp.status = 'approved'), 1) as current_attendees,
        COALESCE(jp.status, CASE WHEN t.host_id = $${userIdParamPos} THEN 'hosting' ELSE 'not_joined' END) as join_status,
        EXISTS(
          SELECT 1 FROM saved_tokis st
          WHERE st.toki_id = t.id AND st.user_id = $${userIdParamPos}
        ) as is_saved`;

    // Add distance calculation if user has coordinates
    if (userLat && userLng) {
      query += `,
        (
          6371 * acos(
            cos(radians($${userIdParamPos + 1})) * 
            cos(radians(t.latitude)) * 
            cos(radians(t.longitude) - radians($${userIdParamPos + 2})) + 
            sin(radians($${userIdParamPos + 1})) * 
            sin(radians(t.latitude))
          )
        ) as distance_km`;
    }

    query += `
      FROM tokis t
      LEFT JOIN users u ON t.host_id = u.id
      LEFT JOIN toki_tags tt ON t.id = tt.toki_id
      LEFT JOIN toki_participants tp ON t.id = tp.toki_id AND tp.status = 'approved'
      LEFT JOIN toki_participants jp ON jp.toki_id = t.id AND jp.user_id = $${userIdParamPos}
      WHERE t.status = 'active'
        AND (
          t.host_id = $${userIdParamPos}
          OR EXISTS (
            SELECT 1 FROM toki_participants p
            WHERE p.toki_id = t.id AND p.user_id = $${userIdParamPos}
          )
        )
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks ub 
          WHERE (ub.blocker_id = $${userIdParamPos} AND ub.blocked_user_id = t.host_id)
          OR (ub.blocker_id = t.host_id AND ub.blocked_user_id = $${userIdParamPos})
        )
        AND NOT EXISTS (
          SELECT 1 FROM toki_hidden_users hu
          WHERE hu.toki_id = t.id AND hu.user_id = $${userIdParamPos}
        )
        AND NOT EXISTS (
          SELECT 1 FROM user_hidden_activities uha
          WHERE uha.toki_id = t.id AND uha.user_id = $${userIdParamPos}
        )
        AND (t.scheduled_time IS NULL OR t.scheduled_time >= NOW() - INTERVAL '12 hours')
      GROUP BY t.id, u.name, u.avatar_url, t.latitude, t.longitude, jp.status, t.host_id
      ORDER BY t.created_at DESC`;

    const result = await pool.query(query, queryParams);

    // Format response
    const tokis = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      latitude: row.latitude,
      longitude: row.longitude,
      timeSlot: row.time_slot,
      scheduledTime: row.scheduled_time ? new Date(row.scheduled_time).toISOString().replace('T', ' ').slice(0, 16) : null,
      maxAttendees: row.max_attendees,
      currentAttendees: row.current_attendees,
      category: row.category,
      visibility: row.visibility,
      autoApprove: row.auto_approve || false,
      imageUrl: row.image_urls && row.image_urls.length > 0 ? row.image_urls[0] : row.image_url,
      images: row.image_urls ? row.image_urls.map((url: string) => ({ url, publicId: '' })) : [],
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      distance: row.distance_km ? {
        km: Math.round(row.distance_km * 10) / 10,
        miles: Math.round((row.distance_km * 0.621371) * 10) / 10
      } : undefined,
      host: {
        id: row.host_id,
        name: row.host_name,
        avatar: row.host_avatar
      },
      tags: row.tags || [],
      joinStatus: row.join_status || 'not_joined',
      is_saved: row.is_saved || false,
      isPaid: row.is_paid || false,
      isBoosted: row.is_boosted || false,
      boostId: row.active_boost_id || null,
      externalLink: row.external_link || null,
    }));

    return res.status(200).json({
      success: true,
      tokis: tokis,
      pagination: {
        total: tokis.length,
        page: 1,
        limit: tokis.length,
        totalPages: 1
      }
    });

  } catch (error) {
    logger.error('Get my tokis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve my tokis'
    });
  }
});

// Get a specific Toki by ID

export default router;
