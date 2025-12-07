import { pool } from '../../config/database';
import { DbToki, SpecToki } from '../types';
import { transformTokiToSpecFormat } from '../adapters/toki-adapter';
import { validateAdminKey } from '../auth';
import type { RegisteredTool } from './user-tools';
import { ImageService } from '../../services/imageService';
import logger from '../../utils/logger';
import { buildShortLabel } from '../../routes/maps';

/**
 * Convert time slot string to ISO 8601 scheduled time (matches frontend logic)
 * This ensures MCP-created tokis have scheduled_time set, just like frontend-created ones
 */
function getScheduledTimeFromSlot(timeSlot: string): string {
  const now = new Date();
  
  switch (timeSlot.toLowerCase()) {
    case 'now':
      return now.toISOString();
    case '30 min':
    case '30min':
      return new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    case '1 hour':
    case '1hour':
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString();
    case '2 hours':
    case '2hours':
      return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();
    case '3 hours':
    case '3hours':
      return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
    case 'tonight':
      const tonight = new Date(now);
      tonight.setHours(19, 0, 0, 0); // 7:00 PM
      return tonight.toISOString();
    case 'tomorrow':
    case 'tommorow': // Handle typo
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0); // 10:00 AM
      return tomorrow.toISOString();
    default:
      // Handle specific time slots like "9:00 AM", "2:00 PM"
      if (timeSlot.includes(':')) {
        const [time, period] = timeSlot.split(' ');
        const [hours, minutes] = time.split(':').map(Number);
        let hour24 = hours;
        
        if (period && period.toUpperCase() === 'PM' && hours !== 12) hour24 += 12;
        if (period && period.toUpperCase() === 'AM' && hours === 12) hour24 = 0;
        
        const scheduledTime = new Date(now);
        scheduledTime.setHours(hour24, minutes, 0, 0);
        
        // If the time has passed today, schedule for tomorrow
        if (scheduledTime <= now) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }
        
        return scheduledTime.toISOString();
      }
      return now.toISOString();
  }
}

export const adminTools: RegisteredTool[] = [
  {
    name: 'create_toki',
    description: 'Create a new Toki post (admin only).',
    inputSchema: {
      type: 'object',
      properties: {
        api_key: {
          type: 'string',
          description: 'Admin MCP API key',
        },
        author_id: {
          type: 'string',
          description: 'Optional: ID of the user who will be the host of the Toki. If not provided, uses the user_id from the API key.',
        },
        title: {
          type: 'string',
          description: 'Title of the Toki (required)',
        },
        description: {
          type: 'string',
          description: 'Optional description of the Toki',
        },
        category: {
          type: 'string',
          description: 'Category for the Toki (required)',
        },
        location: {
          type: 'string',
          description: 'Location string for the Toki (required)',
        },
        timeSlot: {
          type: 'string',
          description: 'Time slot description (e.g., "now", "30min", "tonight", "tomorrow", or any custom text)',
        },
        scheduledTime: {
          type: 'string',
          description: 'Optional scheduled time (ISO 8601 format)',
        },
        maxAttendees: {
          type: 'number',
          description: 'Optional maximum attendees (1-1000, or null for unlimited)',
        },
        latitude: {
          type: 'number',
          description: 'Optional latitude coordinate',
        },
        longitude: {
          type: 'number',
          description: 'Optional longitude coordinate',
        },
        visibility: {
          type: 'string',
          description: 'Visibility level (maps to tokis.visibility)',
        },
        external_url: {
          type: 'string',
          description: 'Optional external link associated with the Toki',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of tags to associate with the Toki',
        },
        autoApprove: {
          type: 'boolean',
          description: 'If true, join requests are automatically approved (defaults to false)',
        },
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              publicId: { type: 'string' },
              base64: { type: 'string' },
              aspectRatio: { 
                type: 'string',
                enum: ['1:1', '4:3'],
                description: 'Optional aspect ratio for cropping. Defaults to 4:3 if not specified. Applies to both URL and base64 images.'
              },
            },
          },
          description: 'Optional array of images. Each image can have: {url} for existing images (will be downloaded and reprocessed), {base64} for upload, and optional {aspectRatio} for cropping (1:1 or 4:3, defaults to 4:3)',
        },
      },
      required: ['api_key', 'title', 'category', 'location', 'timeSlot'],
    },
    handler: async (args: {
      api_key: string;
      author_id?: string;
      title: string;
      description?: string;
      category: string;
      location: string;
      timeSlot: string;
      visibility?: string;
      scheduledTime?: string;
      maxAttendees?: number | null;
      latitude?: number;
      longitude?: number;
      external_url?: string;
      tags?: string[];
      autoApprove?: boolean;
      images?: Array<{ url?: string; publicId?: string; base64?: string; aspectRatio?: '1:1' | '4:3' }>;
    }) => {
      const {
        api_key,
        author_id,
        title,
        description,
        category,
        location,
        timeSlot,
        visibility,
        scheduledTime,
        maxAttendees,
        latitude,
        longitude,
        external_url,
        tags,
        autoApprove,
        images,
      } = args;

      const valid = await validateAdminKey(api_key);
      if (!valid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Invalid or missing MCP admin API key' }, null, 2),
            },
          ],
          isError: true,
        };
      }

      // Use author_id from args if provided, otherwise use user_id from API key
      const finalAuthorId = author_id || valid.user_id;

      // Default visibility to 'public' unless explicitly specified (matches REST API)
      // Note: Only 'public' and 'private' are actually implemented in the backend
      // 'connections' and 'friends' are accepted by validation but not implemented
      const validVisibility = ['public', 'private'];
      const finalVisibility: 'public' | 'private' = 
        validVisibility.includes(visibility || '') ? (visibility as 'public' | 'private') : 'public';

      // Geocode location if coordinates not provided (matches profile update logic)
      let finalLatitude = latitude;
      let finalLongitude = longitude;
      let finalLocation = location; // Keep original location as fallback

      if ((!finalLatitude || !finalLongitude) && location && typeof location === 'string' && location.trim().length > 0) {
        try {
          const key = process.env.GOOGLE_MAPS_API_KEY;
          if (key) {
            const params = new URLSearchParams({ address: location.trim(), key, language: 'en' });
            const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
            const resp = await fetch(url);
            const data: any = await resp.json();
            if (data.status === 'OK') {
              const r = (data.results || [])[0];
              const lat = r?.geometry?.location?.lat;
              const lng = r?.geometry?.location?.lng;
              const formattedAddress = r?.formatted_address;
              const components = r?.address_components || [];
              
              if (typeof lat === 'number' && typeof lng === 'number') {
                finalLatitude = lat;
                finalLongitude = lng;
                // Build short label using same logic as frontend (reuses maps.ts buildShortLabel)
                if (formattedAddress && components.length > 0) {
                  finalLocation = buildShortLabel(components, formattedAddress);
                  logger.info(`✅ [MCP] Geocoded location "${location}" to "${finalLocation}" at coordinates: ${lat}, ${lng}`);
                } else if (formattedAddress) {
                  // Fallback to formatted address if no components
                  finalLocation = formattedAddress;
                  logger.info(`✅ [MCP] Geocoded location "${location}" to "${formattedAddress}" at coordinates: ${lat}, ${lng}`);
                } else {
                  logger.info(`✅ [MCP] Geocoded location "${location}" to coordinates: ${lat}, ${lng} (no formatted address)`);
                }
              }
            } else {
              logger.warn('⚠️ [MCP] Geocode failed:', { status: data.status, message: data.error_message, location });
            }
          } else {
            logger.warn('⚠️ [MCP] GOOGLE_MAPS_API_KEY is not configured; skipping geocode');
          }
        } catch (e) {
          logger.error('❌ [MCP] Error geocoding location:', e);
        }
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert base Toki row (matches REST API requirements)
        const insertResult = await client.query(
          `INSERT INTO tokis (host_id, title, description, category, status, location, visibility, external_link, time_slot, scheduled_time, max_attendees, latitude, longitude, auto_approve)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
           RETURNING *`,
          [
            finalAuthorId,
            title, // Required - use title directly
            description || null, // Optional - use description directly
            category, // Required
            'active', // Status defaults to 'active' (REST API doesn't accept status in create)
            finalLocation, // Use shortLabel if geocoded, otherwise original
            finalVisibility,
            external_url || null,
            timeSlot, // Required
            scheduledTime 
              ? new Date(scheduledTime).toISOString() 
              : getScheduledTimeFromSlot(timeSlot),
            maxAttendees === null || maxAttendees === undefined ? null : (maxAttendees || 10),
            finalLatitude || null,
            finalLongitude || null,
            autoApprove || false,
          ]
        );

        const row = insertResult.rows[0] as DbToki;

        // Insert tags if provided
        if (tags && tags.length > 0) {
          for (const tag of tags) {
            await client.query(
              'INSERT INTO toki_tags (toki_id, tag_name) VALUES ($1, $2)',
              [row.id, tag]
            );
          }
        }

        // Handle images if provided (matches REST API logic)
        const imageUrls: string[] = [];
        const imagePublicIds: string[] = [];

        if (images && Array.isArray(images) && images.length > 0) {
          for (const image of images) {
            try {
              if (image.url) {
                // Reprocess existing URLs: download, validate, upload to Cloudinary
                const reprocessResult = await ImageService.copyAndTransformImage(
                  image.url,
                  String(row.id),
                  image.aspectRatio || '4:3'
                );

                if (reprocessResult.success && reprocessResult.url && reprocessResult.publicId) {
                  imageUrls.push(reprocessResult.url);
                  imagePublicIds.push(reprocessResult.publicId);
                  logger.info(`✅ [MCP] Reprocessed image from URL: ${image.url} → ${reprocessResult.url}`);
                } else {
                  logger.warn(`⚠️ [MCP] Failed to reprocess image from URL: ${image.url} - ${reprocessResult.error || 'Unknown error'}`);
                  // Skip this image, continue with others (partial success)
                }
                continue;
              }

              if (image.base64) {
                const base64String: string = image.base64;
                const base64Data = base64String.includes(',')
                  ? base64String.split(',')[1]
                  : base64String;

                if (!base64Data) {
                  logger.warn('🚫 [MCP] Invalid base64 image payload received');
                  continue;
                }

                const imageBuffer = Buffer.from(base64Data, 'base64');
                const uploadResult = await ImageService.uploadTokiImage(
                  String(row.id),
                  imageBuffer,
                  image.aspectRatio || '4:3'
                );

                if (uploadResult.success && uploadResult.url && uploadResult.publicId) {
                  imageUrls.push(uploadResult.url);
                  imagePublicIds.push(uploadResult.publicId);
                } else {
                  logger.warn(`⚠️ [MCP] Failed to upload inline image: ${uploadResult.error || 'Unknown error'}`);
                }
              }
            } catch (error) {
              logger.warn(`⚠️ [MCP] Error processing inline image: ${error}`);
            }
          }
        }

        // Update tokis with images if any were processed
        if (imageUrls.length > 0) {
          await client.query(
            `UPDATE tokis 
             SET image_urls = $1, image_public_ids = $2, updated_at = NOW()
             WHERE id = $3`,
            [imageUrls, imagePublicIds, row.id]
          );
        }

        await client.query('COMMIT');

        const fullRowResult = await pool.query('SELECT * FROM tokis WHERE id = $1', [row.id]);
        const fullRow = fullRowResult.rows[0] as DbToki;
        const specToki = await transformTokiToSpecFormat(fullRow);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ toki: specToki }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        await client.query('ROLLBACK');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { error: 'Failed to create Toki', detail: String(error?.message || error) },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      } finally {
        client.release();
      }
    },
  },
  {
    name: 'update_toki',
    description: 'Update an existing Toki (admin only).',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the Toki to update',
        },
        api_key: {
          type: 'string',
          description: 'Admin MCP API key',
        },
        title: {
          type: 'string',
          description: 'New title (if provided)',
        },
        description: {
          type: 'string',
          description: 'New description (if provided)',
        },
        author_id: {
          type: 'string',
          description: 'New host/author id, if changing ownership',
        },
        category: {
          type: 'string',
        },
        status: {
          type: 'string',
        },
        location: {
          type: 'string',
        },
        visibility: {
          type: 'string',
        },
        external_url: {
          type: 'string',
        },
        images: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              url: { type: 'string' },
              publicId: { type: 'string' },
              base64: { type: 'string' },
              aspectRatio: { 
                type: 'string',
                enum: ['1:1', '4:3'],
                description: 'Optional aspect ratio for cropping. Defaults to 4:3 if not specified. Applies to both URL and base64 images.'
              },
            },
          },
          description: 'Optional array of images. Each image can have: {url} for existing images (will be downloaded and reprocessed), {base64} for upload, and optional {aspectRatio} for cropping (1:1 or 4:3, defaults to 4:3)',
        },
      },
      required: ['id', 'api_key'],
    },
    handler: async (args: {
      id: string;
      api_key: string;
      title?: string;
      description?: string;
      author_id?: string;
      category?: string;
      status?: string;
      location?: string;
      visibility?: string;
      external_url?: string;
      timeSlot?: string;
      scheduledTime?: string;
      maxAttendees?: number | null;
      latitude?: number;
      longitude?: number;
      autoApprove?: boolean;
      images?: Array<{ url?: string; publicId?: string; base64?: string; aspectRatio?: '1:1' | '4:3' }>;
    }) => {
      const {
        api_key,
        id,
        title,
        description,
        author_id,
        category,
        status,
        location,
        visibility,
        external_url,
        timeSlot,
        scheduledTime,
        maxAttendees,
        latitude,
        longitude,
        autoApprove,
        images,
      } = args;

      const valid = await validateAdminKey(api_key);
      if (!valid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Invalid or missing MCP admin API key' }, null, 2),
            },
          ],
          isError: true,
        };
      }

      // Geocode location if coordinates not provided (matches profile update logic)
      let finalLatitude = latitude;
      let finalLongitude = longitude;
      let finalLocation = location; // Keep original location as fallback

      if (location !== undefined && (!finalLatitude || !finalLongitude) && typeof location === 'string' && location.trim().length > 0) {
        try {
          const key = process.env.GOOGLE_MAPS_API_KEY;
          if (key) {
            const params = new URLSearchParams({ address: location.trim(), key, language: 'en' });
            const url = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
            const resp = await fetch(url);
            const data: any = await resp.json();
            if (data.status === 'OK') {
              const r = (data.results || [])[0];
              const lat = r?.geometry?.location?.lat;
              const lng = r?.geometry?.location?.lng;
              const formattedAddress = r?.formatted_address;
              const components = r?.address_components || [];
              
              if (typeof lat === 'number' && typeof lng === 'number') {
                finalLatitude = lat;
                finalLongitude = lng;
                // Build short label using same logic as frontend (reuses maps.ts buildShortLabel)
                if (formattedAddress && components.length > 0) {
                  finalLocation = buildShortLabel(components, formattedAddress);
                  logger.info(`✅ [MCP] Geocoded location "${location}" to "${finalLocation}" at coordinates: ${lat}, ${lng}`);
                } else if (formattedAddress) {
                  // Fallback to formatted address if no components
                  finalLocation = formattedAddress;
                  logger.info(`✅ [MCP] Geocoded location "${location}" to "${formattedAddress}" at coordinates: ${lat}, ${lng}`);
                } else {
                  logger.info(`✅ [MCP] Geocoded location "${location}" to coordinates: ${lat}, ${lng} (no formatted address)`);
                }
              }
            } else {
              logger.warn('⚠️ [MCP] Geocode failed:', { status: data.status, message: data.error_message, location });
            }
          } else {
            logger.warn('⚠️ [MCP] GOOGLE_MAPS_API_KEY is not configured; skipping geocode');
          }
        } catch (e) {
          logger.error('❌ [MCP] Error geocoding location:', e);
        }
      }

      // Build update query dynamically (matches REST API approach)
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

      if (category !== undefined) {
        paramCount++;
        updateFields.push(`category = $${paramCount}`);
        updateValues.push(category);
      }

      if (status !== undefined) {
        paramCount++;
        updateFields.push(`status = $${paramCount}`);
        updateValues.push(status);
      }

      if (location !== undefined) {
        paramCount++;
        updateFields.push(`location = $${paramCount}`);
        updateValues.push(finalLocation); // Use shortLabel if geocoded
      }

      if (author_id !== undefined) {
        paramCount++;
        updateFields.push(`host_id = $${paramCount}`);
        updateValues.push(author_id);
      }

      if (visibility !== undefined) {
        paramCount++;
        updateFields.push(`visibility = $${paramCount}`);
        updateValues.push(visibility);
      }

      if (external_url !== undefined) {
        paramCount++;
        updateFields.push(`external_link = $${paramCount}`);
        updateValues.push(external_url);
      }

      if (timeSlot !== undefined) {
        paramCount++;
        updateFields.push(`time_slot = $${paramCount}`);
        updateValues.push(timeSlot);
      }

      if (scheduledTime !== undefined) {
        paramCount++;
        updateFields.push(`scheduled_time = $${paramCount}`);
        updateValues.push(scheduledTime ? new Date(scheduledTime).toISOString() : null);
      }

      if (maxAttendees !== undefined) {
        paramCount++;
        updateFields.push(`max_attendees = $${paramCount}`);
        updateValues.push(maxAttendees === null ? null : (maxAttendees || 10));
      }

      // Update coordinates if explicitly provided OR if geocoded from location
      if (latitude !== undefined) {
        paramCount++;
        updateFields.push(`latitude = $${paramCount}`);
        updateValues.push(latitude);
      } else if (finalLatitude !== undefined && location !== undefined) {
        // Location was updated and geocoding succeeded, so update coordinates too
        paramCount++;
        updateFields.push(`latitude = $${paramCount}`);
        updateValues.push(finalLatitude);
      }

      if (longitude !== undefined) {
        paramCount++;
        updateFields.push(`longitude = $${paramCount}`);
        updateValues.push(longitude);
      } else if (finalLongitude !== undefined && location !== undefined) {
        // Location was updated and geocoding succeeded, so update coordinates too
        paramCount++;
        updateFields.push(`longitude = $${paramCount}`);
        updateValues.push(finalLongitude);
      }

      if (autoApprove !== undefined) {
        paramCount++;
        updateFields.push(`auto_approve = $${paramCount}`);
        updateValues.push(autoApprove);
      }

      if (updateFields.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'No fields to update', id }, null, 2),
            },
          ],
          isError: true,
        };
      }

      paramCount++;
      updateFields.push('updated_at = NOW()');
      updateValues.push(id);

      const result = await pool.query(
        `UPDATE tokis SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        updateValues
      );

      if (result.rows.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Toki not found', id }, null, 2),
            },
          ],
          isError: true,
        };
      }

      // Handle images if provided (matches REST API logic)
      if (images !== undefined) {
        const imageUrls: string[] = [];
        const imagePublicIds: string[] = [];

        if (Array.isArray(images) && images.length > 0) {
          for (const image of images) {
            try {
              if (image.url) {
                // Reprocess existing URLs: download, validate, upload to Cloudinary
                const reprocessResult = await ImageService.copyAndTransformImage(
                  image.url,
                  String(id),
                  image.aspectRatio || '4:3'
                );

                if (reprocessResult.success && reprocessResult.url && reprocessResult.publicId) {
                  imageUrls.push(reprocessResult.url);
                  imagePublicIds.push(reprocessResult.publicId);
                  logger.info(`✅ [MCP] Reprocessed image from URL: ${image.url} → ${reprocessResult.url}`);
                } else {
                  logger.warn(`⚠️ [MCP] Failed to reprocess image from URL: ${image.url} - ${reprocessResult.error || 'Unknown error'}`);
                  // Skip this image, continue with others (partial success)
                }
                continue;
              }

              if (image.base64) {
                const base64String: string = image.base64;
                const base64Data = base64String.includes(',')
                  ? base64String.split(',')[1]
                  : base64String;

                if (!base64Data) {
                  logger.warn('🚫 [MCP] Invalid base64 image payload received');
                  continue;
                }

                const imageBuffer = Buffer.from(base64Data, 'base64');
                const uploadResult = await ImageService.uploadTokiImage(
                  String(id),
                  imageBuffer,
                  image.aspectRatio || '4:3'
                );

                if (uploadResult.success && uploadResult.url && uploadResult.publicId) {
                  imageUrls.push(uploadResult.url);
                  imagePublicIds.push(uploadResult.publicId);
                } else {
                  logger.warn(`⚠️ [MCP] Failed to upload inline image: ${uploadResult.error || 'Unknown error'}`);
                }
              }
            } catch (error) {
              logger.warn(`⚠️ [MCP] Error processing inline image: ${error}`);
            }
          }
        }

        // Update tokis with images (empty array if no images provided)
        await pool.query(
          `UPDATE tokis 
           SET image_urls = $1, image_public_ids = $2, updated_at = NOW()
           WHERE id = $3`,
          [imageUrls, imagePublicIds, id]
        );
      }

      // Get updated row
      const updatedResult = await pool.query('SELECT * FROM tokis WHERE id = $1', [id]);
      const row = updatedResult.rows[0] as DbToki;
      const specToki = await transformTokiToSpecFormat(row);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ toki: specToki }, null, 2),
          },
        ],
      };
    },
  },
  {
    name: 'delete_toki',
    description: 'Delete a Toki (admin only).',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the Toki to delete',
        },
        api_key: {
          type: 'string',
          description: 'Admin MCP API key',
        },
        reason: {
          type: 'string',
          description: 'Optional reason for deletion (for logs or client display)',
        },
      },
      required: ['id', 'api_key'],
    },
    handler: async (args: { id: string; api_key: string; reason?: string }) => {
      const { id, api_key, reason } = args;

      const valid = await validateAdminKey(api_key);
      if (!valid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Invalid or missing MCP admin API key' }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const result = await pool.query('DELETE FROM tokis WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Toki not found', id }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const payload = {
        id,
        deleted: true,
        reason: reason ?? null,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    },
  },
];


