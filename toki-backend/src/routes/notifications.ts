import express from 'express';
import { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Ensure helper table exists for read tracking of external (non-table) items
async function ensureReadTrackingTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notification_reads (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      source VARCHAR(64) NOT NULL,
      external_id VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, source, external_id)
    );
  `);
}

// Get unread notifications count for a user
router.get('/count', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get count of unread notifications for the user
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false',
      [userId]
    );

    const unreadCount = parseInt(countResult.rows[0].count);

    return res.status(200).json({
      success: true,
      data: {
        unreadCount,
        totalCount: unreadCount // For now, just return unread count
      }
    });

  } catch (error) {
    console.error('Get notifications count error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to get notifications count'
    });
  }
});

// Get all notifications for a user
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get notifications with pagination
    const notificationsResult = await pool.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count
    const totalResult = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1',
      [userId]
    );

    const totalCount = parseInt(totalResult.rows[0].count);

    return res.status(200).json({
      success: true,
      data: {
        notifications: notificationsResult.rows,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to get notifications'
    });
  }
});

// Unified notifications: merge system notifications + connection requests + accepted + join requests
router.get('/combined', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 50 } = req.query as any;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offset = ((parseInt(page as string) || 1) - 1) * limitNum;

    await ensureReadTrackingTable();

    // 1) System notifications table
    const sysRows = (await pool.query(
      `SELECT n.id, n.created_at, n.read, n.title, n.message, n.type, n.related_toki_id, n.related_user_id,
              t.title as toki_title, u.name as inviter_name
       FROM notifications n
       LEFT JOIN tokis t ON n.related_toki_id = t.id
       LEFT JOIN users u ON n.related_user_id = u.id
       WHERE n.user_id = $1
         AND NOT (n.type = 'invite' AND n.read = true)
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limitNum, offset]
    )).rows.map(r => {
      const baseNotification = {
        id: `sys-${r.id}`,
        source: 'system',
        externalId: String(r.id),
        type: r.type || 'system',
        title: r.title || 'Notification',
        message: r.message || '',
        timestamp: r.created_at,
        read: !!r.read,
      };

      // Add special handling for invite notifications
      if (r.type === 'invite') {
        return {
          ...baseNotification,
          type: 'invite',
          actionRequired: !baseNotification.read,
          tokiId: r.related_toki_id ? String(r.related_toki_id) : null,
          tokiTitle: r.toki_title,
          inviterId: r.related_user_id ? String(r.related_user_id) : null,
          inviterName: r.inviter_name,
        };
      }

      // Add special handling for invite_accepted notifications
      if (r.type === 'invite_accepted') {
        return {
          ...baseNotification,
          type: 'invite_accepted',
          actionRequired: false,
          tokiId: r.related_toki_id ? String(r.related_toki_id) : null,
          tokiTitle: r.toki_title,
          inviterId: r.related_user_id ? String(r.related_user_id) : null,
          inviterName: r.inviter_name,
        };
      }

      // Add special handling for participant_joined notifications
      if (r.type === 'participant_joined') {
        return {
          ...baseNotification,
          type: 'participant_joined',
          actionRequired: false,
          tokiId: r.related_toki_id ? String(r.related_toki_id) : null,
          tokiTitle: r.toki_title,
          userId: r.related_user_id ? String(r.related_user_id) : null,
          userName: r.inviter_name, // This contains the participant's name
        };
      }

      return baseNotification;
    });

    // 2) Pending connection requests to current user
    const connPending = (await pool.query(
      `SELECT uc.id, uc.created_at, u.id as requester_id, u.name
       FROM user_connections uc
       JOIN users u ON uc.requester_id = u.id
       WHERE uc.recipient_id = $1 AND uc.status = 'pending'
       ORDER BY uc.created_at DESC`,
      [userId]
    )).rows.map(r => ({
      id: `conn-pending-${r.id}`,
      source: 'connection_pending',
      externalId: String(r.id),
      type: 'connection_request',
      title: 'New Connection Request',
      message: `${r.name} sent you a connection request`,
      timestamp: r.created_at,
      read: false,
      actionRequired: true,
      userId: String(r.requester_id),
    }));

    // 3) Recently accepted connections (either direction)
    const connAccepted = (await pool.query(
      `SELECT uc.id, COALESCE(uc.updated_at, uc.created_at) as ts, 
              uc.requester_id,
              CASE WHEN uc.requester_id = $1 THEN u2.name ELSE u1.name END as name
       FROM user_connections uc
       JOIN users u1 ON u1.id = uc.requester_id
       JOIN users u2 ON u2.id = uc.recipient_id
       WHERE (uc.requester_id = $1 OR uc.recipient_id = $1)
         AND uc.status = 'accepted'
         AND COALESCE(uc.updated_at, uc.created_at) > NOW() - INTERVAL '30 days'
       ORDER BY ts DESC`,
      [userId]
    )).rows.map(r => {
      // Determine the message based on who the current user is
      const isRequester = r.requester_id === userId;
      const message = isRequester 
        ? `${r.name} accepted your connection request`
        : `You accepted ${r.name}'s connection request`;
      
      return {
        id: `conn-accepted-${r.id}`,
        source: 'connection_accepted',
        externalId: String(r.id),
        type: 'connection_accepted',
        title: 'Connection Request Accepted',
        message: message,
        timestamp: r.ts,
        read: false,
      };
    });

    // 4) Join requests where current user is host (pending)
    const hostPending = (await pool.query(
      `SELECT tp.id, tp.toki_id, tp.joined_at as ts, u.id as user_id, u.name, t.title as toki_title
       FROM toki_participants tp
       JOIN tokis t ON t.id = tp.toki_id
       JOIN users u ON u.id = tp.user_id
       WHERE t.host_id = $1 AND tp.status = 'pending'
       ORDER BY tp.joined_at DESC`,
      [userId]
    )).rows.map(r => ({
      id: `host-join-${r.id}`,
      source: 'host_join_request',
      externalId: String(r.id),
      type: 'join_request',
      title: 'New Join Request',
      message: `${r.name} wants to join your ${r.toki_title} event`,
      timestamp: r.ts,
      read: false,
      // extra fields for client actions
      actionRequired: true,
      tokiId: String(r.toki_id),
      requestId: String(r.id),
      userId: String(r.user_id),
      userName: r.name,
      tokiTitle: r.toki_title,
    }));

    // 5) User's own join status updates (approved)
    const userApproved = (await pool.query(
      `SELECT tp.id, COALESCE(tp.updated_at, tp.joined_at) as ts, t.title as toki_title
       FROM toki_participants tp
       JOIN tokis t ON t.id = tp.toki_id
       WHERE tp.user_id = $1 AND tp.status IN ('approved')
       ORDER BY COALESCE(tp.updated_at, tp.joined_at) DESC`,
      [userId]
    )).rows.map(r => ({
      id: `user-approved-${r.id}`,
      source: 'user_join_approved',
      externalId: String(r.id),
      type: 'join_approved',
      title: 'Join Request Approved',
      message: `You can now join the ${r.toki_title} event`,
      timestamp: r.ts,
      read: true,
    }));

    // 6) Host-side approvals (persisted view that a user was approved for host's event)
    const hostApproved = (await pool.query(
      `SELECT tp.id, COALESCE(tp.updated_at, tp.joined_at) as ts,
              t.id as toki_id, t.title as toki_title,
              u.id as user_id, u.name as user_name
       FROM toki_participants tp
       JOIN tokis t ON t.id = tp.toki_id
       JOIN users u ON u.id = tp.user_id
       WHERE t.host_id = $1 AND tp.status = 'approved'
         AND COALESCE(tp.updated_at, tp.joined_at) > NOW() - INTERVAL '30 days'
       ORDER BY ts DESC`,
      [userId]
    )).rows.map(r => ({
      id: `host-approved-${r.id}`,
      source: 'host_join_approved',
      externalId: String(r.id),
      type: 'join_approved',
      title: 'Join Request Approved',
      message: `${r.user_name} can now join your ${r.toki_title} event`,
      timestamp: r.ts,
      read: true,
      actionRequired: false,
      tokiId: String(r.toki_id),
      requestId: String(r.id),
      userId: String(r.user_id),
      userName: r.user_name,
      tokiTitle: r.toki_title,
    }));

    // 6) User's own join sent (pending)
    const userPending = (await pool.query(
      `SELECT tp.id, tp.joined_at as ts, t.title as toki_title
       FROM toki_participants tp
       JOIN tokis t ON t.id = tp.toki_id
       WHERE tp.user_id = $1 AND tp.status = 'pending'
       ORDER BY tp.joined_at DESC`,
      [userId]
    )).rows.map(r => ({
      id: `user-pending-${r.id}`,
      source: 'user_join_pending',
      externalId: String(r.id),
      type: 'join_sent',
      title: 'Join Request Sent',
      message: `Your request to join ${r.toki_title} is pending`,
      timestamp: r.ts,
      read: false,
    }));

    // Read tracking from helper table
    const readRows = (await pool.query(
      `SELECT source, external_id FROM notification_reads WHERE user_id = $1`,
      [userId]
    )).rows;
    const readSet = new Set(readRows.map((r: any) => `${r.source}:${r.external_id}`));

    let items = [...sysRows, ...connPending, ...connAccepted, ...hostPending, ...userApproved, ...hostApproved, ...userPending];
    // Preserve explicit read=true from item producers (e.g., approved items),
    // otherwise compute read from notification_reads for external sources
    items = items.map(i => ({
      ...i,
      read: i.source === 'system'
        ? i.read
        : (i.read === true ? true : readSet.has(`${i.source}:${i.externalId}`))
    }));

    // Sort and paginate in-memory after merge
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const total = items.length;
    const pageItems = items.slice(0, limitNum); // simple first page slice

    // Map timestamp to created_at for frontend consistency
    const mappedItems = pageItems.map(item => ({
      ...item,
      created_at: item.timestamp,
      timestamp: undefined
    }));

    return res.status(200).json({
      success: true,
      data: {
        notifications: mappedItems,
        pagination: { page: 1, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) }
      }
    });
  } catch (error) {
    console.error('Unified notifications error:', error);
    return res.status(500).json({ success: false, error: 'Server error', message: 'Failed to get unified notifications' });
  }
});

// Mark unified item as read (works for system and external sources)
router.patch('/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { items, source, externalId } = req.body as any;

    await ensureReadTrackingTable();

    const toMark: Array<{ source: string; externalId: string }> = Array.isArray(items) ? items : (source && externalId ? [{ source, externalId }] : []);

    // Mark system notifications via table; external via notification_reads
    for (const it of toMark) {
      if (it.source === 'system') {
        await pool.query('UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2', [it.externalId, userId]);
      } else {
        await pool.query(
          `INSERT INTO notification_reads (user_id, source, external_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, source, external_id) DO NOTHING`,
          [userId, it.source, it.externalId]
        );
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Unified mark read error:', error);
    return res.status(500).json({ success: false, error: 'Server error', message: 'Failed to mark read' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Update notification to read
    const result = await pool.query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
        message: 'The specified notification does not exist'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to mark notification as read'
    });
  }
});

// Mark all notifications as read for a user
router.put('/read-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Update all notifications to read
    const result = await pool.query(
      'UPDATE notifications SET read = true WHERE user_id = $1 RETURNING COUNT(*) as count',
      [userId]
    );

    const updatedCount = parseInt(result.rows[0].count);

    return res.status(200).json({
      success: true,
      message: `Marked ${updatedCount} notifications as read`,
      data: {
        updatedCount
      }
    });

  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to mark notifications as read'
    });
  }
});

export default router;
