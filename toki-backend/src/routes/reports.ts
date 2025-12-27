import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Report a Toki
router.post('/tokis/:tokiId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tokiId } = req.params;
    const { reason } = req.body;
    const reporterId = req.user!.id;

    // Validate reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Report reason is required'
      });
    }

    if (reason.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Reason must be 500 characters or less'
      });
    }

    // Check if Toki exists
    const tokiResult = await pool.query(
      'SELECT id, host_id, title FROM tokis WHERE id = $1',
      [tokiId]
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Toki not found'
      });
    }

    const toki = tokiResult.rows[0];

    // Prevent users from reporting their own Toki
    if (toki.host_id === reporterId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot report your own Toki'
      });
    }

    // Check for duplicate pending report
    const duplicateCheck = await pool.query(
      `SELECT id FROM content_reports 
       WHERE reporter_id = $1 AND content_type = 'toki' AND content_id = $2 AND status = 'pending'`,
      [reporterId, tokiId]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this Toki'
      });
    }

    // Insert report
    const reportResult = await pool.query(
      `INSERT INTO content_reports (
        content_type,
        content_id,
        reporter_id,
        reason,
        reported_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING id`,
      ['toki', tokiId, reporterId, reason.trim()]
    );

    // Automatically hide the reported Toki from the reporter's feed
    // This provides immediate feedback and removes potentially offensive content
    await pool.query(
      `INSERT INTO user_hidden_activities (user_id, toki_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, toki_id) DO NOTHING`,
      [reporterId, tokiId]
    );

    logger.info(`🚨 [REPORTS] Toki ${tokiId} ("${toki.title}") reported by user ${reporterId} for reason: ${reason.trim()}`);
    logger.info(`🙈 [REPORTS] Auto-hidden Toki ${tokiId} from reporter ${reporterId}'s feed`);

    return res.json({
      success: true,
      message: 'Toki reported successfully',
      data: {
        reportId: reportResult.rows[0].id
      }
    });
  } catch (error) {
    logger.error('Error reporting Toki:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to report Toki'
    });
  }
});

// Report a user profile
router.post('/users/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const reporterId = req.user!.id;

    // Validate reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Report reason is required'
      });
    }

    if (reason.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Reason must be 500 characters or less'
      });
    }

    // Check if user exists
    const userResult = await pool.query(
      'SELECT id, name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Prevent users from reporting themselves
    if (userId === reporterId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot report yourself'
      });
    }

    // Check for duplicate pending report
    const duplicateCheck = await pool.query(
      `SELECT id FROM content_reports 
       WHERE reporter_id = $1 AND content_type = 'user' AND content_id = $2 AND status = 'pending'`,
      [reporterId, userId]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this user'
      });
    }

    // Insert report
    const reportResult = await pool.query(
      `INSERT INTO content_reports (
        content_type,
        content_id,
        reporter_id,
        reason,
        reported_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING id`,
      ['user', userId, reporterId, reason.trim()]
    );

    logger.info(`🚨 [REPORTS] User ${userId} ("${user.name}") reported by user ${reporterId} for reason: ${reason.trim()}`);

    return res.json({
      success: true,
      message: 'User reported successfully',
      data: {
        reportId: reportResult.rows[0].id
      }
    });
  } catch (error) {
    logger.error('Error reporting user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to report user'
    });
  }
});

// Get current user's reports
router.get('/my-reports', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const result = await pool.query(
      `SELECT 
        id,
        content_type,
        content_id,
        reason,
        status,
        reported_at,
        reviewed_at
      FROM content_reports
      WHERE reporter_id = $1
      ORDER BY reported_at DESC
      LIMIT 50`,
      [userId]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching user reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reports'
    });
  }
});

export default router;
