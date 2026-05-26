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

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
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
      images,
      externalLink,
      userLatitude,
      userLongitude,
      autoApprove,
      isPaid
    } = req.body;

    const toNumberOrNull = (value: any): number | null => {
      if (value === undefined || value === null) return null;
      const num = typeof value === 'number' ? value : parseFloat(value);
      return Number.isFinite(num) ? num : null;
    };

    const creatorLatitudeInput = toNumberOrNull(userLatitude);
    const creatorLongitudeInput = toNumberOrNull(userLongitude);

    // Validate required fields
    // scheduledTime is the single source of truth; timeSlot is deprecated but accepted for backward compatibility
    if (!title || !location || !category) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Title, location, and category are required'
      });
    }

    // scheduledTime is required (timeSlot alone is no longer sufficient)
    if (!scheduledTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'scheduledTime is required'
      });
    }

    // Validate category - use centralized config
    const validCategories = Object.keys(CATEGORY_CONFIG);
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category',
        message: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    // Validate visibility
    const validVisibility = ['public', 'connections', 'friends', 'private'];
    if (visibility && !validVisibility.includes(visibility)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid visibility',
        message: `Visibility must be one of: ${validVisibility.join(', ')}`
      });
    }

    // Validate max attendees - allow null for unlimited
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

    // Validate isPaid if provided
    if (isPaid !== undefined && typeof isPaid !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Invalid isPaid value',
        message: 'isPaid must be a boolean value'
      });
    }

    // Start a database transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert the Toki
      const tokiResult = await client.query(
        `INSERT INTO tokis (
          host_id, title, description, location, latitude, longitude,
          time_slot, scheduled_time, max_attendees, category, visibility, external_link, auto_approve, is_paid
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          req.user!.id,
          title,
          description || null,
          location,
          latitude || null,
          longitude || null,
          timeSlot,
          scheduledTime || null,
          maxAttendees === null || maxAttendees === undefined ? null : (maxAttendees || 10),
          category,
          visibility || 'public',
          externalLink || null,
          autoApprove || false,
          isPaid || false
        ]
      );

      const toki = tokiResult.rows[0];

      // Insert tags if provided
      if (tags && Array.isArray(tags) && tags.length > 0) {
        for (const tag of tags) {
          await client.query(
            'INSERT INTO toki_tags (toki_id, tag_name) VALUES ($1, $2)',
            [toki.id, tag]
          );
        }
      }

      const imageUrls: string[] = [];
      const imagePublicIds: string[] = [];

      // Handle images if provided
      if (images && Array.isArray(images) && images.length > 0) {
        for (const image of images) {
          try {
            if (image.url && image.publicId) {
              imageUrls.push(image.url);
              imagePublicIds.push(image.publicId);
              continue;
            }

            if (image.base64) {
              const base64String: string = image.base64;
              const base64Data = base64String.includes(',')
                ? base64String.split(',')[1]
                : base64String;

              if (!base64Data) {
                logger.warn('🚫 [TOKIS] Invalid base64 image payload received');
                continue;
              }

              const imageBuffer = Buffer.from(base64Data, 'base64');
              const uploadResult = await ImageService.uploadTokiImage(String(toki.id), imageBuffer);

              if (uploadResult.success && uploadResult.url && uploadResult.publicId) {
                imageUrls.push(uploadResult.url);
                imagePublicIds.push(uploadResult.publicId);
              } else {
                logger.warn(`⚠️ [TOKIS] Failed to upload inline image: ${uploadResult.error || 'Unknown error'}`);
              }
            }
          } catch (error) {
            logger.warn(`⚠️ [TOKIS] Error processing inline image: ${error}`);
          }
        }
      }

      if (imageUrls.length > 0) {
        await client.query(
          `UPDATE tokis 
           SET image_urls = $1, image_public_ids = $2, updated_at = NOW()
           WHERE id = $3`,
          [imageUrls, imagePublicIds, toki.id]
        );
      }

      await client.query('COMMIT');

      // Return the created Toki with host information
      const createdTokiResult = await pool.query(
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
        [toki.id]
      );

      const createdRow = createdTokiResult.rows[0];
      const storedImageUrls: string[] = createdRow.image_urls || [];
      const storedImagePublicIds: string[] = createdRow.image_public_ids || [];
      const normalizedImages = storedImageUrls.map((url: string, index: number) => ({
        url,
        publicId: storedImagePublicIds[index] || null
      }));

      const hostResult = await pool.query(
        'SELECT id, name, avatar_url, latitude AS user_latitude, longitude AS user_longitude FROM users WHERE id = $1',
        [req.user!.id]
      );

      const hostRow = hostResult.rows[0];
      const eventLatitude = toNumberOrNull(createdRow.latitude);
      const eventLongitude = toNumberOrNull(createdRow.longitude);
      let creatorLatitudeValue = creatorLatitudeInput;
      let creatorLongitudeValue = creatorLongitudeInput;

      if (creatorLatitudeValue === null && hostRow) {
        creatorLatitudeValue = toNumberOrNull(hostRow.user_latitude);
      }
      if (creatorLongitudeValue === null && hostRow) {
        creatorLongitudeValue = toNumberOrNull(hostRow.user_longitude);
      }

      let distancePayload = {
        km: 0,
        miles: 0
      };

      if (
        eventLatitude !== null &&
        eventLongitude !== null &&
        creatorLatitudeValue !== null &&
        creatorLongitudeValue !== null
      ) {
        const kms = calculateDistance(
          eventLatitude,
          eventLongitude,
          creatorLatitudeValue,
          creatorLongitudeValue
        );
        const roundedKm = Math.round(kms * 10) / 10;
        const roundedMiles = Math.round((kms * 0.621371) * 10) / 10;
        distancePayload = {
          km: roundedKm,
          miles: roundedMiles
        };
      }

      const responseData = {
        id: createdRow.id,
        title: createdRow.title,
        description: createdRow.description,
        location: createdRow.location,
        latitude: createdRow.latitude,
        longitude: createdRow.longitude,
        timeSlot: createdRow.time_slot,
        scheduledTime: createdRow.scheduled_time
          ? new Date(createdRow.scheduled_time).toISOString().replace('T', ' ').slice(0, 16)
          : null,
        maxAttendees: createdRow.max_attendees,
        currentAttendees: 1, // host counts as first attendee
        category: createdRow.category,
        visibility: createdRow.visibility,
        autoApprove: createdRow.auto_approve || false,
        imageUrl: storedImageUrls[0] || createdRow.image_url || null,
        images: normalizedImages,
        distance: distancePayload,
        externalLink: createdRow.external_link,
        status: createdRow.status,
        createdAt: createdRow.created_at,
        updatedAt: createdRow.updated_at,
        host: {
          id: createdRow.host_id,
          name: createdRow.host_name,
          avatar: createdRow.host_avatar
        },
        tags: createdRow.tags || [],
        joinStatus: 'hosting',
        is_saved: false
      };

      return res.status(201).json({
        success: true,
        message: 'Toki created successfully',
        data: responseData
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error('Create Toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to create Toki'
    });
  }
});

// Hide users (host only)

export default router;
