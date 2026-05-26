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

// ===== SCHEDULED NOTIFICATIONS =====

// Get all scheduled notifications
router.get('/notification-schedule', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offset = (pageNum - 1) * limitNum;

    const result = await pool.query(
      `SELECT id, title, message, day_of_week, hour, minute, enabled, last_sent_at, created_at, updated_at
       FROM scheduled_notifications
       ORDER BY day_of_week, hour, minute
       LIMIT $1 OFFSET $2`,
      [limitNum, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) as total FROM scheduled_notifications');
    const total = parseInt(countResult.rows[0].total);

    return res.json({
      success: true,
      data: {
        notifications: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching scheduled notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled notifications'
    });
  }
});

// Get single scheduled notification
router.get('/notification-schedule/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, title, message, day_of_week, hour, minute, enabled, last_sent_at, created_at, updated_at
       FROM scheduled_notifications
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled notification not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching scheduled notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduled notification'
    });
  }
});

// Create scheduled notification
router.post('/notification-schedule', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, message, day_of_week, hour, minute, enabled = true } = req.body;

    if (!title || !message || day_of_week === undefined || hour === undefined || minute === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Title, message, day_of_week, hour, and minute are required'
      });
    }

    if (day_of_week < 0 || day_of_week > 6) {
      return res.status(400).json({
        success: false,
        message: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)'
      });
    }

    if (hour < 0 || hour > 23) {
      return res.status(400).json({
        success: false,
        message: 'hour must be between 0 and 23'
      });
    }

    if (minute < 0 || minute > 59) {
      return res.status(400).json({
        success: false,
        message: 'minute must be between 0 and 59'
      });
    }

    const result = await pool.query(
      `INSERT INTO scheduled_notifications (title, message, day_of_week, hour, minute, enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING id, title, message, day_of_week, hour, minute, enabled, last_sent_at, created_at, updated_at`,
      [title, message, day_of_week, hour, minute, enabled]
    );

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating scheduled notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create scheduled notification'
    });
  }
});

// Update scheduled notification
router.put('/notification-schedule/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, message, day_of_week, hour, minute, enabled } = req.body;

    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      fields.push(`title = $${paramCount}`);
      values.push(title);
    }
    if (message !== undefined) {
      paramCount++;
      fields.push(`message = $${paramCount}`);
      values.push(message);
    }
    if (day_of_week !== undefined) {
      if (day_of_week < 0 || day_of_week > 6) {
        return res.status(400).json({
          success: false,
          message: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)'
        });
      }
      paramCount++;
      fields.push(`day_of_week = $${paramCount}`);
      values.push(day_of_week);
    }
    if (hour !== undefined) {
      if (hour < 0 || hour > 23) {
        return res.status(400).json({
          success: false,
          message: 'hour must be between 0 and 23'
        });
      }
      paramCount++;
      fields.push(`hour = $${paramCount}`);
      values.push(hour);
    }
    if (minute !== undefined) {
      if (minute < 0 || minute > 59) {
        return res.status(400).json({
          success: false,
          message: 'minute must be between 0 and 59'
        });
      }
      paramCount++;
      fields.push(`minute = $${paramCount}`);
      values.push(minute);
    }
    if (enabled !== undefined) {
      paramCount++;
      fields.push(`enabled = $${paramCount}`);
      values.push(enabled);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    paramCount++;
    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE scheduled_notifications
       SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, title, message, day_of_week, hour, minute, enabled, last_sent_at, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled notification not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating scheduled notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update scheduled notification'
    });
  }
});

// Delete scheduled notification
router.delete('/notification-schedule/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM scheduled_notifications WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled notification not found'
      });
    }

    return res.json({
      success: true,
      message: 'Scheduled notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting scheduled notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete scheduled notification'
    });
  }
});

// Send test notification immediately
router.post('/notification-schedule/:id/test', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, title, message FROM scheduled_notifications WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled notification not found'
      });
    }

    const notification = result.rows[0];

    // Get all user IDs
    const usersResult = await pool.query('SELECT id FROM users');
    const userIds = usersResult.rows.map((row: any) => row.id);

    if (userIds.length === 0) {
      return res.json({
        success: true,
        message: 'Test notification skipped - no users found',
        data: { sentTo: 0 }
      });
    }

    // Import sendPushToUsers
    const { sendPushToUsers } = await import('../../utils/push');

    await sendPushToUsers(userIds, {
      title: notification.title,
      body: notification.message,
      data: { type: 'scheduled_notification', scheduledId: id }
    });

    return res.json({
      success: true,
      message: 'Test notification sent successfully',
      data: { sentTo: userIds.length }
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send test notification'
    });
  }
});

export default router;
