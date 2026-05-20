import { Router, Request, Response } from 'express';
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

// ─── GET /:tokiId/realtime ── Real-time visibility data ─────────────────────

router.get('/:tokiId/realtime', authenticateToken, async (req: Request, res: Response) => {
    try {
        const hostId = (req as any).user.id;
        const { tokiId } = req.params;

        // Verify ownership and boost exists
        const tokiResult = await pool.query(
            `SELECT t.id, t.host_id, t.is_boosted, t.active_boost_id, t.title
       FROM tokis t WHERE t.id = $1`,
            [tokiId]
        );

        if (tokiResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Toki not found' });
        }

        if (tokiResult.rows[0].host_id !== hostId) {
            return res.status(403).json({ success: false, message: 'Only the host can view insights' });
        }

        // Get engagement counts grouped by event type
        const engagementResult = await pool.query(
            `SELECT event_type, 
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE is_during_boost = TRUE) as during_boost,
              COUNT(*) FILTER (WHERE is_during_boost = FALSE) as before_boost
       FROM toki_engagement_events
       WHERE toki_id = $1
       GROUP BY event_type`,
            [tokiId]
        );

        const engagement: Record<string, { total: number; duringBoost: number; beforeBoost: number }> = {};
        for (const row of engagementResult.rows) {
            engagement[row.event_type] = {
                total: parseInt(row.total),
                duringBoost: parseInt(row.during_boost),
                beforeBoost: parseInt(row.before_boost),
            };
        }

        // Get active boost info
        let boostInfo = null;
        if (tokiResult.rows[0].active_boost_id) {
            const boostResult = await pool.query(
                `SELECT b.*, bt.display_name as tier_name,
                ba.started_at, ba.ends_at
         FROM boosts b
         JOIN boost_tiers bt ON b.tier_id = bt.id
         LEFT JOIN boost_activations ba ON ba.boost_id = b.id AND ba.status = 'active'
         WHERE b.id = $1`,
                [tokiResult.rows[0].active_boost_id]
            );

            if (boostResult.rows.length > 0) {
                const boost = boostResult.rows[0];
                boostInfo = {
                    tierName: boost.tier_name,
                    status: boost.status,
                    startedAt: boost.started_at,
                    endsAt: boost.ends_at,
                    hoursRemaining: parseFloat(boost.hours_remaining),
                };
            }
        }

        // Get hourly engagement breakdown for the last 24 hours
        const hourlyResult = await pool.query(
            `SELECT 
         date_trunc('hour', created_at) as hour,
         event_type,
         COUNT(*) as count
       FROM toki_engagement_events
       WHERE toki_id = $1 AND created_at >= NOW() - INTERVAL '24 hours'
       GROUP BY date_trunc('hour', created_at), event_type
       ORDER BY hour ASC`,
            [tokiId]
        );

        return res.json({
            success: true,
            data: {
                tokiId,
                tokiTitle: tokiResult.rows[0].title,
                isBoosted: tokiResult.rows[0].is_boosted,
                boost: boostInfo,
                visibility: {
                    views: engagement['view'] || { total: 0, duringBoost: 0, beforeBoost: 0 },
                    opens: engagement['open'] || { total: 0, duringBoost: 0, beforeBoost: 0 },
                    saves: engagement['save'] || { total: 0, duringBoost: 0, beforeBoost: 0 },
                    joinRequests: engagement['join_request'] || { total: 0, duringBoost: 0, beforeBoost: 0 },
                    chatJoins: engagement['chat_join'] || { total: 0, duringBoost: 0, beforeBoost: 0 },
                },
                boostPerformance: {
                    beforeBoost: Object.values(engagement).reduce((sum, e) => sum + e.beforeBoost, 0),
                    duringBoost: Object.values(engagement).reduce((sum, e) => sum + e.duringBoost, 0),
                },
                hourlyBreakdown: hourlyResult.rows,
            },
        });
    } catch (error) {
        logger.error('Error fetching realtime insights:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── GET /:tokiId/conversion ── Conversion report (~30-36h after event) ─────

router.get('/:tokiId/conversion', authenticateToken, async (req: Request, res: Response) => {
    try {
        const hostId = (req as any).user.id;
        const { tokiId } = req.params;

        // Verify ownership
        const tokiResult = await pool.query(
            `SELECT t.id, t.host_id, t.title, t.scheduled_time, t.category
       FROM tokis t WHERE t.id = $1`,
            [tokiId]
        );

        if (tokiResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Toki not found' });
        }

        if (tokiResult.rows[0].host_id !== hostId) {
            return res.status(403).json({ success: false, message: 'Only the host can view insights' });
        }

        // Check if enough time has passed (~30h after event)
        const scheduledTime = tokiResult.rows[0].scheduled_time;
        if (scheduledTime) {
            const hoursSinceEvent = (Date.now() - new Date(scheduledTime).getTime()) / (1000 * 60 * 60);
            if (hoursSinceEvent < 30) {
                return res.json({
                    success: true,
                    data: {
                        tokiId,
                        status: 'pending',
                        message: 'Conversion report will be available ~30-36 hours after the event ends',
                        availableAt: new Date(new Date(scheduledTime).getTime() + 30 * 60 * 60 * 1000).toISOString(),
                    },
                });
            }
        }

        // Get "Did you go?" responses
        const responsesResult = await pool.query(
            `SELECT 
         COUNT(*) as total_responses,
         COUNT(*) FILTER (WHERE response = TRUE) as yes_count,
         COUNT(*) FILTER (WHERE response = FALSE) as no_count
       FROM did_you_go_responses
       WHERE toki_id = $1`,
            [tokiId]
        );

        const responses = responsesResult.rows[0];
        const totalResponses = parseInt(responses.total_responses);
        const yesCount = parseInt(responses.yes_count);
        const conversionRate = totalResponses > 0 ? Math.round((yesCount / totalResponses) * 100) : 0;

        // Get total engaged users (users who had any engagement event)
        const engagedResult = await pool.query(
            `SELECT COUNT(DISTINCT user_id) as engaged_users
       FROM toki_engagement_events
       WHERE toki_id = $1 AND user_id IS NOT NULL`,
            [tokiId]
        );

        const engagedUsers = parseInt(engagedResult.rows[0].engaged_users);

        // Get peak engagement hours
        const peakHoursResult = await pool.query(
            `SELECT 
         EXTRACT(HOUR FROM created_at) as hour,
         COUNT(*) as count
       FROM toki_engagement_events
       WHERE toki_id = $1
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY count DESC
       LIMIT 3`,
            [tokiId]
        );

        // Get interest tags from engaged users (categories they've participated in)
        const interestTagsResult = await pool.query(
            `SELECT t.category, COUNT(*) as count
       FROM toki_participants tp
       JOIN tokis t ON tp.toki_id = t.id
       WHERE tp.user_id IN (
         SELECT DISTINCT user_id FROM toki_engagement_events WHERE toki_id = $1 AND user_id IS NOT NULL
       )
       AND tp.status = 'approved'
       GROUP BY t.category
       ORDER BY count DESC
       LIMIT 5`,
            [tokiId]
        );

        // Compare with host's previous events
        const previousEventsResult = await pool.query(
            `SELECT 
         COUNT(*) as total_events,
         AVG(sub.conversion_rate) as avg_conversion
       FROM (
         SELECT 
           d.toki_id,
           CASE WHEN COUNT(*) > 0 THEN 
             (COUNT(*) FILTER (WHERE d.response = TRUE)::FLOAT / COUNT(*)::FLOAT) * 100
           ELSE 0 END as conversion_rate
         FROM did_you_go_responses d
         JOIN tokis t ON d.toki_id = t.id
         WHERE t.host_id = $1 AND d.toki_id != $2
         GROUP BY d.toki_id
       ) sub`,
            [hostId, tokiId]
        );

        const prevStats = previousEventsResult.rows[0];

        return res.json({
            success: true,
            data: {
                tokiId,
                tokiTitle: tokiResult.rows[0].title,
                status: 'ready',
                conversion: {
                    totalEngagedUsers: engagedUsers,
                    totalResponses,
                    yesCount,
                    noCount: parseInt(responses.no_count),
                    conversionPercentage: conversionRate,
                },
                comparison: {
                    previousEventsCount: parseInt(prevStats.total_events) || 0,
                    previousAvgConversion: prevStats.avg_conversion
                        ? Math.round(parseFloat(prevStats.avg_conversion))
                        : null,
                },
                peakHours: peakHoursResult.rows.map(r => ({
                    hour: parseInt(r.hour),
                    engagementCount: parseInt(r.count),
                })),
                interestTags: interestTagsResult.rows.map(r => ({
                    category: r.category,
                    count: parseInt(r.count),
                })),
            },
        });
    } catch (error) {
        logger.error('Error fetching conversion insights:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── GET /:tokiId/full ── Combined insights ─────────────────────────────────

router.get('/:tokiId/full', authenticateToken, async (req: Request, res: Response) => {
    try {
        // This is a convenience endpoint that aggregates both realtime and conversion
        const hostId = (req as any).user.id;
        const { tokiId } = req.params;

        // Verify ownership
        const tokiResult = await pool.query(
            `SELECT host_id FROM tokis WHERE id = $1`,
            [tokiId]
        );

        if (tokiResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Toki not found' });
        }

        if (tokiResult.rows[0].host_id !== hostId) {
            return res.status(403).json({ success: false, message: 'Only the host can view insights' });
        }

        // Check if this toki has ever been boosted
        const boostCheck = await pool.query(
            `SELECT id FROM boosts WHERE toki_id = $1 LIMIT 1`,
            [tokiId]
        );

        if (boostCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No boost found for this Toki. Insights are available for boosted Tokis only.',
            });
        }

        // Forward to the individual endpoints internally by making the request
        // For simplicity, just combine the queries here
        const [engagementResult, responsesResult] = await Promise.all([
            pool.query(
                `SELECT event_type, COUNT(*) as total,
                COUNT(*) FILTER (WHERE is_during_boost = TRUE) as during_boost
         FROM toki_engagement_events WHERE toki_id = $1 GROUP BY event_type`,
                [tokiId]
            ),
            pool.query(
                `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE response = TRUE) as yes_count
         FROM did_you_go_responses WHERE toki_id = $1`,
                [tokiId]
            ),
        ]);

        const engagement: Record<string, { total: number; duringBoost: number }> = {};
        for (const row of engagementResult.rows) {
            engagement[row.event_type] = {
                total: parseInt(row.total),
                duringBoost: parseInt(row.during_boost),
            };
        }

        const resp = responsesResult.rows[0];

        return res.json({
            success: true,
            data: {
                tokiId,
                visibility: {
                    views: engagement['view']?.total || 0,
                    opens: engagement['open']?.total || 0,
                    saves: engagement['save']?.total || 0,
                    joinRequests: engagement['join_request']?.total || 0,
                    chatJoins: engagement['chat_join']?.total || 0,
                },
                conversion: {
                    totalResponses: parseInt(resp.total),
                    yesCount: parseInt(resp.yes_count),
                    conversionPercentage: parseInt(resp.total) > 0
                        ? Math.round((parseInt(resp.yes_count) / parseInt(resp.total)) * 100)
                        : 0,
                },
            },
        });
    } catch (error) {
        logger.error('Error fetching full insights:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

// ─── POST /:tokiId/track ── Track an engagement event ───────────────────────

router.post('/:tokiId/track', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.id;
        const { tokiId } = req.params;
        const { eventType } = req.body;

        const validEvents = ['view', 'open', 'save', 'join_request', 'chat_join'];
        if (!validEvents.includes(eventType)) {
            return res.status(400).json({ success: false, message: `Invalid event type. Must be one of: ${validEvents.join(', ')}` });
        }

        // Check if toki is currently boosted
        const tokiResult = await pool.query(
            `SELECT is_boosted, active_boost_id FROM tokis WHERE id = $1`,
            [tokiId]
        );

        if (tokiResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Toki not found' });
        }

        const toki = tokiResult.rows[0];

        await pool.query(
            `INSERT INTO toki_engagement_events (toki_id, boost_id, user_id, event_type, is_during_boost)
       VALUES ($1, $2, $3, $4, $5)`,
            [tokiId, toki.active_boost_id || null, userId, eventType, toki.is_boosted]
        );

        return res.json({ success: true });
    } catch (error) {
        logger.error('Error tracking engagement:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
