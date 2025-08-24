import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Block a user
router.post('/users/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const blockerId = (req as any).user.id;

    if (blockerId === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }

    // Check if user is already blocked
    const existingBlock = await pool.query(
      'SELECT id FROM user_blocks WHERE blocker_id = $1 AND blocked_user_id = $2',
      [blockerId, userId]
    );

    if (existingBlock.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User is already blocked'
      });
    }

    // Create block
    await pool.query(
      'INSERT INTO user_blocks (blocker_id, blocked_user_id, reason) VALUES ($1, $2, $3)',
      [blockerId, userId, reason]
    );

    // Instead of deleting connections, we'll filter them out in the queries
    // This preserves the connection history and allows restoration when unblocking
    // The existing blocking filters in the connection routes will handle visibility

    return res.json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to block user'
    });
  }
});

// Unblock a user
router.delete('/users/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const blockerId = (req as any).user.id;

    const result = await pool.query(
      'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_user_id = $2',
      [blockerId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Block not found'
      });
    }

    // Note: Connections are now preserved when blocking/unblocking
    // They will automatically become visible again since the blocking filters
    // in the connection routes will no longer exclude this user

    return res.json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to unblock user'
    });
  }
});

// Get blocked users
router.get('/blocked-users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const blockedUsersQuery = `
      SELECT 
        ub.id,
        ub.reason,
        ub.created_at,
        u.id as blocked_user_id,
        u.name as blocked_user_name,
        u.avatar_url as blocked_user_avatar,
        u.bio as blocked_user_bio
      FROM user_blocks ub
      JOIN users u ON ub.blocked_user_id = u.id
      WHERE ub.blocker_id = $1
      ORDER BY ub.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const blockedUsersResult = await pool.query(blockedUsersQuery, [userId, limit, offset]);

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM user_blocks WHERE blocker_id = $1';
    const countResult = await pool.query(countQuery, [userId]);

    res.json({
      success: true,
      data: {
        blockedUsers: blockedUsersResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blocked users'
    });
  }
});

// Check if a user is blocked
router.get('/check/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).user.id;

    // Check if current user has blocked the target user
    const blockedByMe = await pool.query(
      'SELECT id FROM user_blocks WHERE blocker_id = $1 AND blocked_user_id = $2',
      [currentUserId, userId]
    );

    // Check if current user is blocked by the target user
    const blockedByThem = await pool.query(
      'SELECT id FROM user_blocks WHERE blocker_id = $1 AND blocked_user_id = $2',
      [userId, currentUserId]
    );

    res.json({
      success: true,
      data: {
        blockedByMe: blockedByMe.rows.length > 0,
        blockedByThem: blockedByThem.rows.length > 0,
        canInteract: blockedByMe.rows.length === 0 && blockedByThem.rows.length === 0
      }
    });
  } catch (error) {
    console.error('Error checking block status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check block status'
    });
  }
});

// Get users who have blocked the current user
router.get('/blocked-by', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const blockedByQuery = `
      SELECT 
        ub.id,
        ub.reason,
        ub.created_at,
        u.id as blocker_id,
        u.name as blocker_name,
        u.avatar_url as blocker_avatar
      FROM user_blocks ub
      JOIN users u ON ub.blocker_id = u.id
      WHERE ub.blocked_user_id = $1
      ORDER BY ub.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const blockedByResult = await pool.query(blockedByQuery, [userId, limit, offset]);

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM user_blocks WHERE blocked_user_id = $1';
    const countResult = await pool.query(countQuery, [userId]);

    res.json({
      success: true,
      data: {
        blockedBy: blockedByResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users who blocked me:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users who blocked you'
    });
  }
});

export default router; 