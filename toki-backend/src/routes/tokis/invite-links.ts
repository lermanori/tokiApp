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

// =========================
// Invite Links Endpoints
// =========================

// Generate invite link for a toki
router.post('/:id/invite-links', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { maxUses, message } = req.body;

    // Verify user is the host of the toki
    const tokiCheck = await pool.query(
      'SELECT id, title, status FROM tokis WHERE id = $1 AND host_id = $2',
      [id, userId]
    );

    if (tokiCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found or you are not the host'
      });
    }

    const toki = tokiCheck.rows[0];

    if (toki.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot create invite links for inactive tokis'
      });
    }

    // Deactivate any existing active links
    await deactivateExistingLinks(id, userId);

    // Generate new invite code
    const inviteCode = await generateInviteCode();

    // Create new invite link
    const result = await pool.query(
      `INSERT INTO toki_invite_links (toki_id, created_by, invite_code, max_uses, custom_message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, userId, inviteCode, maxUses || null, message || null]
    );

    const inviteLink = result.rows[0];
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/join/${inviteCode}`;

    res.status(201).json({
      success: true,
      data: {
        id: inviteLink.id,
        inviteCode: inviteLink.invite_code,
        inviteUrl,
        maxUses: inviteLink.max_uses,
        usedCount: inviteLink.used_count,
        customMessage: inviteLink.custom_message,
        createdAt: inviteLink.created_at
      }
    });
  } catch (error) {
    console.error('Error creating invite link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create invite link'
    });
  }
});

// Join toki via invite link
router.post('/join-by-link', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user!.id;

    if (!inviteCode) {
      return res.status(400).json({
        success: false,
        error: 'Invite code is required'
      });
    }

    // Validate invite link
    const validation = await validateInviteLink(inviteCode);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const { linkData } = validation;
    const tokiId = linkData.toki_id;

    // Check if user is already a participant
    const isParticipant = await isUserParticipant(tokiId, userId);

    if (isParticipant) {
      return res.status(400).json({
        success: false,
        error: 'You are already a participant in this event'
      });
    }

    // Add user to toki
    const added = await addUserToToki(tokiId, userId);

    if (!added) {
      return res.status(400).json({
        success: false,
        error: 'Failed to join event. Event may be full or inactive.'
      });
    }

    // Increment usage count
    await incrementLinkUsage(inviteCode);

    // Create notification for host (no actions needed since user is already approved)
    await createSystemNotificationAndPush({
      userId: linkData.created_by, // Host user ID
      type: 'participant_joined',
      title: 'New Participant Joined',
      message: `${req.user!.name} joined your event "${linkData.toki_title}" via invite link`,
      relatedTokiId: tokiId,
      relatedUserId: userId,
      pushData: { source: 'system' },
      io: req.app.get('io')
    });

    // Get updated toki details
    const tokiResult = await pool.query(
      `SELECT t.*, u.name as host_name, u.avatar_url as host_avatar
       FROM tokis t
       JOIN users u ON t.host_id = u.id
       WHERE t.id = $1`,
      [tokiId]
    );

    res.status(200).json({
      success: true,
      message: 'Successfully joined the event!',
      data: {
        toki: tokiResult.rows[0],
        joinedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error joining via invite link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join event'
    });
  }
});

// Get invite link info (public endpoint)
router.get('/invite-links/:code', async (req: Request, res: Response): Promise<any> => {
  try {
    const { code } = req.params;

    const validation = await validateInviteLink(code);

    if (!validation.isValid) {
      return res.status(404).json({
        success: false,
        error: validation.error
      });
    }

    const { linkData } = validation;

    // Fetch full public details for the toki so the join page can render
    const tokiRow = (await pool.query(
      `SELECT t.id, t.title, t.description, t.location, t.scheduled_time, t.current_attendees,
              t.max_attendees, t.visibility, u.id as host_id, u.name as host_name, u.avatar_url as host_avatar
       FROM tokis t
       JOIN users u ON u.id = t.host_id
       WHERE t.id = $1`,
      [linkData.toki_id]
    )).rows[0];

    res.status(200).json({
      success: true,
      data: {
        toki: tokiRow ? {
          id: tokiRow.id,
          title: tokiRow.title,
          description: tokiRow.description,
          location: tokiRow.location,
          scheduled_time: tokiRow.scheduled_time,
          current_attendees: tokiRow.current_attendees,
          max_attendees: tokiRow.max_attendees,
          visibility: tokiRow.visibility,
          host_id: tokiRow.host_id
        } : {
          id: linkData.toki_id,
          title: linkData.toki_title,
          visibility: linkData.toki_visibility,
          max_attendees: linkData.toki_max_attendees
        },
        host: {
          name: tokiRow?.host_name || linkData.host_name,
          avatar: tokiRow?.host_avatar || linkData.host_avatar
        },
        inviteLink: {
          code: linkData.invite_code,
          maxUses: linkData.max_uses,
          usedCount: linkData.used_count,
          remainingUses: linkData.max_uses ? linkData.max_uses - linkData.used_count : null,
          customMessage: linkData.custom_message
        },
        isActive: linkData.is_active
      }
    });
  } catch (error) {
    console.error('Error getting invite link info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get invite link info'
    });
  }
});

// Get all invite links for a toki (host only)
router.get('/:id/invite-links', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify user is the host
    const tokiCheck = await pool.query(
      'SELECT id, title FROM tokis WHERE id = $1 AND host_id = $2',
      [id, userId]
    );

    if (tokiCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found or you are not the host'
      });
    }

    // Get all invite links for this toki
    const result = await pool.query(
      `SELECT 
        id,
        invite_code,
        is_active,
        max_uses,
        used_count,
        custom_message,
        created_at,
        updated_at
      FROM toki_invite_links 
      WHERE toki_id = $1 
      ORDER BY created_at DESC`,
      [id]
    );

    const links = result.rows.map(link => ({
      id: link.id,
      inviteCode: link.invite_code,
      inviteUrl: `${process.env.FRONTEND_URL || 'https://app.toki.com'}/join/${link.invite_code}`,
      isActive: link.is_active,
      maxUses: link.max_uses,
      usedCount: link.used_count,
      remainingUses: link.max_uses ? link.max_uses - link.used_count : null,
      customMessage: link.custom_message,
      createdAt: link.created_at,
      updatedAt: link.updated_at
    }));

    const activeLink = links.find(link => link.isActive);

    res.status(200).json({
      success: true,
      data: {
        toki: tokiCheck.rows[0],
        links,
        activeLink
      }
    });
  } catch (error) {
    console.error('Error getting invite links:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get invite links'
    });
  }
});

// Deactivate an invite link
router.delete('/invite-links/:linkId', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { linkId } = req.params;
    const userId = req.user!.id;

    // Verify user owns this invite link
    const linkCheck = await pool.query(
      `SELECT il.id, il.toki_id, t.title as toki_title
       FROM toki_invite_links il
       JOIN tokis t ON il.toki_id = t.id
       WHERE il.id = $1 AND il.created_by = $2`,
      [linkId, userId]
    );

    if (linkCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invite link not found or you are not the owner'
      });
    }

    // Deactivate the link
    await pool.query(
      'UPDATE toki_invite_links SET is_active = false, updated_at = NOW() WHERE id = $1',
      [linkId]
    );

    res.status(200).json({
      success: true,
      message: 'Invite link deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating invite link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate invite link'
    });
  }
});

// Regenerate invite link
router.post('/:id/invite-links/regenerate', authenticateToken, async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { maxUses, message } = req.body;

    // Verify user is the host
    const tokiCheck = await pool.query(
      'SELECT id, title, status FROM tokis WHERE id = $1 AND host_id = $2',
      [id, userId]
    );

    if (tokiCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found or you are not the host'
      });
    }

    const toki = tokiCheck.rows[0];

    if (toki.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Cannot create invite links for inactive tokis'
      });
    }

    // Deactivate existing active links
    await deactivateExistingLinks(id, userId);

    // Generate new invite code
    const inviteCode = await generateInviteCode();

    // Create new invite link
    const result = await pool.query(
      `INSERT INTO toki_invite_links (toki_id, created_by, invite_code, max_uses, custom_message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, userId, inviteCode, maxUses || null, message || null]
    );

    const inviteLink = result.rows[0];
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:8081'}/join/${inviteCode}`;

    res.status(201).json({
      success: true,
      message: 'New invite link generated successfully',
      data: {
        id: inviteLink.id,
        inviteCode: inviteLink.invite_code,
        inviteUrl,
        maxUses: inviteLink.max_uses,
        usedCount: inviteLink.used_count,
        customMessage: inviteLink.custom_message,
        createdAt: inviteLink.created_at
      }
    });
  } catch (error) {
    console.error('Error regenerating invite link:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate invite link'
    });
  }
});


export default router;
