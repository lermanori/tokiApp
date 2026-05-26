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

// ===== TOKIS MANAGEMENT =====

// List tokis with pagination, search and filters
router.get('/tokis', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search = '', category, status, host, sortBy = 'created_at', sortOrder = 'desc' } = req.query as any;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    const clauses: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length} OR location ILIKE $${params.length})`);
    }
    if (category) {
      params.push(category);
      clauses.push(`category = $${params.length}`);
    }
    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }
    if (host) {
      params.push(host);
      clauses.push(`host_id = $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const validSortBy = ['created_at', 'title', 'category', 'status'];
    const sortColumn = validSortBy.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const listQuery = `
      SELECT id, title, category, status, location, host_id, created_at
      FROM tokis
      ${where}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const listResult = await pool.query(listQuery, [...params, limitNum, offset]);

    const countQuery = `SELECT COUNT(*) FROM tokis ${where}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    return res.json({
      success: true,
      data: {
        tokis: listResult.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error listing tokis:', error);
    res.status(500).json({ success: false, message: 'Failed to list tokis' });
    return;
  }
});

// Create toki
router.post('/tokis', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      title, description, category, status, location, host_id,
      scheduled_time, max_attendees, visibility, tags, is_paid,
      latitude, longitude, external_link, auto_approve
    } = req.body;

    if (!title || !host_id) {
      res.status(400).json({ success: false, message: 'Title and host_id are required' });
      return;
    }

    await client.query('BEGIN');

    const ins = await client.query(
      `INSERT INTO tokis (
        title, description, category, status, location, host_id,
        scheduled_time, max_attendees, visibility, is_paid,
        latitude, longitude, external_link, auto_approve
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *`,
      [
        title,
        description || null,
        category || null,
        status || 'draft',
        location || null,
        host_id,
        scheduled_time || null,
        max_attendees !== undefined ? max_attendees : null,
        visibility || 'public',
        is_paid !== undefined ? is_paid : false,
        latitude !== undefined ? latitude : null,
        longitude !== undefined ? longitude : null,
        external_link !== undefined ? external_link : null,
        auto_approve !== undefined ? auto_approve : false
      ]
    );

    const toki = ins.rows[0];

    // Handle tags if provided
    if (tags) {
      const tagList = Array.isArray(tags)
        ? tags
        : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : []);

      for (const tag of tagList) {
        if (tag) {
          await client.query(
            'INSERT INTO toki_tags (toki_id, tag_name) VALUES ($1, $2)',
            [toki.id, tag.trim()]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: toki });
    return;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating toki:', error);
    res.status(500).json({ success: false, message: 'Failed to create toki' });
    return;
  } finally {
    client.release();
  }
});

// Get single toki
router.get('/tokis/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT 
        t.*,
        ARRAY_AGG(tt.tag_name) FILTER (WHERE tt.tag_name IS NOT NULL) as tags
      FROM tokis t
      LEFT JOIN toki_tags tt ON t.id = tt.toki_id
      WHERE t.id = $1
      GROUP BY t.id`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Toki not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
    return;
  } catch (error) {
    console.error('Error fetching toki:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch toki' });
    return;
  }
});

// Update toki
router.put('/tokis/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      title, description, category, status, location, host_id,
      scheduled_time, max_attendees, visibility, tags, is_paid,
      latitude, longitude, external_link, auto_approve
    } = req.body;

    await client.query('BEGIN');

    const upd = await client.query(
      `UPDATE tokis SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        status = COALESCE($4, status),
        location = COALESCE($5, location),
        host_id = COALESCE($6, host_id),
        scheduled_time = COALESCE($7, scheduled_time),
        max_attendees = COALESCE($8, max_attendees),
        visibility = COALESCE($9, visibility),
        is_paid = COALESCE($10, is_paid),
        latitude = COALESCE($11, latitude),
        longitude = COALESCE($12, longitude),
        external_link = COALESCE($13, external_link),
        auto_approve = COALESCE($14, auto_approve),
        updated_at = NOW()
       WHERE id = $15
       RETURNING *`,
      [
        title || null,
        description || null,
        category || null,
        status || null,
        location || null,
        host_id || null,
        scheduled_time || null,
        max_attendees !== undefined ? max_attendees : null,
        visibility || null,
        is_paid !== undefined ? is_paid : null,
        latitude !== undefined ? latitude : null,
        longitude !== undefined ? longitude : null,
        external_link !== undefined ? external_link : null,
        auto_approve !== undefined ? auto_approve : null,
        id
      ]
    );

    if (upd.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, message: 'Toki not found' });
      return;
    }

    // Handle tags update if provided
    if (tags !== undefined) {
      // Clear existing tags
      await client.query('DELETE FROM toki_tags WHERE toki_id = $1', [id]);

      // Insert new tags
      if (Array.isArray(tags) && tags.length > 0) {
        for (const tag of tags) {
          if (tag) {
            await client.query(
              'INSERT INTO toki_tags (toki_id, tag_name) VALUES ($1, $2)',
              [id, tag.trim()]
            );
          }
        }
      } else if (typeof tags === 'string' && tags.trim()) {
        const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
        for (const tag of tagList) {
          await client.query(
            'INSERT INTO toki_tags (toki_id, tag_name) VALUES ($1, $2)',
            [id, tag]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, data: upd.rows[0] });
    return;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating toki:', error);
    res.status(500).json({ success: false, message: 'Failed to update toki' });
    return;
  } finally {
    client.release();
  }
});

// Delete toki
router.delete('/tokis/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const del = await pool.query('DELETE FROM tokis WHERE id = $1 RETURNING id', [id]);
    if (del.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Toki not found' });
      return;
    }
    res.json({ success: true, message: 'Toki deleted' });
    return;
  } catch (error) {
    console.error('Error deleting toki:', error);
    res.status(500).json({ success: false, message: 'Failed to delete toki' });
    return;
  }
});

// List participants for a toki
router.get('/tokis/:id/participants', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
         tp.user_id,
         tp.status,
         tp.joined_at,
         u.name,
         u.email,
         u.avatar_url,
         u.location
       FROM toki_participants tp
       JOIN users u ON u.id = tp.user_id
       WHERE tp.toki_id = $1
       ORDER BY tp.joined_at DESC`,
      [id]
    );

    res.json({ success: true, data: result.rows });
    return;
  } catch (error) {
    console.error('Error fetching toki participants:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch participants' });
    return;
  }
});

export default router;
