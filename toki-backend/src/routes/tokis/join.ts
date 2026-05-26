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

router.post('/:id/join', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Check if Toki exists and is active
    const tokiResult = await pool.query(
      `SELECT t.*, u.name as host_name 
       FROM tokis t 
       JOIN users u ON t.host_id = u.id 
       WHERE t.id = $1 AND t.status = $2`,
      [id, 'active']
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist or is not active'
      });
    }

    const toki = tokiResult.rows[0];

    // Check if user is trying to join their own Toki
    if (toki.host_id === userId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot join own Toki',
        message: 'You cannot join a Toki that you are hosting'
      });
    }

    // Check if user has already joined or requested to join
    const existingJoinResult = await pool.query(
      'SELECT * FROM toki_participants WHERE toki_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (existingJoinResult.rows.length > 0) {
      const existingJoin = existingJoinResult.rows[0];

      if (existingJoin.status === 'approved') {
        return res.status(400).json({
          success: false,
          error: 'Already joined',
          message: 'You have already joined this Toki'
        });
      } else if (existingJoin.status === 'pending') {
        return res.status(400).json({
          success: false,
          error: 'Request pending',
          message: 'You have already requested to join this Toki'
        });
      }
    }

    // Check if user has an active invite for this toki
    const inviteResult = await pool.query(
      'SELECT * FROM toki_invites WHERE toki_id = $1 AND invited_user_id = $2 AND status = $3',
      [id, userId, 'invited']
    );

    const hasActiveInvite = inviteResult.rows.length > 0;

    // Check if Toki is full (skip check if max_attendees is NULL/unlimited)
    if (toki.max_attendees !== null && toki.max_attendees !== undefined) {
      const currentAttendeesResult = await pool.query(
        'SELECT COUNT(*) as count FROM toki_participants WHERE toki_id = $1 AND status = $2',
        [id, 'approved']
      );

      const currentAttendees = 1 + parseInt(currentAttendeesResult.rows[0].count); // Host (1) + participants

      if (currentAttendees >= toki.max_attendees) {
        return res.status(400).json({
          success: false,
          error: 'Toki is full',
          message: 'This Toki has reached its maximum number of attendees'
        });
      }
    }

    // Determine status based on auto_approve setting or active invite
    const autoApprove = toki.auto_approve || false;
    const joinStatus = (hasActiveInvite || autoApprove) ? 'approved' : 'pending';

    // Insert join request or direct join
    const joinResult = await pool.query(
      'INSERT INTO toki_participants (toki_id, user_id, status, joined_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [id, userId, joinStatus, new Date()]
    );

    // If pending, notify host (unified feed will show join_request for host)
    if (joinStatus === 'pending') {
      await sendPushToUsers([toki.host_id], {
        title: 'New Join Request',
        body: `${req.user!.name || 'Someone'} wants to join your ${toki.title} event`,
        data: { type: 'join_request', source: 'host_join_request', tokiId: id, requestId: joinResult.rows[0].id }
      });
    } else if (autoApprove && !hasActiveInvite) {
      // Notify user that they were auto-approved
      await sendPushToUsers([userId], {
        title: 'Join Request Approved',
        body: `You can now join "${toki.title}"`,
        data: { type: 'join_approved', source: 'user_join_approved', tokiId: id, requestId: joinResult.rows[0].id }
      });
    }

    // If user had an active invite, update the invite status to accepted
    if (hasActiveInvite) {
      await pool.query(
        'UPDATE toki_invites SET status = $1 WHERE toki_id = $2 AND invited_user_id = $3',
        ['accepted', id, userId]
      );
    }

    return res.status(200).json({
      success: true,
      message: hasActiveInvite ? 'Successfully joined the Toki' : 'Join request sent successfully',
      data: {
        id: joinResult.rows[0].id,
        tokiId: id,
        status: joinStatus,
        createdAt: joinResult.rows[0].joined_at
      }
    });

  } catch (error) {
    console.error('Join Toki error:', error);

    // Check if it's a table doesn't exist error
    if (error instanceof Error && error.message && error.message.includes('relation "toki_participants" does not exist')) {
      return res.status(500).json({
        success: false,
        error: 'Database setup required',
        message: 'The database tables need to be initialized. Please run the database setup script.'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to join Toki'
    });
  }
});

// Approve join request (only by host)
router.put('/:id/join/:requestId/approve', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id, requestId } = req.params;
    const hostId = (req as any).user.id;

    // Check if Toki exists and user is the host
    const tokiResult = await pool.query(
      'SELECT host_id, max_attendees FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (tokiResult.rows[0].host_id !== hostId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the host can approve join requests'
      });
    }

    // Check if join request exists and is pending
    const requestResult = await pool.query(
      'SELECT * FROM toki_participants WHERE id = $1 AND toki_id = $2 AND status = $3',
      [requestId, id, 'pending']
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Join request not found',
        message: 'The specified join request does not exist or is not pending'
      });
    }

    // Check if Toki is full (skip check if max_attendees is NULL/unlimited)
    const maxAttendees = tokiResult.rows[0].max_attendees;

    if (maxAttendees !== null && maxAttendees !== undefined) {
      const currentAttendeesResult = await pool.query(
        'SELECT COUNT(*) as count FROM toki_participants WHERE toki_id = $1 AND status = $2',
        [id, 'approved']
      );

      const currentAttendees = 1 + parseInt(currentAttendeesResult.rows[0].count);

      if (currentAttendees >= maxAttendees) {
        return res.status(400).json({
          success: false,
          error: 'Toki is full',
          message: 'This Toki has reached its maximum number of attendees'
        });
      }
    }

    // Approve the join request
    const updateResult = await pool.query(
      'UPDATE toki_participants SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      ['approved', new Date(), requestId]
    );

    // Get user info for notification
    const userResult = await pool.query(
      'SELECT u.name as user_name, t.title as toki_title FROM toki_participants tp JOIN users u ON tp.user_id = u.id JOIN tokis t ON tp.toki_id = t.id WHERE tp.id = $1',
      [requestId]
    );

    if (userResult.rows.length > 0) {
      const { toki_title } = userResult.rows[0];
      const participantId = requestResult.rows[0].user_id;
      await sendPushToUsers([participantId], {
        title: 'Join Request Approved',
        body: `You can now join "${toki_title}"`,
        data: { type: 'join_approved', source: 'user_join_approved', tokiId: id, requestId }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Join request approved successfully',
      data: {
        id: updateResult.rows[0].id,
        tokiId: id,
        status: 'approved',
        updatedAt: updateResult.rows[0].updated_at
      }
    });

  } catch (error) {
    console.error('Approve join request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to approve join request'
    });
  }
});

// Decline join request (only by host)
router.put('/:id/join/:requestId/decline', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id, requestId } = req.params;
    const hostId = (req as any).user.id;

    // Check if Toki exists and user is the host
    const tokiResult = await pool.query(
      'SELECT host_id FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (tokiResult.rows[0].host_id !== hostId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the host can decline join requests'
      });
    }

    // Check if join request exists and is pending
    const requestResult = await pool.query(
      'SELECT * FROM toki_participants WHERE id = $1 AND toki_id = $2 AND status = $3',
      [requestId, id, 'pending']
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Join request not found',
        message: 'The specified join request does not exist or is not pending'
      });
    }

    // Decline the join request
    const updateResult = await pool.query(
      'UPDATE toki_participants SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      ['declined', new Date(), requestId]
    );

    // Get user info for notification
    const userResult = await pool.query(
      'SELECT u.name as user_name, t.title as toki_title FROM toki_participants tp JOIN users u ON tp.user_id = u.id JOIN tokis t ON tp.toki_id = t.id WHERE tp.id = $1',
      [requestId]
    );

    if (userResult.rows.length > 0) {
      const { toki_title } = userResult.rows[0];
      const participantId = requestResult.rows[0].user_id;
      await sendPushToUsers([participantId], {
        title: 'Join Request Declined',
        body: `Your request to join "${toki_title}" was declined`,
        data: { type: 'join_declined', source: 'user_join_pending', tokiId: id, requestId }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Join request declined successfully',
      data: {
        id: updateResult.rows[0].id,
        tokiId: id,
        status: 'declined',
        updatedAt: updateResult.rows[0].updated_at
      }
    });

  } catch (error) {
    console.error('Decline join request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to decline join request'
    });
  }
});

// Cancel own pending join request (by user)
router.delete('/:id/join', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Check if Toki exists
    const tokiResult = await pool.query(
      'SELECT id FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist or is not active'
      });
    }

    // Check if user has a pending join request
    const requestResult = await pool.query(
      'SELECT id, status FROM toki_participants WHERE toki_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No join request found',
        message: 'You have not requested to join this Toki'
      });
    }

    const request = requestResult.rows[0];

    if (request.status === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Already approved',
        message: 'You are already a participant. Use leave functionality instead.'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: 'Only pending requests can be cancelled'
      });
    }

    // Delete the pending request
    await pool.query(
      'DELETE FROM toki_participants WHERE id = $1',
      [request.id]
    );

    console.log(`✅ User ${userId} cancelled join request for Toki ${id}`);

    return res.status(200).json({
      success: true,
      message: 'Join request cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel join request error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to cancel join request'
    });
  }
});

// Get pending join requests for a Toki (only by host)
router.get('/:id/join-requests', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hostId = (req as any).user.id;

    // Check if Toki exists and user is the host
    const tokiResult = await pool.query(
      'SELECT host_id FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (tokiResult.rows[0].host_id !== hostId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the host can view join requests'
      });
    }

    // Get pending join requests with user details
    const requestsResult = await pool.query(
      `SELECT 
        tp.id,
        tp.status,
        tp.joined_at,
        tp.updated_at,
        u.id as user_id,
        u.name as user_name,
        u.avatar_url as user_avatar,
        u.bio as user_bio
      FROM toki_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.toki_id = $1 AND tp.status = $2
      ORDER BY tp.joined_at DESC`,
      [id, 'pending']
    );

    return res.status(200).json({
      success: true,
      data: {
        requests: requestsResult.rows.map(row => ({
          id: row.id,
          status: row.status,
          joinedAt: row.joined_at,
          updatedAt: row.updated_at,
          user: {
            id: row.user_id,
            name: row.user_name,
            avatar: row.user_avatar,
            bio: row.user_bio
          }
        }))
      }
    });

  } catch (error) {
    console.error('Get join requests error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve join requests'
    });
  }
});

// Remove participant from Toki (only by host)
router.delete('/:id/participants/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    const hostId = (req as any).user.id;

    // Check if Toki exists and user is the host
    const tokiResult = await pool.query(
      'SELECT host_id FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist or is not active'
      });
    }

    if (tokiResult.rows[0].host_id !== hostId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the host can remove participants'
      });
    }

    // Check if the user to be removed is actually a participant
    const participantResult = await pool.query(
      'SELECT id, user_id FROM toki_participants WHERE toki_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (participantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found',
        message: 'The specified user is not a participant in this Toki'
      });
    }

    // Don't allow host to remove themselves
    if (userId === hostId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid operation',
        message: 'Host cannot remove themselves from the Toki'
      });
    }

    // Remove the participant
    await pool.query(
      'DELETE FROM toki_participants WHERE toki_id = $1 AND user_id = $2',
      [id, userId]
    );

    // Update current_attendees count
    await pool.query(
      'UPDATE tokis SET current_attendees = current_attendees - 1 WHERE id = $1',
      [id]
    );

    return res.status(200).json({
      success: true,
      message: 'Participant removed successfully'
    });

  } catch (error) {
    console.error('Error removing participant:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to remove participant'
    });
  }
});

// Complete a Toki (only by host)

export default router;
