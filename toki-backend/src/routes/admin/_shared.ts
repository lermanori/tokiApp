import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { pool } from '../../config/database';
import { isEnabled } from '../../services/featureFlags';

export const BOOST_CODE_EXPIRY_HOURS = 72;

// Middleware to check if user is admin
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

export const requireBoostsEnabled = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!(await isEnabled('boosts'))) {
    res.status(404).json({ success: false, message: 'Feature disabled' });
    return;
  }
  next();
};

export const generateBoostAuthorizationCode = () => {
  const token = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `BOOST-${token}`;
};

export const logBoostPurchaseRequestEvent = async (
  executor: { query: (text: string, params?: any[]) => Promise<any> },
  requestId: string,
  actorType: 'host' | 'admin' | 'system',
  actorId: string | null,
  action: string,
  details: Record<string, unknown> = {}
) => {
  await executor.query(
    `INSERT INTO boost_purchase_request_events (request_id, actor_type, actor_id, action, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [requestId, actorType, actorId, action, JSON.stringify(details)]
  );
};
