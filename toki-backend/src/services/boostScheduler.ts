import { pool } from '../config/database';
import logger from '../utils/logger';

// ─── Boost Expiration Check ─────────────────────────────────────────────────
// Runs every 5 minutes. Deactivates boosts whose active hours have elapsed.

async function checkBoostExpirations(): Promise<void> {
    try {
        // Find active activations that have passed their end time
        const expiredActivations = await pool.query(
            `SELECT ba.id, ba.boost_id, ba.toki_id, ba.hours_allocated,
              b.host_id, b.hours_remaining, bt.is_splittable
       FROM boost_activations ba
       JOIN boosts b ON ba.boost_id = b.id
       JOIN boost_tiers bt ON b.tier_id = bt.id
       WHERE ba.status = 'active' AND ba.ends_at <= NOW()`
        );

        for (const activation of expiredActivations.rows) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Mark activation as completed
                await client.query(
                    `UPDATE boost_activations SET status = 'completed', actual_end_at = NOW() WHERE id = $1`,
                    [activation.id]
                );

                // Update boost hours
                const newHoursUsed = parseFloat(activation.hours_allocated);
                const newRemaining = Math.max(0, parseFloat(activation.hours_remaining) - newHoursUsed);

                const newStatus = newRemaining <= 0 ? 'completed' : (activation.is_splittable ? 'paused' : 'completed');

                await client.query(
                    `UPDATE boosts
           SET hours_used = hours_used + $1, hours_remaining = $2,
               status = $3, completed_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE NULL END,
               updated_at = NOW()
           WHERE id = $4`,
                    [newHoursUsed, newRemaining, newStatus, activation.boost_id]
                );

                // Remove boost flag from toki
                await client.query(
                    `UPDATE tokis SET is_boosted = FALSE, active_boost_id = NULL, updated_at = NOW() WHERE id = $1`,
                    [activation.toki_id]
                );

                await client.query('COMMIT');

                logger.info(`⏰ Boost activation ${activation.id} expired for toki ${activation.toki_id}`);
            } catch (error) {
                await client.query('ROLLBACK');
                logger.error(`Error expiring boost activation ${activation.id}:`, error);
            } finally {
                client.release();
            }
        }

        // Also expire Pro Pack boosts past their 30-day validity window
        const expiredProPacks = await pool.query(
            `UPDATE boosts SET status = 'expired', updated_at = NOW()
       WHERE status IN ('purchased', 'paused') AND expires_at IS NOT NULL AND expires_at <= NOW()
       RETURNING id`
        );

        if (expiredProPacks.rowCount && expiredProPacks.rowCount > 0) {
            logger.info(`⏰ Expired ${expiredProPacks.rowCount} Pro Pack boosts`);
        }
    } catch (error) {
        logger.error('Error checking boost expirations:', error);
    }
}

// ─── "Did You Go?" Prompt Scheduler ──────────────────────────────────────────
// Runs every 30 minutes. Creates survey prompts ~24h after event ends for engaged users.

async function createDidYouGoPrompts(): Promise<void> {
    try {
        // Find boosted tokis whose event ended 20-28 hours ago and haven't been prompted yet
        const eligibleTokis = await pool.query(
            `SELECT DISTINCT t.id as toki_id
       FROM tokis t
       JOIN boosts b ON b.toki_id = t.id
       WHERE t.scheduled_time IS NOT NULL
         AND t.scheduled_time <= NOW() - INTERVAL '20 hours'
         AND t.scheduled_time >= NOW() - INTERVAL '28 hours'
         AND NOT EXISTS (
           SELECT 1 FROM did_you_go_prompts p WHERE p.toki_id = t.id
         )`
        );

        for (const toki of eligibleTokis.rows) {
            // Find engaged users (anyone who opened, saved, requested, or joined chat)
            const engagedUsers = await pool.query(
                `SELECT DISTINCT user_id
         FROM toki_engagement_events
         WHERE toki_id = $1
           AND user_id IS NOT NULL
           AND event_type IN ('open', 'save', 'join_request', 'chat_join')`,
                [toki.toki_id]
            );

            // Also include approved participants
            const participants = await pool.query(
                `SELECT DISTINCT user_id
         FROM toki_participants
         WHERE toki_id = $1 AND status = 'approved'`,
                [toki.toki_id]
            );

            // Combine and deduplicate users
            const userIds = new Set<string>();
            for (const row of engagedUsers.rows) userIds.add(row.user_id);
            for (const row of participants.rows) userIds.add(row.user_id);

            // Exclude the host
            const hostResult = await pool.query(
                'SELECT host_id FROM tokis WHERE id = $1',
                [toki.toki_id]
            );

            if (hostResult.rows.length > 0) {
                userIds.delete(hostResult.rows[0].host_id);
            }

            // Create prompts with 48h expiry
            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

            for (const userId of userIds) {
                try {
                    await pool.query(
                        `INSERT INTO did_you_go_prompts (toki_id, user_id, status, expires_at)
             VALUES ($1, $2, 'pending', $3)
             ON CONFLICT (toki_id, user_id) DO NOTHING`,
                        [toki.toki_id, userId, expiresAt]
                    );
                } catch (err) {
                    // Ignore duplicate errors
                }
            }

            if (userIds.size > 0) {
                logger.info(`📋 Created ${userIds.size} "Did you go?" prompts for toki ${toki.toki_id}`);
            }
        }

        // Expire old prompts (older than 48h)
        await pool.query(
            `UPDATE did_you_go_prompts SET status = 'expired'
       WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at <= NOW()`
        );
    } catch (error) {
        logger.error('Error creating did-you-go prompts:', error);
    }
}

// ─── Start the scheduler ─────────────────────────────────────────────────────

export function startBoostScheduler(): void {
    logger.info('🚀 Starting boost scheduler...');

    // Check boost expirations every 5 minutes
    setInterval(checkBoostExpirations, 5 * 60 * 1000);

    // Create "Did you go?" prompts every 30 minutes
    setInterval(createDidYouGoPrompts, 30 * 60 * 1000);

    // Run initial checks after a short delay
    setTimeout(() => {
        checkBoostExpirations();
        createDidYouGoPrompts();
    }, 10_000);

    logger.info('✅ Boost scheduler started (expiration: 5min, did-you-go: 30min)');
}
