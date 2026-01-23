import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { IZipEntry } from 'adm-zip';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { generateTokenPair } from '../utils/jwt';
import { issuePasswordResetToken, PasswordLinkPurpose } from '../utils/passwordReset';
import logger from '../utils/logger';
import { validateTokiData, matchImagesToTokis } from '../utils/batchUploadValidation';
import { ImageService } from '../services/imageService';

const router = Router();

// Middleware to check if user is admin
const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    
    const userResult = await pool.query(
      'SELECT id, name, email, role FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }
    
    if (userResult.rows[0].role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
      return;
    }
    
    next();
    return;
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
    return;
  }
};

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

// Get detailed report with message context
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

// Admin login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const userResult = await pool.query(
      'SELECT id, email, password_hash, name, role FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = userResult.rows[0];

    // Check if user has admin role
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT tokens
    const tokens = generateTokenPair({ id: user.id, email: user.email, name: user.name });

    return res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        tokens
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get current admin user info
router.get('/me', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    const userResult = await pool.query(
      'SELECT id, email, name, role, verified, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: userResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching admin info:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ===== WAITLIST MANAGEMENT =====

// Get all waitlist entries
router.get('/waitlist', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', location, platform, sortBy = 'created_at', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    let query = `SELECT 
      id, 
      email, 
      phone, 
      location, 
      reason, 
      platform, 
      created_at,
      EXISTS (SELECT 1 FROM users u WHERE u.email = waitlist_signups.email) AS user_exists
    FROM waitlist_signups WHERE 1=1`;
    const queryParams: any[] = [];
    let paramCount = 0;

    // Add filters
    if (location) {
      paramCount++;
      query += ` AND location ILIKE $${paramCount}`;
      queryParams.push(`%${location}%`);
    }

    if (platform) {
      paramCount++;
      query += ` AND platform = $${paramCount}`;
      queryParams.push(platform);
    }

    // Add sorting
    const validSortBy = ['created_at', 'email', 'location', 'user_exists'];
    const sortColumn = validSortBy.includes(sortBy as string) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${order}`;

    // Add pagination
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(limitNum);
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await pool.query(query, queryParams);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM waitlist_signups WHERE 1=1';
    const countParams: any[] = [];
    let countParamCount = 0;

    if (location) {
      countParamCount++;
      countQuery += ` AND location ILIKE $${countParamCount}`;
      countParams.push(`%${location}%`);
    }

    if (platform) {
      countParamCount++;
      countQuery += ` AND platform = $${countParamCount}`;
      countParams.push(platform);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return res.json({
      success: true,
      data: {
        entries: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching waitlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch waitlist entries'
    });
  }
});

// Get single waitlist entry
router.get('/waitlist/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT id, email, phone, location, reason, platform, created_at FROM waitlist_signups WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching waitlist entry:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch waitlist entry'
    });
  }
});

// Get waitlist statistics
router.get('/waitlist/stats', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    // Total count
    const totalResult = await pool.query('SELECT COUNT(*) FROM waitlist_signups');
    const total = parseInt(totalResult.rows[0].count);

    // By location
    const locationResult = await pool.query(
      `SELECT location, COUNT(*) as count 
       FROM waitlist_signups 
       WHERE location IS NOT NULL 
       GROUP BY location 
       ORDER BY count DESC`
    );

    // By platform
    const platformResult = await pool.query(
      `SELECT platform, COUNT(*) as count 
       FROM waitlist_signups 
       WHERE platform IS NOT NULL 
       GROUP BY platform 
       ORDER BY count DESC`
    );

    // Signups over time (last 30 days)
    const timeSeriesResult = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM waitlist_signups
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    return res.json({
      success: true,
      data: {
        total,
        byLocation: locationResult.rows,
        byPlatform: platformResult.rows,
        timeSeries: timeSeriesResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching waitlist stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch waitlist statistics'
    });
  }
});

// Create waitlist entry
router.post('/waitlist', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, phone = null, location = null, platform = null } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const exists = await pool.query('SELECT 1 FROM waitlist_signups WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already on waitlist' });
    }
    const ins = await pool.query(
      `INSERT INTO waitlist_signups (email, phone, location, platform)
       VALUES ($1,$2,$3,$4)
       RETURNING id, email, phone, location, reason, platform, created_at`,
      [email, phone, location, platform]
    );
    return res.json({ success: true, data: ins.rows[0] });
  } catch (error) {
    console.error('Error creating waitlist entry:', error);
    return res.status(500).json({ success: false, message: 'Failed to create waitlist entry' });
  }
});

// Update waitlist entry
router.put('/waitlist/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, phone, location, platform } = req.body || {};

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email); }
    if (phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(phone); }
    if (location !== undefined) { fields.push(`location = $${idx++}`); values.push(location); }
    if (platform !== undefined) { fields.push(`platform = $${idx++}`); values.push(platform); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(id);

    const upd = await pool.query(
      `UPDATE waitlist_signups SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, email, phone, location, reason, platform, created_at`,
      values
    );

    if (upd.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Waitlist entry not found' });
    }

    return res.json({ success: true, data: upd.rows[0] });
  } catch (error) {
    console.error('Error updating waitlist entry:', error);
    return res.status(500).json({ success: false, message: 'Failed to update waitlist entry' });
  }
});

// Delete waitlist entry (hard delete)
router.delete('/waitlist/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const del = await pool.query('DELETE FROM waitlist_signups WHERE id = $1 RETURNING id', [id]);
    if (del.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Waitlist entry not found' });
    }
    return res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('Error deleting waitlist entry:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete waitlist entry' });
  }
});

// Create user from waitlist entry
router.post('/waitlist/:id/user', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, password, sendWelcomeEmail = true, sendWelcomeLink = false } = req.body as {
      name?: string;
      password?: string;
      sendWelcomeEmail?: boolean;
      sendWelcomeLink?: boolean;
    };

    // Get waitlist entry
    const waitlistResult = await pool.query(
      'SELECT email, phone, location, reason FROM waitlist_signups WHERE id = $1',
      [id]
    );

    if (waitlistResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found'
      });
    }

    const entry = waitlistResult.rows[0];
    const email = entry.email;
    const userName = name || email.split('@')[0]; // Use email username if name not provided

    // Check if user already exists
    const existingUserResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUserResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate password if not provided
    let passwordHash: string;
    if (password) {
      passwordHash = await bcrypt.hash(password, 12);
    } else {
      // Generate random password (12 characters)
      const crypto = require('crypto');
      const randomPassword = crypto.randomBytes(12).toString('base64').slice(0, 12);
      passwordHash = await bcrypt.hash(randomPassword, 12);
    }

    // Create user
    const userResult = await pool.query(
      `INSERT INTO users (email, password_hash, name, bio, location)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, bio, location, verified, rating, member_since, created_at`,
      [email, passwordHash, userName, entry.reason || null, entry.location || null]
    );

    const user = userResult.rows[0];

    // Create user stats entry
    await pool.query('INSERT INTO user_stats (user_id) VALUES ($1)', [user.id]);

    // Send welcome email or welcome password link if requested
    if (sendWelcomeLink) {
      const { link, expiryHours } = await issuePasswordResetToken(user.id, 'welcome');
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (RESEND_API_KEY) {
        const subject = "Welcome to Toki – Set your password";
        const text = `Hey ${userName},\n\nWelcome to Toki! Set your password using the link below (expires in ${expiryHours} hours):\n\n${link}\n\n—\nToki`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "onboarding@toki-app.com",
            to: email,
            subject,
            text,
          }),
        }).catch(err => console.error('Email send error:', err));
      }
    } else if (sendWelcomeEmail) {
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (RESEND_API_KEY) {
        const subject = "Welcome to Toki! 🖤";
        const text = `Hey ${userName},\n\nWelcome to Toki! Your account has been created.\n\nYou can now start discovering and creating activities in your area.\n\nLet's make something happen.\n\n—\nToki`;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "onboarding@toki-app.com",
            to: email,
            subject,
            text,
          }),
        }).catch(err => console.error('Email send error:', err));
      }
    }

    return res.json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          bio: user.bio,
          location: user.location
        }
      }
    });
  } catch (error) {
    console.error('Error creating user from waitlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// Send custom email to waitlist entry
router.post('/waitlist/:id/email', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subject, body, templateId } = req.body;

    // Get waitlist entry
    const waitlistResult = await pool.query(
      'SELECT email, phone, location FROM waitlist_signups WHERE id = $1',
      [id]
    );

    if (waitlistResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found'
      });
    }

    const entry = waitlistResult.rows[0];

    // Get email template if templateId provided
    let emailSubject = subject;
    let emailBody = body;

    if (templateId) {
      const templateResult = await pool.query(
        'SELECT subject, body_text FROM email_templates WHERE id = $1',
        [templateId]
      );

      if (templateResult.rows.length > 0) {
        const template = templateResult.rows[0];
        emailSubject = template.subject;
        emailBody = template.body_text;

        // Replace variables
        // Get position for this user
        const positionResult = await pool.query(
          `SELECT COUNT(*) FROM waitlist_signups 
           WHERE created_at <= (SELECT created_at FROM waitlist_signups WHERE id = $1)`,
          [id]
        );
        const position = parseInt(positionResult.rows[0].count);

        emailBody = emailBody
          .replace(/\{position\}/g, String(position))
          .replace(/#\{position\}/g, String(position))
          .replace(/\{city\}/g, entry.location || 'your city')
          .replace(/\{name\}/g, entry.email.split('@')[0])
          .replace(/\{email\}/g, entry.email);
      }
    }

    if (!emailSubject || !emailBody) {
      return res.status(400).json({
        success: false,
        message: 'Subject and body are required'
      });
    }

    // Send email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return res.status(500).json({
        success: false,
        message: 'Email service not configured'
      });
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@toki-app.com",
        to: entry.email,
        subject: emailSubject,
        text: emailBody,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error('Resend email failed:', errorText);
      return res.status(500).json({
        success: false,
        message: 'Failed to send email'
      });
    }

    return res.json({
      success: true,
      message: 'Email sent successfully'
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send email'
    });
  }
});

// ===== USERS MANAGEMENT =====

// List users with pagination, search and filters
router.get('/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search = '', role, verified, sortBy = 'created_at', sortOrder = 'desc' } = req.query as any;
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    const clauses: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (role) {
      params.push(role);
      clauses.push(`role = $${params.length}`);
    }
    if (verified !== undefined && verified !== '') {
      params.push(verified === 'true');
      clauses.push(`verified = $${params.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const validSortBy = ['created_at', 'name', 'email', 'role', 'verified'];
    const sortColumn = validSortBy.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const listQuery = `
      SELECT id, email, name, role, verified, location, created_at, invitation_credits
      FROM users
      ${where}
      ORDER BY ${sortColumn} ${order}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const listResult = await pool.query(listQuery, [...params, limitNum, offset]);

    const countQuery = `SELECT COUNT(*) FROM users ${where}`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    return res.json({
      success: true,
      data: {
        users: listResult.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ success: false, message: 'Failed to list users' });
    return;
  }
});

// Create user
router.post('/users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, name, password, role = 'user', bio, location, verified, sendWelcomeLink = false } = req.body as any;
    if (!email || !name) {
      res.status(400).json({ success: false, message: 'Email and name are required' });
      return;
    }
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      res.status(409).json({ success: false, message: 'User already exists' });
      return;
    }
    const passwordHash = password ? await bcrypt.hash(password, 12) : await bcrypt.hash(Math.random().toString(36).slice(2), 12);
    const ins = await pool.query(
      `INSERT INTO users (email, password_hash, name, bio, location, role, verified)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,false))
       RETURNING id, email, name, role, verified, location, created_at`,
      [email, passwordHash, name, bio || null, location || null, role, verified === true]
    );
    const createdUser = ins.rows[0];
    await pool.query('INSERT INTO user_stats (user_id) VALUES ($1)', [createdUser.id]);

    // Optionally send welcome link to set password
    if (sendWelcomeLink === true) {
      const { link, expiryHours } = await issuePasswordResetToken(createdUser.id, 'welcome');
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (RESEND_API_KEY) {
        const subject = "Welcome to Toki – Set your password";
        const text = `Hey ${name},\n\nWelcome to Toki! Set your password using the link below (expires in ${expiryHours} hours):\n\n${link}\n\n—\nToki`;
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "onboarding@toki-app.com",
            to: email,
            subject,
            text,
          }),
        }).catch(err => console.error('Email send error:', err));
      }
    }

    res.json({ success: true, data: createdUser });
    return;
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
    return;
  }
});

// Issue password link for a user (welcome or reset)
router.post('/users/:id/password-link', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { purpose = 'reset', send = false, templateId, includeLink = true } = req.body as { 
      purpose?: PasswordLinkPurpose; 
      send?: boolean; 
      templateId?: string;
      includeLink?: boolean;
    };

    // Ensure user exists and get email/name
    const userResult = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    const u = userResult.rows[0];

    const { link, expiryHours } = await issuePasswordResetToken(u.id, purpose === 'welcome' ? 'welcome' : 'reset');

    if (send) {
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (!RESEND_API_KEY) {
        res.status(500).json({ success: false, message: 'Email service not configured' });
        return;
      }
      let subject =
        purpose === 'welcome'
          ? 'Welcome to Toki – Set your password'
          : 'Reset your Toki password';
      let text =
        purpose === 'welcome'
          ? `Hey ${u.name || ''},\n\nWelcome to Toki! Set your password using the link below (expires in ${expiryHours} hours):\n\n${link}\n\n—\nToki`
          : `Hey ${u.name || ''},\n\nReset your Toki password using the link below (expires in ${expiryHours} hours):\n\n${link}\n\n—\nToki`;

      // Try to find template by name if templateId not provided
      let templateIdToUse = templateId;
      if (!templateIdToUse) {
        const templateName = purpose === 'welcome' ? 'welcome_password' : 'reset_password';
        const templateResult = await pool.query(
          'SELECT id FROM email_templates WHERE template_name = $1 ORDER BY created_at DESC LIMIT 1',
          [templateName]
        );
        if (templateResult.rows.length > 0) {
          templateIdToUse = templateResult.rows[0].id;
        }
      }

      // If a template is found/provided, use it
      if (templateIdToUse) {
        const t = await pool.query('SELECT subject, body_text FROM email_templates WHERE id = $1', [templateIdToUse]);
        if (t.rows.length > 0) {
          const tmpl = t.rows[0];
          subject = tmpl.subject || subject;
          let bodyText = tmpl.body_text || text;
          
          // Replace variables
          bodyText = bodyText
            .replace(/\{\{name\}\}/g, u.name || '')
            .replace(/\{\{email\}\}/g, u.email || '')
            .replace(/\{\{expiry_hours\}\}/g, String(expiryHours));
          
          // Only include link if checkbox is checked
          if (includeLink) {
            bodyText = bodyText.replace(/\{\{reset_link\}\}/g, link);
          } else {
            // Remove the link placeholder if not including it
            bodyText = bodyText.replace(/\{\{reset_link\}\}/g, '');
          }
          
          text = bodyText;
        }
      } else if (!includeLink) {
        // No template but link should not be included - remove it from default text
        text = text.replace(new RegExp(link.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
      }

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "onboarding@toki-app.com",
          to: u.email,
          subject,
          text,
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text().catch(()=> '');
        console.error('Resend email failed (password-link):', txt);
        res.status(500).json({ success: false, message: 'Failed to send email' });
        return;
      }
    }

    res.json({ success: true, data: { link } });
    return;
  } catch (error) {
    console.error('Error issuing password link:', error);
    res.status(500).json({ success: false, message: 'Failed to issue password link' });
    return;
  }
});

// Settings: password reset expiry
router.get('/settings/password-reset-expiry', authenticateToken, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`SELECT value FROM app_settings WHERE key = 'password_reset_expiry_hours'`);
    const hours =
      result.rows.length > 0
        ? Number(typeof result.rows[0].value === 'string' ? result.rows[0].value : Number(result.rows[0].value))
        : 2;
    res.json({ success: true, data: { hours: Number.isFinite(hours) && hours > 0 ? hours : 2 } });
  } catch (error) {
    console.error('Error reading settings (password expiry):', error);
    res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
});

router.put('/settings/password-reset-expiry', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { hours } = req.body as { hours: number };
    const n = Number(hours);
    if (!Number.isFinite(n) || n <= 0 || n > 168) {
      res.status(400).json({ success: false, message: 'Invalid hours (1-168)' });
      return;
    }
    await pool.query(
      `INSERT INTO app_settings(key, value, updated_at)
       VALUES ('password_reset_expiry_hours', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [JSON.stringify(n)]
    );
    res.json({ success: true, data: { hours: n } });
  } catch (error) {
    console.error('Error saving settings (password expiry):', error);
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
});

// Update user
router.put('/users/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name, bio, location, role, verified } = req.body;
    const upd = await pool.query(
      `UPDATE users SET
        email = COALESCE($1, email),
        name = COALESCE($2, name),
        bio = COALESCE($3, bio),
        location = COALESCE($4, location),
        role = COALESCE($5, role),
        verified = COALESCE($6, verified)
       WHERE id = $7
       RETURNING id, email, name, role, verified, location, created_at`,
      [email || null, name || null, bio || null, location || null, role || null, verified as boolean | null, id]
    );
    if (upd.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, data: upd.rows[0] });
    return;
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Failed to update user' });
    return;
  }
});

// Delete user
router.delete('/users/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const del = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (del.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, message: 'User deleted' });
    return;
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
    return;
  }
});

// Add invitation credits to a user
router.post('/users/:id/invitation-credits', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { credits } = req.body;

    if (!credits || typeof credits !== 'number' || credits <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid credits amount is required'
      });
    }

    const result = await pool.query(
      `UPDATE users 
       SET invitation_credits = COALESCE(invitation_credits, 0) + $1 
       WHERE id = $2 
       RETURNING id, email, name, invitation_credits`,
      [credits, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding invitation credits:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add invitation credits'
    });
  }
});

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
  try {
    const { title, description, category, status, location, host_id } = req.body;
    if (!title || !host_id) {
      res.status(400).json({ success: false, message: 'Title and host_id are required' });
      return;
    }
    const ins = await pool.query(
      `INSERT INTO tokis (title, description, category, status, location, host_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, title, category, status, location, host_id, created_at`,
      [title, description || null, category || null, status || 'draft', location || null, host_id]
    );
    res.json({ success: true, data: ins.rows[0] });
    return;
  } catch (error) {
    console.error('Error creating toki:', error);
    res.status(500).json({ success: false, message: 'Failed to create toki' });
    return;
  }
});

// Update toki
router.put('/tokis/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, category, status, location, host_id } = req.body;
    const upd = await pool.query(
      `UPDATE tokis SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        status = COALESCE($4, status),
        location = COALESCE($5, location),
        host_id = COALESCE($6, host_id)
       WHERE id = $7
       RETURNING id, title, category, status, location, host_id, created_at`,
      [title || null, description || null, category || null, status || null, location || null, host_id || null, id]
    );
    if (upd.rows.length === 0) {
      res.status(404).json({ success: false, message: 'Toki not found' });
      return;
    }
    res.json({ success: true, data: upd.rows[0] });
    return;
  } catch (error) {
    console.error('Error updating toki:', error);
    res.status(500).json({ success: false, message: 'Failed to update toki' });
    return;
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

// ===== ALGORITHM HYPERPARAMETERS =====

router.get('/algorithm', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_pen, updated_by, updated_at
       FROM algorithm_hyperparameters
       ORDER BY updated_at DESC
       LIMIT 1`
    );
    if (result.rows.length === 0) {
      res.json({ success: true, data: { w_hist: 0.2, w_social: 0.15, w_pop: 0.2, w_time: 0.15, w_geo: 0.2, w_novel: 0.1, w_pen: 0.05 } });
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
    const { w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_pen } = req.body || {};
    const weights = [w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_pen].map(Number);
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
      `INSERT INTO algorithm_hyperparameters (w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_pen, updated_by, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [w_hist, w_social, w_pop, w_time, w_geo, w_novel, w_pen, updatedBy]
    );

    res.json({ success: true });
    return;
  } catch (error) {
    console.error('Error updating algorithm weights:', error);
    res.status(500).json({ success: false, message: 'Failed to update algorithm weights' });
    return;
  }
});

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

// ===== ANALYTICS DASHBOARD =====

router.get('/analytics', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { hours = '720' } = req.query; // default 30 days (720 hours)
    const hoursNum = Math.min(Math.max(parseInt(hours as string) || 720, 1), 2160); // Limit 1-2160 hours (90 days)

    // Determine grouping granularity: use hour for <= 72 hours (3 days), day for longer
    const groupByHour = hoursNum <= 72;
    // Use created_at from activity logs (not updated_at from users)
    const dateGroupExpr = groupByHour ? "DATE_TRUNC('hour', created_at)" : "DATE(created_at)";
    const dateGroupExprCreated = groupByHour ? "DATE_TRUNC('hour', created_at)" : "DATE(created_at)";

    // Generate start time
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hoursNum);
    const startTimeStr = startTime.toISOString();

    // 1. Active Users (users who connected via WebSocket per hour or day)
    const activeUsersResult = await pool.query(
      `SELECT 
        ${dateGroupExpr} as date, 
        COUNT(DISTINCT user_id) as count
      FROM user_activity_logs 
      WHERE event_type = 'connect' 
        AND created_at >= $1
      GROUP BY ${dateGroupExpr}
      ORDER BY date ASC`,
      [startTimeStr]
    );

    // 2. Total Accounts (cumulative count from beginning)
    // First get total before start time
    const totalBeforeResult = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE created_at < $1`,
      [startTimeStr]
    );
    const totalBefore = parseInt(totalBeforeResult.rows[0]?.count || '0');
    
    // Then get counts per period and calculate cumulative
    const totalAccountsResult = await pool.query(
      `WITH period_counts AS (
        SELECT ${dateGroupExprCreated} as date, COUNT(*) as count
        FROM users
        WHERE created_at >= $1
        GROUP BY ${dateGroupExprCreated}
      )
      SELECT 
        date,
        $2 + SUM(count) OVER (ORDER BY date) as cumulative_count
      FROM period_counts
      ORDER BY date ASC`,
      [startTimeStr, totalBefore]
    );

    // 3. Unique Logins (actual login events per hour or day)
    const uniqueLoginsResult = await pool.query(
      `SELECT 
        ${dateGroupExpr} as date,
        COUNT(DISTINCT user_id) as count
      FROM user_activity_logs
      WHERE event_type = 'login'
        AND created_at >= $1
      GROUP BY ${dateGroupExpr}
      ORDER BY date ASC`,
      [startTimeStr]
    );

    // 4. Tokis Created (per hour or day)
    const tokisCreatedResult = await pool.query(
      `SELECT 
        ${dateGroupExprCreated} as date,
        COUNT(*) as count
      FROM tokis
      WHERE created_at >= $1
      GROUP BY ${dateGroupExprCreated}
      ORDER BY date ASC`,
      [startTimeStr]
    );

    // Get current summary stats
    // Active Users (last 7 days - users who connected via WebSocket)
    const currentActiveUsersResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as count
       FROM user_activity_logs
       WHERE event_type = 'connect'
         AND created_at >= NOW() - INTERVAL '7 days'`
    );

    const totalAccountsResult2 = await pool.query(
      'SELECT COUNT(*) as count FROM users'
    );

    // Unique Logins Today (actual login events)
    const uniqueLoginsTodayResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as count
       FROM user_activity_logs
       WHERE event_type = 'login'
         AND DATE(created_at) = CURRENT_DATE`
    );

    const tokisCreatedTodayResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM tokis
       WHERE DATE(created_at) = CURRENT_DATE`
    );

    // Build time series data
    const activeUsersMap = new Map(activeUsersResult.rows.map((r: any) => {
      const dateKey = r.date instanceof Date ? r.date.toISOString() : String(r.date);
      return [dateKey, parseInt(r.count)];
    }));
    const totalAccountsMap = new Map(totalAccountsResult.rows.map((r: any) => {
      const dateKey = r.date instanceof Date ? r.date.toISOString() : String(r.date);
      return [dateKey, parseInt(r.cumulative_count)];
    }));
    const uniqueLoginsMap = new Map(uniqueLoginsResult.rows.map((r: any) => {
      const dateKey = r.date instanceof Date ? r.date.toISOString() : String(r.date);
      return [dateKey, parseInt(r.count)];
    }));
    const tokisCreatedMap = new Map(tokisCreatedResult.rows.map((r: any) => {
      const dateKey = r.date instanceof Date ? r.date.toISOString() : String(r.date);
      return [dateKey, parseInt(r.count)];
    }));

    // Get all unique dates/times
    const allDates = new Set<string>();
    [activeUsersResult.rows, totalAccountsResult.rows, uniqueLoginsResult.rows, tokisCreatedResult.rows].forEach(rows => {
      rows.forEach((r: any) => {
        const dateKey = r.date instanceof Date ? r.date.toISOString() : String(r.date);
        allDates.add(dateKey);
      });
    });

    // Fill in missing periods and build time series
    const timeSeries: any[] = [];
    const sortedDates = Array.from(allDates).sort();
    
    // If no data, create empty series for the time range
    if (sortedDates.length === 0) {
      const increment = groupByHour ? 1 : 24; // hours
      for (let i = 0; i < hoursNum; i += increment) {
        const date = new Date(startTime);
        if (groupByHour) {
          date.setHours(date.getHours() + i);
        } else {
          date.setHours(date.getHours() + i);
        }
        const dateStr = date.toISOString();
        timeSeries.push({
          date: dateStr,
          activeUsers: 0,
          totalAccounts: totalBefore,
          uniqueLoginsToday: 0,
          tokisCreatedToday: 0
        });
      }
    } else {
      // Fill gaps in time range
      let lastTotalAccounts = totalBefore;
      for (const dateStr of sortedDates) {
        const activeUsers = activeUsersMap.get(dateStr) || 0;
        const totalAccounts = totalAccountsMap.get(dateStr) || lastTotalAccounts;
        lastTotalAccounts = totalAccounts; // Track cumulative
        const uniqueLoginsToday = uniqueLoginsMap.get(dateStr) || 0;
        const tokisCreatedToday = tokisCreatedMap.get(dateStr) || 0;

        timeSeries.push({
          date: dateStr,
          activeUsers,
          totalAccounts,
          uniqueLoginsToday,
          tokisCreatedToday
        });
      }
    }

    const summary = {
      currentActiveUsers: parseInt(currentActiveUsersResult.rows[0].count),
      totalAccounts: parseInt(totalAccountsResult2.rows[0].count),
      uniqueLoginsToday: parseInt(uniqueLoginsTodayResult.rows[0].count),
      tokisCreatedToday: parseInt(tokisCreatedTodayResult.rows[0].count)
    };

    res.json({
      success: true,
      data: {
        timeSeries,
        summary
      }
    });
    return;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    return;
  }
});

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
    const { sendPushToUsers } = await import('../utils/push');
    
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

// Configure multer for batch upload (50MB limit for zip files)
const batchUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Batch upload preview endpoint
router.post('/tokis/batch/preview', authenticateToken, requireAdmin, batchUpload.single('zipFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No zip file provided'
      });
      return;
    }

    // Extract zip
    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();

    // Find JSON file
    const jsonEntry = entries.find((e: IZipEntry) => 
      e.entryName.toLowerCase().endsWith('.json')
    );

    if (!jsonEntry) {
      res.status(400).json({
        success: false,
        message: 'No JSON file found in zip archive'
      });
      return;
    }

    // Parse JSON
    let jsonContent: any;
    try {
      jsonContent = JSON.parse(jsonEntry.getData().toString('utf8'));
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON file: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
      return;
    }

    const tokis = jsonContent.tokis || [];
    if (!Array.isArray(tokis) || tokis.length === 0) {
      res.status(400).json({
        success: false,
        message: 'JSON file must contain a "tokis" array with at least one toki'
      });
      return;
    }

    // Get default host (logged-in admin user)
    const defaultHostId = req.user!.id;

    // Fix invalid or missing host_ids - first pass: check which host_ids exist
    const allHostIds = [...new Set(tokis.map((t: any) => t.host_id).filter(Boolean))];
    const existingHostIds = new Set<string>();
    
    if (allHostIds.length > 0) {
      try {
        const hostCheckResult = await pool.query(
          'SELECT id FROM users WHERE id = ANY($1)',
          [allHostIds]
        );
        hostCheckResult.rows.forEach((row: any) => {
          existingHostIds.add(row.id);
        });
      } catch (error) {
        logger.warn('Error checking host IDs:', error);
      }
    }

    // Fix tokis with invalid/missing host_ids
    const fixedTokis = tokis.map((t: any) => {
      if (!t.host_id || !existingHostIds.has(t.host_id)) {
        return { ...t, host_id: defaultHostId, _hostFixed: true };
      }
      return t;
    });

    // Collect unique host IDs (including the default)
    const hostIds = [...new Set(fixedTokis.map((t: any) => t.host_id).filter(Boolean))];
    const hostMap = new Map<string, { id: string; name: string; email: string }>();

    // Fetch host information (including default host)
    if (hostIds.length > 0) {
      try {
        const hostResult = await pool.query(
          'SELECT id, name, email FROM users WHERE id = ANY($1)',
          [hostIds]
        );
        hostResult.rows.forEach((row: any) => {
          hostMap.set(row.id, { id: row.id, name: row.name, email: row.email });
        });
      } catch (error) {
        logger.warn('Error fetching host information:', error);
      }
    }

    // Extract images
    const imageMap = new Map<string, Buffer>();
    entries.forEach((entry: IZipEntry) => {
      const ext = entry.entryName.toLowerCase();
      if (ext.endsWith('.jpg') || ext.endsWith('.jpeg') || 
          ext.endsWith('.png') || ext.endsWith('.webp')) {
        const filename = entry.entryName.split('/').pop() || entry.entryName;
        imageMap.set(filename, entry.getData());
      }
    });

    // Match images to tokis and validate (use fixedTokis)
    const matched = matchImagesToTokis(fixedTokis, imageMap);
    const valid: any[] = [];
    const invalid: any[] = [];

    for (let i = 0; i < matched.length; i++) {
      const matchedToki = matched[i];
      const validation = await validateTokiData(matchedToki.toki, imageMap, i);

      // Add warning if host was auto-fixed
      if (matchedToki.toki._hostFixed) {
        const defaultHost = hostMap.get(defaultHostId);
        if (!validation.warnings) {
          validation.warnings = [];
        }
        validation.warnings.push(
          `Host ID was invalid or missing. Using default host: ${defaultHost?.name || 'Current User'}`
        );
      }

      // Create preview data with image data URIs for display
      const previewData: any = {
        ...matchedToki.toki,
        index: i,
        host: hostMap.get(matchedToki.toki.host_id) || { 
          id: matchedToki.toki.host_id, 
          name: 'Unknown User',
          email: ''
        }
      };
      
      // Remove the internal flag from preview data
      delete previewData._hostFixed;

      // Convert first image to data URI for preview
      if (matchedToki.imageBuffer) {
        const mimeType = matchedToki.imageBuffer[0] === 0xFF && matchedToki.imageBuffer[1] === 0xD8
          ? 'image/jpeg'
          : matchedToki.imageBuffer[0] === 0x89
          ? 'image/png'
          : 'image/webp';
        previewData.previewImage = `data:${mimeType};base64,${matchedToki.imageBuffer.toString('base64')}`;
      }

      if (validation.isValid) {
        valid.push({
          index: i,
          toki: previewData,
          validation: {
            status: 'valid' as const,
            warnings: validation.warnings.length > 0 ? validation.warnings : undefined
          }
        });
      } else {
        invalid.push({
          index: i,
          toki: previewData,
          validation: {
            status: 'invalid' as const,
            errors: validation.errors
          }
        });
      }
    }

    res.json({
      success: true,
      preview: {
        valid,
        invalid
      },
      summary: {
        total: fixedTokis.length,
        validCount: valid.length,
        invalidCount: invalid.length
      }
    });
    return;
  } catch (error) {
    logger.error('Batch upload preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process zip file: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
    return;
  }
});

// Batch create endpoint
router.post('/tokis/batch/create', authenticateToken, requireAdmin, batchUpload.single('zipFile'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No zip file provided'
      });
      return;
    }

    // Extract zip (same as preview)
    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();

    const jsonEntry = entries.find((e: IZipEntry) => 
      e.entryName.toLowerCase().endsWith('.json')
    );

    if (!jsonEntry) {
      res.status(400).json({
        success: false,
        message: 'No JSON file found in zip archive'
      });
      return;
    }

    let jsonContent: any;
    try {
      jsonContent = JSON.parse(jsonEntry.getData().toString('utf8'));
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'Invalid JSON file: ' + (error instanceof Error ? error.message : 'Unknown error')
      });
      return;
    }

    const tokis = jsonContent.tokis || [];
    if (!Array.isArray(tokis) || tokis.length === 0) {
      res.status(400).json({
        success: false,
        message: 'JSON file must contain a "tokis" array with at least one toki'
      });
      return;
    }

    // Get default host (logged-in admin user)
    const defaultHostId = req.user!.id;

    // Fix invalid or missing host_ids - first pass: check which host_ids exist
    const allHostIds = [...new Set(tokis.map((t: any) => t.host_id).filter(Boolean))];
    const existingHostIds = new Set<string>();
    
    if (allHostIds.length > 0) {
      try {
        const hostCheckResult = await pool.query(
          'SELECT id FROM users WHERE id = ANY($1)',
          [allHostIds]
        );
        hostCheckResult.rows.forEach((row: any) => {
          existingHostIds.add(row.id);
        });
      } catch (error) {
        logger.warn('Error checking host IDs:', error);
      }
    }

    // Fix tokis with invalid/missing host_ids
    const fixedTokis = tokis.map((t: any) => {
      if (!t.host_id || !existingHostIds.has(t.host_id)) {
        return { ...t, host_id: defaultHostId };
      }
      return t;
    });

    // Extract images
    const imageMap = new Map<string, Buffer>();
    entries.forEach((entry: IZipEntry) => {
      const ext = entry.entryName.toLowerCase();
      if (ext.endsWith('.jpg') || ext.endsWith('.jpeg') || 
          ext.endsWith('.png') || ext.endsWith('.webp')) {
        const filename = entry.entryName.split('/').pop() || entry.entryName;
        imageMap.set(filename, entry.getData());
      }
    });

    // Match and validate (use fixedTokis)
    const matched = matchImagesToTokis(fixedTokis, imageMap);
    const created: any[] = [];
    const failed: any[] = [];

    // Process each toki
    for (let i = 0; i < matched.length; i++) {
      const matchedToki = matched[i];
      const validation = await validateTokiData(matchedToki.toki, imageMap, i);

      if (!validation.isValid) {
        failed.push({
          index: i,
          title: matchedToki.toki.title || 'Untitled',
          error: validation.errors.join('; ')
        });
        continue;
      }

      // Ensure host_id is set (should already be fixed, but double-check)
      if (!matchedToki.toki.host_id) {
        matchedToki.toki.host_id = defaultHostId;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert toki
        const tokiResult = await client.query(
          `INSERT INTO tokis (
            host_id, title, description, location, latitude, longitude,
            time_slot, scheduled_time, max_attendees, category, visibility, external_link, auto_approve, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *`,
          [
            matchedToki.toki.host_id,
            matchedToki.toki.title,
            matchedToki.toki.description || null,
            matchedToki.toki.location,
            matchedToki.toki.latitude || null,
            matchedToki.toki.longitude || null,
            matchedToki.toki.timeSlot,
            matchedToki.toki.scheduledTime || null,
            matchedToki.toki.maxAttendees === null || matchedToki.toki.maxAttendees === undefined 
              ? null 
              : (matchedToki.toki.maxAttendees || 10),
            matchedToki.toki.category,
            matchedToki.toki.visibility || 'public',
            matchedToki.toki.externalLink || null,
            matchedToki.toki.autoApprove || false,
            'active'
          ]
        );

        const toki = tokiResult.rows[0];

        // Insert tags
        if (matchedToki.toki.tags && Array.isArray(matchedToki.toki.tags)) {
          for (const tag of matchedToki.toki.tags) {
            await client.query(
              'INSERT INTO toki_tags (toki_id, tag_name) VALUES ($1, $2)',
              [toki.id, tag]
            );
          }
        }

        // Process images
        const imageUrls: string[] = [];
        const imagePublicIds: string[] = [];

        for (const imageBuffer of matchedToki.imageBuffers) {
          try {
            const uploadResult = await ImageService.uploadTokiImage(String(toki.id), imageBuffer);
            if (uploadResult.success && uploadResult.url && uploadResult.publicId) {
              imageUrls.push(uploadResult.url);
              imagePublicIds.push(uploadResult.publicId);
            } else {
              logger.warn(`Failed to upload image for toki ${toki.id}: ${uploadResult.error}`);
            }
          } catch (error) {
            logger.warn(`Error uploading image for toki ${toki.id}:`, error);
          }
        }

        // Update toki with image URLs
        if (imageUrls.length > 0) {
          await client.query(
            `UPDATE tokis 
             SET image_urls = $1, image_public_ids = $2, updated_at = NOW()
             WHERE id = $3`,
            [imageUrls, imagePublicIds, toki.id]
          );
        }

        await client.query('COMMIT');

        created.push({
          index: i,
          tokiId: toki.id,
          title: toki.title
        });
      } catch (error) {
        await client.query('ROLLBACK');
        logger.error(`Error creating toki at index ${i}:`, error);
        failed.push({
          index: i,
          title: matchedToki.toki.title || 'Untitled',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        client.release();
      }
    }

    res.json({
      success: true,
      results: {
        created,
        failed
      },
      summary: {
        total: tokis.length,
        createdCount: created.length,
        failedCount: failed.length
      }
    });
    return;
  } catch (error) {
    logger.error('Batch create error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process batch creation: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
    return;
  }
});

export default router;
