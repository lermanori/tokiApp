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

router.get('/boost-purchase-requests', authenticateToken, requireAdmin, requireBoostsEnabled, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status = 'all' } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    const params: any[] = [];
    let whereClause = '';

    if (status !== 'all') {
      params.push(status);
      whereClause = `WHERE bpr.status = $${params.length}`;
    }

    params.push(limitNum, offset);
    const limitIndex = params.length - 1;
    const offsetIndex = params.length;

    const listQuery = `
      SELECT
        bpr.*,
        bt.name AS tier_slug,
        bt.display_name AS tier_name,
        bt.total_hours,
        bt.is_splittable,
        t.title AS toki_title,
        u.name AS host_name,
        u.email AS host_email,
        admin_user.name AS generated_by_admin_name
      FROM boost_purchase_requests bpr
      JOIN boost_tiers bt ON bt.id = bpr.tier_id
      LEFT JOIN tokis t ON t.id = bpr.toki_id
      JOIN users u ON u.id = bpr.host_id
      LEFT JOIN users admin_user ON admin_user.id = bpr.generated_by_admin_id
      ${whereClause}
      ORDER BY bpr.created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM boost_purchase_requests bpr
      ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      pool.query(listQuery, params),
      pool.query(countQuery, params.slice(0, status !== 'all' ? 1 : 0)),
    ]);

    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    return res.json({
      success: true,
      data: {
        requests: result.rows.map((row) => ({
          id: row.id,
          tierId: row.tier_id,
          tierSlug: row.tier_slug,
          tierName: row.tier_name,
          totalHours: row.total_hours,
          isSplittable: row.is_splittable,
          tokiId: row.toki_id,
          tokiTitle: row.toki_title,
          hostId: row.host_id,
          hostName: row.host_name,
          hostEmail: row.host_email,
          paymentAmount: parseFloat(row.payment_amount),
          paymentCurrency: row.payment_currency,
          status: row.status,
          authorizationCode: row.authorization_code,
          codeGeneratedAt: row.code_generated_at,
          codeExpiresAt: row.code_expires_at,
          codeRedeemedAt: row.code_redeemed_at,
          redeemedAt: row.redeemed_at,
          generatedByAdminId: row.generated_by_admin_id,
          generatedByAdminName: row.generated_by_admin_name,
          boostId: row.boost_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.max(1, Math.ceil(total / limitNum)),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching boost purchase requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch boost purchase requests',
    });
  }
});

router.get('/boost-purchase-requests/:requestId', authenticateToken, requireAdmin, requireBoostsEnabled, async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;

    const requestResult = await pool.query(
      `SELECT
         bpr.*,
         bt.name AS tier_slug,
         bt.display_name AS tier_name,
         bt.total_hours,
         bt.is_splittable,
         bt.validity_days,
         bt.description AS tier_description,
         t.title AS toki_title,
         u.name AS host_name,
         u.email AS host_email,
         admin_user.name AS generated_by_admin_name
       FROM boost_purchase_requests bpr
       JOIN boost_tiers bt ON bt.id = bpr.tier_id
       LEFT JOIN tokis t ON t.id = bpr.toki_id
       JOIN users u ON u.id = bpr.host_id
       LEFT JOIN users admin_user ON admin_user.id = bpr.generated_by_admin_id
       WHERE bpr.id = $1`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Boost purchase request not found',
      });
    }

    const eventsResult = await pool.query(
      `SELECT e.*, actor.name AS actor_name
       FROM boost_purchase_request_events e
       LEFT JOIN users actor ON actor.id = e.actor_id
       WHERE e.request_id = $1
       ORDER BY e.created_at DESC`,
      [requestId]
    );

    const row = requestResult.rows[0];

    return res.json({
      success: true,
      data: {
        request: {
          id: row.id,
          tierId: row.tier_id,
          tierSlug: row.tier_slug,
          tierName: row.tier_name,
          tierDescription: row.tier_description,
          totalHours: row.total_hours,
          isSplittable: row.is_splittable,
          validityDays: row.validity_days,
          tokiId: row.toki_id,
          tokiTitle: row.toki_title,
          hostId: row.host_id,
          hostName: row.host_name,
          hostEmail: row.host_email,
          paymentAmount: parseFloat(row.payment_amount),
          paymentCurrency: row.payment_currency,
          status: row.status,
          authorizationCode: row.authorization_code,
          codeGeneratedAt: row.code_generated_at,
          codeExpiresAt: row.code_expires_at,
          codeRedeemedAt: row.code_redeemed_at,
          redeemedAt: row.redeemed_at,
          generatedByAdminId: row.generated_by_admin_id,
          generatedByAdminName: row.generated_by_admin_name,
          boostId: row.boost_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        },
        events: eventsResult.rows.map((event) => ({
          id: event.id,
          actorType: event.actor_type,
          actorId: event.actor_id,
          actorName: event.actor_name,
          action: event.action,
          details: event.details || {},
          createdAt: event.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching boost purchase request detail:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch boost purchase request detail',
    });
  }
});

router.post('/boost-purchase-requests/:requestId/generate-code', authenticateToken, requireAdmin, requireBoostsEnabled, async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const adminId = req.user!.id;
    const { requestId } = req.params;

    await client.query('BEGIN');

    const requestResult = await client.query(
      `SELECT bpr.*, bt.name AS tier_slug, bt.display_name AS tier_name
       FROM boost_purchase_requests bpr
       JOIN boost_tiers bt ON bt.id = bpr.tier_id
       WHERE bpr.id = $1
       FOR UPDATE`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Boost purchase request not found',
      });
    }

    const requestRow = requestResult.rows[0];

    if (requestRow.status === 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This request has already been approved',
      });
    }

    if (requestRow.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This request has been cancelled',
      });
    }

    if (requestRow.authorization_code) {
      await logBoostPurchaseRequestEvent(client, requestId, 'admin', adminId, 'code_replaced', {
        previousCode: requestRow.authorization_code,
      });
    }

    const authorizationCode = generateBoostAuthorizationCode();
    const codeExpiresAt = new Date(Date.now() + BOOST_CODE_EXPIRY_HOURS * 60 * 60 * 1000);

    await client.query(
      `UPDATE boost_purchase_requests
       SET status = 'code_issued',
           authorization_code = $1,
           code_generated_at = NOW(),
           code_expires_at = $2,
           generated_by_admin_id = $3,
           updated_at = NOW()
       WHERE id = $4`,
      [authorizationCode, codeExpiresAt, adminId, requestId]
    );

    await logBoostPurchaseRequestEvent(client, requestId, 'admin', adminId, 'code_generated', {
      code: authorizationCode,
      expiresAt: codeExpiresAt.toISOString(),
    });

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Authorization code generated',
      data: {
        requestId,
        authorizationCode,
        codeExpiresAt: codeExpiresAt.toISOString(),
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating boost authorization code:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate authorization code',
    });
  } finally {
    client.release();
  }
});

router.post('/boost-purchase-requests/:requestId/invalidate-code', authenticateToken, requireAdmin, requireBoostsEnabled, async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const adminId = req.user!.id;
    const { requestId } = req.params;

    await client.query('BEGIN');

    const requestResult = await client.query(
      `SELECT id, status, authorization_code
       FROM boost_purchase_requests
       WHERE id = $1
       FOR UPDATE`,
      [requestId]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Boost purchase request not found',
      });
    }

    const requestRow = requestResult.rows[0];

    if (requestRow.status === 'approved') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot invalidate a code for an approved request',
      });
    }

    if (!requestRow.authorization_code) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No active authorization code to invalidate',
      });
    }

    await client.query(
      `UPDATE boost_purchase_requests
       SET status = 'pending_code',
           authorization_code = NULL,
           code_generated_at = NULL,
           code_expires_at = NULL,
           generated_by_admin_id = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [requestId]
    );

    await logBoostPurchaseRequestEvent(client, requestId, 'admin', adminId, 'code_invalidated', {
      previousCode: requestRow.authorization_code,
    });

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Authorization code invalidated',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error invalidating boost authorization code:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to invalidate authorization code',
    });
  } finally {
    client.release();
  }
});

export default router;
