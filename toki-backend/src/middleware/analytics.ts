import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import logger from '../utils/logger';

export const analyticsMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Keep original end method
    const originalEnd = res.end;

    // Intercept response finish
    res.end = function (this: Response, chunk?: any, encoding?: any, callback?: any): Response {
        const duration = Date.now() - start;

        // Call original end
        const result = originalEnd.call(this, chunk, encoding, callback);

        // Log asynchronously to avoid blocking the response
        logRequest(req, res, duration).catch(err => {
            logger.error('📊 [ANALYTICS] Error logging request:', err);
        });

        return result;
    } as any;

    next();
};

async function logRequest(req: Request, res: Response, duration: number) {
    const userId = req.user?.id;
    if (!userId) return; // Only log authenticated user requests for now (as requested: "which user is doing that")

    const method = req.method;
    const path = req.path;
    const statusCode = res.statusCode;

    // Platform detection
    const userAgent = req.headers['user-agent'] || '';
    const xPlatform = req.headers['x-platform'] || req.headers['expo-platform'] || '';

    let platform = 'web';
    if (xPlatform) {
        platform = String(xPlatform).toLowerCase();
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iOS')) {
        platform = 'ios';
    } else if (userAgent.includes('Android')) {
        platform = 'android';
    } else if (userAgent.includes('Expo') || userAgent.includes('Dalvik')) {
        platform = 'mobile';
    }

    // Optional metadata (could be extended)
    const metadata = {
        query: req.query,
        // We could add more here, but keep it light
    };

    try {
        await pool.query(
            `INSERT INTO user_activity_logs (
        user_id, event_type, method, path, status_code, device_platform, duration_ms, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [userId, 'request', method, path, statusCode, platform, duration, JSON.stringify(metadata)]
        );
    } catch (error) {
        // Already caught by the caller
        throw error;
    }
}
