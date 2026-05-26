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

router.get('/feature-flags', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT key, enabled, description, updated_at, updated_by
       FROM feature_flags
       ORDER BY key ASC`
    );
    return res.json({
      success: true,
      data: result.rows.map((row) => ({
        key: row.key,
        enabled: row.enabled === true,
        description: row.description,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
      })),
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch feature flags' });
  }
});

router.put('/feature-flags/:key', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { enabled } = req.body as { enabled?: boolean };

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: '`enabled` must be a boolean' });
    }

    const result = await pool.query(
      `UPDATE feature_flags
       SET enabled = $1, updated_at = NOW(), updated_by = $2
       WHERE key = $3
       RETURNING key, enabled, description, updated_at, updated_by`,
      [enabled, req.user!.id, key]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Feature flag not found' });
    }

    invalidateFeatureCache();

    const row = result.rows[0];
    return res.json({
      success: true,
      data: {
        key: row.key,
        enabled: row.enabled === true,
        description: row.description,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
      },
    });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    return res.status(500).json({ success: false, message: 'Failed to update feature flag' });
  }
});

export default router;
