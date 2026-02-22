import express from 'express';
import { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Mute notifications for a Toki
router.post('/:tokiId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { tokiId } = req.params;

        await pool.query(
            `INSERT INTO toki_notification_mutes (user_id, toki_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, toki_id) DO NOTHING`,
            [userId, tokiId]
        );

        return res.json({ success: true, muted: true });
    } catch (error) {
        console.error('Mute toki notifications error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Unmute notifications for a Toki
router.delete('/:tokiId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { tokiId } = req.params;

        await pool.query(
            `DELETE FROM toki_notification_mutes WHERE user_id = $1 AND toki_id = $2`,
            [userId, tokiId]
        );

        return res.json({ success: true, muted: false });
    } catch (error) {
        console.error('Unmute toki notifications error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Check mute status for a Toki
router.get('/:tokiId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = req.user!.id;
        const { tokiId } = req.params;

        const result = await pool.query(
            `SELECT id FROM toki_notification_mutes WHERE user_id = $1 AND toki_id = $2`,
            [userId, tokiId]
        );

        return res.json({ success: true, muted: result.rows.length > 0 });
    } catch (error) {
        console.error('Check toki mute status error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
