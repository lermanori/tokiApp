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

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      location,
      latitude,
      longitude,
      timeSlot,
      scheduledTime,
      maxAttendees,
      category,
      visibility,
      tags,
      externalLink,
      autoApprove,
      isPaid
    } = req.body;

    // Check if Toki exists and user is the host
    const existingResult = await pool.query(
      'SELECT host_id FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (existingResult.rows[0].host_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only update Tokis you host'
      });
    }

    // Validate category if provided - use centralized config
    if (category) {
      const validCategories = Object.keys(CATEGORY_CONFIG);
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category',
          message: `Category must be one of: ${validCategories.join(', ')}`
        });
      }
    }

    // Validate visibility if provided
    if (visibility) {
      const validVisibility = ['public', 'connections', 'friends', 'private'];
      if (!validVisibility.includes(visibility)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid visibility',
          message: `Visibility must be one of: ${validVisibility.join(', ')}`
        });
      }
    }

    // Validate max attendees if provided - allow null for unlimited
    if (maxAttendees !== null && maxAttendees !== undefined) {
      const maxAttendeesNum = typeof maxAttendees === 'number' ? maxAttendees : parseInt(maxAttendees);
      if (isNaN(maxAttendeesNum) || maxAttendeesNum < 1 || maxAttendeesNum > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Invalid max attendees',
          message: 'Max attendees must be between 1 and 1000, or null for unlimited'
        });
      }
    }

    // Start a database transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramCount = 0;

      if (title !== undefined) {
        paramCount++;
        updateFields.push(`title = $${paramCount}`);
        updateValues.push(title);
      }

      if (description !== undefined) {
        paramCount++;
        updateFields.push(`description = $${paramCount}`);
        updateValues.push(description);
      }

      if (location !== undefined) {
        paramCount++;
        updateFields.push(`location = $${paramCount}`);
        updateValues.push(location);
      }

      if (latitude !== undefined) {
        paramCount++;
        updateFields.push(`latitude = $${paramCount}`);
        updateValues.push(latitude);
      }

      if (longitude !== undefined) {
        paramCount++;
        updateFields.push(`longitude = $${paramCount}`);
        updateValues.push(longitude);
      }

      if (timeSlot !== undefined) {
        paramCount++;
        updateFields.push(`time_slot = $${paramCount}`);
        updateValues.push(timeSlot);
      }

      if (scheduledTime !== undefined) {
        paramCount++;
        updateFields.push(`scheduled_time = $${paramCount}`);
        updateValues.push(scheduledTime);
      }

      if (maxAttendees !== undefined) {
        paramCount++;
        updateFields.push(`max_attendees = $${paramCount}`);
        updateValues.push(maxAttendees === null ? null : maxAttendees);
      }

      if (autoApprove !== undefined) {
        paramCount++;
        updateFields.push(`auto_approve = $${paramCount}`);
        updateValues.push(autoApprove);
      }

      if (category !== undefined) {
        paramCount++;
        updateFields.push(`category = $${paramCount}`);
        updateValues.push(category);
      }

      if (visibility !== undefined) {
        paramCount++;
        updateFields.push(`visibility = $${paramCount}`);
        updateValues.push(visibility);
      }

      if (externalLink !== undefined) {
        paramCount++;
        updateFields.push(`external_link = $${paramCount}`);
        updateValues.push(externalLink || null);
      }

      if (isPaid !== undefined) {
        paramCount++;
        updateFields.push(`is_paid = $${paramCount}`);
        updateValues.push(isPaid);
      }

      // Always update the updated_at timestamp
      paramCount++;
      updateFields.push(`updated_at = $${paramCount}`);
      updateValues.push(new Date());

      // Add the WHERE clause parameter
      paramCount++;
      updateValues.push(id);

      const updateQuery = `
        UPDATE tokis 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, updateValues);
      const updatedToki = updateResult.rows[0];

      // Update tags if provided
      if (tags !== undefined) {
        // Delete existing tags
        await client.query('DELETE FROM toki_tags WHERE toki_id = $1', [id]);

        // Insert new tags
        if (Array.isArray(tags) && tags.length > 0) {
          for (const tag of tags) {
            await client.query(
              'INSERT INTO toki_tags (toki_id, tag_name) VALUES ($1, $2)',
              [id, tag]
            );
          }
        }
      }

      await client.query('COMMIT');

      // Get updated Toki with host and tags
      const finalResult = await pool.query(
        `SELECT 
          t.*,
          u.name as host_name,
          u.avatar_url as host_avatar,
          ARRAY_AGG(tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL) as tags
        FROM tokis t
        LEFT JOIN users u ON t.host_id = u.id
        LEFT JOIN toki_tags tt ON t.id = tt.toki_id
        WHERE t.id = $1
        GROUP BY t.id, u.name, u.avatar_url`,
        [id]
      );

      const responseData = {
        ...finalResult.rows[0],
        host: {
          id: finalResult.rows[0].host_id,
          name: finalResult.rows[0].host_name,
          avatar: finalResult.rows[0].host_avatar
        },
        tags: finalResult.rows[0].tags || []
      };

      return res.status(200).json({
        success: true,
        message: 'Toki updated successfully',
        data: responseData
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Update Toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to update Toki'
    });
  }
});

// Create an invite (host only)

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if Toki exists and user is the host
    const existingResult = await pool.query(
      'SELECT host_id FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (existingResult.rows[0].host_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only delete Tokis you host'
      });
    }

    // Soft delete by setting status to 'cancelled'
    const result = await pool.query(
      'UPDATE tokis SET status = $1, updated_at = $2 WHERE id = $3 RETURNING id',
      ['cancelled', new Date(), id]
    );

    return res.status(200).json({
      success: true,
      message: 'Toki deleted successfully',
      data: { id: result.rows[0].id }
    });

  } catch (error) {
    logger.error('Delete Toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to delete Toki'
    });
  }
});

// Join a Toki

export default router;
