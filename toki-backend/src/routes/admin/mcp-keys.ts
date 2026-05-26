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

// =========================
// MCP Admin API Keys
// =========================

// List MCP API keys (without plaintext)
router.get('/mcp-keys', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, scopes, user_id, created_by, created_at, last_used_at, revoked_at
       FROM mcp_api_keys
       ORDER BY created_at DESC`
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error listing MCP API keys:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list MCP API keys',
    });
  }
});

// Create a new MCP API key (returns plaintext once)
router.post('/mcp-keys', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, scopes, user_id } = req.body as { name: string; scopes?: string[]; user_id: string };
    const adminId = req.user!.id;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Name is required',
      });
    }

    if (!user_id || typeof user_id !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'user_id is required - this user will be the author for all Tokis created with this key',
      });
    }

    // Verify the user exists and has admin role
    const userCheck = await pool.query('SELECT id, role FROM users WHERE id = $1', [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user_id - user not found',
      });
    }
    if (userCheck.rows[0].role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Invalid user_id - user must have admin role',
      });
    }

    const key = crypto.randomBytes(32).toString('hex');
    const keyHash = await bcrypt.hash(key, 10);

    const scopesArray = Array.isArray(scopes) && scopes.length > 0 ? scopes : ['admin'];

    const result = await pool.query(
      `INSERT INTO mcp_api_keys (name, key_hash, scopes, user_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, scopes, user_id, created_by, created_at, last_used_at, revoked_at`,
      [name, keyHash, scopesArray, user_id, adminId]
    );

    return res.json({
      success: true,
      data: {
        key, // plaintext, only returned once
        keyInfo: result.rows[0],
      },
    });
  } catch (error) {
    console.error('Error creating MCP API key:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create MCP API key',
    });
  }
});

// Revoke an MCP API key
router.post('/mcp-keys/:id/revoke', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE mcp_api_keys
       SET revoked_at = NOW()
       WHERE id = $1 AND revoked_at IS NULL
       RETURNING id, name, scopes, user_id, created_by, created_at, last_used_at, revoked_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'MCP API key not found or already revoked',
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Error revoking MCP API key:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to revoke MCP API key',
    });
  }
});


export default router;
