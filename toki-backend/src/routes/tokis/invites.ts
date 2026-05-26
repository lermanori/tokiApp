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
      (await pool.query('SELECT 1 FROM toki_participants WHERE toki_id = $1 AND user_id = $2 AND status = $3',
        [id, userId, 'approved'])).rows.length > 0;

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
         VALUES ($1, $2, 'approved', NOW())
         ON CONFLICT (toki_id, user_id) DO UPDATE SET status = 'approved', joined_at = NOW()`,
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

export default router;
