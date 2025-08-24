import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Get user's connections (accepted)
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    // Get accepted connections where user is either requester or recipient
    const result = await pool.query(
      `SELECT 
        uc.id,
        uc.created_at,
        CASE 
          WHEN uc.requester_id = $1 THEN u2.id
          ELSE u1.id
        END as connection_user_id,
        CASE 
          WHEN uc.requester_id = $1 THEN u2.name
          ELSE u1.name
        END as connection_user_name,
        CASE 
          WHEN uc.requester_id = $1 THEN u2.avatar_url
          ELSE u1.avatar_url
        END as connection_user_avatar,
        CASE 
          WHEN uc.requester_id = $1 THEN u2.bio
          ELSE u1.bio
        END as connection_user_bio,
        CASE 
          WHEN uc.requester_id = $1 THEN u2.location
          ELSE u1.location
        END as connection_user_location,
        CASE 
          WHEN uc.requester_id = $1 THEN COALESCE(ROUND(u2_rating.avg_rating, 1), 0)
          ELSE COALESCE(ROUND(u1_rating.avg_rating, 1), 0)
        END as connection_user_rating,
        CASE 
          WHEN uc.requester_id = $1 THEN u2_tokis.tokis_created
          ELSE u1_tokis.tokis_created
        END as connection_user_tokis_created
      FROM user_connections uc
      JOIN users u1 ON uc.requester_id = u1.id
      JOIN users u2 ON uc.recipient_id = u2.id
      LEFT JOIN (
        SELECT rated_user_id, AVG(rating) as avg_rating 
        FROM user_ratings 
        GROUP BY rated_user_id
      ) u1_rating ON u1.id = u1_rating.rated_user_id
      LEFT JOIN (
        SELECT rated_user_id, AVG(rating) as avg_rating 
        FROM user_ratings 
        GROUP BY rated_user_id
      ) u2_rating ON u2.id = u2_rating.rated_user_id
      LEFT JOIN (
        SELECT host_id as user_id, COUNT(*) as tokis_created
        FROM tokis
        WHERE status = 'active'
        GROUP BY host_id
      ) u1_tokis ON u1.id = u1_tokis.user_id
      LEFT JOIN (
        SELECT host_id as user_id, COUNT(*) as tokis_created
        FROM tokis
        WHERE status = 'active'
        GROUP BY host_id
      ) u2_tokis ON u2.id = u2_tokis.user_id
      WHERE uc.status = 'accepted'
        AND (uc.requester_id = $1 OR uc.recipient_id = $1)
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks ub 
          WHERE (ub.blocker_id = $1 AND ub.blocked_user_id = CASE 
            WHEN uc.requester_id = $1 THEN uc.recipient_id
            ELSE uc.requester_id
          END)
          OR (ub.blocker_id = CASE 
            WHEN uc.requester_id = $1 THEN uc.recipient_id
            ELSE uc.requester_id
          END AND ub.blocked_user_id = $1)
        )
      ORDER BY uc.updated_at DESC
      LIMIT $2 OFFSET $3`,
      [req.user!.id, limitNum, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
      FROM user_connections uc
      WHERE uc.status = 'accepted'
        AND (uc.requester_id = $1 OR uc.recipient_id = $1)
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks ub 
          WHERE (ub.blocker_id = $1 AND ub.blocked_user_id = CASE 
            WHEN uc.requester_id = $1 THEN uc.recipient_id
            ELSE uc.requester_id
          END)
          OR (ub.blocker_id = CASE 
            WHEN uc.requester_id = $1 THEN uc.recipient_id
            ELSE uc.requester_id
          END AND ub.blocked_user_id = $1)
        )`,
      [req.user!.id]
    );

    const total = parseInt(countResult.rows[0].total);

    const connections = result.rows.map(row => ({
      id: row.id,
      createdAt: row.created_at,
      user: {
        id: row.connection_user_id,
        name: row.connection_user_name,
        avatar: row.connection_user_avatar,
        bio: row.connection_user_bio,
        location: row.connection_user_location,
        rating: row.connection_user_rating,
        tokisCreated: row.connection_user_tokis_created
      }
    }));

    return res.status(200).json({
      success: true,
      data: {
        connections,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Get connections error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve connections'
    });
  }
});

// Get pending connection requests (received by current user)
router.get('/pending', authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        uc.id,
        uc.created_at,
        u.id as requester_id,
        u.name as requester_name,
        u.avatar_url as requester_avatar,
        u.bio as requester_bio,
        u.location as requester_location,
        COALESCE(ROUND(ur.avg_rating, 1), 0) as requester_rating,
        COALESCE(ut.tokis_created, 0) as requester_tokis_created
      FROM user_connections uc
      JOIN users u ON uc.requester_id = u.id
      LEFT JOIN (
        SELECT rated_user_id, AVG(rating) as avg_rating 
        FROM user_ratings 
        GROUP BY rated_user_id
      ) ur ON u.id = ur.rated_user_id
      LEFT JOIN (
        SELECT host_id as user_id, COUNT(*) as tokis_created
        FROM tokis
        WHERE status = 'active'
        GROUP BY host_id
      ) ut ON u.id = ut.user_id
      WHERE uc.recipient_id = $1 AND uc.status = 'pending'
        AND NOT EXISTS (
          SELECT 1 FROM user_blocks ub 
          WHERE (ub.blocker_id = $1 AND ub.blocked_user_id = uc.requester_id)
          OR (ub.blocker_id = uc.requester_id AND ub.blocked_user_id = $1)
        )
      ORDER BY uc.created_at DESC`,
      [req.user!.id]
    );

    const pendingRequests = result.rows.map(row => ({
      id: row.id,
      createdAt: row.created_at,
      requester: {
        id: row.requester_id,
        name: row.requester_name,
        avatar: row.requester_avatar,
        bio: row.requester_bio,
        location: row.requester_location,
        rating: row.requester_rating,
        tokisCreated: row.requester_tokis_created
      }
    }));

    return res.status(200).json({
      success: true,
      data: pendingRequests
    });

  } catch (error) {
    console.error('Get pending connections error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve pending connections'
    });
  }
});

// Send connection request
router.post('/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if user is trying to connect with themselves
    if (userId === req.user!.id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'You cannot send a connection request to yourself'
      });
    }

    // Check if target user exists
    const userResult = await pool.query(
      'SELECT id, name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    // Check if either user has blocked the other
    const blockCheck = await pool.query(
      `SELECT id FROM user_blocks 
       WHERE (blocker_id = $1 AND blocked_user_id = $2) 
       OR (blocker_id = $2 AND blocked_user_id = $1)`,
      [req.user!.id, userId]
    );

    if (blockCheck.rows.length > 0) {
      return res.status(403).json({
        success: false,
        error: 'Blocked user',
        message: 'Cannot send connection request to blocked users'
      });
    }

    // Check if connection already exists
    const existingResult = await pool.query(
      `SELECT id, status FROM user_connections 
       WHERE (requester_id = $1 AND recipient_id = $2) 
          OR (requester_id = $2 AND recipient_id = $1)`,
      [req.user!.id, userId]
    );

    if (existingResult.rows.length > 0) {
      const connection = existingResult.rows[0];
      
      if (connection.status === 'accepted') {
        return res.status(400).json({
          success: false,
          error: 'Already connected',
          message: 'You are already connected with this user'
        });
      } else if (connection.status === 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Request pending',
          message: 'A connection request is already pending'
        });
      } else if (connection.status === 'declined') {
        return res.status(400).json({
          success: false,
          error: 'Request declined',
          message: 'This connection request was previously declined'
        });
      }
    }

    // Create connection request
    const result = await pool.query(
      `INSERT INTO user_connections (requester_id, recipient_id, status)
       VALUES ($1, $2, 'pending')
       RETURNING id, created_at`,
      [req.user!.id, userId]
    );

    // Create notification for the recipient
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, related_user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId, // recipient gets the notification
        'connection_request',
        'New Connection Request',
        `${req.user!.name} sent you a connection request`,
        req.user!.id // the requester's ID
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Connection request sent successfully',
      data: {
        id: result.rows[0].id,
        createdAt: result.rows[0].created_at,
        recipient: {
          id: userResult.rows[0].id,
          name: userResult.rows[0].name
        }
      }
    });

  } catch (error) {
    console.error('Send connection request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to send connection request'
    });
  }
});

// Get connection status between current user and another user
router.get('/status/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user!.id;

    // Check if connection exists and get its status
    const result = await pool.query(
      `SELECT 
        id, 
        status, 
        requester_id, 
        recipient_id,
        created_at,
        updated_at
      FROM user_connections 
      WHERE (requester_id = $1 AND recipient_id = $2) 
         OR (requester_id = $2 AND recipient_id = $1)`,
      [currentUserId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          status: 'none',
          message: 'No connection exists'
        }
      });
    }

    const connection = result.rows[0];
    const isRequester = connection.requester_id === currentUserId;
    
    return res.status(200).json({
      success: true,
      data: {
        id: connection.id,
        status: connection.status,
        isRequester: isRequester,
        createdAt: connection.created_at,
        updatedAt: connection.updated_at,
        message: `Connection status: ${connection.status}`
      }
    });

  } catch (error) {
    console.error('Get connection status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve connection status'
    });
  }
});

// Accept/decline connection request
router.put('/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { action } = req.body; // 'accept' or 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action',
        message: 'Action must be either "accept" or "decline"'
      });
    }

    // Check if connection request exists and user is the recipient
    const existingResult = await pool.query(
      `SELECT id, status FROM user_connections 
       WHERE requester_id = $1 AND recipient_id = $2 AND status = 'pending'`,
      [userId, req.user!.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Request not found',
        message: 'No pending connection request found from this user'
      });
    }

    // Update connection status
    const newStatus = action === 'accept' ? 'accepted' : 'declined';
    const result = await pool.query(
      `UPDATE user_connections 
       SET status = $1, updated_at = $2
       WHERE id = $3
       RETURNING id, status, updated_at`,
      [newStatus, new Date(), existingResult.rows[0].id]
    );

    // Get requester info
    const requesterResult = await pool.query(
      'SELECT id, name FROM users WHERE id = $1',
      [userId]
    );

    // Create notification for the requester about the response
    const notificationType = action === 'accept' ? 'request_approved' : 'request_declined';
    const notificationTitle = action === 'accept' ? 'Connection Request Accepted' : 'Connection Request Declined';
    const notificationMessage = action === 'accept' 
      ? `${req.user!.name} accepted your connection request`
      : `${req.user!.name} declined your connection request`;

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, related_user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        userId, // requester gets the notification
        notificationType,
        notificationTitle,
        notificationMessage,
        req.user!.id // the responder's ID
      ]
    );

    return res.status(200).json({
      success: true,
      message: `Connection request ${action}ed successfully`,
      data: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        updatedAt: result.rows[0].updated_at,
        requester: {
          id: requesterResult.rows[0].id,
          name: requesterResult.rows[0].name
        }
      }
    });

  } catch (error) {
    console.error('Update connection request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to update connection request'
    });
  }
});

// Remove connection
router.delete('/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Check if connection exists and user is part of it
    const existingResult = await pool.query(
      `SELECT id FROM user_connections 
       WHERE status = 'accepted'
         AND ((requester_id = $1 AND recipient_id = $2) 
              OR (requester_id = $2 AND recipient_id = $1))`,
      [req.user!.id, userId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found',
        message: 'No active connection found with this user'
      });
    }

    // Delete the connection
    await pool.query(
      'DELETE FROM user_connections WHERE id = $1',
      [existingResult.rows[0].id]
    );

    return res.status(200).json({
      success: true,
      message: 'Connection removed successfully'
    });

  } catch (error) {
    console.error('Remove connection error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to remove connection'
    });
  }
});

export default router; 