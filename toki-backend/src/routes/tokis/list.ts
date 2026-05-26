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

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const {
      category,
      location,
      timeSlot,
      visibility,
      search,
      dateFrom,
      dateTo,
      radius,
      userLatitude,
      userLongitude,
      page = '1',
      limit = '20',
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = req.query;

    // First get the user's coordinates for distance calculation
    const userResult = await pool.query(
      'SELECT latitude, longitude FROM users WHERE id = $1',
      [userId]
    );

    const userLat = userResult.rows[0]?.latitude;
    const userLng = userResult.rows[0]?.longitude;

    const queryParams: any[] = [];
    let paramCount = 0;

    // Calculate where userId parameter will be (after distance params if they exist)
    const userIdParamPos = (userLat && userLng ? 3 : 1);

    // Build the base query
    let query = `
      SELECT 
        t.*,
        u.name as host_name,
        u.avatar_url as host_avatar,
        ARRAY_AGG(tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL) as tags,
        COALESCE(1 + COUNT(tp.user_id) FILTER (WHERE tp.status = 'approved'), 1) as current_attendees,
        COALESCE(jp.status, 'not_joined') as join_status,
        EXISTS(
          SELECT 1 FROM saved_tokis st 
          WHERE st.toki_id = t.id AND st.user_id = $${userIdParamPos}
        ) as is_saved
    `;

    // Always add distance calculation if user has coordinates
    if (userLat && userLng) {
      query += `,
        (
          6371 * acos(
            cos(radians($${paramCount + 1})) * 
            cos(radians(t.latitude)) * 
            cos(radians(t.longitude) - radians($${paramCount + 2})) + 
            sin(radians($${paramCount + 1})) * 
            sin(radians(t.latitude))
          )
        ) as distance_km`;
      queryParams.push(userLat, userLng);
      paramCount += 2;
    }

    query += `
      FROM tokis t
      LEFT JOIN users u ON t.host_id = u.id
      LEFT JOIN toki_tags tt ON t.id = tt.toki_id
      LEFT JOIN toki_participants tp ON t.id = tp.toki_id
      LEFT JOIN toki_participants jp ON jp.toki_id = t.id AND jp.user_id = $${paramCount + 1}
      WHERE t.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM user_blocks ub 
        WHERE (ub.blocker_id = $${paramCount + 1} AND ub.blocked_user_id = t.host_id)
        OR (ub.blocker_id = t.host_id AND ub.blocked_user_id = $${paramCount + 1})
      )
      AND NOT EXISTS (
        SELECT 1 FROM toki_hidden_users hu
        WHERE hu.toki_id = t.id AND hu.user_id = $${paramCount + 1}
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_hidden_activities uha
        WHERE uha.toki_id = t.id AND uha.user_id = $${paramCount + 1}
      )
    `;
    // Add userId for jp join and for block/hidden checks
    paramCount++;
    queryParams.push(userId);

    // TODO: Implement radius filtering in next iteration
    // For now, just log the parameters for debugging
    if (radius && userLatitude && userLongitude) {
      logger.debug('🔍 [BACKEND] Radius filtering requested:', { radius, userLatitude, userLongitude });
      // query += ` AND t.latitude IS NOT NULL AND t.longitude IS NOT NULL`;
      // queryParams.push(lat, lng);
      // paramCount += 2;
    }

    // Hide private tokis unless requester is host or participant/invitee
    query += ` AND (
      t.visibility <> 'private'
      OR t.host_id = $${paramCount + 1}
      OR EXISTS (
        SELECT 1 FROM toki_participants p
        WHERE p.toki_id = t.id AND p.user_id = $${paramCount + 1} AND p.status = 'approved'
      )
      OR EXISTS (
        SELECT 1 FROM toki_invites ti
        WHERE ti.toki_id = t.id AND ti.invited_user_id = $${paramCount + 1} AND ti.status IN ('invited','accepted')
      )
    )`;
    paramCount++;
    queryParams.push(userId);

    // Filter out tokis that are more than 12 hours past their scheduled time
    // Show tokis that are in the future or within 12 hours of their start time
    query += ` AND (t.scheduled_time IS NULL OR t.scheduled_time >= NOW() - INTERVAL '12 hours')`;

    // Add filters
    if (category) {
      paramCount++;
      query += ` AND t.category = $${paramCount}`;
      queryParams.push(category);
    }

    if (location) {
      paramCount++;
      query += ` AND t.location ILIKE $${paramCount}`;
      queryParams.push(`%${location}%`);
    }

    if (timeSlot) {
      paramCount++;
      query += ` AND t.time_slot = $${paramCount}`;
      queryParams.push(timeSlot);
    }

    if (visibility) {
      paramCount++;
      query += ` AND t.visibility = $${paramCount}`;
      queryParams.push(visibility);
    }

    if (search) {
      paramCount++;
      query += ` AND t.search_vector @@ plainto_tsquery('english', $${paramCount})`;
      queryParams.push(search);
    }

    // Add date range filtering
    if (dateFrom) {
      paramCount++;
      query += ` AND t.scheduled_time >= $${paramCount}::timestamp`;
      queryParams.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      query += ` AND t.scheduled_time <= $${paramCount}::timestamp`;
      queryParams.push(dateTo);
    }

    // Add radius-based filtering if coordinates provided; default/cap is 500km
    if (userLatitude && userLongitude) {
      const lat = parseFloat(userLatitude as string);
      const lng = parseFloat(userLongitude as string);
      const radiusKm = Math.min(parseFloat((radius as string) || '500') || 500, 500);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        query += ` AND t.latitude IS NOT NULL AND t.longitude IS NOT NULL`;
        queryParams.push(lat, lng, radiusKm);
        paramCount += 3;
        query += `
          AND (
            6371 * acos(
              cos(radians($${paramCount - 2})) * 
              cos(radians(t.latitude)) * 
              cos(radians(t.longitude) - radians($${paramCount - 1})) + 
              sin(radians($${paramCount - 2})) * 
              sin(radians(t.latitude))
            )
          ) <= $${paramCount}
        `;
      }
    }

    // Group by to handle tags aggregation and joins
    query += ` GROUP BY t.id, u.name, u.avatar_url, t.latitude, t.longitude, jp.status`;

    // Add sorting
    const validSortFields = ['created_at', 'title', 'location', 'current_attendees'];
    const validSortOrders = ['asc', 'desc'];

    // Add distance to valid sort fields if user coordinates are available
    if (userLat && userLng) {
      validSortFields.push('distance');
    }

    if ((sortBy as string) === 'relevance') {
      query += ` ORDER BY t.created_at DESC`;
    } else if (validSortFields.includes(sortBy as string) && validSortOrders.includes(sortOrder as string)) {
      if (sortBy === 'distance' && userLat && userLng) {
        query += ` ORDER BY distance_km ${(sortOrder as string).toUpperCase()}`;
      } else {
        query += ` ORDER BY t.${sortBy} ${(sortOrder as string).toUpperCase()}`;
      }
    } else {
      query += ` ORDER BY t.created_at DESC`;
    }

    // Add pagination
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100); // Max 100 items per page
    const offset = (pageNum - 1) * limitNum;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(limitNum);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    let scoreMap = new Map<string, number>();

    if (userId) {
      // Fetch algorithm weights (hyperparameters)
      const weightsResult = await pool.query(
        `SELECT w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_new, w_pen
         FROM algorithm_hyperparameters
         ORDER BY updated_at DESC
         LIMIT 1`
      );

      const weightsRow = weightsResult.rows[0];
      const weights: AlgorithmWeights = weightsRow
        ? {
          w_hist: Number(weightsRow.w_hist ?? 0.2),
          w_social: Number(weightsRow.w_social ?? 0.15),
          w_pop: Number(weightsRow.w_pop ?? 0.2),
          w_time: Number(weightsRow.w_time ?? 0.15),
          w_geo: Number(weightsRow.w_geo ?? 0.15),
          w_novel: Number(weightsRow.w_novel ?? 0.1),
          w_new: Number(weightsRow.w_new ?? 0.05),
          w_pen: Number(weightsRow.w_pen ?? 0.05),
        }
        : {
          w_hist: 0.2,
          w_social: 0.15,
          w_pop: 0.2,
          w_time: 0.15,
          w_geo: 0.15,
          w_novel: 0.1,
          w_new: 0.05,
          w_pen: 0.05,
        };

      let userLatForAlgo: number | null = null;
      let userLngForAlgo: number | null = null;
      try {
        const { rows } = await pool.query(
          'SELECT latitude, longitude FROM users WHERE id = $1',
          [userId]
        );
        userLatForAlgo = rows[0]?.latitude ?? null;
        userLngForAlgo = rows[0]?.longitude ?? null;
      } catch (coordError) {
        logger.warn('⚠️ Failed to fetch user coordinates for nearby algorithm scoring', coordError);
      }

      const eventData: EventData[] = result.rows.map((row) => ({
        id: row.id,
        category: row.category,
        scheduled_time: row.scheduled_time ? new Date(row.scheduled_time) : null,
        created_at: row.created_at ? new Date(row.created_at) : null,
        latitude: row.latitude,
        longitude: row.longitude,
        max_attendees: row.max_attendees,
        current_attendees: Number(row.current_attendees ?? 0),
        distance_km:
          typeof row.distance_km === 'string'
            ? parseFloat(row.distance_km)
            : row.distance_km ?? undefined,
        host_id: row.host_id,
        is_boosted: row.is_boosted || false,
      }));

      const algorithm = AlgorithmFactory.getAlgorithm('weighted-recommendation');
      const fallbackUserLat =
        userLatForAlgo ??
        (typeof userLat === 'number'
          ? userLat
          : typeof userLat === 'string'
            ? parseFloat(userLat)
            : null);
      const fallbackUserLng =
        userLngForAlgo ??
        (typeof userLng === 'number'
          ? userLng
          : typeof userLng === 'string'
            ? parseFloat(userLng)
            : null);

      const algorithmContext: AlgorithmContext = {
        userId,
        userLat: fallbackUserLat,
        userLng: fallbackUserLng,
        weights,
      };

      try {
        const scoredEvents = await algorithm.scoreEvents(eventData, algorithmContext);
        scoreMap = new Map<string, number>(
          scoredEvents.map((event) => [event.id, event.algorithm_score])
        );
      } catch (algoError) {
        logger.warn('⚠️ Failed to score nearby tokis with recommendation algorithm', algoError);
      }
    }

    if ((sortBy as string) === 'relevance' && scoreMap.size > 0) {
      const direction = (sortOrder as string)?.toLowerCase() === 'asc' ? 1 : -1;
      result.rows.sort((a, b) => {
        const scoreA = scoreMap.get(a.id) ?? 0;
        const scoreB = scoreMap.get(b.id) ?? 0;
        if (scoreA === scoreB) {
          // Fall back to created_at for stable ordering
          const aCreated = new Date(a.created_at || 0).getTime();
          const bCreated = new Date(b.created_at || 0).getTime();
          return direction * (bCreated - aCreated);
        }
        return direction * (scoreB - scoreA);
      });
    }

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT t.id) as total
      FROM tokis t
      WHERE t.status = 'active'
      AND (t.scheduled_time IS NULL OR t.scheduled_time >= NOW() - INTERVAL '12 hours')
    `;
    const countParams: any[] = [];
    let countParamCount = 0;

    if (category) {
      countParamCount++;
      countQuery += ` AND t.category = $${countParamCount}`;
      countParams.push(category);
    }

    if (location) {
      countParamCount++;
      countQuery += ` AND t.location ILIKE $${countParamCount}`;
      countParams.push(`%${location}%`);
    }

    if (timeSlot) {
      countParamCount++;
      countQuery += ` AND t.time_slot = $${countParamCount}`;
      countParams.push(timeSlot);
    }

    if (visibility) {
      countParamCount++;
      countQuery += ` AND t.visibility = $${countParamCount}`;
      countParams.push(visibility);
    }

    if (search) {
      countParamCount++;
      countQuery += ` AND t.search_vector @@ plainto_tsquery('english', $${countParamCount})`;
      countParams.push(search);
    }

    // Add date range filtering to count query
    if (dateFrom) {
      countParamCount++;
      countQuery += ` AND t.scheduled_time >= $${countParamCount}::timestamp`;
      countParams.push(dateFrom);
    }

    if (dateTo) {
      countParamCount++;
      countQuery += ` AND t.scheduled_time <= $${countParamCount}::timestamp`;
      countParams.push(dateTo);
    }

    // TODO: Implement radius filtering in count query in next iteration
    // Add radius-based filtering to count query if coordinates provided
    if (radius && userLatitude && userLongitude) {
      logger.debug('🔍 [BACKEND] Radius filtering in count query:', { radius, userLatitude, userLongitude });
      // countQuery += ` AND t.latitude IS NOT NULL AND t.longitude IS NOT NULL`;
      // countParams.push(lat, lng, radiusKm);
      // countParamCount += 3;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Fetch friends attending for each toki (only if user is authenticated)
    const friendsMap = new Map<string, Array<{ id: string; name: string; avatar?: string; isFriend?: boolean }>>();

    if (userId) {
      // Get all toki IDs from the result
      const tokiIds = result.rows.map(row => row.id);

      if (tokiIds.length > 0) {
        // Fetch friends attending for all tokis in one query
        const friendsResult = await pool.query(
          `SELECT 
            tp.toki_id,
            u.id,
            u.name,
            u.avatar_url,
            EXISTS(
              SELECT 1 FROM user_connections uc 
              WHERE ((uc.requester_id = $1 AND uc.recipient_id = tp.user_id) OR
                     (uc.recipient_id = $1 AND uc.requester_id = tp.user_id))
              AND uc.status = 'accepted'
            ) as is_friend
          FROM toki_participants tp
          JOIN users u ON tp.user_id = u.id
          WHERE tp.toki_id = ANY($2::uuid[])
            AND tp.status = 'approved'
            AND NOT EXISTS (
              SELECT 1 FROM user_blocks ub 
              WHERE (ub.blocker_id = $1 AND ub.blocked_user_id = tp.user_id)
                OR (ub.blocker_id = tp.user_id AND ub.blocked_user_id = $1)
            )
          ORDER BY tp.toki_id, is_friend DESC, tp.joined_at ASC`,
          [userId, tokiIds]
        );

        // Group participants by toki_id
        friendsResult.rows.forEach(friend => {
          if (!friendsMap.has(friend.toki_id)) {
            friendsMap.set(friend.toki_id, []);
          }
          // Limit to a small sample per Toki (frontend shows up to 3 anyway)
          if (friendsMap.get(friend.toki_id)!.length < 5) {
            friendsMap.get(friend.toki_id)!.push({
              id: friend.id,
              name: friend.name,
              avatar: friend.avatar_url,
              isFriend: friend.is_friend
            });
          }
        });
      }
    }

    // Format response with join status
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
      algorithmScore: scoreMap.size > 0 ? scoreMap.get(row.id) ?? null : null,
      friendsAttending: friendsMap.get(row.id) || [],
      isBoosted: row.is_boosted || false,
      boostId: row.active_boost_id || null,
    }));

    return res.status(200).json({
      success: true,
      data: {
        tokis,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Get Tokis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve Tokis'
    });
  }
});

// Get nearby Tokis based on coordinates
router.get('/nearby', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      latitude,
      longitude,
      radius = '500', // Default 500km radius
      limit = '50',
      page = '1',
      category,
      timeSlot,
      isPaid
    } = req.query;

    // Validate required coordinates
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        error: 'Coordinates required',
        message: 'Latitude and longitude are required for nearby search'
      });
    }

    const lat = parseFloat(latitude as string);
    const lng = parseFloat(longitude as string);
    const radiusKm = Math.min(parseFloat(radius as string) || 500, 500); // Max 500km
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const pageNum = Math.max(parseInt(page as string) || 1, 1);
    const offset = (pageNum - 1) * limitNum;

    // Get userId from optional auth (may be undefined)
    const userId = (req as any).user?.id || null;

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates',
        message: 'Please provide valid latitude (-90 to 90) and longitude (-180 to 180)'
      });
    }

    // Build WHERE conditions for both COUNT and SELECT queries
    let whereConditions = `
      WHERE t.status = 'active'
        AND t.latitude IS NOT NULL 
        AND t.longitude IS NOT NULL
        AND (t.scheduled_time IS NULL OR t.scheduled_time >= NOW() - INTERVAL '12 hours')
        AND (
          6371 * acos(
            cos(radians($1)) * 
            cos(radians(t.latitude)) * 
            cos(radians(t.longitude) - radians($2)) + 
            sin(radians($1)) * 
            sin(radians(t.latitude))
          )
        ) <= $3
    `;

    // Filter out hidden activities and handle private Tokis if user is authenticated
    if (userId) {
      whereConditions += `
        AND NOT EXISTS (
          SELECT 1 FROM user_hidden_activities uha
          WHERE uha.toki_id = t.id AND uha.user_id = $4
        )
        AND NOT EXISTS (
          SELECT 1 FROM toki_hidden_users thu
          WHERE thu.toki_id = t.id AND thu.user_id = $4
        )
        AND (
          t.visibility <> 'private'
          OR t.host_id = $4
          OR EXISTS (
            SELECT 1 FROM toki_participants p
            WHERE p.toki_id = t.id AND p.user_id = $4 AND p.status = 'approved'
          )
          OR EXISTS (
            SELECT 1 FROM toki_invites ti
            WHERE ti.toki_id = t.id AND ti.invited_user_id = $4 AND ti.status IN ('invited','accepted')
          )
        )
      `;
    } else {
      whereConditions += ` AND t.visibility <> 'private'`;
    }


    const baseParams: any[] = [lat, lng, radiusKm];
    let paramCount = 3;

    // Add userId parameter if authenticated (for hidden activities filter)
    if (userId) {
      paramCount++;
      baseParams.push(userId);
    }

    // Add category filter
    if (category) {
      paramCount++;
      whereConditions += ` AND t.category = $${paramCount}`;
      baseParams.push(category);
    }

    // Add time slot filter
    if (timeSlot) {
      paramCount++;
      whereConditions += ` AND t.time_slot = $${paramCount}`;
      baseParams.push(timeSlot);
    }

    // Add isPaid filter
    if (isPaid !== undefined && isPaid !== 'all') {
      paramCount++;
      const isPaidBool = isPaid === 'true';
      whereConditions += ` AND t.is_paid = $${paramCount}`;
      baseParams.push(isPaidBool);
    }

    // First, get the total count
    const countQuery = `
      SELECT COUNT(DISTINCT t.id) as total
      FROM tokis t
      ${whereConditions}
    `;
    const countResult = await pool.query(countQuery, baseParams);
    const totalCount = parseInt(countResult.rows[0].total);

    // Build the main query with distance calculation
    let query = `
      SELECT
        t.*,
        t.image_urls,
        t.is_paid,
        u.name as host_name,
        u.avatar_url as host_avatar,
        ARRAY_AGG(tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL) as tags,
        COALESCE(1 + COUNT(tp.user_id) FILTER (WHERE tp.status = 'approved'), 1) as current_attendees,
        (
          6371 * acos(
            cos(radians($1)) *
            cos(radians(t.latitude)) *
            cos(radians(t.longitude) - radians($2)) +
            sin(radians($1)) *
            sin(radians(t.latitude))
          )
        ) as distance_km`;

    // Add is_saved check and join_status if user is authenticated
    // Note: userId is already in baseParams at position 4 if authenticated
    const userIdParamNum = userId ? 4 : null;

    if (userId) {
      query += `,
        EXISTS(
          SELECT 1 FROM saved_tokis st 
          WHERE st.toki_id = t.id AND st.user_id = $${userIdParamNum}
        ) as is_saved,
        COALESCE(jp.status, CASE WHEN t.host_id = $${userIdParamNum} THEN 'hosting' ELSE 'not_joined' END) as join_status`;
    } else {
      query += `,
        false as is_saved,
        'not_joined' as join_status`;
    }

    query += `
      FROM tokis t
      LEFT JOIN users u ON t.host_id = u.id
      LEFT JOIN toki_tags tt ON t.id = tt.toki_id
      LEFT JOIN toki_participants tp ON t.id = tp.toki_id AND tp.status = 'approved'`;

    // Add join_status join if user is authenticated
    if (userId) {
      query += `
      LEFT JOIN toki_participants jp ON jp.toki_id = t.id AND jp.user_id = $${userIdParamNum}`;
    }

    query += `
      ${whereConditions}
    `;

    const queryParams = [...baseParams];

    // Group by and order by distance
    let groupByClause = ` GROUP BY t.id, u.name, u.avatar_url, t.latitude, t.longitude, t.image_urls`;
    if (userId) {
      groupByClause += `, jp.status`;
    }
    query += groupByClause;
    query += ` ORDER BY distance_km ASC`;

    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(limitNum);
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    const scoreMap = new Map<string, number>();

    if (userId) {
      const weightsResult = await pool.query(
        `SELECT w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_new, w_pen
         FROM algorithm_hyperparameters
         ORDER BY updated_at DESC
         LIMIT 1`
      );

      const weightsRow = weightsResult.rows[0];
      const weights: AlgorithmWeights = weightsRow
        ? {
          w_hist: Number(weightsRow.w_hist ?? 0.2),
          w_social: Number(weightsRow.w_social ?? 0.15),
          w_pop: Number(weightsRow.w_pop ?? 0.2),
          w_time: Number(weightsRow.w_time ?? 0.15),
          w_geo: Number(weightsRow.w_geo ?? 0.15),
          w_novel: Number(weightsRow.w_novel ?? 0.1),
          w_new: Number(weightsRow.w_new ?? 0.05),
          w_pen: Number(weightsRow.w_pen ?? 0.05),
        }
        : {
          w_hist: 0.2,
          w_social: 0.15,
          w_pop: 0.2,
          w_time: 0.15,
          w_geo: 0.15,
          w_novel: 0.1,
          w_new: 0.05,
          w_pen: 0.05,
        };

      let userLatForAlgo: number | null = null;
      let userLngForAlgo: number | null = null;
      try {
        const { rows } = await pool.query(
          'SELECT latitude, longitude FROM users WHERE id = $1',
          [userId]
        );
        userLatForAlgo = rows[0]?.latitude ?? null;
        userLngForAlgo = rows[0]?.longitude ?? null;
      } catch (coordError) {
        logger.warn('⚠️ Failed to fetch user coordinates for nearby scoring', coordError);
      }

      const eventData: EventData[] = result.rows.map((row) => ({
        id: row.id,
        category: row.category,
        scheduled_time: row.scheduled_time ? new Date(row.scheduled_time) : null,
        created_at: row.created_at ? new Date(row.created_at) : null,
        latitude: row.latitude,
        longitude: row.longitude,
        max_attendees: row.max_attendees,
        current_attendees: Number(row.current_attendees ?? 0),
        distance_km:
          typeof row.distance_km === 'string'
            ? parseFloat(row.distance_km)
            : row.distance_km ?? undefined,
        host_id: row.host_id,
        is_boosted: row.is_boosted || false,
      }));

      const algorithm = AlgorithmFactory.getAlgorithm('weighted-recommendation');
      const algorithmContext: AlgorithmContext = {
        userId,
        userLat: userLatForAlgo ?? lat,
        userLng: userLngForAlgo ?? lng,
        weights,
      };

      try {
        const scoredEvents = await algorithm.scoreEvents(eventData, algorithmContext);
        scoredEvents.forEach((event) => {
          scoreMap.set(event.id, event.algorithm_score);
        });
      } catch (algoError) {
        logger.warn('⚠️ Failed to score nearby tokis', algoError);
      }
    }

    // Fetch friends attending for each toki (only if user is authenticated)
    const friendsMap = new Map<string, Array<{ id: string; name: string; avatar?: string; isFriend?: boolean }>>();

    if (userId) {
      // Get all toki IDs from the result
      const tokiIds = result.rows.map(row => row.id);

      if (tokiIds.length > 0) {
        // Fetch friends attending for all tokis in one query
        const friendsResult = await pool.query(
          `SELECT 
            tp.toki_id,
            u.id,
            u.name,
            u.avatar_url,
            EXISTS(
              SELECT 1 FROM user_connections uc 
              WHERE ((uc.requester_id = $1 AND uc.recipient_id = tp.user_id) OR
                     (uc.recipient_id = $1 AND uc.requester_id = tp.user_id))
              AND uc.status = 'accepted'
            ) as is_friend
          FROM toki_participants tp
          JOIN users u ON tp.user_id = u.id
          WHERE tp.toki_id = ANY($2::uuid[])
            AND tp.status = 'approved'
            AND NOT EXISTS (
              SELECT 1 FROM user_blocks ub 
              WHERE (ub.blocker_id = $1 AND ub.blocked_user_id = tp.user_id)
                OR (ub.blocker_id = tp.user_id AND ub.blocked_user_id = $1)
            )
          ORDER BY tp.toki_id, is_friend DESC, tp.joined_at ASC`,
          [userId, tokiIds]
        );

        // Group participants by toki_id
        friendsResult.rows.forEach(friend => {
          if (!friendsMap.has(friend.toki_id)) {
            friendsMap.set(friend.toki_id, []);
          }
          if (friendsMap.get(friend.toki_id)!.length < 5) {
            friendsMap.get(friend.toki_id)!.push({
              id: friend.id,
              name: friend.name,
              avatar: friend.avatar_url,
              isFriend: friend.is_friend
            });
          }
        });
      }
    }

    // Format response
    const tokis = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      location: row.location,
      latitude: row.latitude,
      longitude: row.longitude,
      timeSlot: row.time_slot,
      scheduledTime: row.scheduled_time ? new Date(row.scheduled_time).toISOString().replace('T', ' ').slice(0, 16) : null,
      maxAttendees: row.max_attendees,
      currentAttendees: Number(row.current_attendees ?? 0),
      category: row.category,
      visibility: row.visibility,
      autoApprove: row.auto_approve || false,
      imageUrl: row.image_urls && row.image_urls.length > 0 ? row.image_urls[0] : row.image_url,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      distance: {
        km: Math.round(row.distance_km * 10) / 10,
        miles: Math.round((row.distance_km * 0.621371) * 10) / 10
      },
      host: {
        id: row.host_id,
        name: row.host_name,
        avatar: row.host_avatar
      },
      tags: row.tags || [],
      joinStatus: row.join_status || 'not_joined',
      is_saved: row.is_saved || false,
      algorithmScore: scoreMap.size > 0 ? scoreMap.get(row.id) ?? null : null,
      friendsAttending: friendsMap.get(row.id) || [],
      isBoosted: row.is_boosted || false,
      boostId: row.active_boost_id || null,
    }));

    const totalPages = Math.ceil(totalCount / limitNum);
    const hasMore = pageNum * limitNum < totalCount;

    return res.status(200).json({
      success: true,
      data: {
        tokis,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: totalPages,
          hasMore: hasMore
        },
        searchParams: {
          latitude: lat,
          longitude: lng,
          radiusKm,
          totalFound: totalCount
        }
      }
    });

  } catch (error) {
    logger.error('Nearby search error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to search nearby Tokis'
    });
  }
});

// Get all Tokis the user is involved with (hosting, joined, or pending)

export default router;
