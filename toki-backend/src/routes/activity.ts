import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { pool } from '../config/database';
import logger from '../utils/logger';

const router = express.Router();

// List current user's activity with hidden flag
router.get('/me/activity', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get viewer coordinates for distance calculation
    let userLat: number | null = null;
    let userLng: number | null = null;
    try {
      const { rows } = await pool.query('SELECT latitude, longitude FROM users WHERE id = $1', [userId]);
      if (rows.length > 0) {
        userLat = rows[0].latitude;
        userLng = rows[0].longitude;
      }
    } catch (e) {
      logger.warn('⚠️ Failed to fetch viewer coordinates for distance', e);
    }

    const distanceSelect = (userLat && userLng)
      ? `(6371 * acos(
            cos(radians($2)) * cos(radians(t.latitude)) * cos(radians(t.longitude) - radians($3)) +
            sin(radians($2)) * sin(radians(t.latitude))
         )) as distance_km`
      : `NULL::decimal as distance_km`;
    const query = `
      SELECT 
        t.id,
        t.title,
        COALESCE((t.image_urls)[1], t.image_url) as image_url,
        t.category,
        t.location,
        t.latitude,
        t.longitude,
        t.time_slot,
        t.current_attendees,
        t.max_attendees,
        t.scheduled_time,
        t.created_at,
        COALESCE(t.scheduled_time, t.created_at) AS sort_ts,
        t.visibility,
        t.status,
        u2.id as host_id,
        u2.name as host_name,
        u2.avatar_url as host_avatar,
        (MAX(CASE WHEN uha.toki_id IS NULL THEN 0 ELSE 1 END) > 0) AS is_hidden,
        COALESCE(array_agg(DISTINCT tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL), '{}') AS tags,
        ${distanceSelect}
      FROM tokis t
      JOIN users u2 ON u2.id = t.host_id
      LEFT JOIN user_hidden_activities uha ON uha.user_id = $1 AND uha.toki_id = t.id
      LEFT JOIN toki_tags tt ON tt.toki_id = t.id
      WHERE (
          t.host_id = $1
          OR EXISTS (
            SELECT 1 FROM toki_participants tp
            WHERE tp.toki_id = t.id AND tp.user_id = $1 AND tp.status IN ('approved','joined')
          )
        )
        AND t.status = 'active'
        AND t.visibility <> 'private'
        AND (t.scheduled_time IS NULL OR t.scheduled_time >= NOW())
      GROUP BY 
        t.id, t.title, t.image_urls, t.image_url, t.category, t.location, t.latitude, t.longitude, t.time_slot, t.current_attendees, t.max_attendees,
        t.scheduled_time, t.created_at, t.visibility, t.status, u2.id, u2.name, u2.avatar_url
      ORDER BY sort_ts DESC
      LIMIT 50
    `;
    const params: any[] = [userId];
    if (userLat && userLng) {
      params.push(userLat, userLng);
    }
    const { rows } = await pool.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('GET /activity/me/activity error', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// List a user's public activity (what others see)
router.get('/users/:userId/activity', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get viewer coordinates for distance calculation
    let viewerLat: number | null = null;
    let viewerLng: number | null = null;
    try {
      const { rows } = await pool.query('SELECT latitude, longitude FROM users WHERE id = $1', [req.user!.id]);
      if (rows.length > 0) {
        viewerLat = rows[0].latitude;
        viewerLng = rows[0].longitude;
      }
    } catch (e) {
      logger.warn('⚠️ Failed to fetch viewer coordinates for distance', e);
    }

    const distanceSelect = (viewerLat && viewerLng)
      ? `(6371 * acos(
            cos(radians($2)) * cos(radians(t.latitude)) * cos(radians(t.longitude) - radians($3)) +
            sin(radians($2)) * sin(radians(t.latitude))
         )) as distance_km`
      : `NULL::decimal as distance_km`;
    const query = `
      SELECT 
        t.id,
        t.title,
        COALESCE((t.image_urls)[1], t.image_url) as image_url,
        t.category,
        t.location,
        t.latitude,
        t.longitude,
        t.time_slot,
        t.current_attendees,
        t.max_attendees,
        t.scheduled_time,
        t.created_at,
        COALESCE(t.scheduled_time, t.created_at) AS sort_ts,
        t.visibility,
        t.status,
        u2.id as host_id,
        u2.name as host_name,
        u2.avatar_url as host_avatar,
        COALESCE(array_agg(DISTINCT tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL), '{}') AS tags,
        ${distanceSelect}
      FROM tokis t
      JOIN users u2 ON u2.id = t.host_id
      LEFT JOIN toki_tags tt ON tt.toki_id = t.id
      WHERE (
          t.host_id = $1
          OR EXISTS (
            SELECT 1 FROM toki_participants tp
            WHERE tp.toki_id = t.id AND tp.user_id = $1 AND tp.status IN ('approved','joined')
          )
        )
        AND t.status = 'active'
        AND t.visibility <> 'private'
        AND (t.scheduled_time IS NULL OR t.scheduled_time >= NOW())
        AND NOT EXISTS (
          SELECT 1 FROM user_hidden_activities uha
          WHERE uha.user_id = $1 AND uha.toki_id = t.id
        )
      GROUP BY 
        t.id, t.title, t.image_urls, t.image_url, t.category, t.location, t.latitude, t.longitude, t.time_slot, t.current_attendees, t.max_attendees,
        t.scheduled_time, t.created_at, t.visibility, t.status, u2.id, u2.name, u2.avatar_url
      ORDER BY sort_ts DESC
      LIMIT 50
    `;
    const params: any[] = [userId];
    if (viewerLat && viewerLng) {
      params.push(viewerLat, viewerLng);
    }
    const { rows } = await pool.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('GET /activity/users/:userId/activity error', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Hide a specific Toki from the current user's public profile
router.post('/me/activity/:tokiId/hide', authenticateToken, async (req: Request, res: Response) => {
  try {
    await pool.query(
      `INSERT INTO user_hidden_activities(user_id, toki_id) VALUES($1,$2)
       ON CONFLICT(user_id, toki_id) DO NOTHING`,
      [req.user!.id, req.params.tokiId]
    );
    return res.json({ success: true });
  } catch (error) {
    logger.error('POST /activity/me/activity/:tokiId/hide error', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Unhide
router.delete('/me/activity/:tokiId/hide', authenticateToken, async (req: Request, res: Response) => {
  try {
    await pool.query(`DELETE FROM user_hidden_activities WHERE user_id=$1 AND toki_id=$2`, [req.user!.id, req.params.tokiId]);
    return res.json({ success: true });
  } catch (error) {
    logger.error('DELETE /activity/me/activity/:tokiId/hide error', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

export default router;


