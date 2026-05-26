import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { IZipEntry } from 'adm-zip';
import { pool } from '../../config/database';
import { authenticateToken } from '../../middleware/auth';
import { generateTokenPair } from '../../utils/jwt';
import { issuePasswordResetToken, PasswordLinkPurpose } from '../../utils/passwordReset';
import logger from '../../utils/logger';
import { validateTokiData, matchImagesToTokis } from '../../utils/batchUploadValidation';
import { ImageService } from '../../services/imageService';
import { geocodingService } from '../../services/geocodingService';
import { invalidateFeatureCache, isEnabled } from '../../services/featureFlags';
import { requireAdmin, requireBoostsEnabled, generateBoostAuthorizationCode, logBoostPurchaseRequestEvent, BOOST_CODE_EXPIRY_HOURS } from './_shared';

const router = Router();

// ===== ANALYTICS DASHBOARD =====

router.get('/analytics', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { hours = '720' } = req.query; // default 30 days (720 hours)
    const hoursNum = Math.min(Math.max(parseInt(hours as string) || 720, 1), 2160); // Limit 1-2160 hours (90 days)

    // Determine grouping granularity: use hour for <= 72 hours (3 days), day for longer
    const groupByHour = hoursNum <= 72;
    // Use created_at from activity logs (not updated_at from users)
    // Granville expression helper
    const getDateGroupExpr = (col: string) => groupByHour ? `DATE_TRUNC('hour', ${col})` : `DATE(${col})`;

    // Generate start time
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hoursNum);
    const startTimeStr = startTime.toISOString();

    // Fetch internal users (marked via is_internal flag) so we can split each
    // time-series metric into a "real" baseline plus one toggleable series per
    // internal account.
    const INTERNAL_USER_PALETTE = [
      '#F97316', '#0EA5E9', '#A855F7', '#14B8A6', '#EAB308',
      '#EF4444', '#22C55E', '#DB2777', '#6366F1', '#84CC16',
    ];
    const internalUsersResult = await pool.query(
      `SELECT id, name, email FROM users WHERE is_internal = TRUE ORDER BY name ASC`
    );
    const internalUsers = internalUsersResult.rows.map((u: any, idx: number) => ({
      id: u.id,
      name: u.name || u.email || u.id,
      color: INTERNAL_USER_PALETTE[idx % INTERNAL_USER_PALETTE.length],
    }));
    const internalUserIds = internalUsers.map((u: any) => u.id);
    const internalKey = (metric: string, userId: string) => `${metric}__internal__${userId}`;

    // Helper to run a per-internal-user breakdown query for any time-series metric.
    // Returns Map<userId, Map<dateKey, count>>.
    const runInternalBreakdown = async (
      sql: string,
      params: any[]
    ): Promise<Map<string, Map<string, number>>> => {
      const out = new Map<string, Map<string, number>>();
      if (internalUserIds.length === 0) return out;
      const result = await pool.query(sql, params);
      for (const row of result.rows) {
        const userId = String(row.user_id);
        const dateKey = row.date instanceof Date ? row.date.toISOString() : String(row.date);
        if (!out.has(userId)) out.set(userId, new Map());
        out.get(userId)!.set(dateKey, parseInt(row.count));
      }
      return out;
    };

    // 1. Active Users (users who connected via WebSocket per hour or day)
    // Real = excludes internal users; internal users get their own series below.
    const activeUsersResult = await pool.query(
      `SELECT
        ${getDateGroupExpr('l.created_at')} as date,
        COUNT(DISTINCT l.user_id) as count
      FROM user_activity_logs l
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.event_type = 'connect'
        AND l.created_at >= $1
        AND COALESCE(u.is_internal, FALSE) = FALSE
      GROUP BY ${getDateGroupExpr('l.created_at')}
      ORDER BY date ASC`,
      [startTimeStr]
    );
    const activeUsersInternal = await runInternalBreakdown(
      `SELECT
        ${getDateGroupExpr('created_at')} as date,
        user_id,
        COUNT(DISTINCT user_id) as count
      FROM user_activity_logs
      WHERE event_type = 'connect'
        AND created_at >= $1
        AND user_id = ANY($2::uuid[])
      GROUP BY ${getDateGroupExpr('created_at')}, user_id
      ORDER BY date ASC`,
      [startTimeStr, internalUserIds]
    );

    // 2. Total Accounts (cumulative count from beginning, excluding internal users)
    // First get total before start time
    const totalBeforeResult = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE created_at < $1 AND COALESCE(is_internal, FALSE) = FALSE`,
      [startTimeStr]
    );
    const totalBefore = parseInt(totalBeforeResult.rows[0]?.count || '0');

    // Then get counts per period and calculate cumulative
    const totalAccountsResult = await pool.query(
      `WITH period_counts AS (
        SELECT ${getDateGroupExpr('created_at')} as date, COUNT(*) as count
        FROM users
        WHERE created_at >= $1 AND COALESCE(is_internal, FALSE) = FALSE
        GROUP BY ${getDateGroupExpr('created_at')}
      )
      SELECT
        date,
        $2 + SUM(count) OVER (ORDER BY date) as cumulative_count
      FROM period_counts
      ORDER BY date ASC`,
      [startTimeStr, totalBefore]
    );

    // 3. Unique Logins (actual login events per hour or day)
    const uniqueLoginsResult = await pool.query(
      `SELECT
        ${getDateGroupExpr('l.created_at')} as date,
        COUNT(DISTINCT l.user_id) as count
      FROM user_activity_logs l
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.event_type = 'login'
        AND l.created_at >= $1
        AND COALESCE(u.is_internal, FALSE) = FALSE
      GROUP BY ${getDateGroupExpr('l.created_at')}
      ORDER BY date ASC`,
      [startTimeStr]
    );
    const uniqueLoginsInternal = await runInternalBreakdown(
      `SELECT
        ${getDateGroupExpr('created_at')} as date,
        user_id,
        COUNT(DISTINCT user_id) as count
      FROM user_activity_logs
      WHERE event_type = 'login'
        AND created_at >= $1
        AND user_id = ANY($2::uuid[])
      GROUP BY ${getDateGroupExpr('created_at')}, user_id
      ORDER BY date ASC`,
      [startTimeStr, internalUserIds]
    );

    // 4. Tokis Created (per hour or day, host_id is creator)
    const tokisCreatedResult = await pool.query(
      `SELECT
        ${getDateGroupExpr('t.created_at')} as date,
        COUNT(*) as count
      FROM tokis t
      LEFT JOIN users u ON u.id = t.host_id
      WHERE t.created_at >= $1
        AND COALESCE(u.is_internal, FALSE) = FALSE
      GROUP BY ${getDateGroupExpr('t.created_at')}
      ORDER BY date ASC`,
      [startTimeStr]
    );
    const tokisCreatedInternal = await runInternalBreakdown(
      `SELECT
        ${getDateGroupExpr('created_at')} as date,
        host_id as user_id,
        COUNT(*) as count
      FROM tokis
      WHERE created_at >= $1
        AND host_id = ANY($2::uuid[])
      GROUP BY ${getDateGroupExpr('created_at')}, host_id
      ORDER BY date ASC`,
      [startTimeStr, internalUserIds]
    );

    // 5. Join Requests (per hour or day)
    const joinRequestsResult = await pool.query(
      `SELECT
        ${getDateGroupExpr('tp.joined_at')} as date,
        COUNT(*) as count
      FROM toki_participants tp
      LEFT JOIN users u ON u.id = tp.user_id
      WHERE tp.joined_at >= $1
        AND COALESCE(u.is_internal, FALSE) = FALSE
      GROUP BY ${getDateGroupExpr('tp.joined_at')}
      ORDER BY date ASC`,
      [startTimeStr]
    );
    const joinRequestsInternal = await runInternalBreakdown(
      `SELECT
        ${getDateGroupExpr('joined_at')} as date,
        user_id,
        COUNT(*) as count
      FROM toki_participants
      WHERE joined_at >= $1
        AND user_id = ANY($2::uuid[])
      GROUP BY ${getDateGroupExpr('joined_at')}, user_id
      ORDER BY date ASC`,
      [startTimeStr, internalUserIds]
    );

    // 6. Total Views (per hour or day). user_id can be NULL for guests; those count as real.
    const totalViewsResult = await pool.query(
      `SELECT
        ${getDateGroupExpr('v.viewed_at')} as date,
        COUNT(*) as count
      FROM toki_views v
      LEFT JOIN users u ON u.id = v.user_id
      WHERE v.viewed_at >= $1
        AND COALESCE(u.is_internal, FALSE) = FALSE
      GROUP BY ${getDateGroupExpr('v.viewed_at')}
      ORDER BY date ASC`,
      [startTimeStr]
    );
    const totalViewsInternal = await runInternalBreakdown(
      `SELECT
        ${getDateGroupExpr('viewed_at')} as date,
        user_id,
        COUNT(*) as count
      FROM toki_views
      WHERE viewed_at >= $1
        AND user_id = ANY($2::uuid[])
      GROUP BY ${getDateGroupExpr('viewed_at')}, user_id
      ORDER BY date ASC`,
      [startTimeStr, internalUserIds]
    );

    // 7. Top 30 Viewed Tokis
    const topViewedTokisResult = await pool.query(
      `SELECT 
        t.id,
        t.title,
        COUNT(v.id) as view_count
      FROM tokis t
      LEFT JOIN toki_views v ON t.id = v.toki_id
      WHERE t.status = 'active'
      GROUP BY t.id, t.title
      ORDER BY view_count DESC
      LIMIT 30`
    );

    // Get current summary stats
    // Active Users (last 7 days - users who connected via WebSocket, excluding internal)
    const currentActiveUsersResult = await pool.query(
      `SELECT COUNT(DISTINCT l.user_id) as count
       FROM user_activity_logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.event_type = 'connect'
         AND l.created_at >= NOW() - INTERVAL '7 days'
         AND COALESCE(u.is_internal, FALSE) = FALSE`
    );

    // Online Users (any activity in last 10 minutes, excluding internal)
    const onlineUsersResult = await pool.query(
      `SELECT COUNT(DISTINCT l.user_id) as count
       FROM user_activity_logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.created_at >= NOW() - INTERVAL '10 minutes'
         AND COALESCE(u.is_internal, FALSE) = FALSE`
    );

    // Platform Distribution (excludes internal users so device share reflects real users only)
    const platformStatsResult = await pool.query(
      `SELECT
         CASE
           WHEN l.device_platform IS NULL OR l.device_platform = '' THEN 'unknown'
           ELSE LOWER(l.device_platform)
         END as platform,
         COUNT(DISTINCT l.user_id) as count
       FROM user_activity_logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.created_at >= NOW() - INTERVAL '30 days'
         AND COALESCE(u.is_internal, FALSE) = FALSE
       GROUP BY platform`
    );

    // Excludes internal users so dev/test activity doesn't skew version distribution.
    const appVersionStatsResult = await pool.query(
      `SELECT
         COALESCE(NULLIF(l.metadata->>'clientVersion', ''), 'unknown') as version,
         COUNT(*) as count
       FROM user_activity_logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.event_type = 'request'
         AND l.path = '/nearby'
         AND l.created_at >= $1
         AND COALESCE(u.is_internal, FALSE) = FALSE
       GROUP BY version
       ORDER BY count DESC, version ASC`,
      [startTimeStr]
    );

    const loginAfterOpenResult = await pool.query(
      `WITH app_opens AS (
         SELECT
           user_id,
           created_at,
           CASE
             WHEN device_platform IS NULL OR device_platform = '' THEN COALESCE(metadata->>'platform', 'unknown')
             ELSE LOWER(device_platform)
           END AS platform
         FROM user_activity_logs
         WHERE event_type = 'frontend_action'
           AND metadata->>'action' = 'app_open'
           AND created_at >= $1
       )
       SELECT
         COUNT(*) AS app_open_count,
         COUNT(*) FILTER (
           WHERE EXISTS (
             SELECT 1
             FROM user_activity_logs login_logs
             WHERE login_logs.user_id = app_opens.user_id
               AND login_logs.event_type = 'login'
               AND login_logs.created_at BETWEEN app_opens.created_at AND app_opens.created_at + INTERVAL '2 minutes'
           )
         ) AS login_after_open_count
       FROM app_opens`,
      [startTimeStr]
    );

    const loginAfterOpenByPlatformResult = await pool.query(
      `WITH app_opens AS (
         SELECT
           user_id,
           created_at,
           CASE
             WHEN device_platform IS NULL OR device_platform = '' THEN COALESCE(metadata->>'platform', 'unknown')
             ELSE LOWER(device_platform)
           END AS platform
         FROM user_activity_logs
         WHERE event_type = 'frontend_action'
           AND metadata->>'action' = 'app_open'
           AND created_at >= $1
       )
       SELECT
         platform,
         COUNT(*) AS app_open_count,
         COUNT(*) FILTER (
           WHERE EXISTS (
             SELECT 1
             FROM user_activity_logs login_logs
             WHERE login_logs.user_id = app_opens.user_id
               AND login_logs.event_type = 'login'
               AND login_logs.created_at BETWEEN app_opens.created_at AND app_opens.created_at + INTERVAL '2 minutes'
           )
         ) AS login_after_open_count
       FROM app_opens
       GROUP BY platform
       ORDER BY platform`,
      [startTimeStr]
    );

    const startupRefreshResult = await pool.query(
      `WITH app_opens AS (
         SELECT user_id, created_at
         FROM user_activity_logs
         WHERE event_type = 'frontend_action'
           AND metadata->>'action' = 'app_open'
           AND created_at >= $1
       ),
       startup_windows AS (
         SELECT
           user_id,
           created_at,
           EXISTS (
             SELECT 1
             FROM user_activity_logs refresh_logs
             WHERE refresh_logs.user_id = app_opens.user_id
               AND refresh_logs.event_type IN ('refresh_success', 'refresh_failure')
               AND refresh_logs.created_at BETWEEN app_opens.created_at AND app_opens.created_at + INTERVAL '2 minutes'
           ) AS attempted,
           EXISTS (
             SELECT 1
             FROM user_activity_logs refresh_logs
             WHERE refresh_logs.user_id = app_opens.user_id
               AND refresh_logs.event_type = 'refresh_success'
               AND refresh_logs.created_at BETWEEN app_opens.created_at AND app_opens.created_at + INTERVAL '2 minutes'
           ) AS succeeded,
           EXISTS (
             SELECT 1
             FROM user_activity_logs refresh_logs
             WHERE refresh_logs.user_id = app_opens.user_id
               AND refresh_logs.event_type = 'refresh_failure'
               AND refresh_logs.created_at BETWEEN app_opens.created_at AND app_opens.created_at + INTERVAL '2 minutes'
           ) AS failed
         FROM app_opens
       )
       SELECT
         COUNT(*) FILTER (WHERE attempted) AS refresh_attempt_count,
         COUNT(*) FILTER (WHERE succeeded) AS refresh_success_count,
         COUNT(*) FILTER (WHERE failed) AS refresh_failure_count
       FROM startup_windows`,
      [startTimeStr]
    );

    const forcedReauthAfterFailureResult = await pool.query(
      `WITH app_opens AS (
         SELECT user_id, created_at
         FROM user_activity_logs
         WHERE event_type = 'frontend_action'
           AND metadata->>'action' = 'app_open'
           AND created_at >= $1
       ),
       refresh_failures AS (
         SELECT refresh_logs.user_id, refresh_logs.created_at
         FROM user_activity_logs refresh_logs
         JOIN app_opens
           ON app_opens.user_id = refresh_logs.user_id
          AND refresh_logs.created_at BETWEEN app_opens.created_at AND app_opens.created_at + INTERVAL '2 minutes'
         WHERE refresh_logs.event_type = 'refresh_failure'
       )
       SELECT
         COUNT(*) AS refresh_failure_count,
         COUNT(*) FILTER (
           WHERE EXISTS (
             SELECT 1
             FROM user_activity_logs login_events
             WHERE login_events.user_id = refresh_failures.user_id
               AND login_events.event_type = 'frontend_action'
               AND login_events.metadata->>'action' = 'login_success'
               AND COALESCE(login_events.metadata->>'source', 'manual_login') = 'startup_reauth'
               AND login_events.created_at BETWEEN refresh_failures.created_at AND refresh_failures.created_at + INTERVAL '2 minutes'
           )
         ) AS forced_reauth_count
       FROM refresh_failures`,
      [startTimeStr]
    );

    // Global Average Session Length (Last 30 days)
    const globalSessionResult = await pool.query(
      `WITH daily_activity AS (
         SELECT 
           user_id,
           DATE(created_at) as active_date,
           MIN(created_at) as first_action,
           MAX(created_at) as last_action
         FROM user_activity_logs
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY user_id, DATE(created_at)
       )
       SELECT AVG(EXTRACT(EPOCH FROM (last_action - first_action))) as avg_seconds
       FROM daily_activity
       WHERE last_action > first_action`
    );

    let avgSessionSeconds = 0;
    if (globalSessionResult.rows.length > 0 && globalSessionResult.rows[0].avg_seconds) {
      avgSessionSeconds = Math.round(parseFloat(globalSessionResult.rows[0].avg_seconds));
    }

    const totalAccountsResult2 = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE COALESCE(is_internal, FALSE) = FALSE) as count,
         COUNT(*) FILTER (WHERE is_internal = TRUE) as internal_count,
         COUNT(*) as total_count
       FROM users`
    );

    // Unique Logins Today (actual login events) - excluding internal users
    const uniqueLoginsTodayResult = await pool.query(
      `SELECT COUNT(DISTINCT l.user_id) as count
       FROM user_activity_logs l
       LEFT JOIN users u ON u.id = l.user_id
       WHERE l.event_type = 'login'
         AND DATE(l.created_at) = CURRENT_DATE
         AND COALESCE(u.is_internal, FALSE) = FALSE`
    );

    const tokisCreatedTodayResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM tokis t
       LEFT JOIN users u ON u.id = t.host_id
       WHERE DATE(t.created_at) = CURRENT_DATE
         AND COALESCE(u.is_internal, FALSE) = FALSE`
    );

    const appOpenCount = parseInt(loginAfterOpenResult.rows[0]?.app_open_count || '0');
    const loginAfterOpenCount = parseInt(loginAfterOpenResult.rows[0]?.login_after_open_count || '0');
    const refreshAttemptCount = parseInt(startupRefreshResult.rows[0]?.refresh_attempt_count || '0');
    const refreshSuccessCount = parseInt(startupRefreshResult.rows[0]?.refresh_success_count || '0');
    const refreshFailureCount = parseInt(startupRefreshResult.rows[0]?.refresh_failure_count || '0');
    const forcedReauthCount = parseInt(forcedReauthAfterFailureResult.rows[0]?.forced_reauth_count || '0');

    const asRate = (numerator: number, denominator: number) => (
      denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(1)) : 0
    );

    // Build time series data
    const activeUsersMap = new Map(activeUsersResult.rows.map((r: any) => {
      const dateKey = r.date instanceof Date ? r.date.toISOString() : String(r.date);
      return [dateKey, parseInt(r.count)];
    }));
    const totalAccountsMap = new Map(totalAccountsResult.rows.map((r: any) => {
      const dateKey = r.date instanceof Date ? r.date.toISOString() : String(r.date);
      return [dateKey, parseInt(r.cumulative_count)];
    }));
    const uniqueLoginsMap = new Map(uniqueLoginsResult.rows.map((r: any) => {
      const dateKey = r.date instanceof Date ? r.date.toISOString() : String(r.date);
      return [dateKey, parseInt(r.count)];
    }));
    const tokisCreatedMap = new Map(tokisCreatedResult.rows.map((r: any) => {
      const dateKey = r.date instanceof Date ? r.date.toISOString() : String(r.date);
      return [dateKey, parseInt(r.count)];
    }));
    const joinRequestsMap = new Map(joinRequestsResult.rows.map((r: any) => {
      const dateKey = r.date instanceof Date ? r.date.toISOString() : String(r.date);
      return [dateKey, parseInt(r.count)];
    }));
    const totalViewsMap = new Map(totalViewsResult.rows.map((r: any) => {
      const dateKey = r.date instanceof Date ? r.date.toISOString() : String(r.date);
      return [dateKey, parseInt(r.count)];
    }));

    // Get all unique dates/times
    const allDates = new Set<string>();
    [activeUsersResult.rows, totalAccountsResult.rows, uniqueLoginsResult.rows, tokisCreatedResult.rows, joinRequestsResult.rows, totalViewsResult.rows].forEach(rows => {
      rows.forEach((r: any) => {
        const dateKey = r.date instanceof Date ? r.date.toISOString() : String(r.date);
        allDates.add(dateKey);
      });
    });

    // Fill in missing periods and build time series
    const timeSeries: any[] = [];
    const sortedDates = Array.from(allDates).sort();

    // Add internal-user breakdown dates to allDates so points exist for those buckets.
    const internalBreakdowns: [string, Map<string, Map<string, number>>][] = [
      ['activeUsers', activeUsersInternal],
      ['uniqueLoginsToday', uniqueLoginsInternal],
      ['tokisCreatedToday', tokisCreatedInternal],
      ['joinRequestsToday', joinRequestsInternal],
      ['totalViewsToday', totalViewsInternal],
    ];
    for (const [, byUser] of internalBreakdowns) {
      for (const dateMap of byUser.values()) {
        for (const dateKey of dateMap.keys()) {
          if (!allDates.has(dateKey)) {
            allDates.add(dateKey);
            sortedDates.push(dateKey);
          }
        }
      }
    }
    sortedDates.sort();

    const buildInternalKeys = (metric: string, dateStr: string, byUser: Map<string, Map<string, number>>) => {
      const out: Record<string, number> = {};
      for (const u of internalUsers) {
        out[internalKey(metric, u.id)] = byUser.get(u.id)?.get(dateStr) || 0;
      }
      return out;
    };

    // If no data, create empty series for the time range
    if (sortedDates.length === 0) {
      const increment = groupByHour ? 1 : 24; // hours
      for (let i = 0; i < hoursNum; i += increment) {
        const date = new Date(startTime);
        if (groupByHour) {
          date.setHours(date.getHours() + i);
        } else {
          date.setHours(date.getHours() + i);
        }
        const dateStr = date.toISOString();
        const emptyRow: any = {
          date: dateStr,
          activeUsers: 0,
          totalAccounts: totalBefore,
          uniqueLoginsToday: 0,
          tokisCreatedToday: 0,
          joinRequestsToday: 0,
          totalViewsToday: 0,
        };
        for (const [metric] of internalBreakdowns) {
          for (const u of internalUsers) emptyRow[internalKey(metric, u.id)] = 0;
        }
        timeSeries.push(emptyRow);
      }
    } else {
      // Fill gaps in time range
      let lastTotalAccounts = totalBefore;
      for (const dateStr of sortedDates) {
        const activeUsers = activeUsersMap.get(dateStr) || 0;
        const totalAccounts = totalAccountsMap.get(dateStr) || lastTotalAccounts;
        lastTotalAccounts = totalAccounts; // Track cumulative
        const uniqueLoginsToday = uniqueLoginsMap.get(dateStr) || 0;
        const tokisCreatedToday = tokisCreatedMap.get(dateStr) || 0;
        const joinRequestsToday = joinRequestsMap.get(dateStr) || 0;
        const totalViewsToday = totalViewsMap.get(dateStr) || 0;

        timeSeries.push({
          date: dateStr,
          activeUsers,
          totalAccounts,
          uniqueLoginsToday,
          tokisCreatedToday,
          joinRequestsToday,
          totalViewsToday,
          ...buildInternalKeys('activeUsers', dateStr, activeUsersInternal),
          ...buildInternalKeys('uniqueLoginsToday', dateStr, uniqueLoginsInternal),
          ...buildInternalKeys('tokisCreatedToday', dateStr, tokisCreatedInternal),
          ...buildInternalKeys('joinRequestsToday', dateStr, joinRequestsInternal),
          ...buildInternalKeys('totalViewsToday', dateStr, totalViewsInternal),
        });
      }
    }

    const summary = {
      currentActiveUsers: parseInt(currentActiveUsersResult.rows[0].count),
      onlineUsers: parseInt(onlineUsersResult.rows[0].count),
      totalAccounts: parseInt(totalAccountsResult2.rows[0].count),
      totalAccountsInternal: parseInt(totalAccountsResult2.rows[0].internal_count || '0'),
      totalAccountsAll: parseInt(totalAccountsResult2.rows[0].total_count || totalAccountsResult2.rows[0].count),
      uniqueLoginsToday: parseInt(uniqueLoginsTodayResult.rows[0].count),
      tokisCreatedToday: parseInt(tokisCreatedTodayResult.rows[0].count),
      averageSessionLength: avgSessionSeconds,
      loginAfterOpenRate: asRate(loginAfterOpenCount, appOpenCount),
      startupRefreshAttemptRate: asRate(refreshAttemptCount, appOpenCount),
      startupRefreshSuccessRate: asRate(refreshSuccessCount, refreshAttemptCount),
      forcedReauthAfterRefreshFailureRate: asRate(forcedReauthCount, refreshFailureCount),
    };

    res.json({
      success: true,
      data: {
        timeSeries,
        summary,
        internalUsers,
        platformStats: platformStatsResult.rows,
        appVersionStats: appVersionStatsResult.rows,
        topViewedTokis: topViewedTokisResult.rows,
        loginFrictionByPlatform: loginAfterOpenByPlatformResult.rows.map((row: any) => {
          const rowAppOpenCount = parseInt(row.app_open_count || '0');
          const rowLoginAfterOpenCount = parseInt(row.login_after_open_count || '0');
          return {
            platform: row.platform,
            appOpenCount: rowAppOpenCount,
            loginAfterOpenCount: rowLoginAfterOpenCount,
            loginAfterOpenRate: asRate(rowLoginAfterOpenCount, rowAppOpenCount),
          };
        }),
      }
    });
    return;
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    return;
  }
});

// Get most active users based on request logs
router.get('/analytics/active-users', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { limit = '10', days = '7' } = req.query;
    const limitNum = parseInt(limit as string) || 10;
    const daysNum = parseInt(days as string) || 7;

    const result = await pool.query(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        COALESCE(u.is_internal, FALSE) as is_internal,
        COUNT(l.id) as request_count,
        ARRAY_AGG(DISTINCT l.device_platform) as platforms,
        MAX(l.created_at) as last_active
      FROM users u
      JOIN user_activity_logs l ON l.user_id = u.id
      WHERE l.event_type = 'request'
        AND l.created_at >= NOW() - ($1 || ' days')::INTERVAL
      GROUP BY u.id
      ORDER BY request_count DESC
      LIMIT $2`,
      [daysNum, limitNum]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching active users:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch active users' });
  }
});

// Toggle is_internal flag for a user. Internal users are split out as their own
// toggleable series in the Analytics dashboard charts so admins can see metrics
// with or without their own dev/test accounts.
router.patch('/users/:id/internal', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isInternal } = req.body as { isInternal?: boolean };
    if (typeof isInternal !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isInternal must be a boolean' });
    }
    const result = await pool.query(
      `UPDATE users SET is_internal = $1 WHERE id = $2 RETURNING id, name, email, is_internal`,
      [isInternal, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating is_internal flag:', error);
    return res.status(500).json({ success: false, message: 'Failed to update internal flag' });
  }
});

// Get detailed activity timeline for a specific user
router.get('/analytics/user-activity/:userId', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = '100' } = req.query;
    const limitNum = parseInt(limit as string) || 100;

    const result = await pool.query(
      `SELECT 
        l.id, 
        l.event_type, 
        l.method, 
        l.path, 
        l.status_code, 
        l.device_platform, 
        l.duration_ms, 
        l.metadata, 
        l.created_at,
        t.title as resource_name
      FROM user_activity_logs l
      LEFT JOIN tokis t ON l.metadata->>'resourceId' = t.id::text 
        AND (l.path LIKE '%/tokis/%' OR l.path LIKE '%/event/%')
      WHERE l.user_id = $1
      ORDER BY l.created_at DESC
      LIMIT $2`,
      [userId, limitNum]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user activity' });
  }
});

// Get aggregated stats for a single user profile (Daniela-style profile stats)
router.get('/analytics/users/:id/stats', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. App Opens (Count of connect events or frontend_action 'app_open')
    const appOpensResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM user_activity_logs 
       WHERE user_id = $1 
         AND (event_type = 'connect' OR (event_type = 'frontend_action' AND metadata->>'action' = 'app_open'))`,
      [id]
    );

    // 2. Active Days
    const activeDaysResult = await pool.query(
      `SELECT COUNT(DISTINCT DATE(created_at)) as count 
       FROM user_activity_logs 
       WHERE user_id = $1`,
      [id]
    );

    // 3. Avg Session Length (Approximated: difference between last activity and first activity per day. 
    // This is a simplified proxy since true sessions are hard to track definitively without explicit start/end markers)
    const sessionResult = await pool.query(
      `WITH daily_activity AS (
         SELECT 
           DATE(created_at) as active_date,
           MIN(created_at) as first_action,
           MAX(created_at) as last_action
         FROM user_activity_logs
         WHERE user_id = $1
         GROUP BY DATE(created_at)
       )
       SELECT AVG(EXTRACT(EPOCH FROM (last_action - first_action))) as avg_seconds
       FROM daily_activity
       WHERE last_action > first_action`,
      [id]
    );

    let avgSessionSeconds = 0;
    if (sessionResult.rows.length > 0 && sessionResult.rows[0].avg_seconds) {
      avgSessionSeconds = Math.round(parseFloat(sessionResult.rows[0].avg_seconds));
    }

    // 4. Event Views (GET requests to /api/tokis/:id or frontend_action 'event_viewed')
    const eventViewsResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM user_activity_logs 
       WHERE user_id = $1 
         AND (
           (method = 'GET' AND path LIKE '/api/tokis/%' AND path NOT LIKE '/api/tokis') OR 
           (event_type = 'frontend_action' AND metadata->>'action' = 'event_viewed')
         )`,
      [id]
    );

    // 5. Event Clicks (Proxy: map taps or similar interactions from frontend events)
    const eventClicksResult = await pool.query(
      `SELECT COUNT(*) as count 
       FROM user_activity_logs 
       WHERE user_id = $1 
         AND event_type = 'frontend_action' 
         AND metadata->>'action' = 'map_tap'`,
      [id]
    );

    // 6. Tokis Created
    const tokisCreatedResult = await pool.query(
      `SELECT COUNT(*) as count FROM tokis WHERE host_id = $1`,
      [id]
    );

    // 7. Tokis Joined
    const tokisJoinedResult = await pool.query(
      `SELECT COUNT(*) as count FROM toki_participants WHERE user_id = $1 AND status = 'approved'`,
      [id]
    );

    // 8. Last Active
    const lastActiveResult = await pool.query(
      `SELECT MAX(created_at) as last_active FROM user_activity_logs WHERE user_id = $1`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        appOpens: parseInt(appOpensResult.rows[0].count),
        activeDays: parseInt(activeDaysResult.rows[0].count),
        avgSessionSeconds: avgSessionSeconds,
        eventViews: parseInt(eventViewsResult.rows[0].count),
        eventClicks: parseInt(eventClicksResult.rows[0].count),
        tokisCreated: parseInt(tokisCreatedResult.rows[0].count),
        tokisJoined: parseInt(tokisJoinedResult.rows[0].count),
        lastActive: lastActiveResult.rows[0].last_active
      }
    });
  } catch (error) {
    console.error('Error fetching single user analytics stats:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user stats' });
  }
});

// Get push notification campaign performance
router.get('/analytics/push-performance', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
         pc.id,
         pc.name,
         pc.sent_count,
         COUNT(ua.id) as open_count,
         CASE 
           WHEN pc.sent_count > 0 THEN ROUND((COUNT(ua.id)::numeric / pc.sent_count::numeric) * 100, 1)
           ELSE 0
         END as open_rate
       FROM push_campaigns pc
       LEFT JOIN user_activity_logs ua 
         ON ua.event_type = 'frontend_action' 
        AND ua.metadata->>'action' = 'push_opened'
        AND ua.metadata->>'campaign_id' = pc.id::text
       GROUP BY pc.id, pc.name, pc.sent_count
       ORDER BY pc.created_at DESC`
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching push performance:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch push performance' });
  }
});

// Get screen interaction analytics
router.get('/analytics/interactions', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string) || 30;

    const result = await pool.query(
      `SELECT 
         metadata->>'action' as action,
         COUNT(*) as count
       FROM user_activity_logs
       WHERE event_type = 'frontend_action'
         AND metadata->>'action' IN ('map_tap', 'event_viewed', 'filter_applied', 'profile_viewed')
         AND created_at >= NOW() - ($1 || ' days')::INTERVAL
       GROUP BY metadata->>'action'
       ORDER BY count DESC`,
      [daysNum]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching screen interactions:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch screen interactions' });
  }
});

export default router;
