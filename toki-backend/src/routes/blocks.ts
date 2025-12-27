import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { sendEmail } from '../utils/email';

const router = Router();

// Block a user
router.post('/users/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const blockerId = (req as any).user.id;

    if (blockerId === userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot block yourself'
      });
    }

    // Check if user is already blocked
    const existingBlock = await pool.query(
      'SELECT id FROM user_blocks WHERE blocker_id = $1 AND blocked_user_id = $2',
      [blockerId, userId]
    );

    if (existingBlock.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User is already blocked'
      });
    }

    // Get user details for email notification
    const blockerResult = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [blockerId]
    );
    const blockedUserResult = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [userId]
    );

    if (blockerResult.rows.length === 0 || blockedUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const blocker = blockerResult.rows[0];
    const blockedUser = blockedUserResult.rows[0];

    // Create block
    const blockResult = await pool.query(
      'INSERT INTO user_blocks (blocker_id, blocked_user_id, reason) VALUES ($1, $2, $3) RETURNING id, created_at',
      [blockerId, userId, reason]
    );

    const block = blockResult.rows[0];

    // Send email notification to admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SUPPORT_EMAIL;
    if (adminEmail) {
      try {
        // Try Resend API first (if configured)
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        
        const emailSubject = '🚫 User Block Notification - Toki App';
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #EF4444;">🚫 User Block Notification</h2>
            
            <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px; margin: 20px 0;">
              <p style="margin: 0;"><strong>A user has been blocked on the Toki platform</strong></p>
            </div>
            
            <h3 style="color: #333;">Block Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 12px 0; font-weight: bold; width: 40%;">Blocker:</td>
                <td style="padding: 12px 0;">${blocker.name} (ID: ${blocker.id})</td>
              </tr>
              <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 12px 0; font-weight: bold;">Blocker Email:</td>
                <td style="padding: 12px 0;">${blocker.email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 12px 0; font-weight: bold;">Blocked User:</td>
                <td style="padding: 12px 0;">${blockedUser.name} (ID: ${blockedUser.id})</td>
              </tr>
              <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 12px 0; font-weight: bold;">Blocked User Email:</td>
                <td style="padding: 12px 0;">${blockedUser.email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 12px 0; font-weight: bold;">Reason:</td>
                <td style="padding: 12px 0;">${reason || 'No reason provided'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #E5E7EB;">
                <td style="padding: 12px 0; font-weight: bold;">Timestamp:</td>
                <td style="padding: 12px 0;">${new Date(block.created_at).toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' })}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; font-weight: bold;">Block ID:</td>
                <td style="padding: 12px 0;">${block.id}</td>
              </tr>
            </table>
            
            <div style="background-color: #F3F4F6; padding: 16px; margin: 20px 0; border-radius: 8px;">
              <h4 style="margin-top: 0; color: #333;">Actions Taken:</h4>
              <ul style="margin: 8px 0; padding-left: 20px; color: #666;">
                <li>User ${blockedUser.name} has been blocked by ${blocker.name}</li>
                <li>All content from ${blockedUser.name} is now hidden from ${blocker.name}</li>
                <li>Direct messaging between these users is now prevented</li>
                <li>Connection has been automatically removed (if existed)</li>
              </ul>
            </div>
            
            <div style="background-color: #FFF9E6; border-left: 4px solid #F59E0B; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #92400E;">
                <strong>⚠️ Review Required:</strong> Please review this block in the admin panel to determine if further action is needed.
              </p>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
            <p style="color: #9CA3AF; font-size: 12px;">
              This is an automated notification from the Toki platform. 
              Login to the admin panel to review details and take action if needed.
            </p>
          </div>
        `;
        
        if (RESEND_API_KEY) {
          // Use Resend API (preferred for production)
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "admin@toki-app.com",
              to: adminEmail,
              subject: emailSubject,
              html: emailHtml,
            }),
          });
          
          if (resendResponse.ok) {
            console.log(`📧 Block notification sent to admin via Resend: ${adminEmail}`);
          } else {
            console.error('📧 Resend email failed, falling back to SMTP');
            // Fallback to SMTP
            await sendEmail({
              to: adminEmail,
              subject: emailSubject,
              html: emailHtml,
            });
          }
        } else {
          // Use SMTP (development/fallback)
          await sendEmail({
            to: adminEmail,
            subject: emailSubject,
            html: emailHtml,
          });
        }
      } catch (emailError) {
        // Don't fail the block operation if email fails
        console.error('📧 Failed to send block notification email:', emailError);
      }
    } else {
      console.warn('⚠️ No admin email configured for block notifications');
    }

    // Log block action for admin panel
    try {
      // Check if admin_logs table exists before trying to insert
      await pool.query(
        `INSERT INTO admin_logs (action_type, admin_id, target_id, target_type, details, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          'user_block',
          blockerId, // Not actually an admin, but the user who initiated the block
          userId,
          'user',
          JSON.stringify({
            blocker_name: blocker.name,
            blocked_user_name: blockedUser.name,
            reason: reason || 'No reason provided',
            block_id: block.id
          })
        ]
      );
    } catch (logError: any) {
      // Don't fail if logging fails (table might not exist yet)
      if (logError.code === '42P01') {
        // Table doesn't exist - that's okay, it will be created by migration
        console.warn('⚠️ admin_logs table does not exist yet. Run database migration to enable logging.');
      } else {
        console.error('Failed to create admin log entry:', logError);
      }
    }

    // Instead of deleting connections, we'll filter them out in the queries
    // This preserves the connection history and allows restoration when unblocking
    // The existing blocking filters in the connection routes will handle visibility

    return res.json({
      success: true,
      message: 'User blocked successfully. Their content has been removed from your feed.'
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to block user'
    });
  }
});

// Unblock a user
router.delete('/users/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const blockerId = (req as any).user.id;

    const result = await pool.query(
      'DELETE FROM user_blocks WHERE blocker_id = $1 AND blocked_user_id = $2',
      [blockerId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Block not found'
      });
    }

    // Note: Connections are now preserved when blocking/unblocking
    // They will automatically become visible again since the blocking filters
    // in the connection routes will no longer exclude this user

    return res.json({
      success: true,
      message: 'User unblocked successfully'
    });
  } catch (error) {
    console.error('Error unblocking user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to unblock user'
    });
  }
});

// Get blocked users
router.get('/blocked-users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const blockedUsersQuery = `
      SELECT 
        ub.id,
        ub.reason,
        ub.created_at,
        u.id as blocked_user_id,
        u.name as blocked_user_name,
        u.avatar_url as blocked_user_avatar,
        u.bio as blocked_user_bio
      FROM user_blocks ub
      JOIN users u ON ub.blocked_user_id = u.id
      WHERE ub.blocker_id = $1
      ORDER BY ub.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const blockedUsersResult = await pool.query(blockedUsersQuery, [userId, limit, offset]);

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM user_blocks WHERE blocker_id = $1';
    const countResult = await pool.query(countQuery, [userId]);

    res.json({
      success: true,
      data: {
        blockedUsers: blockedUsersResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch blocked users'
    });
  }
});

// Check if a user is blocked
router.get('/check/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const currentUserId = (req as any).user.id;

    // Check if current user has blocked the target user
    const blockedByMe = await pool.query(
      'SELECT id FROM user_blocks WHERE blocker_id = $1 AND blocked_user_id = $2',
      [currentUserId, userId]
    );

    // Check if current user is blocked by the target user
    const blockedByThem = await pool.query(
      'SELECT id FROM user_blocks WHERE blocker_id = $1 AND blocked_user_id = $2',
      [userId, currentUserId]
    );

    res.json({
      success: true,
      data: {
        blockedByMe: blockedByMe.rows.length > 0,
        blockedByThem: blockedByThem.rows.length > 0,
        canInteract: blockedByMe.rows.length === 0 && blockedByThem.rows.length === 0
      }
    });
  } catch (error) {
    console.error('Error checking block status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check block status'
    });
  }
});

// Get users who have blocked the current user
router.get('/blocked-by', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const blockedByQuery = `
      SELECT 
        ub.id,
        ub.reason,
        ub.created_at,
        u.id as blocker_id,
        u.name as blocker_name,
        u.avatar_url as blocker_avatar
      FROM user_blocks ub
      JOIN users u ON ub.blocker_id = u.id
      WHERE ub.blocked_user_id = $1
      ORDER BY ub.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const blockedByResult = await pool.query(blockedByQuery, [userId, limit, offset]);

    // Get total count
    const countQuery = 'SELECT COUNT(*) FROM user_blocks WHERE blocked_user_id = $1';
    const countResult = await pool.query(countQuery, [userId]);

    res.json({
      success: true,
      data: {
        blockedBy: blockedByResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users who blocked me:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users who blocked you'
    });
  }
});

export default router; 