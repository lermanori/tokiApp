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

// ===== ALGORITHM HYPERPARAMETERS =====

router.get('/algorithm', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_new, w_pen, updated_by, updated_at
       FROM algorithm_hyperparameters
       ORDER BY updated_at DESC
       LIMIT 1`
    );
    if (result.rows.length === 0) {
      res.json({ success: true, data: { w_hist: 0.2, w_social: 0.15, w_pop: 0.2, w_time: 0.15, w_geo: 0.15, w_novel: 0.1, w_new: 0.05, w_pen: 0.05 } });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
    return;
  } catch (error) {
    console.error('Error fetching algorithm weights:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch algorithm weights' });
    return;
  }
});

router.put('/algorithm', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_new, w_pen } = req.body || {};
    const weights = [w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_new, w_pen].map(Number);
    if (weights.some((v) => isNaN(v))) {
      res.status(400).json({ success: false, message: 'All weights must be numbers' });
      return;
    }
    if (weights.some((v) => v < 0 || v > 1)) {
      res.status(400).json({ success: false, message: 'All weights must be in [0,1]' });
      return;
    }
    const sum = weights.reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 1e-6) {
      res.status(400).json({ success: false, message: 'Weights must sum to 1.0' });
      return;
    }

    const updatedBy = req.user!.id;
    // Upsert single latest row (simple approach)
    await pool.query(
      `INSERT INTO algorithm_hyperparameters (w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_new, w_pen, updated_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
      [w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_new, w_pen, updatedBy]
    );

    res.json({ success: true });
    return;
  } catch (error) {
    console.error('Error updating algorithm weights:', error);
    res.status(500).json({ success: false, message: 'Failed to update algorithm weights' });
    return;
  }
});

export default router;
