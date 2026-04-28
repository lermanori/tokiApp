import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// ─── GET /tiers ── List all boost tiers (public) ───────────────────────────

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
            data: result.rows.map(row => ({
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

// ─── POST /purchase ── Purchase a boost ─────────────────────────────────────

router.post('/purchase', authenticateToken, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const hostId = (req as any).user.id;
        const { tierId, tokiId, paymentReference, paymentAmount, paymentCurrency } = req.body;

        if (!tierId) {
            return res.status(400).json({ success: false, message: 'tierId is required' });
        }

        // Get the tier
        const tierResult = await client.query(
            'SELECT * FROM boost_tiers WHERE id = $1',
            [tierId]
        );

        if (tierResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Boost tier not found' });
        }

        const tier = tierResult.rows[0];

        // If tokiId is provided, verify the user owns the toki
        if (tokiId) {
            const tokiResult = await client.query(
                'SELECT host_id FROM tokis WHERE id = $1',
                [tokiId]
            );

            if (tokiResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Toki not found' });
            }

            if (tokiResult.rows[0].host_id !== hostId) {
                return res.status(403).json({ success: false, message: 'You can only boost your own Tokis' });
            }
        }

        await client.query('BEGIN');

        // Calculate expiration for Pro Pack (30-day validity window)
        const expiresAt = tier.is_splittable && tier.validity_days
            ? new Date(Date.now() + tier.validity_days * 24 * 60 * 60 * 1000)
            : null;

        // Create the boost record
        const boostResult = await client.query(
            `INSERT INTO boosts (tier_id, toki_id, host_id, total_hours, hours_remaining,
                           payment_method, payment_reference, payment_amount, payment_currency,
                           status, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
            [
                tierId,
                tokiId || null,
                hostId,
                tier.total_hours,
                tier.total_hours,
                'manual',
                paymentReference || null,
                paymentAmount || tier.price_ils,
                paymentCurrency || 'ILS',
                'purchased',
                expiresAt,
            ]
        );

        await client.query('COMMIT');

        const boost = boostResult.rows[0];

        return res.status(201).json({
            success: true,
            message: 'Boost purchased successfully',
            data: {
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
        });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Error purchasing boost:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        client.release();
    }
});

// ─── POST /:boostId/activate ── Activate boost hours ────────────────────────

router.post('/:boostId/activate', authenticateToken, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const hostId = (req as any).user.id;
        const { boostId } = req.params;
        const { tokiId, hours } = req.body;

        // Get the boost
        const boostResult = await client.query(
            `SELECT b.*, bt.is_splittable, bt.display_name as tier_name
       FROM boosts b
       JOIN boost_tiers bt ON b.tier_id = bt.id
       WHERE b.id = $1 AND b.host_id = $2`,
            [boostId, hostId]
        );

        if (boostResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Boost not found or not owned by you' });
        }

        const boost = boostResult.rows[0];

        // Check boost is purchasable/pausable state
        if (!['purchased', 'paused'].includes(boost.status)) {
            return res.status(400).json({
                success: false,
                message: `Cannot activate boost with status "${boost.status}"`,
            });
        }

        // Check Pro Pack hasn't expired
        if (boost.expires_at && new Date(boost.expires_at) < new Date()) {
            await client.query('UPDATE boosts SET status = $1, updated_at = NOW() WHERE id = $2', ['expired', boostId]);
            return res.status(400).json({ success: false, message: 'Pro Pack has expired (30-day window passed)' });
        }

        // Determine which toki to boost
        const targetTokiId = tokiId || boost.toki_id;
        if (!targetTokiId) {
            return res.status(400).json({ success: false, message: 'tokiId is required for Pro Pack activation' });
        }

        // Verify ownership
        const tokiCheck = await client.query('SELECT host_id FROM tokis WHERE id = $1', [targetTokiId]);
        if (tokiCheck.rows.length === 0 || tokiCheck.rows[0].host_id !== hostId) {
            return res.status(403).json({ success: false, message: 'You can only boost your own Tokis' });
        }

        // Determine hours to activate
        const hoursToActivate = boost.is_splittable
            ? Math.min(hours || parseFloat(boost.hours_remaining), parseFloat(boost.hours_remaining))
            : parseFloat(boost.hours_remaining);

        if (hoursToActivate <= 0) {
            return res.status(400).json({ success: false, message: 'No hours remaining' });
        }

        const endsAt = new Date(Date.now() + hoursToActivate * 60 * 60 * 1000);

        await client.query('BEGIN');

        // Create activation record
        await client.query(
            `INSERT INTO boost_activations (boost_id, toki_id, hours_allocated, started_at, ends_at, status)
       VALUES ($1, $2, $3, NOW(), $4, 'active')`,
            [boostId, targetTokiId, hoursToActivate, endsAt]
        );

        // Update boost
        await client.query(
            `UPDATE boosts
       SET status = 'active', toki_id = $1, activated_at = COALESCE(activated_at, NOW()), updated_at = NOW()
       WHERE id = $2`,
            [targetTokiId, boostId]
        );

        // Mark the toki as boosted
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

// ─── POST /:boostId/deactivate ── Manually pause a boost ───────────────────

router.post('/:boostId/deactivate', authenticateToken, async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
        const hostId = (req as any).user.id;
        const { boostId } = req.params;

        const boostResult = await client.query(
            `SELECT b.*, bt.is_splittable
       FROM boosts b
       JOIN boost_tiers bt ON b.tier_id = bt.id
       WHERE b.id = $1 AND b.host_id = $2 AND b.status = 'active'`,
            [boostId, hostId]
        );

        if (boostResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Active boost not found' });
        }

        const boost = boostResult.rows[0];

        await client.query('BEGIN');

        // Find the current active activation and calculate remaining hours
        const activationResult = await client.query(
            `SELECT * FROM boost_activations
       WHERE boost_id = $1 AND status = 'active'
       ORDER BY started_at DESC LIMIT 1`,
            [boostId]
        );

        let hoursRefunded = 0;
        if (activationResult.rows.length > 0) {
            const activation = activationResult.rows[0];
            const now = new Date();
            const hoursUsed = (now.getTime() - new Date(activation.started_at).getTime()) / (1000 * 60 * 60);
            hoursRefunded = Math.max(0, parseFloat(activation.hours_allocated) - hoursUsed);

            await client.query(
                `UPDATE boost_activations SET status = 'cancelled', actual_end_at = NOW() WHERE id = $1`,
                [activation.id]
            );
        }

        // Update boost: return unused hours if splittable
        const newHoursUsed = parseFloat(boost.hours_used) + (parseFloat(boost.hours_remaining) - hoursRefunded > 0
            ? parseFloat(boost.hours_remaining) - hoursRefunded
            : 0);

        const newStatus = boost.is_splittable ? 'paused' : 'completed';

        await client.query(
            `UPDATE boosts
       SET status = $1, hours_used = $2, hours_remaining = $3, updated_at = NOW()
       WHERE id = $4`,
            [newStatus, newHoursUsed, hoursRefunded, boostId]
        );

        // Remove boost flag from toki
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

// ─── GET /:boostId/status ── Get boost status ───────────────────────────────

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

        // Get active activation if any
        const activationResult = await pool.query(
            `SELECT * FROM boost_activations
       WHERE boost_id = $1 AND status = 'active'
       ORDER BY started_at DESC LIMIT 1`,
            [boostId]
        );

        const activeActivation = activationResult.rows[0] || null;

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
            },
        });
    } catch (error) {
        logger.error('Error fetching boost status:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── GET /my-boosts ── List all boosts for the host ─────────────────────────

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

        const boosts = result.rows.map(row => ({
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

export default router;
