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

// Get single user
router.get('/users/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, email, name, role, verified, location, created_at, invitation_credits FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, data: result.rows[0] });
    return;
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
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
        const txt = await resp.text().catch(() => '');
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

export default router;
