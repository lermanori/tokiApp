import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Middleware to check if user is admin
const requireAdmin = async (req: Request, res: Response, next: () => void) => {
  try {
    const userId = req.user!.id;
    
    // Check if user has admin role (you can add a role field to users table later)
    // For now, let's use a simple check - you can modify this based on your needs
    const userResult = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // TODO: Add proper admin role checking
    // For now, allow any authenticated user to access admin routes
    // In production, you should implement proper role-based access control
    
    next();
    return; // Add explicit return after next()
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
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

export default router;
