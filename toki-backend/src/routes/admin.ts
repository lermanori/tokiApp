import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { generateTokenPair } from '../utils/jwt';

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

// Get all reported messages with pagination
router.get('/reports', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', status = 'pending' } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);
    const offset = (pageNum - 1) * limitNum;

    // Get reported messages with context
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
        reporter.name as reporter_name,
        reporter.id as reporter_id,
        CASE 
          WHEN m.conversation_id IS NOT NULL THEN 'conversation'
          WHEN m.toki_id IS NOT NULL THEN 'toki_group'
          ELSE 'unknown'
        END as message_type,
        m.conversation_id,
        m.toki_id,
        reviewer.name as reviewer_name
      FROM message_reports mr
      JOIN messages m ON mr.message_id = m.id
      JOIN users sender ON m.sender_id = sender.id
      JOIN users reporter ON mr.reporter_id = reporter.id
      LEFT JOIN users reviewer ON mr.reviewed_by = reviewer.id
      WHERE mr.status = $1
      ORDER BY mr.reported_at DESC
      LIMIT $2 OFFSET $3`,
      [status, limitNum, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM message_reports WHERE status = $1`,
      [status]
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

// Create user from waitlist entry
router.post('/waitlist/:id/user', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, password, sendWelcomeEmail = true } = req.body;

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

    // Send welcome email if requested
    if (sendWelcomeEmail) {
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
      SELECT id, email, name, role, verified, location, created_at
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
    const { email, name, password, role = 'user', bio, location, verified } = req.body;
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
    await pool.query('INSERT INTO user_stats (user_id) VALUES ($1)', [ins.rows[0].id]);
    res.json({ success: true, data: ins.rows[0] });
    return;
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Failed to create user' });
    return;
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
export default router;
