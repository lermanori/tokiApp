import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { createSystemNotificationAndPush } from '../utils/notify';
import { sendPushToUsers } from '../utils/push';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import { uploadSingleImage, handleUploadError } from '../middleware/upload';
import { calculateDistance, formatDistance } from '../utils/distance';
import { 
  generateInviteCode, 
  deactivateExistingLinks, 
  validateInviteLink, 
  incrementLinkUsage, 
  isUserParticipant, 
  addUserToToki 
} from '../utils/inviteLinkUtils';
import { getCategoriesForAPI, CATEGORY_CONFIG } from '../config/categories';
import logger from '../utils/logger';
import {
  AlgorithmContext,
  AlgorithmFactory,
  AlgorithmWeights,
  EventData,
} from '../algorithms';

const router = Router();

// Create a new Toki
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      location,
      latitude,
      longitude,
      timeSlot,
      scheduledTime,
      maxAttendees,
      category,
      visibility,
      tags,
      images,
      externalLink
    } = req.body;

    // Validate required fields
    if (!title || !location || !timeSlot || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Title, location, time slot, and category are required'
      });
    }

    // Validate category - use centralized config
    const validCategories = Object.keys(CATEGORY_CONFIG);
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category',
        message: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    // Validate visibility
    const validVisibility = ['public', 'connections', 'friends', 'private'];
    if (visibility && !validVisibility.includes(visibility)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid visibility',
        message: `Visibility must be one of: ${validVisibility.join(', ')}`
      });
    }

    // Validate max attendees
    if (maxAttendees && (maxAttendees < 1 || maxAttendees > 1000)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid max attendees',
        message: 'Max attendees must be between 1 and 1000'
      });
    }

    // Start a database transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Insert the Toki
      const tokiResult = await client.query(
        `INSERT INTO tokis (
          host_id, title, description, location, latitude, longitude,
          time_slot, scheduled_time, max_attendees, category, visibility, external_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          req.user!.id,
          title,
          description || null,
          location,
          latitude || null,
          longitude || null,
          timeSlot,
          scheduledTime || null,
          maxAttendees || 10,
          category,
          visibility || 'public',
          externalLink || null
        ]
      );

      const toki = tokiResult.rows[0];

      // Insert tags if provided
      if (tags && Array.isArray(tags) && tags.length > 0) {
        for (const tag of tags) {
          await client.query(
            'INSERT INTO toki_tags (toki_id, tag_name) VALUES ($1, $2)',
            [toki.id, tag]
          );
        }
      }

      // Handle images if provided
      if (images && Array.isArray(images) && images.length > 0) {
        const imageUrls: string[] = [];
        const imagePublicIds: string[] = [];

        for (const image of images) {
          try {
            if (image.publicId && image.publicId.startsWith('temp_')) {
              logger.debug(`Processing temporary image: ${image.publicId}`);
              
              // For temporary images, store the local URI for now
              // The frontend can handle uploading them to Cloudinary later
              imageUrls.push(image.url);
              imagePublicIds.push(image.publicId);
            } else {
              // For already uploaded images, store as-is
              imageUrls.push(image.url);
              imagePublicIds.push(image.publicId);
            }
          } catch (error) {
            logger.warn(`Error processing image: ${error}`);
            // Continue with other images
          }
        }

        // Update the Toki with image information
        if (imageUrls.length > 0) {
          await client.query(
            `UPDATE tokis 
             SET image_urls = $1, image_public_ids = $2, updated_at = NOW()
             WHERE id = $3`,
            [imageUrls, imagePublicIds, toki.id]
          );
        }
      }

      await client.query('COMMIT');

      // Return the created Toki with host information
      const hostResult = await pool.query(
        'SELECT id, name, avatar_url FROM users WHERE id = $1',
        [req.user!.id]
      );

      const responseData = {
        ...toki,
        host: {
          id: hostResult.rows[0].id,
          name: hostResult.rows[0].name,
          avatar: hostResult.rows[0].avatar_url
        },
        tags: tags || [],
        images: images || []
      };

      return res.status(201).json({
        success: true,
        message: 'Toki created successfully',
        data: responseData
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Create Toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to create Toki'
    });
  }
});

// Hide users (host only)
router.post('/:id/hide', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body as { userId: string };
    const requester = (req as any).user.id;

    if (!userId) return res.status(400).json({ success: false, error: 'Missing userId' });

    const hostCheck = await pool.query('SELECT host_id FROM tokis WHERE id = $1 AND status = $2', [id, 'active']);
    if (hostCheck.rows.length === 0) return res.status(404).json({ success: false, error: 'Toki not found' });
    if (hostCheck.rows[0].host_id !== requester) return res.status(403).json({ success: false, error: 'Only host can hide users' });
    if (userId === requester) return res.status(400).json({ success: false, error: 'Cannot hide host' });

    const result = await pool.query(
      `INSERT INTO toki_hidden_users (toki_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (toki_id, user_id) DO NOTHING
       RETURNING *`,
      [id, userId]
    );

    return res.status(201).json({ success: true, data: { hidden: result.rows[0] || null } });
  } catch (error) {
    logger.error('Hide user error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/:id/hide', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requester = (req as any).user.id;
    const hostCheck = await pool.query('SELECT host_id FROM tokis WHERE id = $1', [id]);
    if (hostCheck.rows.length === 0) return res.status(404).json({ success: false, error: 'Toki not found' });
    if (hostCheck.rows[0].host_id !== requester) return res.status(403).json({ success: false, error: 'Only host can view hidden list' });

    const result = await pool.query(
      `SELECT hu.*, u.name, u.avatar_url FROM toki_hidden_users hu
       JOIN users u ON u.id = hu.user_id
       WHERE hu.toki_id = $1
       ORDER BY hu.created_at DESC`,
      [id]
    );
    return res.status(200).json({ success: true, data: { hiddenUsers: result.rows } });
  } catch (error) {
    logger.error('List hidden users error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.delete('/:id/hide/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    const requester = (req as any).user.id;
    const hostCheck = await pool.query('SELECT host_id FROM tokis WHERE id = $1', [id]);
    if (hostCheck.rows.length === 0) return res.status(404).json({ success: false, error: 'Toki not found' });
    if (hostCheck.rows[0].host_id !== requester) return res.status(403).json({ success: false, error: 'Only host can unhide users' });

    await pool.query('DELETE FROM toki_hidden_users WHERE toki_id = $1 AND user_id = $2', [id, userId]);
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Unhide user error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get all available categories
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = getCategoriesForAPI();

    return res.status(200).json({
      success: true,
      data: categories
    });

  } catch (error) {
    logger.error('Get categories error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve categories'
    });
  }
});

// Get popular tags
router.get('/tags/popular', async (req: Request, res: Response) => {
  try {
    const { limit = '20' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);

    const result = await pool.query(
      `SELECT 
        tt.tag_name,
        COUNT(*) as usage_count
      FROM toki_tags tt
      JOIN tokis t ON tt.toki_id = t.id
      WHERE t.status = 'active'
      GROUP BY tt.tag_name
      ORDER BY usage_count DESC
      LIMIT $1`,
      [limitNum]
    );

    const popularTags = result.rows.map(row => ({
      name: row.tag_name,
      count: parseInt(row.usage_count)
    }));

    return res.status(200).json({
      success: true,
      data: popularTags
    });

  } catch (error) {
    console.error('Get popular tags error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve popular tags'
    });
  }
});

// Search tags
router.get('/tags/search', async (req: Request, res: Response) => {
  try {
    const { q, limit = '10' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 10, 50);

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
        message: 'Please provide a search query'
      });
    }

    const result = await pool.query(
      `SELECT DISTINCT tt.tag_name
      FROM toki_tags tt
      JOIN tokis t ON tt.toki_id = t.id
      WHERE t.status = 'active' 
        AND tt.tag_name ILIKE $1
      ORDER BY tt.tag_name
      LIMIT $2`,
      [`%${q}%`, limitNum]
    );

    const tags = result.rows.map(row => row.tag_name);

    return res.status(200).json({
      success: true,
      data: tags
    });

  } catch (error) {
    logger.error('Search tags error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to search tags'
    });
  }
});

// Get all Tokis with filtering and pagination
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
        COALESCE(1 + COUNT(tp.user_id) FILTER (WHERE tp.status IN ('approved', 'joined')), 1) as current_attendees,
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
        WHERE p.toki_id = t.id AND p.user_id = $${paramCount + 1} AND p.status IN ('approved','joined')
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
        `SELECT w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_pen
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
            w_geo: Number(weightsRow.w_geo ?? 0.2),
            w_novel: Number(weightsRow.w_novel ?? 0.1),
            w_pen: Number(weightsRow.w_pen ?? 0.05),
          }
        : {
            w_hist: 0.2,
            w_social: 0.15,
            w_pop: 0.2,
            w_time: 0.15,
            w_geo: 0.2,
            w_novel: 0.1,
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
        latitude: row.latitude,
        longitude: row.longitude,
        max_attendees: row.max_attendees,
        current_attendees: Number(row.current_attendees ?? 0),
        distance_km:
          typeof row.distance_km === 'string'
            ? parseFloat(row.distance_km)
            : row.distance_km ?? undefined,
        host_id: row.host_id,
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
      timeSlot
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

    const baseParams: any[] = [lat, lng, radiusKm];
    let paramCount = 3;

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
        u.name as host_name,
        u.avatar_url as host_avatar,
        ARRAY_AGG(tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL) as tags,
        COALESCE(1 + COUNT(tp.user_id) FILTER (WHERE tp.status = 'joined'), 1) as current_attendees,
        (
          6371 * acos(
            cos(radians($1)) * 
            cos(radians(t.latitude)) * 
            cos(radians(t.longitude) - radians($2)) + 
            sin(radians($1)) * 
            sin(radians(t.latitude))
          )
        ) as distance_km`;
    
    // Add is_saved check if user is authenticated
    if (userId) {
      paramCount++;
      query += `,
        EXISTS(
          SELECT 1 FROM saved_tokis st 
          WHERE st.toki_id = t.id AND st.user_id = $${paramCount}
        ) as is_saved`;
    } else {
      query += `,
        false as is_saved`;
    }
    
    query += `
      FROM tokis t
      LEFT JOIN users u ON t.host_id = u.id
      LEFT JOIN toki_tags tt ON t.id = tt.toki_id
      LEFT JOIN toki_participants tp ON t.id = tp.toki_id AND tp.status = 'joined'
      ${whereConditions}
    `;

    const queryParams = [...baseParams];
    if (userId) {
      queryParams.push(userId);
    }

    // Group by and order by distance
    query += ` GROUP BY t.id, u.name, u.avatar_url, t.latitude, t.longitude, t.image_urls`;
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
        `SELECT w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_pen
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
            w_geo: Number(weightsRow.w_geo ?? 0.2),
            w_novel: Number(weightsRow.w_novel ?? 0.1),
            w_pen: Number(weightsRow.w_pen ?? 0.05),
          }
        : {
            w_hist: 0.2,
            w_social: 0.15,
            w_pop: 0.2,
            w_time: 0.15,
            w_geo: 0.2,
            w_novel: 0.1,
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
        latitude: row.latitude,
        longitude: row.longitude,
        max_attendees: row.max_attendees,
        current_attendees: Number(row.current_attendees ?? 0),
        distance_km:
          typeof row.distance_km === 'string'
            ? parseFloat(row.distance_km)
            : row.distance_km ?? undefined,
        host_id: row.host_id,
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
      currentAttendees: row.current_attendees,
      category: row.category,
      visibility: row.visibility,
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
      is_saved: row.is_saved || false,
      algorithmScore: scoreMap.size > 0 ? scoreMap.get(row.id) ?? null : null
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

// Get a specific Toki by ID
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
            WHERE p.toki_id = t.id AND p.user_id = $2 AND p.status IN ('approved','joined')
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
      'SELECT COUNT(*) as participant_count FROM toki_participants WHERE toki_id = $1 AND status IN ($2, $3)',
      [id, 'approved', 'joined']
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
      WHERE tp.toki_id = $1 AND tp.status IN ($2, $3)
      ORDER BY tp.joined_at ASC`,
      [id, 'approved', 'joined']
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

// Update a Toki (only by host)
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      location,
      latitude,
      longitude,
      timeSlot,
      scheduledTime,
      maxAttendees,
      category,
      visibility,
      tags,
      externalLink
    } = req.body;

    // Check if Toki exists and user is the host
    const existingResult = await pool.query(
      'SELECT host_id FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (existingResult.rows[0].host_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only update Tokis you host'
      });
    }

    // Validate category if provided - use centralized config
    if (category) {
      const validCategories = Object.keys(CATEGORY_CONFIG);
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category',
          message: `Category must be one of: ${validCategories.join(', ')}`
        });
      }
    }

    // Validate visibility if provided
    if (visibility) {
      const validVisibility = ['public', 'connections', 'friends', 'private'];
      if (!validVisibility.includes(visibility)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid visibility',
          message: `Visibility must be one of: ${validVisibility.join(', ')}`
        });
      }
    }

    // Validate max attendees if provided
    if (maxAttendees && (maxAttendees < 1 || maxAttendees > 1000)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid max attendees',
        message: 'Max attendees must be between 1 and 100'
      });
    }

    // Start a database transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 0;

      if (title !== undefined) {
        paramCount++;
        updateFields.push(`title = $${paramCount}`);
        updateValues.push(title);
      }

      if (description !== undefined) {
        paramCount++;
        updateFields.push(`description = $${paramCount}`);
        updateValues.push(description);
      }

      if (location !== undefined) {
        paramCount++;
        updateFields.push(`location = $${paramCount}`);
        updateValues.push(location);
      }

      if (latitude !== undefined) {
        paramCount++;
        updateFields.push(`latitude = $${paramCount}`);
        updateValues.push(latitude);
      }

      if (longitude !== undefined) {
        paramCount++;
        updateFields.push(`longitude = $${paramCount}`);
        updateValues.push(longitude);
      }

      if (timeSlot !== undefined) {
        paramCount++;
        updateFields.push(`time_slot = $${paramCount}`);
        updateValues.push(timeSlot);
      }

      if (scheduledTime !== undefined) {
        paramCount++;
        updateFields.push(`scheduled_time = $${paramCount}`);
        updateValues.push(scheduledTime);
      }

      if (maxAttendees !== undefined) {
        paramCount++;
        updateFields.push(`max_attendees = $${paramCount}`);
        updateValues.push(maxAttendees);
      }

      if (category !== undefined) {
        paramCount++;
        updateFields.push(`category = $${paramCount}`);
        updateValues.push(category);
      }

      if (visibility !== undefined) {
        paramCount++;
        updateFields.push(`visibility = $${paramCount}`);
        updateValues.push(visibility);
      }

      if (externalLink !== undefined) {
        paramCount++;
        updateFields.push(`external_link = $${paramCount}`);
        updateValues.push(externalLink || null);
      }

      // Always update the updated_at timestamp
      paramCount++;
      updateFields.push(`updated_at = $${paramCount}`);
      updateValues.push(new Date());

      // Add the WHERE clause parameter
      paramCount++;
      updateValues.push(id);

      const updateQuery = `
        UPDATE tokis 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, updateValues);
      const updatedToki = updateResult.rows[0];

      // Update tags if provided
      if (tags !== undefined) {
        // Delete existing tags
        await client.query('DELETE FROM toki_tags WHERE toki_id = $1', [id]);

        // Insert new tags
        if (Array.isArray(tags) && tags.length > 0) {
          for (const tag of tags) {
            await client.query(
              'INSERT INTO toki_tags (toki_id, tag_name) VALUES ($1, $2)',
              [id, tag]
            );
          }
        }
      }

      await client.query('COMMIT');

      // Get updated Toki with host and tags
      const finalResult = await pool.query(
        `SELECT 
          t.*,
          u.name as host_name,
          u.avatar_url as host_avatar,
          ARRAY_AGG(tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL) as tags
        FROM tokis t
        LEFT JOIN users u ON t.host_id = u.id
        LEFT JOIN toki_tags tt ON t.id = tt.toki_id
        WHERE t.id = $1
        GROUP BY t.id, u.name, u.avatar_url`,
        [id]
      );

      const responseData = {
        ...finalResult.rows[0],
        host: {
          id: finalResult.rows[0].host_id,
          name: finalResult.rows[0].host_name,
          avatar: finalResult.rows[0].host_avatar
        },
        tags: finalResult.rows[0].tags || []
      };

      return res.status(200).json({
        success: true,
        message: 'Toki updated successfully',
        data: responseData
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Update Toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to update Toki'
    });
  }
});

// Create an invite (host only)
router.post('/:id/invites', authenticateToken, async (req: Request, res: Response) => {
  logger.info('📥 [TOKIS] POST /:id/invites endpoint called');
  try {
    const { id } = req.params;
    const { invitedUserId } = req.body as { invitedUserId: string };
    const userId = (req as any).user.id;
    
    logger.info('📥 [TOKIS] Invite request:', { tokiId: id, invitedUserId, inviterId: userId });

    if (!invitedUserId) {
      return res.status(400).json({ success: false, error: 'Missing invitedUserId' });
    }

    // Check if toki exists and get details
    const tokiCheck = await pool.query('SELECT host_id, visibility, title FROM tokis WHERE id = $1 AND status = $2', [id, 'active']);
    if (tokiCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Toki not found' });
    }
    
    const toki = tokiCheck.rows[0];
    const isHost = toki.host_id === userId;
    const isPublicAttendee = toki.visibility === 'public' && 
      (await pool.query('SELECT 1 FROM toki_participants WHERE toki_id = $1 AND user_id = $2 AND status IN ($3, $4)', 
        [id, userId, 'approved', 'joined'])).rows.length > 0;
    
    if (!isHost && !isPublicAttendee) {
      return res.status(403).json({ success: false, error: 'Only host or attendees of public tokis can invite users' });
    }

    const result = await pool.query(
      `INSERT INTO toki_invites (toki_id, invited_user_id, invited_by, status)
       VALUES ($1, $2, $3, 'invited')
       ON CONFLICT (toki_id, invited_user_id) DO UPDATE SET status = 'invited', created_at = NOW()
       RETURNING *`,
      [id, invitedUserId, userId]
    );

    // Create notification for the invited user
    const tokiTitle = toki.title || 'a Toki';
    const inviterName = (req as any).user.name;
    const inviterType = isHost ? 'the host' : 'an attendee';
    
    logger.info('📥 [TOKIS] About to create notification, io available:', !!req.app.get('io'));
    
    await createSystemNotificationAndPush({
      userId: invitedUserId,
      type: 'invite',
      title: 'New Toki Invite',
      message: `You've been invited to join "${tokiTitle}" by ${inviterName} (${inviterType})`,
      relatedTokiId: id,
      relatedUserId: userId,
      pushData: { source: 'system' },
      io: req.app.get('io')
    });

    return res.status(201).json({ success: true, data: { invite: result.rows[0] } });
  } catch (error) {
    logger.error('Create invite error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// List invites (host sees all; invited user sees own)
router.get('/:id/invites', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const hostRow = await pool.query('SELECT host_id FROM tokis WHERE id = $1', [id]);
    if (hostRow.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Toki not found' });
    }
    const isHost = hostRow.rows[0].host_id === userId;

    const result = isHost
      ? await pool.query(
          `SELECT ti.*, u.name as invited_user_name, u.avatar_url as invited_user_avatar
           FROM toki_invites ti
           JOIN users u ON u.id = ti.invited_user_id
           WHERE ti.toki_id = $1
           ORDER BY ti.created_at DESC`,
          [id]
        )
      : await pool.query(
          `SELECT ti.*, u.name as invited_user_name, u.avatar_url as invited_user_avatar
           FROM toki_invites ti
           JOIN users u ON u.id = ti.invited_user_id
           WHERE ti.toki_id = $1 AND ti.invited_user_id = $2
           ORDER BY ti.created_at DESC`,
          [id, userId]
        );

    return res.status(200).json({ success: true, data: { invites: result.rows } });
  } catch (error) {
    logger.error('List invites error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Respond to an invite (invited user)
router.post('/:id/invites/:inviteId/respond', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id, inviteId } = req.params;
    const { action } = req.body as { action: 'accept' | 'decline' };
    const userId = (req as any).user.id;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    const inviteRow = await pool.query('SELECT * FROM toki_invites WHERE id = $1 AND toki_id = $2', [inviteId, id]);
    if (inviteRow.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invite not found' });
    }
    if (inviteRow.rows[0].invited_user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not your invite' });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const updated = await pool.query('UPDATE toki_invites SET status = $1 WHERE id = $2 RETURNING *', [newStatus, inviteId]);

    return res.status(200).json({ success: true, data: { invite: updated.rows[0] } });
  } catch (error) {
    logger.error('Respond invite error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Respond to an invite via notification ID (for notification actions)
router.post('/invites/respond', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notificationId, action } = req.body as { notificationId: string; action: 'accept' | 'decline' };
    const userId = (req as any).user.id;

    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    // Get the notification and verify it belongs to the user
    const notificationRow = await pool.query(
      'SELECT * FROM notifications WHERE id = $1 AND user_id = $2 AND type = $3',
      [notificationId, userId, 'invite']
    );
    
    if (notificationRow.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invite notification not found' });
    }

    const tokiId = notificationRow.rows[0].related_toki_id;
    if (!tokiId) {
      return res.status(400).json({ success: false, error: 'Invalid invite notification' });
    }

    // Find the invite for this toki and user
    const inviteRow = await pool.query(
      'SELECT * FROM toki_invites WHERE toki_id = $1 AND invited_user_id = $2 AND status = $3',
      [tokiId, userId, 'invited']
    );
    
    if (inviteRow.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Invite not found or already responded' });
    }

    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const updated = await pool.query(
      'UPDATE toki_invites SET status = $1 WHERE id = $2 RETURNING *',
      [newStatus, inviteRow.rows[0].id]
    );

    // Mark the notification as read
    await pool.query('UPDATE notifications SET read = true WHERE id = $1', [notificationId]);

    // If accepted, add user as participant and create accepted notification
    if (action === 'accept') {
      await pool.query(
        `INSERT INTO toki_participants (toki_id, user_id, status, joined_at)
         VALUES ($1, $2, 'joined', NOW())
         ON CONFLICT (toki_id, user_id) DO UPDATE SET status = 'joined', joined_at = NOW()`,
        [tokiId, userId]
      );

      // Create a new invite_accepted notification + push
      const tokiTitle = notificationRow.rows[0].message.split('"')[1] || 'event';
      await createSystemNotificationAndPush({
        userId,
        type: 'invite_accepted',
        title: 'Invite Accepted',
        message: `You've accepted the invite to join "${tokiTitle}"`,
        relatedTokiId: String(tokiId),
        relatedUserId: String(notificationRow.rows[0].related_user_id),
        pushData: { source: 'system' },
        io: req.app.get('io')
      });
      // Mark as read since it's just a confirmation
      await pool.query('UPDATE notifications SET read = true WHERE user_id = $1 AND type = $2 AND related_toki_id = $3 ORDER BY created_at DESC LIMIT 1', [userId, 'invite_accepted', tokiId]);
    }

    return res.status(200).json({ 
      success: true, 
      data: { 
        invite: updated.rows[0],
        action: action,
        tokiId: tokiId
      } 
    });
  } catch (error) {
    logger.error('Respond invite via notification error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete a Toki (only by host)
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if Toki exists and user is the host
    const existingResult = await pool.query(
      'SELECT host_id FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (existingResult.rows[0].host_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only delete Tokis you host'
      });
    }

    // Soft delete by setting status to 'cancelled'
    const result = await pool.query(
      'UPDATE tokis SET status = $1, updated_at = $2 WHERE id = $3 RETURNING id',
      ['cancelled', new Date(), id]
    );

    return res.status(200).json({
      success: true,
      message: 'Toki deleted successfully',
      data: { id: result.rows[0].id }
    });

  } catch (error) {
    logger.error('Delete Toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to delete Toki'
    });
  }
});

// Join a Toki
router.post('/:id/join', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if Toki exists and is active
    const tokiResult = await pool.query(
      `SELECT t.*, u.name as host_name 
       FROM tokis t 
       JOIN users u ON t.host_id = u.id 
       WHERE t.id = $1 AND t.status = $2`,
      [id, 'active']
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist or is not active'
      });
    }

    const toki = tokiResult.rows[0];

    // Check if user is trying to join their own Toki
    if (toki.host_id === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot join own Toki',
        message: 'You cannot join a Toki that you are hosting'
      });
    }

    // Check if user has already joined or requested to join
    const existingJoinResult = await pool.query(
      'SELECT * FROM toki_participants WHERE toki_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingJoinResult.rows.length > 0) {
      const existingJoin = existingJoinResult.rows[0];
      
      if (existingJoin.status === 'joined') {
        return res.status(400).json({
          success: false,
          error: 'Already joined',
          message: 'You have already joined this Toki'
        });
      } else if (existingJoin.status === 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Request pending',
          message: 'You have already requested to join this Toki'
        });
      }
    }

    // Check if user has an active invite for this toki
    const inviteResult = await pool.query(
      'SELECT * FROM toki_invites WHERE toki_id = $1 AND invited_user_id = $2 AND status = $3',
      [id, userId, 'invited']
    );

    const hasActiveInvite = inviteResult.rows.length > 0;

    // Check if Toki is full
    const currentAttendeesResult = await pool.query(
      'SELECT COUNT(*) as count FROM toki_participants WHERE toki_id = $1 AND status IN ($2, $3)',
      [id, 'approved', 'joined']
    );
    
    const currentAttendees = 1 + parseInt(currentAttendeesResult.rows[0].count); // Host (1) + participants
    
    if (currentAttendees >= toki.max_attendees) {
      return res.status(400).json({
        success: false,
        error: 'Toki is full',
        message: 'This Toki has reached its maximum number of attendees'
      });
    }

    // Determine status based on whether user has an active invite
    const joinStatus = hasActiveInvite ? 'joined' : 'pending';
    
    // Insert join request or direct join
    const joinResult = await pool.query(
      'INSERT INTO toki_participants (toki_id, user_id, status, joined_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, userId, joinStatus, new Date()]
    );

    // If pending, notify host (unified feed will show join_request for host)
    if (joinStatus === 'pending') {
      await sendPushToUsers([toki.host_id], {
        title: 'New Join Request',
        body: `${req.user!.name || 'Someone'} wants to join your ${toki.title} event`,
        data: { type: 'join_request', source: 'host_join_request', tokiId: id, requestId: joinResult.rows[0].id }
      });
    }

    // If user had an active invite, update the invite status to accepted
    if (hasActiveInvite) {
      await pool.query(
        'UPDATE toki_invites SET status = $1 WHERE toki_id = $2 AND invited_user_id = $3',
        ['accepted', id, userId]
      );
    }

    return res.status(200).json({
      success: true,
      message: hasActiveInvite ? 'Successfully joined the Toki' : 'Join request sent successfully',
      data: {
        id: joinResult.rows[0].id,
        tokiId: id,
        status: joinStatus,
        createdAt: joinResult.rows[0].joined_at
      }
    });

  } catch (error) {
    console.error('Join Toki error:', error);
    
    // Check if it's a table doesn't exist error
    if (error instanceof Error && error.message && error.message.includes('relation "toki_participants" does not exist')) {
      return res.status(500).json({
        success: false,
        error: 'Database setup required',
        message: 'The database tables need to be initialized. Please run the database setup script.'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to join Toki'
    });
  }
});

// Approve join request (only by host)
router.put('/:id/join/:requestId/approve', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id, requestId } = req.params;
    const hostId = (req as any).user.id;

    // Check if Toki exists and user is the host
    const tokiResult = await pool.query(
      'SELECT host_id, max_attendees FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (tokiResult.rows[0].host_id !== hostId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the host can approve join requests'
      });
    }

    // Check if join request exists and is pending
    const requestResult = await pool.query(
      'SELECT * FROM toki_participants WHERE id = $1 AND toki_id = $2 AND status = $3',
      [requestId, id, 'pending']
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Join request not found',
        message: 'The specified join request does not exist or is not pending'
      });
    }

    // Check if Toki is full
    const currentAttendeesResult = await pool.query(
      'SELECT COUNT(*) as count FROM toki_participants WHERE toki_id = $1 AND status IN ($2, $3)',
      [id, 'approved', 'joined']
    );
    
    const currentAttendees = 1 + parseInt(currentAttendeesResult.rows[0].count);
    const maxAttendees = tokiResult.rows[0].max_attendees;
    
    if (currentAttendees >= maxAttendees) {
      return res.status(400).json({
        success: false,
        error: 'Toki is full',
        message: 'This Toki has reached its maximum number of attendees'
      });
    }

    // Approve the join request
    const updateResult = await pool.query(
      'UPDATE toki_participants SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      ['approved', new Date(), requestId]
    );

    // Get user info for notification
    const userResult = await pool.query(
      'SELECT u.name as user_name, t.title as toki_title FROM toki_participants tp JOIN users u ON tp.user_id = u.id JOIN tokis t ON tp.toki_id = t.id WHERE tp.id = $1',
      [requestId]
    );

    if (userResult.rows.length > 0) {
      const { toki_title } = userResult.rows[0];
      const participantId = requestResult.rows[0].user_id;
      await sendPushToUsers([participantId], {
        title: 'Join Request Approved',
        body: `You can now join "${toki_title}"`,
        data: { type: 'join_approved', source: 'user_join_approved', tokiId: id, requestId }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Join request approved successfully',
      data: {
        id: updateResult.rows[0].id,
        tokiId: id,
        status: 'approved',
        updatedAt: updateResult.rows[0].updated_at
      }
    });

  } catch (error) {
    console.error('Approve join request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to approve join request'
    });
  }
});

// Decline join request (only by host)
router.put('/:id/join/:requestId/decline', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id, requestId } = req.params;
    const hostId = (req as any).user.id;

    // Check if Toki exists and user is the host
    const tokiResult = await pool.query(
      'SELECT host_id FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (tokiResult.rows[0].host_id !== hostId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the host can decline join requests'
      });
    }

    // Check if join request exists and is pending
    const requestResult = await pool.query(
      'SELECT * FROM toki_participants WHERE id = $1 AND toki_id = $2 AND status = $3',
      [requestId, id, 'pending']
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Join request not found',
        message: 'The specified join request does not exist or is not pending'
      });
    }

    // Decline the join request
    const updateResult = await pool.query(
      'UPDATE toki_participants SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      ['declined', new Date(), requestId]
    );

    // Get user info for notification
    const userResult = await pool.query(
      'SELECT u.name as user_name, t.title as toki_title FROM toki_participants tp JOIN users u ON tp.user_id = u.id JOIN tokis t ON tp.toki_id = t.id WHERE tp.id = $1',
      [requestId]
    );

    if (userResult.rows.length > 0) {
      const { toki_title } = userResult.rows[0];
      const participantId = requestResult.rows[0].user_id;
      await sendPushToUsers([participantId], {
        title: 'Join Request Declined',
        body: `Your request to join "${toki_title}" was declined`,
        data: { type: 'join_declined', source: 'user_join_pending', tokiId: id, requestId }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Join request declined successfully',
      data: {
        id: updateResult.rows[0].id,
        tokiId: id,
        status: 'declined',
        updatedAt: updateResult.rows[0].updated_at
      }
    });

  } catch (error) {
    console.error('Decline join request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to decline join request'
    });
  }
});

// Get pending join requests for a Toki (only by host)
router.get('/:id/join-requests', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hostId = (req as any).user.id;

    // Check if Toki exists and user is the host
    const tokiResult = await pool.query(
      'SELECT host_id FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (tokiResult.rows[0].host_id !== hostId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the host can view join requests'
      });
    }

    // Get pending join requests with user details
    const requestsResult = await pool.query(
      `SELECT 
        tp.id,
        tp.status,
        tp.joined_at,
        tp.updated_at,
        u.id as user_id,
        u.name as user_name,
        u.avatar_url as user_avatar,
        u.bio as user_bio
      FROM toki_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.toki_id = $1 AND tp.status = $2
      ORDER BY tp.joined_at DESC`,
      [id, 'pending']
    );

    return res.status(200).json({
      success: true,
      data: {
        requests: requestsResult.rows.map(row => ({
          id: row.id,
          status: row.status,
          joinedAt: row.joined_at,
          updatedAt: row.updated_at,
          user: {
            id: row.user_id,
            name: row.user_name,
            avatar: row.user_avatar,
            bio: row.user_bio
          }
        }))
      }
    });

  } catch (error) {
    console.error('Get join requests error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve join requests'
    });
  }
});

// Remove participant from Toki (only by host)
router.delete('/:id/participants/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    const hostId = (req as any).user.id;

    // Check if Toki exists and user is the host
    const tokiResult = await pool.query(
      'SELECT host_id FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist or is not active'
      });
    }

    if (tokiResult.rows[0].host_id !== hostId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the host can remove participants'
      });
    }

    // Check if the user to be removed is actually a participant
    const participantResult = await pool.query(
      'SELECT id, user_id FROM toki_participants WHERE toki_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found',
        message: 'The specified user is not a participant in this Toki'
      });
    }

    // Don't allow host to remove themselves
    if (userId === hostId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation',
        message: 'Host cannot remove themselves from the Toki'
      });
    }

    // Remove the participant
    await pool.query(
      'DELETE FROM toki_participants WHERE toki_id = $1 AND user_id = $2',
      [id, userId]
    );

    // Update current_attendees count
    await pool.query(
      'UPDATE tokis SET current_attendees = current_attendees - 1 WHERE id = $1',
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Participant removed successfully'
    });

  } catch (error) {
    console.error('Error removing participant:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to remove participant'
    });
  }
});

// Complete a Toki (only by host)
router.put('/:id/complete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hostId = (req as any).user.id;

    // Check if Toki exists and user is the host
    const tokiResult = await pool.query(
      'SELECT host_id, status FROM tokis WHERE id = $1',
      [id]
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (tokiResult.rows[0].host_id !== hostId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the host can complete the Toki'
      });
    }

    if (tokiResult.rows[0].status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Already completed',
        message: 'This Toki is already marked as completed'
      });
    }

    // Update Toki status to completed
    const result = await pool.query(
      'UPDATE tokis SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      ['completed', new Date(), id]
    );

    // Update all participants' join status to completed
    await pool.query(
      'UPDATE toki_participants SET status = $1, updated_at = $2 WHERE toki_id = $3',
      ['completed', new Date(), id]
    );

    console.log(`✅ Toki ${id} completed by host ${hostId}`);

    return res.status(200).json({
      success: true,
      message: 'Toki completed successfully',
      data: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        updatedAt: result.rows[0].updated_at
      }
    });

  } catch (error) {
    console.error('Complete Toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to complete Toki'
    });
  }
});

// Upload image for a Toki (only by host)
router.post('/:id/image', authenticateToken, uploadSingleImage, handleUploadError, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image provided',
        message: 'Please provide an image file'
      });
    }

    // Check if Toki exists and user is the host
    const existingResult = await pool.query(
      'SELECT host_id, image_url FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (existingResult.rows[0].host_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only upload images for Tokis you host'
      });
    }

    // Generate the image URL
    const imageUrl = `/uploads/${req.file.filename}`;

    // Update the Toki with the new image URL
    const result = await pool.query(
      'UPDATE tokis SET image_url = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [imageUrl, new Date(), id]
    );

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        id: result.rows[0].id,
        imageUrl: result.rows[0].image_url
      }
    });

  } catch (error) {
    console.error('Upload image error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to upload image'
    });
  }
});

// =========================
// Invite Links Endpoints
// =========================

// Generate invite link for a toki
router.post('/:id/invite-links', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { maxUses, message } = req.body;

    // Verify user is the host of the toki
    const tokiCheck = await pool.query(
      'SELECT id, title, status FROM tokis WHERE id = $1 AND host_id = $2',
      [id, userId]
    );

    if (tokiCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found or you are not the host'
      });
    }

    const toki = tokiCheck.rows[0];

    if (toki.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot create invite links for inactive tokis'
      });
    }

    // Deactivate any existing active links
    await deactivateExistingLinks(id, userId);

    // Generate new invite code
    const inviteCode = await generateInviteCode();

    // Create new invite link
    const result = await pool.query(
      `INSERT INTO toki_invite_links (toki_id, created_by, invite_code, max_uses, custom_message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, userId, inviteCode, maxUses || null, message || null]
    );

    const inviteLink = result.rows[0];
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/join/${inviteCode}`;

    res.status(201).json({
      success: true,
      data: {
        id: inviteLink.id,
        inviteCode: inviteLink.invite_code,
        inviteUrl,
        maxUses: inviteLink.max_uses,
        usedCount: inviteLink.used_count,
        customMessage: inviteLink.custom_message,
        createdAt: inviteLink.created_at
      }
    });
  } catch (error) {
    console.error('Error creating invite link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create invite link'
    });
  }
});

// Join toki via invite link
router.post('/join-by-link', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user!.id;

    if (!inviteCode) {
      return res.status(400).json({
        success: false,
        error: 'Invite code is required'
      });
    }

    // Validate invite link
    const validation = await validateInviteLink(inviteCode);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const { linkData } = validation;
    const tokiId = linkData.toki_id;

    // Check if user is already a participant
    const isParticipant = await isUserParticipant(tokiId, userId);
    
    if (isParticipant) {
      return res.status(400).json({
        success: false,
        error: 'You are already a participant in this event'
      });
    }

    // Add user to toki
    const added = await addUserToToki(tokiId, userId);
    
    if (!added) {
      return res.status(400).json({
        success: false,
        error: 'Failed to join event. Event may be full or inactive.'
      });
    }

    // Increment usage count
    await incrementLinkUsage(inviteCode);

    // Create notification for host (no actions needed since user is already approved)
    await createSystemNotificationAndPush({
      userId: linkData.created_by, // Host user ID
      type: 'participant_joined',
      title: 'New Participant Joined',
      message: `${req.user!.name} joined your event "${linkData.toki_title}" via invite link`,
      relatedTokiId: tokiId,
      relatedUserId: userId,
      pushData: { source: 'system' },
      io: req.app.get('io')
    });

    // Get updated toki details
    const tokiResult = await pool.query(
      `SELECT t.*, u.name as host_name, u.avatar_url as host_avatar
       FROM tokis t
       JOIN users u ON t.host_id = u.id
       WHERE t.id = $1`,
      [tokiId]
    );

    res.status(200).json({
      success: true,
      message: 'Successfully joined the event!',
      data: {
        toki: tokiResult.rows[0],
        joinedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error joining via invite link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join event'
    });
  }
});

// Get invite link info (public endpoint)
router.get('/invite-links/:code', async (req: Request, res: Response): Promise<any> => {
  try {
    const { code } = req.params;

    const validation = await validateInviteLink(code);
    
    if (!validation.isValid) {
      return res.status(404).json({
        success: false,
        error: validation.error
      });
    }

    const { linkData } = validation;

    // Fetch full public details for the toki so the join page can render
    const tokiRow = (await pool.query(
      `SELECT t.id, t.title, t.description, t.location, t.scheduled_time, t.current_attendees,
              t.max_attendees, t.visibility, u.id as host_id, u.name as host_name, u.avatar_url as host_avatar
       FROM tokis t
       JOIN users u ON u.id = t.host_id
       WHERE t.id = $1`,
      [linkData.toki_id]
    )).rows[0];

    res.status(200).json({
      success: true,
      data: {
        toki: tokiRow ? {
          id: tokiRow.id,
          title: tokiRow.title,
          description: tokiRow.description,
          location: tokiRow.location,
          scheduled_time: tokiRow.scheduled_time,
          current_attendees: tokiRow.current_attendees,
          max_attendees: tokiRow.max_attendees,
          visibility: tokiRow.visibility,
          host_id: tokiRow.host_id
        } : {
          id: linkData.toki_id,
          title: linkData.toki_title,
          visibility: linkData.toki_visibility,
          max_attendees: linkData.toki_max_attendees
        },
        host: {
          name: tokiRow?.host_name || linkData.host_name,
          avatar: tokiRow?.host_avatar || linkData.host_avatar
        },
        inviteLink: {
          code: linkData.invite_code,
          maxUses: linkData.max_uses,
          usedCount: linkData.used_count,
          remainingUses: linkData.max_uses ? linkData.max_uses - linkData.used_count : null,
          customMessage: linkData.custom_message
        },
        isActive: linkData.is_active
      }
    });
  } catch (error) {
    console.error('Error getting invite link info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get invite link info'
    });
  }
});

// Get all invite links for a toki (host only)
router.get('/:id/invite-links', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify user is the host
    const tokiCheck = await pool.query(
      'SELECT id, title FROM tokis WHERE id = $1 AND host_id = $2',
      [id, userId]
    );

    if (tokiCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found or you are not the host'
      });
    }

    // Get all invite links for this toki
    const result = await pool.query(
      `SELECT 
        id,
        invite_code,
        is_active,
        max_uses,
        used_count,
        custom_message,
        created_at,
        updated_at
      FROM toki_invite_links 
      WHERE toki_id = $1 
      ORDER BY created_at DESC`,
      [id]
    );

    const links = result.rows.map(link => ({
      id: link.id,
      inviteCode: link.invite_code,
      inviteUrl: `${process.env.FRONTEND_URL || 'https://app.toki.com'}/join/${link.invite_code}`,
      isActive: link.is_active,
      maxUses: link.max_uses,
      usedCount: link.used_count,
      remainingUses: link.max_uses ? link.max_uses - link.used_count : null,
      customMessage: link.custom_message,
      createdAt: link.created_at,
      updatedAt: link.updated_at
    }));

    const activeLink = links.find(link => link.isActive);

    res.status(200).json({
      success: true,
      data: {
        toki: tokiCheck.rows[0],
        links,
        activeLink
      }
    });
  } catch (error) {
    console.error('Error getting invite links:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get invite links'
    });
  }
});

// Deactivate an invite link
router.delete('/invite-links/:linkId', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { linkId } = req.params;
    const userId = req.user!.id;

    // Verify user owns this invite link
    const linkCheck = await pool.query(
      `SELECT il.id, il.toki_id, t.title as toki_title
       FROM toki_invite_links il
       JOIN tokis t ON il.toki_id = t.id
       WHERE il.id = $1 AND il.created_by = $2`,
      [linkId, userId]
    );

    if (linkCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invite link not found or you are not the owner'
      });
    }

    // Deactivate the link
    await pool.query(
      'UPDATE toki_invite_links SET is_active = false, updated_at = NOW() WHERE id = $1',
      [linkId]
    );

    res.status(200).json({
      success: true,
      message: 'Invite link deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating invite link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate invite link'
    });
  }
});

// Regenerate invite link
router.post('/:id/invite-links/regenerate', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { maxUses, message } = req.body;

    // Verify user is the host
    const tokiCheck = await pool.query(
      'SELECT id, title, status FROM tokis WHERE id = $1 AND host_id = $2',
      [id, userId]
    );

    if (tokiCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found or you are not the host'
      });
    }

    const toki = tokiCheck.rows[0];

    if (toki.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot create invite links for inactive tokis'
      });
    }

    // Deactivate existing active links
    await deactivateExistingLinks(id, userId);

    // Generate new invite code
    const inviteCode = await generateInviteCode();

    // Create new invite link
    const result = await pool.query(
      `INSERT INTO toki_invite_links (toki_id, created_by, invite_code, max_uses, custom_message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, userId, inviteCode, maxUses || null, message || null]
    );

    const inviteLink = result.rows[0];
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/join/${inviteCode}`;

    res.status(201).json({
      success: true,
      message: 'New invite link generated successfully',
      data: {
        id: inviteLink.id,
        inviteCode: inviteLink.invite_code,
        inviteUrl,
        maxUses: inviteLink.max_uses,
        usedCount: inviteLink.used_count,
        customMessage: inviteLink.custom_message,
        createdAt: inviteLink.created_at
      }
    });
  } catch (error) {
    console.error('Error regenerating invite link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate invite link'
    });
  }
});

export default router; 