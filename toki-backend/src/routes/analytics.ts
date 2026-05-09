import express from 'express';
import { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = express.Router();

// Define allowed frontend events to prevent noisy/malicious data
const ALLOWED_EVENTS = [
    'app_open',
    'map_tap',
    'event_viewed',
    'filter_applied',
    'push_opened',
    'profile_viewed',
    'login_screen_viewed',
    'login_success',
    'startup_refresh_attempted',
    'startup_refresh_succeeded',
    'startup_refresh_failed'
];

router.get('/nearby-request-count', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;

        const result = await pool.query(
            `SELECT COUNT(*)::int AS count
             FROM user_activity_logs
             WHERE user_id = $1
               AND event_type = 'request'
               AND path = '/nearby'`,
            [userId]
        );

        return res.status(200).json({
            success: true,
            data: {
                count: result.rows[0]?.count ?? 0,
            },
        });
    } catch (error) {
        logger.error('Error fetching nearby request count:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch nearby request count' });
    }
});

router.post('/track', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { action, screen, platform, version, metadata } = req.body;

        if (!action) {
            return res.status(400).json({ success: false, message: 'Missing action parameter' });
        }

        if (!ALLOWED_EVENTS.includes(action)) {
            return res.status(400).json({ success: false, message: 'Invalid action type' });
        }

        const payload = {
            action,
            screen: screen || 'unknown',
            platform: platform || 'unknown',
            version: version || 'unknown',
            ...metadata
        };

        // Log as a frontend_action in the existing user_activity_logs table
        await pool.query(
            `INSERT INTO user_activity_logs (
        user_id, event_type, method, path, status_code, device_platform, duration_ms, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
                userId,
                'frontend_action',
                'POST',               // Reusing existing cols for consistency
                '/api/analytics/track',
                200,
                platform || 'unknown',
                0,                    // duration is 0 for these instantaneous events
                JSON.stringify(payload)
            ]
        );

        return res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Error tracking analytics event:', error);
        return res.status(500).json({ success: false, message: 'Failed to log event' });
    }
});

export default router;
