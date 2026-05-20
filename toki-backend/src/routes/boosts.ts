import { Router, Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';
import { isEnabled } from '../services/featureFlags';

const router = Router();

router.use(async (_req: Request, res: Response, next) => {
  if (!(await isEnabled('boosts'))) {
    res.status(404).json({ success: false, message: 'Feature disabled' });
    return;
  }
  next();
});

const OPEN_PURCHASE_REQUEST_STATUSES = ['pending_code', 'code_issued'] as const;
const CODE_EXPIRY_HOURS = 72;

const serializePurchaseRequest = (row: any) => ({
  id: row.id,
  tierId: row.tier_id,
  tierName: row.tier_name,
  tierSlug: row.tier_slug,
  tokiId: row.toki_id,
  tokiTitle: row.toki_title,
  hostId: row.host_id,
  paymentAmount: parseFloat(row.payment_amount),
  paymentCurrency: row.payment_currency,
  totalHours: row.total_hours,
  isSplittable: row.is_splittable,
  validityDays: row.validity_days,
  status: row.status,
  codeStatus: row.status === 'code_issued' ? 'ready' : row.status,
  codeGeneratedAt: row.code_generated_at,
  codeExpiresAt: row.code_expires_at,
  codeRedeemedAt: row.code_redeemed_at,
  redeemedAt: row.redeemed_at,
  boostId: row.boost_id,
  generatedByAdminId: row.generated_by_admin_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const logPurchaseRequestEvent = async (
  client: PoolClient,
  requestId: string,
  actorType: 'host' | 'admin' | 'system',
  actorId: string | null,
  action: string,
  details: Record<string, unknown> = {}
) => {
  await client.query(
    `INSERT INTO boost_purchase_request_events (request_id, actor_type, actor_id, action, details)
     VALUES ($1, $2, $3, $4, $5)`,
    [requestId, actorType, actorId, action, JSON.stringify(details)]
  );
};

const getTierById = async (client: PoolClient, tierId: string) => {
  const tierResult = await client.query(
    `SELECT id, name, display_name, price_ils, total_hours, description, is_splittable, validity_days
     FROM boost_tiers
     WHERE id = $1`,
    [tierId]
  );

  return tierResult.rows[0] || null;
};

const verifyOwnedToki = async (client: PoolClient, tokiId: string, hostId: string) => {
  const tokiResult = await client.query(
    `SELECT id, host_id, title
     FROM tokis
     WHERE id = $1`,
    [tokiId]
  );

  if (tokiResult.rows.length === 0) {
    return { error: { status: 404, message: 'Toki not found' } };
  }

  if (tokiResult.rows[0].host_id !== hostId) {
    return { error: { status: 403, message: 'You can only boost your own Tokis' } };
  }

  return { toki: tokiResult.rows[0] };
};

const createBoostFromPurchaseRequest = async (client: PoolClient, requestRow: any, tierRow: any) => {
  const expiresAt = tierRow.is_splittable && tierRow.validity_days
    ? new Date(Date.now() + tierRow.validity_days * 24 * 60 * 60 * 1000)
    : null;

  const boostResult = await client.query(
    `INSERT INTO boosts (
       tier_id, toki_id, host_id, total_hours, hours_remaining,
       payment_method, payment_reference, payment_amount, payment_currency,
       status, expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      requestRow.tier_id,
      requestRow.toki_id || null,
      requestRow.host_id,
      tierRow.total_hours,
      tierRow.total_hours,
      'manual_code',
      `purchase_request:${requestRow.id}`,
      requestRow.payment_amount,
      requestRow.payment_currency,
      'purchased',
      expiresAt,
    ]
  );

  return boostResult.rows[0];
};

const getPurchaseRequestBaseQuery = () => `
  SELECT
    bpr.*,
    bt.name AS tier_slug,
    bt.display_name AS tier_name,
    bt.total_hours,
    bt.is_splittable,
    bt.validity_days,
    t.title AS toki_title
  FROM boost_purchase_requests bpr
  JOIN boost_tiers bt ON bt.id = bpr.tier_id
  LEFT JOIN tokis t ON t.id = bpr.toki_id
`;

const createOrResumePurchaseRequest = async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const hostId = (req as any).user.id;
    const { tierId, tokiId } = req.body;

    if (!tierId) {
      return res.status(400).json({ success: false, message: 'tierId is required' });
    }

    await client.query('BEGIN');

    const tier = await getTierById(client, tierId);
    if (!tier) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Boost tier not found' });
    }

    if (!tier.is_splittable && !tokiId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'tokiId is required for this tier' });
    }

    if (tokiId) {
      const ownership = await verifyOwnedToki(client, tokiId, hostId);
      if (ownership.error) {
        await client.query('ROLLBACK');
        return res.status(ownership.error.status).json({ success: false, message: ownership.error.message });
      }
    }

    const existingResult = await client.query(
      `${getPurchaseRequestBaseQuery()}
       WHERE bpr.host_id = $1
         AND bpr.tier_id = $2
         AND bpr.toki_id IS NOT DISTINCT FROM $3
         AND bpr.status = ANY($4::text[])
       ORDER BY bpr.created_at DESC
       LIMIT 1
       FOR UPDATE OF bpr`,
      [hostId, tierId, tokiId || null, [...OPEN_PURCHASE_REQUEST_STATUSES]]
    );

    const existingRequest = existingResult.rows[0] || null;

    if (
      existingRequest &&
      existingRequest.status === 'code_issued' &&
      existingRequest.code_expires_at &&
      new Date(existingRequest.code_expires_at) < new Date()
    ) {
      await client.query(
        `UPDATE boost_purchase_requests
         SET status = 'expired', updated_at = NOW()
         WHERE id = $1`,
        [existingRequest.id]
      );
      await logPurchaseRequestEvent(client, existingRequest.id, 'system', null, 'request_expired', {
        reason: 'code_expired_before_resume',
      });
    } else if (existingRequest) {
      await client.query('COMMIT');
      return res.json({
        success: true,
        message: 'Purchase request resumed',
        data: serializePurchaseRequest(existingRequest),
      });
    }

    const requestResult = await client.query(
      `INSERT INTO boost_purchase_requests (
         tier_id, toki_id, host_id, payment_amount, payment_currency, status
       )
       VALUES ($1, $2, $3, $4, $5, 'pending_code')
       RETURNING *`,
      [tier.id, tokiId || null, hostId, tier.price_ils, 'ILS']
    );

    const requestRow = requestResult.rows[0];
    await logPurchaseRequestEvent(client, requestRow.id, 'host', hostId, 'request_created', {
      tierId: tier.id,
      tokiId: tokiId || null,
    });

    const hydratedResult = await client.query(
      `${getPurchaseRequestBaseQuery()}
       WHERE bpr.id = $1`,
      [requestRow.id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Purchase request created',
      data: serializePurchaseRequest(hydratedResult.rows[0]),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error creating boost purchase request:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
};

router.get('/tiers', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, display_name, price_ils, total_hours,
              description, is_splittable, validity_days, sort_order
       FROM boost_tiers
       ORDER BY sort_order ASC`
    );

    return res.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        priceILS: parseFloat(row.price_ils),
        totalHours: row.total_hours,
        description: row.description,
        isSplittable: row.is_splittable,
        validityDays: row.validity_days,
      })),
    });
  } catch (error) {
    logger.error('Error fetching boost tiers:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/purchase', authenticateToken, createOrResumePurchaseRequest);
router.post('/purchase-requests', authenticateToken, createOrResumePurchaseRequest);

router.get('/purchase-requests/my', authenticateToken, async (req: Request, res: Response) => {
  try {
    const hostId = (req as any).user.id;
    const tokiId = typeof req.query.tokiId === 'string' ? req.query.tokiId : null;

    const params: any[] = [hostId];
    let whereClause = 'WHERE bpr.host_id = $1';

    if (tokiId) {
      params.push(tokiId);
      whereClause += ` AND bpr.toki_id = $${params.length}`;
    }

    const result = await pool.query(
      `${getPurchaseRequestBaseQuery()}
       ${whereClause}
       ORDER BY bpr.created_at DESC`,
      params
    );

    return res.json({
      success: true,
      data: result.rows.map((row) => serializePurchaseRequest(row)),
    });
  } catch (error) {
    logger.error('Error fetching boost purchase requests:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/purchase-requests/:requestId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const hostId = (req as any).user.id;
    const { requestId } = req.params;

    const result = await pool.query(
      `${getPurchaseRequestBaseQuery()}
       WHERE bpr.id = $1 AND bpr.host_id = $2`,
      [requestId, hostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase request not found' });
    }

    return res.json({
      success: true,
      data: serializePurchaseRequest(result.rows[0]),
    });
  } catch (error) {
    logger.error('Error fetching boost purchase request detail:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/purchase-requests/:requestId/redeem', authenticateToken, async (req: Request, res: Response) => {
  const client = await pool.connect();

  try {
    const hostId = (req as any).user.id;
    const { requestId } = req.params;
    const normalizedCode = typeof req.body?.code === 'string' ? req.body.code.trim().toUpperCase() : '';

    if (!normalizedCode) {
      return res.status(400).json({ success: false, message: 'code is required' });
    }

    await client.query('BEGIN');

    const requestResult = await client.query(
      `${getPurchaseRequestBaseQuery()}
       WHERE bpr.id = $1 AND bpr.host_id = $2
       FOR UPDATE OF bpr`,
      [requestId, hostId]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Purchase request not found' });
    }

    const requestRow = requestResult.rows[0];

    if (requestRow.status === 'approved' && requestRow.boost_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This purchase request has already been approved' });
    }

    if (requestRow.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This purchase request was cancelled' });
    }

    if (requestRow.status === 'expired') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'This purchase request has expired' });
    }

    if (!requestRow.authorization_code || requestRow.status !== 'code_issued') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'No active authorization code has been issued yet' });
    }

    if (requestRow.code_expires_at && new Date(requestRow.code_expires_at) < new Date()) {
      await client.query(
        `UPDATE boost_purchase_requests
         SET status = 'expired', updated_at = NOW()
         WHERE id = $1`,
        [requestId]
      );
      await logPurchaseRequestEvent(client, requestId, 'system', null, 'request_expired', {
        reason: 'code_expired_before_redeem',
      });
      await client.query('COMMIT');
      return res.status(400).json({ success: false, message: 'This authorization code has expired' });
    }

    if (requestRow.authorization_code !== normalizedCode) {
      await logPurchaseRequestEvent(client, requestId, 'host', hostId, 'redeem_failed', {
        reason: 'invalid_code',
      });
      await client.query('COMMIT');
      return res.status(400).json({ success: false, message: 'Invalid authorization code' });
    }

    const boost = await createBoostFromPurchaseRequest(client, requestRow, requestRow);

    await client.query(
      `UPDATE boost_purchase_requests
       SET status = 'approved',
           boost_id = $1,
           redeemed_at = NOW(),
           code_redeemed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [boost.id, requestId]
    );

    await logPurchaseRequestEvent(client, requestId, 'host', hostId, 'redeemed', {
      boostId: boost.id,
    });

    const hydratedResult = await client.query(
      `${getPurchaseRequestBaseQuery()}
       WHERE bpr.id = $1`,
      [requestId]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Authorization code accepted',
      data: {
        request: serializePurchaseRequest(hydratedResult.rows[0]),
        boost: {
          id: boost.id,
          tierId: boost.tier_id,
          tokiId: boost.toki_id,
          totalHours: boost.total_hours,
          hoursRemaining: parseFloat(boost.hours_remaining),
          status: boost.status,
          paymentCurrency: boost.payment_currency,
          paymentAmount: parseFloat(boost.payment_amount),
          expiresAt: boost.expires_at,
          createdAt: boost.created_at,
        },
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error redeeming boost purchase code:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

router.post('/:boostId/activate', authenticateToken, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const hostId = (req as any).user.id;
    const { boostId } = req.params;
    const { tokiId, hours } = req.body;

    await client.query('BEGIN');

    const boostResult = await client.query(
      `SELECT b.*, bt.is_splittable, bt.display_name as tier_name
       FROM boosts b
       JOIN boost_tiers bt ON b.tier_id = bt.id
       WHERE b.id = $1 AND b.host_id = $2
       FOR UPDATE`,
      [boostId, hostId]
    );

    if (boostResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Boost not found or not owned by you' });
    }

    const boost = boostResult.rows[0];

    if (!['purchased', 'paused'].includes(boost.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot activate boost with status "${boost.status}"`,
      });
    }

    if (boost.expires_at && new Date(boost.expires_at) < new Date()) {
      await client.query(
        `UPDATE boosts SET status = 'expired', updated_at = NOW() WHERE id = $1`,
        [boostId]
      );
      await client.query('COMMIT');
      return res.status(400).json({ success: false, message: 'Pro Pack has expired (30-day window passed)' });
    }

    const targetTokiId = tokiId || boost.toki_id;
    if (!targetTokiId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'tokiId is required for Pro Pack activation' });
    }

    const tokiCheck = await client.query(
      `SELECT id, host_id, is_boosted, active_boost_id
       FROM tokis
       WHERE id = $1
       FOR UPDATE`,
      [targetTokiId]
    );

    if (tokiCheck.rows.length === 0 || tokiCheck.rows[0].host_id !== hostId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'You can only boost your own Tokis' });
    }

    if (
      tokiCheck.rows[0].is_boosted &&
      tokiCheck.rows[0].active_boost_id &&
      tokiCheck.rows[0].active_boost_id !== boostId
    ) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This Toki already has an active boost',
      });
    }

    const activeActivationResult = await client.query(
      `SELECT id
       FROM boost_activations
       WHERE boost_id = $1 AND status = 'active'
       LIMIT 1`,
      [boostId]
    );

    if (activeActivationResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This boost is already active',
      });
    }

    const numericRemaining = parseFloat(boost.hours_remaining);
    const requestedHours = Number(hours);
    const hoursToActivate = boost.is_splittable
      ? Math.min(
        Number.isFinite(requestedHours) && requestedHours > 0 ? requestedHours : numericRemaining,
        numericRemaining
      )
      : numericRemaining;

    if (hoursToActivate <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'No hours remaining' });
    }

    const endsAt = new Date(Date.now() + hoursToActivate * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO boost_activations (boost_id, toki_id, hours_allocated, started_at, ends_at, status)
       VALUES ($1, $2, $3, NOW(), $4, 'active')`,
      [boostId, targetTokiId, hoursToActivate, endsAt]
    );

    await client.query(
      `UPDATE boosts
       SET status = 'active', toki_id = $1, activated_at = COALESCE(activated_at, NOW()), updated_at = NOW()
       WHERE id = $2`,
      [targetTokiId, boostId]
    );

    await client.query(
      `UPDATE tokis SET is_boosted = TRUE, active_boost_id = $1, updated_at = NOW() WHERE id = $2`,
      [boostId, targetTokiId]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Boost activated successfully',
      data: {
        boostId,
        tokiId: targetTokiId,
        hoursActivated: hoursToActivate,
        endsAt: endsAt.toISOString(),
        hoursRemaining: parseFloat(boost.hours_remaining) - hoursToActivate,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error activating boost:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

router.post('/:boostId/deactivate', authenticateToken, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const hostId = (req as any).user.id;
    const { boostId } = req.params;

    await client.query('BEGIN');

    const boostResult = await client.query(
      `SELECT b.*, bt.is_splittable
       FROM boosts b
       JOIN boost_tiers bt ON b.tier_id = bt.id
       WHERE b.id = $1 AND b.host_id = $2 AND b.status = 'active'
       FOR UPDATE`,
      [boostId, hostId]
    );

    if (boostResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Active boost not found' });
    }

    const boost = boostResult.rows[0];

    const activationResult = await client.query(
      `SELECT *
       FROM boost_activations
       WHERE boost_id = $1 AND status = 'active'
       ORDER BY started_at DESC
       LIMIT 1
       FOR UPDATE`,
      [boostId]
    );

    if (activationResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Active boost session not found' });
    }

    const activation = activationResult.rows[0];
    const now = new Date();
    const hoursAllocated = parseFloat(activation.hours_allocated);
    const elapsedHours = (now.getTime() - new Date(activation.started_at).getTime()) / (1000 * 60 * 60);
    const hoursUsedThisSession = Math.min(hoursAllocated, Math.max(0, elapsedHours));
    const hoursRefunded = Math.max(0, hoursAllocated - hoursUsedThisSession);

    await client.query(
      `UPDATE boost_activations SET status = 'cancelled', actual_end_at = NOW() WHERE id = $1`,
      [activation.id]
    );

    const currentHoursUsed = parseFloat(boost.hours_used);
    const currentHoursRemaining = parseFloat(boost.hours_remaining);
    const newHoursUsed = boost.is_splittable
      ? currentHoursUsed + hoursUsedThisSession
      : currentHoursUsed + hoursAllocated;
    const newHoursRemaining = boost.is_splittable
      ? Math.max(0, currentHoursRemaining - hoursUsedThisSession)
      : 0;
    const newStatus = boost.is_splittable && newHoursRemaining > 0 ? 'paused' : 'completed';

    await client.query(
      `UPDATE boosts
       SET status = $1, hours_used = $2, hours_remaining = $3,
           completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $4`,
      [newStatus, newHoursUsed, newHoursRemaining, boostId]
    );

    if (boost.toki_id) {
      await client.query(
        `UPDATE tokis SET is_boosted = FALSE, active_boost_id = NULL, updated_at = NOW() WHERE id = $1`,
        [boost.toki_id]
      );
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: `Boost ${newStatus}`,
      data: {
        boostId,
        status: newStatus,
        hoursRefunded: Math.round(hoursRefunded * 100) / 100,
        hoursUsedThisSession: Math.round(hoursUsedThisSession * 100) / 100,
        hoursRemaining: Math.round(newHoursRemaining * 100) / 100,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error deactivating boost:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    client.release();
  }
});

router.get('/my-boosts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const hostId = (req as any).user.id;

    const result = await pool.query(
      `SELECT b.*, bt.display_name as tier_name, bt.name as tier_slug, bt.is_splittable,
              t.title as toki_title
       FROM boosts b
       JOIN boost_tiers bt ON b.tier_id = bt.id
       LEFT JOIN tokis t ON b.toki_id = t.id
       WHERE b.host_id = $1
       ORDER BY b.created_at DESC`,
      [hostId]
    );

    const boosts = result.rows.map((row) => ({
      id: row.id,
      tierName: row.tier_name,
      tierSlug: row.tier_slug,
      tokiId: row.toki_id,
      tokiTitle: row.toki_title,
      totalHours: row.total_hours,
      hoursUsed: parseFloat(row.hours_used),
      hoursRemaining: parseFloat(row.hours_remaining),
      status: row.status,
      isSplittable: row.is_splittable,
      paymentAmount: parseFloat(row.payment_amount),
      paymentCurrency: row.payment_currency,
      activatedAt: row.activated_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    }));

    return res.json({ success: true, data: boosts });
  } catch (error) {
    logger.error('Error fetching user boosts:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:boostId/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const hostId = (req as any).user.id;
    const { boostId } = req.params;

    const result = await pool.query(
      `SELECT b.*, bt.display_name as tier_name, bt.name as tier_slug, bt.is_splittable,
              t.title as toki_title
       FROM boosts b
       JOIN boost_tiers bt ON b.tier_id = bt.id
       LEFT JOIN tokis t ON b.toki_id = t.id
       WHERE b.id = $1 AND b.host_id = $2`,
      [boostId, hostId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Boost not found' });
    }

    const boost = result.rows[0];

    const activationResult = await pool.query(
      `SELECT *
       FROM boost_activations
       WHERE boost_id = $1 AND status = 'active'
       ORDER BY started_at DESC
       LIMIT 1`,
      [boostId]
    );

    const activeActivation = activationResult.rows[0] || null;
    const recentActivationsResult = await pool.query(
      `SELECT id, toki_id, hours_allocated, started_at, ends_at, actual_end_at, status
       FROM boost_activations
       WHERE boost_id = $1
       ORDER BY started_at DESC
       LIMIT 5`,
      [boostId]
    );

    return res.json({
      success: true,
      data: {
        id: boost.id,
        tierName: boost.tier_name,
        tierSlug: boost.tier_slug,
        tokiId: boost.toki_id,
        tokiTitle: boost.toki_title,
        totalHours: boost.total_hours,
        hoursUsed: parseFloat(boost.hours_used),
        hoursRemaining: parseFloat(boost.hours_remaining),
        status: boost.status,
        isSplittable: boost.is_splittable,
        paymentAmount: parseFloat(boost.payment_amount),
        paymentCurrency: boost.payment_currency,
        activatedAt: boost.activated_at,
        expiresAt: boost.expires_at,
        createdAt: boost.created_at,
        activeActivation: activeActivation ? {
          id: activeActivation.id,
          hoursAllocated: parseFloat(activeActivation.hours_allocated),
          startedAt: activeActivation.started_at,
          endsAt: activeActivation.ends_at,
        } : null,
        recentActivations: recentActivationsResult.rows.map((row) => ({
          id: row.id,
          tokiId: row.toki_id,
          hoursAllocated: parseFloat(row.hours_allocated),
          startedAt: row.started_at,
          endsAt: row.ends_at,
          actualEndAt: row.actual_end_at,
          status: row.status,
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching boost status:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
