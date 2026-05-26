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

// ===== TOKEN DEBUG =====

// Get token configuration and user info for debugging disconnections
router.get('/token-debug/:userId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const userResult = await pool.query(
      'SELECT id, name, email, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Return configured token expiry durations
    const accessExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        },
        tokenConfig: {
          accessExpiresIn,
          refreshExpiresIn
        },
        serverTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching token debug info:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch token debug info'
    });
  }
});

router.post('/token-debug/issue', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const accessExpiresIn = typeof req.body?.accessExpiresIn === 'string' && req.body.accessExpiresIn.trim()
      ? req.body.accessExpiresIn.trim()
      : (process.env.JWT_EXPIRES_IN || '24h');
    const refreshExpiresIn = typeof req.body?.refreshExpiresIn === 'string' && req.body.refreshExpiresIn.trim()
      ? req.body.refreshExpiresIn.trim()
      : (process.env.JWT_REFRESH_EXPIRES_IN || '7d');

    const userId = req.user!.id;
    const userResult = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];
    const tokens = generateTokenPair(
      { id: user.id, email: user.email, name: user.name },
      { accessExpiresIn, refreshExpiresIn }
    );

    return res.json({
      success: true,
      message: 'Debug token pair issued',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        tokenConfig: {
          accessExpiresIn,
          refreshExpiresIn
        },
        tokens,
        serverTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error issuing debug tokens:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to issue debug tokens'
    });
  }
});

router.get('/token-debug-probe', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    return res.json({
      success: true,
      message: 'Protected request succeeded',
      data: {
        user: {
          id: req.user!.id,
          email: req.user!.email,
          name: req.user!.name
        },
        serverTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error probing token debug route:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to probe protected route'
    });
  }
});

// Feature flags admin endpoints

export default router;
