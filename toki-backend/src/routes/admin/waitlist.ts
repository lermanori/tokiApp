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

export default router;
