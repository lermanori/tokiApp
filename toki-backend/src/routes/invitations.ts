import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// Generate unique invitation code
function generateInvitationCode(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Send invitation (requires authentication)
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Valid email is required'
      });
    }

    // Check user's invitation credits
    const userResult = await pool.query(
      'SELECT invitation_credits FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const credits = userResult.rows[0].invitation_credits || 0;
    if (credits <= 0) {
      return res.status(403).json({
        success: false,
        message: 'You have no invitation credits remaining'
      });
    }

    // Check if email already has an active invitation
    const existingInvitation = await pool.query(
      `SELECT id FROM invitations 
       WHERE invitee_email = $1 AND status = 'pending' 
       AND (expires_at IS NULL OR expires_at > NOW())`,
      [email.toLowerCase()]
    );

    if (existingInvitation.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An active invitation already exists for this email'
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Create invitation
    const invitationCode = generateInvitationCode();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    const invitationResult = await pool.query(
      `INSERT INTO invitations (inviter_id, invitee_email, invitation_code, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, invitation_code, expires_at, created_at`,
      [userId, email.toLowerCase(), invitationCode, expiresAt]
    );

    // Decrement invitation credits
    await pool.query(
      'UPDATE users SET invitation_credits = invitation_credits - 1 WHERE id = $1',
      [userId]
    );

    // Send invitation email
    const inviteLink = `${process.env.FRONTEND_URL || 'https://toki-app.com'}/register?invite=${invitationCode}`;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (RESEND_API_KEY) {
      const inviterResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
      const inviterName = inviterResult.rows[0]?.name || 'Someone';
      
      const subject = "You're invited to join Toki 🎉";
      const text = `Hey,\n\n${inviterName} has invited you to join Toki!\n\nUse this link to create your account (expires in 30 days):\n\n${inviteLink}\n\n—\nToki`;
      
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

    return res.json({
      success: true,
      data: {
        invitation: invitationResult.rows[0],
        remainingCredits: credits - 1
      }
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send invitation'
    });
  }
});

// Get user's invitations
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { status } = req.query;

    let query = `
      SELECT 
        i.id,
        i.invitee_email,
        i.invitation_code,
        i.status,
        i.created_at,
        i.expires_at,
        i.accepted_at,
        u.name as accepted_user_name
      FROM invitations i
      LEFT JOIN users u ON i.accepted_user_id = u.id
      WHERE i.inviter_id = $1
    `;
    const params: any[] = [userId];

    if (status) {
      query += ` AND i.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY i.created_at DESC`;

    const result = await pool.query(query, params);

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch invitations'
    });
  }
});

// Validate invitation code (public endpoint)
router.get('/validate/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const result = await pool.query(
      `SELECT 
        i.id,
        i.invitee_email,
        i.expires_at,
        i.status,
        u.name as inviter_name
      FROM invitations i
      JOIN users u ON i.inviter_id = u.id
      WHERE i.invitation_code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid invitation code'
      });
    }

    const invitation = result.rows[0];

    // Check if expired
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      await pool.query(
        'UPDATE invitations SET status = $1 WHERE id = $2',
        ['expired', invitation.id]
      );
      return res.status(400).json({
        success: false,
        message: 'This invitation has expired'
      });
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'This invitation has already been used'
      });
    }

    return res.json({
      success: true,
      data: {
        email: invitation.invitee_email,
        inviterName: invitation.inviter_name,
        expiresAt: invitation.expires_at
      }
    });
  } catch (error) {
    console.error('Error validating invitation:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to validate invitation'
    });
  }
});

// Get user's invitation credits
router.get('/credits', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const result = await pool.query(
      'SELECT invitation_credits FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      data: {
        credits: result.rows[0].invitation_credits || 0
      }
    });
  } catch (error) {
    console.error('Error fetching credits:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch invitation credits'
    });
  }
});

export default router;

