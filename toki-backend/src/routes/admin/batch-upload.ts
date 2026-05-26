import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { IZipEntry } from 'adm-zip';
import { pool } from '../../config/database';
import { authenticateToken } from '../../middleware/auth';
import { generateTokenPair } from '../../utils/jwt';
import { issuePasswordResetToken, PasswordLinkPurpose } from '../../utils/passwordReset';
import logger from '../../utils/logger';
import { validateTokiData, matchImagesToTokis } from '../../utils/batchUploadValidation';
import { ImageService } from '../../services/imageService';
import { geocodingService } from '../../services/geocodingService';
import { invalidateFeatureCache, isEnabled } from '../../services/featureFlags';
import { requireAdmin, requireBoostsEnabled, generateBoostAuthorizationCode, logBoostPurchaseRequestEvent, BOOST_CODE_EXPIRY_HOURS } from './_shared';

const router = Router();

// Configure multer for batch upload (50MB limit for zip files)
const batchUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Batch upload preview endpoint
router.post('/tokis/batch/preview', authenticateToken, requireAdmin, batchUpload.single('zipFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No zip file provided'
      });
      return;
    }

    // Extract zip
    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();

    // Find JSON file
    const jsonEntry = entries.find((e: IZipEntry) =>
      e.entryName.toLowerCase().endsWith('.json')
    );

    if (!jsonEntry) {
      res.status(400).json({
        success: false,
        message: 'No JSON file found in zip archive'
      });
      return;
    }

    // Parse JSON
    let jsonContent: any;
    try {
      jsonContent = JSON.parse(jsonEntry.getData().toString('utf8'));
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON file: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
      return;
    }

    const tokis = jsonContent.tokis || [];
    if (!Array.isArray(tokis) || tokis.length === 0) {
      res.status(400).json({
        success: false,
        message: 'JSON file must contain a "tokis" array with at least one toki'
      });
      return;
    }

    // Get default host (logged-in admin user)
    const defaultHostId = req.user!.id;

    // Fix invalid or missing host_ids - first pass: check which host_ids exist
    const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const allHostIds = [...new Set(tokis.map((t: any) => t.host_id).filter((id: any) => id && isValidUUID(id)))];
    const existingHostIds = new Set<string>();

    if (allHostIds.length > 0) {
      try {
        const hostCheckResult = await pool.query(
          'SELECT id FROM users WHERE id = ANY($1)',
          [allHostIds]
        );
        hostCheckResult.rows.forEach((row: any) => {
          existingHostIds.add(row.id);
        });
      } catch (error) {
        logger.warn('Error checking host IDs:', error);
      }
    }

    // Fix tokis with invalid/missing host_ids
    const fixedTokis = tokis.map((t: any) => {
      // Map isFree to isPaid if present
      if (t.isPaid === undefined && typeof t.isFree === 'boolean') {
        t.isPaid = !t.isFree;
      }

      if (!t.host_id || !existingHostIds.has(t.host_id)) {
        return { ...t, host_id: defaultHostId, _hostFixed: true };
      }
      return t;
    });

    // Collect unique host IDs (including the default)
    const hostIds = [...new Set(fixedTokis.map((t: any) => t.host_id).filter(Boolean))];
    const hostMap = new Map<string, { id: string; name: string; email: string }>();

    // Fetch host information (including default host)
    if (hostIds.length > 0) {
      try {
        const hostResult = await pool.query(
          'SELECT id, name, email FROM users WHERE id = ANY($1)',
          [hostIds]
        );
        hostResult.rows.forEach((row: any) => {
          hostMap.set(row.id, { id: row.id, name: row.name, email: row.email });
        });
      } catch (error) {
        logger.warn('Error fetching host information:', error);
      }
    }

    // Extract images
    const imageMap = new Map<string, Buffer>();
    entries.forEach((entry: IZipEntry) => {
      const ext = entry.entryName.toLowerCase();
      if (ext.endsWith('.jpg') || ext.endsWith('.jpeg') ||
        ext.endsWith('.png') || ext.endsWith('.webp')) {
        const filename = entry.entryName.split('/').pop() || entry.entryName;
        imageMap.set(filename, entry.getData());
      }
    });

    // Match images to tokis and validate (use fixedTokis)
    const matched = matchImagesToTokis(fixedTokis, imageMap);

    // Auto-geocode missing coordinates using Google Maps API
    if (geocodingService.isAvailable()) {
      for (const matchedToki of matched) {
        const toki = matchedToki.toki;
        const hasLatitude = toki.latitude !== null && toki.latitude !== undefined && toki.latitude !== '';
        const hasLongitude = toki.longitude !== null && toki.longitude !== undefined && toki.longitude !== '';

        // If coordinates are missing but location string exists, attempt geocoding
        if ((!hasLatitude || !hasLongitude) && toki.location) {
          try {
            const geocodeResult = await geocodingService.geocode(toki.location);
            if (geocodeResult) {
              toki.latitude = geocodeResult.latitude;
              toki.longitude = geocodeResult.longitude;
              toki._geocoded = true; // Flag for adding warning later
              logger.info(`Auto-geocoded "${toki.location}" to (${geocodeResult.latitude}, ${geocodeResult.longitude})`);
            }
          } catch (error) {
            logger.warn(`Failed to geocode location "${toki.location}":`, error);
          }
        }
      }
    }

    const valid: any[] = [];
    const invalid: any[] = [];

    for (let i = 0; i < matched.length; i++) {
      const matchedToki = matched[i];
      const validation = await validateTokiData(matchedToki.toki, imageMap, i);

      // Add warning if host was auto-fixed
      if (matchedToki.toki._hostFixed) {
        const defaultHost = hostMap.get(defaultHostId);
        if (!validation.warnings) {
          validation.warnings = [];
        }
        validation.warnings.push(
          `Host ID was invalid or missing. Using default host: ${defaultHost?.name || 'Current User'}`
        );
      }

      // Add info if coordinates were auto-geocoded
      if (matchedToki.toki._geocoded) {
        if (!validation.warnings) {
          validation.warnings = [];
        }
        validation.warnings.push(
          `Coordinates auto-geocoded from location "${matchedToki.toki.location}"`
        );
      }

      // Create preview data with image data URIs for display
      const previewData: any = {
        ...matchedToki.toki,
        index: i,
        host: hostMap.get(matchedToki.toki.host_id) || {
          id: matchedToki.toki.host_id,
          name: 'Unknown User',
          email: ''
        }
      };

      // Remove the internal flag from preview data
      delete previewData._hostFixed;

      // Convert first image to data URI for preview
      if (matchedToki.imageBuffer) {
        const mimeType = matchedToki.imageBuffer[0] === 0xFF && matchedToki.imageBuffer[1] === 0xD8
          ? 'image/jpeg'
          : matchedToki.imageBuffer[0] === 0x89
            ? 'image/png'
            : 'image/webp';
        previewData.previewImage = `data:${mimeType};base64,${matchedToki.imageBuffer.toString('base64')}`;
      }

      if (validation.isValid) {
        valid.push({
          index: i,
          toki: previewData,
          validation: {
            status: 'valid' as const,
            warnings: validation.warnings.length > 0 ? validation.warnings : undefined
          }
        });
      } else {
        invalid.push({
          index: i,
          toki: previewData,
          validation: {
            status: 'invalid' as const,
            errors: validation.errors
          }
        });
      }
    }

    res.json({
      success: true,
      preview: {
        valid,
        invalid
      },
      summary: {
        total: fixedTokis.length,
        validCount: valid.length,
        invalidCount: invalid.length
      }
    });
    return;
  } catch (error) {
    logger.error('Batch upload preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process zip file: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
    return;
  }
});

// Batch create endpoint
router.post('/tokis/batch/create', authenticateToken, requireAdmin, batchUpload.single('zipFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No zip file provided'
      });
      return;
    }

    // Extract zip (same as preview)
    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();

    const jsonEntry = entries.find((e: IZipEntry) =>
      e.entryName.toLowerCase().endsWith('.json')
    );

    if (!jsonEntry) {
      res.status(400).json({
        success: false,
        message: 'No JSON file found in zip archive'
      });
      return;
    }

    let jsonContent: any;
    try {
      jsonContent = JSON.parse(jsonEntry.getData().toString('utf8'));
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON file: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
      return;
    }

    const tokis = jsonContent.tokis || [];
    if (!Array.isArray(tokis) || tokis.length === 0) {
      res.status(400).json({
        success: false,
        message: 'JSON file must contain a "tokis" array with at least one toki'
      });
      return;
    }

    // Get default host (logged-in admin user)
    const defaultHostId = req.user!.id;

    // Fix invalid or missing host_ids - first pass: check which host_ids exist
    const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const allHostIds = [...new Set(tokis.map((t: any) => t.host_id).filter((id: any) => id && isValidUUID(id)))];
    const existingHostIds = new Set<string>();

    if (allHostIds.length > 0) {
      try {
        const hostCheckResult = await pool.query(
          'SELECT id FROM users WHERE id = ANY($1)',
          [allHostIds]
        );
        hostCheckResult.rows.forEach((row: any) => {
          existingHostIds.add(row.id);
        });
      } catch (error) {
        logger.warn('Error checking host IDs:', error);
      }
    }

    // Fix tokis with invalid/missing host_ids
    const fixedTokis = tokis.map((t: any) => {
      // Map isFree to isPaid if present
      if (t.isPaid === undefined && typeof t.isFree === 'boolean') {
        t.isPaid = !t.isFree;
      }

      if (!t.host_id || !existingHostIds.has(t.host_id)) {
        return { ...t, host_id: defaultHostId };
      }
      return t;
    });

    // Extract images
    const imageMap = new Map<string, Buffer>();
    entries.forEach((entry: IZipEntry) => {
      const ext = entry.entryName.toLowerCase();
      if (ext.endsWith('.jpg') || ext.endsWith('.jpeg') ||
        ext.endsWith('.png') || ext.endsWith('.webp')) {
        const filename = entry.entryName.split('/').pop() || entry.entryName;
        imageMap.set(filename, entry.getData());
      }
    });

    // Match and validate (use fixedTokis)
    const matched = matchImagesToTokis(fixedTokis, imageMap);

    // Auto-geocode missing coordinates using Google Maps API
    if (geocodingService.isAvailable()) {
      for (const matchedToki of matched) {
        const toki = matchedToki.toki;
        const hasLatitude = toki.latitude !== null && toki.latitude !== undefined && toki.latitude !== '';
        const hasLongitude = toki.longitude !== null && toki.longitude !== undefined && toki.longitude !== '';

        // If coordinates are missing but location string exists, attempt geocoding
        if ((!hasLatitude || !hasLongitude) && toki.location) {
          try {
            const geocodeResult = await geocodingService.geocode(toki.location);
            if (geocodeResult) {
              toki.latitude = geocodeResult.latitude;
              toki.longitude = geocodeResult.longitude;
              logger.info(`Auto-geocoded "${toki.location}" to (${geocodeResult.latitude}, ${geocodeResult.longitude})`);
            }
          } catch (error) {
            logger.warn(`Failed to geocode location "${toki.location}":`, error);
          }
        }
      }
    }

    const created: any[] = [];
    const failed: any[] = [];

    // Process each toki
    for (let i = 0; i < matched.length; i++) {
      const matchedToki = matched[i];
      const validation = await validateTokiData(matchedToki.toki, imageMap, i);

      if (!validation.isValid) {
        failed.push({
          index: i,
          title: matchedToki.toki.title || 'Untitled',
          error: validation.errors.join('; ')
        });
        continue;
      }

      // Ensure host_id is set (should already be fixed, but double-check)
      if (!matchedToki.toki.host_id) {
        matchedToki.toki.host_id = defaultHostId;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert toki
        const tokiResult = await client.query(
          `INSERT INTO tokis (
            host_id, title, description, location, latitude, longitude,
            time_slot, scheduled_time, max_attendees, category, visibility, external_link, auto_approve, is_paid, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *`,
          [
            matchedToki.toki.host_id,
            matchedToki.toki.title,
            matchedToki.toki.description || null,
            matchedToki.toki.location,
            matchedToki.toki.latitude || null,
            matchedToki.toki.longitude || null,
            matchedToki.toki.timeSlot,
            matchedToki.toki.scheduledTime || null,
            matchedToki.toki.maxAttendees === null || matchedToki.toki.maxAttendees === undefined
              ? null
              : (matchedToki.toki.maxAttendees || 10),
            matchedToki.toki.category,
            matchedToki.toki.visibility || 'public',
            matchedToki.toki.externalLink || null,
            matchedToki.toki.autoApprove || false,
            matchedToki.toki.isPaid !== undefined ? matchedToki.toki.isPaid : false,
            'active'
          ]
        );

        const toki = tokiResult.rows[0];

        // Insert tags
        if (matchedToki.toki.tags && Array.isArray(matchedToki.toki.tags)) {
          for (const tag of matchedToki.toki.tags) {
            await client.query(
              'INSERT INTO toki_tags (toki_id, tag_name) VALUES ($1, $2)',
              [toki.id, tag]
            );
          }
        }

        // Process images
        const imageUrls: string[] = [];
        const imagePublicIds: string[] = [];

        for (const imageBuffer of matchedToki.imageBuffers) {
          try {
            const uploadResult = await ImageService.uploadTokiImage(String(toki.id), imageBuffer);
            if (uploadResult.success && uploadResult.url && uploadResult.publicId) {
              imageUrls.push(uploadResult.url);
              imagePublicIds.push(uploadResult.publicId);
            } else {
              logger.warn(`Failed to upload image for toki ${toki.id}: ${uploadResult.error}`);
            }
          } catch (error) {
            logger.warn(`Error uploading image for toki ${toki.id}:`, error);
          }
        }

        // Update toki with image URLs
        if (imageUrls.length > 0) {
          await client.query(
            `UPDATE tokis 
             SET image_urls = $1, image_public_ids = $2, updated_at = NOW()
             WHERE id = $3`,
            [imageUrls, imagePublicIds, toki.id]
          );
        }

        await client.query('COMMIT');

        created.push({
          index: i,
          tokiId: toki.id,
          title: toki.title
        });
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Error creating toki at index ${i}:`, error);
        failed.push({
          index: i,
          title: matchedToki.toki.title || 'Untitled',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        client.release();
      }
    }

    res.json({
      success: true,
      results: {
        created,
        failed
      },
      summary: {
        total: tokis.length,
        createdCount: created.length,
        failedCount: failed.length
      }
    });
    return;
  } catch (error) {
    logger.error('Batch create error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch creation: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
    return;
  }
});

export default router;
