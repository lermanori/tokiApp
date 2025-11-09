import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get user's saved Tokis
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    // First get the user's coordinates for distance calculation
    const userResult = await pool.query(
      'SELECT latitude, longitude FROM users WHERE id = $1',
      [userId]
    );
    
    const userLat = userResult.rows[0]?.latitude;
    const userLng = userResult.rows[0]?.longitude;
    
    const queryParams: any[] = [userId];
    let paramCount = 1;

    // Build the base query with distance calculation
    let query = `
      SELECT 
        t.*,
        u.name as host_name,
        u.avatar_url as host_avatar,
        ARRAY_AGG(tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL) as tags,
        COALESCE(1 + COUNT(tp.user_id) FILTER (WHERE tp.status IN ('approved', 'joined')), 1) as current_attendees,
        st.created_at as saved_at
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
      FROM saved_tokis st
      JOIN tokis t ON st.toki_id = t.id
      JOIN users u ON t.host_id = u.id
      LEFT JOIN toki_tags tt ON t.id = tt.toki_id
      LEFT JOIN toki_participants tp ON t.id = tp.toki_id
      WHERE st.user_id = $1 AND t.status = 'active'
      GROUP BY t.id, u.name, u.avatar_url, t.latitude, t.longitude, st.created_at
      ORDER BY st.created_at DESC`;

    const result = await pool.query(query, queryParams);

    // Format response with join status - matching the /tokis route exactly
    const savedTokis = await Promise.all(result.rows.map(async (row) => {
      // Get current user's join status for this Toki
      let joinStatus = 'not_joined';
      if (row.host_id !== userId) {
        const joinResult = await pool.query(
          'SELECT status FROM toki_participants WHERE toki_id = $1 AND user_id = $2',
          [row.id, userId]
        );
        
        if (joinResult.rows.length > 0) {
          joinStatus = joinResult.rows[0].status;
        }
      }

      return {
        id: row.id,
        title: row.title,
        description: row.description,
        location: row.location,
        latitude: row.latitude,
        longitude: row.longitude,
        timeSlot: row.time_slot,
        scheduledTime: row.scheduled_time,
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
        joinStatus: joinStatus,
        savedAt: row.saved_at
      };
    }));

    return res.status(200).json({
      success: true,
      data: savedTokis
    });

  } catch (error) {
    console.error('Get saved Tokis error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve saved Tokis'
    });
  }
});

// Save a Toki
router.post('/:tokiId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { tokiId } = req.params;

    // Check if Toki exists and is active
    const tokiResult = await pool.query(
      'SELECT id, status FROM tokis WHERE id = $1',
      [tokiId]
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (tokiResult.rows[0].status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Toki not available',
        message: 'You can only save active Tokis'
      });
    }

    // Check if already saved
    const existingResult = await pool.query(
      'SELECT id FROM saved_tokis WHERE user_id = $1 AND toki_id = $2',
      [userId, tokiId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Already saved',
        message: 'This Toki is already saved'
      });
    }

    // Save the Toki
    await pool.query(
      'INSERT INTO saved_tokis (user_id, toki_id) VALUES ($1, $2)',
      [userId, tokiId]
    );

    return res.status(201).json({
      success: true,
      message: 'Toki saved successfully'
    });

  } catch (error) {
    console.error('Save Toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to save Toki'
    });
  }
});

// Unsave a Toki
router.delete('/:tokiId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { tokiId } = req.params;

    const result = await pool.query(
      'DELETE FROM saved_tokis WHERE user_id = $1 AND toki_id = $2 RETURNING id',
      [userId, tokiId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Saved Toki not found',
        message: 'This Toki was not saved'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Toki unsaved successfully'
    });

  } catch (error) {
    console.error('Unsave Toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to unsave Toki'
    });
  }
});

// Check if a Toki is saved by current user
router.get('/check/:tokiId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { tokiId } = req.params;

    const result = await pool.query(
      'SELECT id FROM saved_tokis WHERE user_id = $1 AND toki_id = $2',
      [userId, tokiId]
    );

    return res.status(200).json({
      success: true,
      data: {
        isSaved: result.rows.length > 0
      }
    });

  } catch (error) {
    console.error('Check saved Toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to check saved status'
    });
  }
});



export default router;
