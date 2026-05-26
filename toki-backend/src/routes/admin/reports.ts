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

// Get all reports (unified view of content_reports and message_reports) with pagination
router.get('/reports', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status = 'pending', contentType = 'all' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    // Build WHERE clause based on filters
    let whereClause = 'WHERE cr.status = $1';
    const queryParams: any[] = [status];
    let paramCount = 1;

    if (contentType !== 'all') {
      paramCount++;
      whereClause += ` AND cr.content_type = $${paramCount}`;
      queryParams.push(contentType);
    }

    paramCount++;
    const limitParam = paramCount;
    paramCount++;
    const offsetParam = paramCount;
    queryParams.push(limitNum, offset);

    // Get all reports with unified query - ENHANCED with full context
    const result = await pool.query(
      `SELECT 
        cr.id as report_id,
        cr.content_type,
        cr.content_id,
        cr.reason,
        cr.reported_at,
        cr.status,
        cr.notes,
        cr.reviewed_at,
        reporter.name as reporter_name,
        reporter.id as reporter_id,
        reviewer.name as reviewer_name,
        CASE 
          WHEN cr.content_type = 'toki' THEN t.title
          WHEN cr.content_type = 'user' THEN u.name
          WHEN cr.content_type = 'message' THEN m.content
          ELSE NULL
        END as content_preview,
        -- Enhanced Toki metadata
        t.location as toki_location,
        t.category as toki_category,
        t.scheduled_time as toki_scheduled_time,
        t.status as toki_status,
        t.visibility as toki_visibility,
        host.name as toki_host_name,
        -- Enhanced Message metadata
        m.created_at as message_created_at,
        sender.name as message_sender_name,
        CASE 
          WHEN m.conversation_id IS NOT NULL THEN 'direct'
          WHEN m.toki_id IS NOT NULL THEN 'group'
          ELSE NULL
        END as message_type,
        -- Content owner
        CASE 
          WHEN cr.content_type = 'toki' THEN t.host_id
          WHEN cr.content_type = 'message' THEN m.sender_id
          ELSE cr.content_id
        END as content_owner_id
      FROM content_reports cr
      JOIN users reporter ON cr.reporter_id = reporter.id
      LEFT JOIN users reviewer ON cr.reviewed_by = reviewer.id
      LEFT JOIN tokis t ON cr.content_type = 'toki' AND cr.content_id = t.id
      LEFT JOIN users host ON t.host_id = host.id
      LEFT JOIN users u ON cr.content_type = 'user' AND cr.content_id = u.id
      LEFT JOIN messages m ON cr.content_type = 'message' AND cr.content_id = m.id
      LEFT JOIN users sender ON m.sender_id = sender.id
      ${whereClause}
      ORDER BY cr.reported_at DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}`,
      queryParams
    );

    // Get total count
    const countQueryParams = queryParams.slice(0, -2); // Remove limit and offset
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM content_reports cr ${whereClause}`,
      countQueryParams
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limitNum);

    return res.json({
      success: true,
      data: {
        reports: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reports'
    });
  }
});

// Update report status (for admin review)
router.patch('/reports/:reportId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { status, notes } = req.body;
    const reviewerId = req.user!.id;

    // Validate status
    if (!['reviewed', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be: reviewed, resolved, or dismissed'
      });
    }

    // Update report
    const result = await pool.query(
      `UPDATE content_reports 
       SET status = $1, notes = $2, reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, notes || null, reviewerId, reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    const report = result.rows[0];

    logger.info(`✅ [ADMIN] Report ${reportId} updated to ${status} by admin ${reviewerId}`);

    // If report is dismissed (false alarm), unhide the content for the reporter
    // If resolved (content was problematic), keep it hidden
    if (status === 'dismissed' && report.content_type === 'toki') {
      try {
        await pool.query(
          `DELETE FROM user_hidden_activities 
           WHERE user_id = $1 AND toki_id = $2`,
          [report.reporter_id, report.content_id]
        );
        logger.info(`👁️ [ADMIN] Unhid Toki ${report.content_id} for reporter ${report.reporter_id} after dismissed report`);
      } catch (unhideError) {
        // Log error but don't fail the request - report status update is more important
        logger.error('Error unhiding content after dismissal:', unhideError);
      }
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update report'
    });
  }
});

// Block or unblock a Toki (admin only)
router.patch('/tokis/:tokiId/block', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { tokiId } = req.params;
    const { block, reason } = req.body;
    const adminId = req.user!.id;

    // Validate block parameter
    if (typeof block !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Block parameter must be a boolean'
      });
    }

    const newStatus = block ? 'blocked' : 'active';

    // Update Toki status
    const result = await pool.query(
      `UPDATE tokis 
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, tokiId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Toki not found'
      });
    }

    logger.info(`🚫 [ADMIN] Toki ${tokiId} ${block ? 'BLOCKED' : 'UNBLOCKED'} by admin ${adminId}. Reason: ${reason || 'N/A'}`);

    return res.json({
      success: true,
      data: result.rows[0],
      message: `Toki ${block ? 'blocked' : 'unblocked'} successfully`
    });
  } catch (error) {
    logger.error('Error blocking/unblocking Toki:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update Toki status'
    });
  }
});

// Get report statistics
router.get('/reports/stats', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const statsResult = await pool.query(
      `SELECT 
        status,
        COUNT(*) as count
      FROM message_reports 
      GROUP BY status`
    );

    const totalResult = await pool.query(
      'SELECT COUNT(*) as total FROM message_reports'
    );

    const total = parseInt(totalResult.rows[0].total);
    const stats = statsResult.rows.reduce((acc: any, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        total,
        byStatus: stats
      }
    });
  } catch (error) {
    console.error('Error fetching report stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch report statistics'
    });
  }
});

// Update report status (review, resolve, dismiss)
router.put('/reports/:reportId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const { status, notes } = req.body;
    const adminId = req.user!.id;

    // Validate status
    const validStatuses = ['pending', 'reviewed', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: pending, reviewed, resolved, dismissed'
      });
    }

    // Update report
    const result = await pool.query(
      `UPDATE message_reports 
       SET status = $1, notes = $2, reviewed_by = $3, reviewed_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [status, notes || null, adminId, reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    console.log(`🚨 [ADMIN] Report ${reportId} updated to status: ${status} by admin ${adminId}`);

    return res.json({
      success: true,
      message: 'Report updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update report'
    });
  }
});

// Delete a report (permanent removal)
router.delete('/reports/:reportId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const adminId = req.user!.id;

    const result = await pool.query(
      'DELETE FROM message_reports WHERE id = $1 RETURNING *',
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    console.log(`🗑️ [ADMIN] Report ${reportId} deleted by admin ${adminId}`);

    return res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete report'
    });
  }
});

router.get('/reports/:reportId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;

    const result = await pool.query(
      `SELECT 
        mr.id as report_id,
        mr.reason,
        mr.reported_at,
        mr.status,
        mr.notes,
        mr.reviewed_at,
        m.id as message_id,
        m.content as message_content,
        m.created_at as message_created_at,
        sender.name as sender_name,
        sender.id as sender_id,
        sender.email as sender_email,
        sender.bio as sender_bio,
        reporter.name as reporter_name,
        reporter.id as reporter_id,
        reporter.email as reporter_email,
        CASE 
          WHEN m.conversation_id IS NOT NULL THEN 'conversation'
          WHEN m.toki_id IS NOT NULL THEN 'toki_group'
          ELSE 'unknown'
        END as message_type,
        m.conversation_id,
        m.toki_id,
        reviewer.name as reviewer_name,
        reviewer.id as reviewer_id
      FROM message_reports mr
      JOIN messages m ON mr.message_id = m.id
      JOIN users sender ON m.sender_id = sender.id
      JOIN users reporter ON mr.reporter_id = reporter.id
      LEFT JOIN users reviewer ON mr.reviewed_by = reviewer.id
      WHERE mr.id = $1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching report details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch report details'
    });
  }
});


export default router;
