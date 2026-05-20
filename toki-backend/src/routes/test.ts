import { Router } from 'express';
import { pool } from '../config/database';
import { revokeAccessTokensForUser, revokeRefreshTokensForUser } from '../lib/tokenRevocation';

const router = Router();

// All routes here are mounted only when ENABLE_E2E_TEST_ROUTES=1.
// They MUST NOT ship to production.

router.post('/auth/expire-access-tokens-for-user', async (req, res) => {
  const email: unknown = req.body?.email;

  if (typeof email !== 'string' || email.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'email (string) is required',
    });
  }

  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const userId = result.rows[0].id as string;
    revokeAccessTokensForUser(userId);

    return res.json({
      success: true,
      data: { userId, revokedAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error('[TEST] expire-access-tokens-for-user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal error',
    });
  }
});

router.post('/auth/expire-refresh-tokens-for-user', async (req, res) => {
  const email: unknown = req.body?.email;

  if (typeof email !== 'string' || email.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'email (string) is required',
    });
  }

  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const userId = result.rows[0].id as string;
    revokeRefreshTokensForUser(userId);

    return res.json({
      success: true,
      data: { userId, revokedAt: new Date().toISOString() },
    });
  } catch (error) {
    console.error('[TEST] expire-refresh-tokens-for-user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal error',
    });
  }
});

export default router;
