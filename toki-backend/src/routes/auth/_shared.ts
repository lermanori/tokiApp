import { pool } from '../../config/database';
import logger from '../../utils/logger';

// Current Terms of Use version - update this when terms are updated
export const CURRENT_TERMS_VERSION = '2025-12-27';

export const logAuthActivity = async (
  userId: string,
  eventType: 'login' | 'refresh_success' | 'refresh_failure',
  metadata?: Record<string, any>,
) => {
  try {
    await pool.query(
      'INSERT INTO user_activity_logs (user_id, event_type, metadata) VALUES ($1, $2, $3)',
      [userId, eventType, metadata ? JSON.stringify(metadata) : null],
    );
  } catch (error) {
    logger.error(`Error logging ${eventType} event:`, error);
  }
};
