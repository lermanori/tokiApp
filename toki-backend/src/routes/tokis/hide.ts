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

export default router;
