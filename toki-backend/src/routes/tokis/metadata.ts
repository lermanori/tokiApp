import { Router, Request, Response } from 'express';
import { pool } from '../../config/database';
import { createSystemNotificationAndPush } from '../../utils/notify';
import { sendPushToUsers } from '../../utils/push';
import { authenticateToken, optionalAuth } from '../../middleware/auth';
import { uploadSingleImage, handleUploadError } from '../../middleware/upload';
import { calculateDistance, formatDistance } from '../../utils/distance';
import {
  generateInviteCode,
  deactivateExistingLinks,
  validateInviteLink,
  incrementLinkUsage,
  isUserParticipant,
  addUserToToki
} from '../../utils/inviteLinkUtils';
import { getCategoriesForAPI, CATEGORY_CONFIG } from '../../config/categories';
import logger from '../../utils/logger';
import { ImageService } from '../../services/imageService';
import {
  AlgorithmContext,
  AlgorithmFactory,
  AlgorithmWeights,
  EventData,
} from '../../algorithms';

const router = Router();

router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = getCategoriesForAPI();

    return res.status(200).json({
      success: true,
      data: categories
    });

  } catch (error) {
    logger.error('Get categories error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve categories'
    });
  }
});

// Get popular tags
router.get('/tags/popular', async (req: Request, res: Response) => {
  try {
    const { limit = '20' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 20, 100);

    const result = await pool.query(
      `SELECT 
        tt.tag_name,
        COUNT(*) as usage_count
      FROM toki_tags tt
      JOIN tokis t ON tt.toki_id = t.id
      WHERE t.status = 'active'
      GROUP BY tt.tag_name
      ORDER BY usage_count DESC
      LIMIT $1`,
      [limitNum]
    );

    const popularTags = result.rows.map(row => ({
      name: row.tag_name,
      count: parseInt(row.usage_count)
    }));

    return res.status(200).json({
      success: true,
      data: popularTags
    });

  } catch (error) {
    console.error('Get popular tags error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve popular tags'
    });
  }
});

// Search tags
router.get('/tags/search', async (req: Request, res: Response) => {
  try {
    const { q, limit = '10' } = req.query;
    const limitNum = Math.min(parseInt(limit as string) || 10, 50);

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Search query required',
        message: 'Please provide a search query'
      });
    }

    const result = await pool.query(
      `SELECT DISTINCT tt.tag_name
      FROM toki_tags tt
      JOIN tokis t ON tt.toki_id = t.id
      WHERE t.status = 'active' 
        AND tt.tag_name ILIKE $1
      ORDER BY tt.tag_name
      LIMIT $2`,
      [`%${q}%`, limitNum]
    );

    const tags = result.rows.map(row => row.tag_name);

    return res.status(200).json({
      success: true,
      data: tags
    });

  } catch (error) {
    logger.error('Search tags error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to search tags'
    });
  }
});

// Get all Tokis with filtering and pagination

export default router;
