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

// ===== EMAIL TEMPLATES =====

router.get('/email-templates', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, template_name, subject, body_text, variables, created_at, updated_at FROM email_templates ORDER BY updated_at DESC`
    );
    res.json({ success: true, data: result.rows });
    return;
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ success: false, message: 'Failed to list templates' });
    return;
  }
});

router.get('/email-templates/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, template_name, subject, body_text, variables, created_at, updated_at FROM email_templates WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
    return;
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch template' });
    return;
  }
});

router.post('/email-templates', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { template_name, subject, body_text, variables } = req.body || {};
    if (!template_name || !subject || !body_text) {
      res.status(400).json({ success: false, message: 'template_name, subject, body_text are required' });
      return;
    }
    const ins = await pool.query(
      `INSERT INTO email_templates (template_name, subject, body_text, variables, created_at, updated_at)
       VALUES ($1,$2,$3,COALESCE($4,'{}'::jsonb),NOW(),NOW())
       RETURNING id, template_name, subject, body_text, variables, created_at, updated_at`,
      [template_name, subject, body_text, variables || {}]
    );
    res.json({ success: true, data: ins.rows[0] });
    return;
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ success: false, message: 'Failed to create template' });
    return;
  }
});

router.put('/email-templates/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { template_name, subject, body_text, variables } = req.body || {};
    const upd = await pool.query(
      `UPDATE email_templates SET
         template_name = COALESCE($1, template_name),
         subject = COALESCE($2, subject),
         body_text = COALESCE($3, body_text),
         variables = COALESCE($4, variables),
         updated_at = NOW()
       WHERE id = $5
       RETURNING id, template_name, subject, body_text, variables, created_at, updated_at`,
      [template_name || null, subject || null, body_text || null, variables || null, id]
    );
    if (upd.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    res.json({ success: true, data: upd.rows[0] });
    return;
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ success: false, message: 'Failed to update template' });
    return;
  }
});

router.delete('/email-templates/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const del = await pool.query('DELETE FROM email_templates WHERE id = $1 RETURNING id', [id]);
    if (del.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }
    res.json({ success: true, message: 'Template deleted' });
    return;
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ success: false, message: 'Failed to delete template' });
    return;
  }
});

export default router;
