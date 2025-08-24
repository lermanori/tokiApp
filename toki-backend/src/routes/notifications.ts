import express from 'express';
import { Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

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
