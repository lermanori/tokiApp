import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';
import { isEnabled } from '../services/featureFlags';

const router = Router();

router.use(async (_req: Request, res: Response, next) => {
  if (!(await isEnabled('boosts'))) {
    res.status(404).json({ success: false, message: 'Feature disabled' });
    return;
  }
  next();
});

// ─── GET /pending ── Get "Did you go?" cards pending for the user ───────────

router.get('/pending', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;

        const result = await pool.query(
            `SELECT p.id as prompt_id, p.toki_id, p.created_at,
              t.title, t.category, t.location, t.scheduled_time,
              t.image_url, t.image_urls,
              u.name as host_name, u.avatar_url as host_avatar
       FROM did_you_go_prompts p
       JOIN tokis t ON p.toki_id = t.id
       JOIN users u ON t.host_id = u.id
       WHERE p.user_id = $1
         AND p.status = 'pending'
         AND (p.expires_at IS NULL OR p.expires_at > NOW())
       ORDER BY p.created_at DESC`,
            [userId]
        );

        const cards = result.rows.map(row => ({
            promptId: row.prompt_id,
            tokiId: row.toki_id,
            title: row.title,
            category: row.category,
            location: row.location,
            scheduledTime: row.scheduled_time,
            imageUrl: row.image_urls && row.image_urls.length > 0 ? row.image_urls[0] : row.image_url,
            host: {
                name: row.host_name,
                avatar: row.host_avatar,
            },
            createdAt: row.created_at,
        }));

        return res.json({ success: true, data: cards });
    } catch (error) {
        logger.error('Error fetching did-you-go prompts:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── POST /:tokiId/respond ── Submit Yes/No response ────────────────────────

router.post('/:tokiId/respond', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { tokiId } = req.params;
        const { response } = req.body;

        if (typeof response !== 'boolean') {
            return res.status(400).json({ success: false, message: 'response must be a boolean (true for Yes, false for No)' });
        }

        // Verify there's a pending prompt for this user/toki
        const promptResult = await pool.query(
            `SELECT id FROM did_you_go_prompts
       WHERE toki_id = $1 AND user_id = $2 AND status IN ('pending', 'shown')`,
            [tokiId, userId]
        );

        if (promptResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No pending survey found for this Toki' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert the response
            await client.query(
                `INSERT INTO did_you_go_responses (toki_id, user_id, response, responded_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (toki_id, user_id) DO UPDATE SET response = $3, responded_at = NOW()`,
                [tokiId, userId, response]
            );

            // Update prompt status
            await client.query(
                `UPDATE did_you_go_prompts SET status = 'responded' WHERE toki_id = $1 AND user_id = $2`,
                [tokiId, userId]
            );

            await client.query('COMMIT');

            return res.json({
                success: true,
                message: response ? 'Thanks for letting us know you went!' : 'Thanks for your response!',
            });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        logger.error('Error submitting did-you-go response:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── POST /:tokiId/mark-shown ── Mark prompt as shown ───────────────────────

router.post('/:tokiId/mark-shown', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { tokiId } = req.params;

        await pool.query(
            `UPDATE did_you_go_prompts SET status = 'shown'
       WHERE toki_id = $1 AND user_id = $2 AND status = 'pending'`,
            [tokiId, userId]
        );

        return res.json({ success: true });
    } catch (error) {
        logger.error('Error marking did-you-go as shown:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
