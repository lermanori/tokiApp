import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Submit a new rating
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { ratedUserId, tokiId, rating, reviewText } = req.body;
    const raterId = (req as any).user.id;

    // Validate required fields
    if (!ratedUserId || !tokiId || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'ratedUserId, tokiId, and rating are required'
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rating',
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if user is trying to rate themselves
    if (raterId === ratedUserId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rating',
        message: 'Users cannot rate themselves'
      });
    }

    // Check if Toki exists and is active or completed
    const tokiResult = await pool.query(
      'SELECT id, host_id, status FROM tokis WHERE id = $1',
      [tokiId]
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    // Allow ratings for active Tokis (hosts rating participants) or completed Tokis
    if (tokiResult.rows[0].status !== 'active' && tokiResult.rows[0].status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Toki not available',
        message: 'You can only rate users for active or completed Tokis'
      });
    }

    // Check if user participated in this Toki OR is the host
    const participationResult = await pool.query(
      'SELECT id FROM toki_participants WHERE toki_id = $1 AND user_id = $2 AND status IN ($3, $4)',
      [tokiId, raterId, 'joined', 'approved']
    );

    // Also check if user is the host of this Toki
    const hostResult = await pool.query(
      'SELECT id FROM tokis WHERE id = $1 AND host_id = $2',
      [tokiId, raterId]
    );

    if (participationResult.rows.length === 0 && hostResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only rate users if you participated in this Toki or are the host'
      });
    }

    // Check if rating already exists
    const existingRatingResult = await pool.query(
      'SELECT id FROM user_ratings WHERE rater_id = $1 AND rated_user_id = $2 AND toki_id = $3',
      [raterId, ratedUserId, tokiId]
    );

    if (existingRatingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Rating already exists',
        message: 'You have already rated this user for this Toki'
      });
    }

    // Insert the rating
    const result = await pool.query(
      `INSERT INTO user_ratings (rater_id, rated_user_id, toki_id, rating, review_text)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [raterId, ratedUserId, tokiId, rating, reviewText || null]
    );

    console.log(`✅ Rating submitted: ${raterId} rated ${ratedUserId} with ${rating} stars for Toki ${tokiId}`);

    return res.status(201).json({
      success: true,
      message: 'Rating submitted successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Submit rating error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to submit rating'
    });
  }
});

// Get user's rating history
router.get('/users/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get ratings received by the user
    const ratingsResult = await pool.query(
      `SELECT 
        ur.id,
        ur.rating,
        ur.review_text,
        ur.created_at,
        ur.updated_at,
        u.id as rater_id,
        u.name as rater_name,
        u.avatar_url as rater_avatar,
        t.id as toki_id,
        t.title as toki_title,
        t.scheduled_time as toki_date
      FROM user_ratings ur
      JOIN users u ON ur.rater_id = u.id
      JOIN tokis t ON ur.toki_id = t.id
      WHERE ur.rated_user_id = $1
      ORDER BY ur.created_at DESC
      LIMIT $2 OFFSET $3`,
      [id, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM user_ratings WHERE rated_user_id = $1',
      [id]
    );

    const totalCount = parseInt(countResult.rows[0].count);

    return res.status(200).json({
      success: true,
      data: {
        ratings: ratingsResult.rows.map(row => ({
          id: row.id,
          rating: row.rating,
          reviewText: row.review_text,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          rater: {
            id: row.rater_id,
            name: row.rater_name,
            avatar: row.rater_avatar
          },
          toki: {
            id: row.toki_id,
            title: row.toki_title,
            date: row.toki_date
          }
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: totalCount,
          totalPages: Math.ceil(totalCount / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    console.error('Get user ratings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve ratings'
    });
  }
});

// Get user's rating statistics
router.get('/users/:id/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get basic stats
    const statsResult = await pool.query(
      `SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_ratings,
        COUNT(review_text) as total_reviews
      FROM user_ratings 
      WHERE rated_user_id = $1`,
      [id]
    );

    // Get rating distribution
    const distributionResult = await pool.query(
      `SELECT 
        rating,
        COUNT(*) as count
      FROM user_ratings 
      WHERE rated_user_id = $1
      GROUP BY rating
      ORDER BY rating DESC`,
      [id]
    );

    // Get recent ratings
    const recentRatingsResult = await pool.query(
      `SELECT 
        ur.id,
        ur.rating,
        ur.review_text,
        ur.created_at,
        u.name as rater_name,
        t.title as toki_title
      FROM user_ratings ur
      JOIN users u ON ur.rater_id = u.id
      JOIN tokis t ON ur.toki_id = t.id
      WHERE ur.rated_user_id = $1
      ORDER BY ur.created_at DESC
      LIMIT 5`,
      [id]
    );

    const stats = statsResult.rows[0];
    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    distributionResult.rows.forEach(row => {
      distribution[row.rating] = parseInt(row.count);
    });

    return res.status(200).json({
      success: true,
      data: {
        averageRating: parseFloat(stats.average_rating) || 0,
        totalRatings: parseInt(stats.total_ratings) || 0,
        totalReviews: parseInt(stats.total_reviews) || 0,
        ratingDistribution: distribution,
        recentRatings: recentRatingsResult.rows.map(row => ({
          id: row.id,
          rating: row.rating,
          reviewText: row.review_text,
          createdAt: row.created_at,
          raterName: row.rater_name,
          tokiTitle: row.toki_title
        }))
      }
    });

  } catch (error) {
    console.error('Get user rating stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to retrieve rating statistics'
    });
  }
});

// Update an existing rating
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, reviewText } = req.body;
    const userId = (req as any).user.id;

    // Validate rating range
    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rating',
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if rating exists and user owns it
    const existingRatingResult = await pool.query(
      'SELECT id FROM user_ratings WHERE id = $1 AND rater_id = $2',
      [id, userId]
    );

    if (existingRatingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found',
        message: 'Rating not found or you do not have permission to edit it'
      });
    }

    // Update the rating
    const result = await pool.query(
      `UPDATE user_ratings 
       SET rating = COALESCE($1, rating), 
           review_text = COALESCE($2, review_text),
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [rating, reviewText, id]
    );

    console.log(`✅ Rating updated: ${id} by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Rating updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update rating error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to update rating'
    });
  }
});

// Delete a rating
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Check if rating exists and user owns it
    const existingRatingResult = await pool.query(
      'SELECT id FROM user_ratings WHERE id = $1 AND rater_id = $2',
      [id, userId]
    );

    if (existingRatingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rating not found',
        message: 'Rating not found or you do not have permission to delete it'
      });
    }

    // Delete the rating
    await pool.query('DELETE FROM user_ratings WHERE id = $1', [id]);

    console.log(`✅ Rating deleted: ${id} by user ${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Rating deleted successfully'
    });

  } catch (error) {
    console.error('Delete rating error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to delete rating'
    });
  }
});

// Check if users are already rated for a specific Toki
router.get('/check/:tokiId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tokiId } = req.params;
    const raterId = (req as any).user.id;

    // Get all participants for this Toki
    const participantsResult = await pool.query(
      `SELECT 
        u.id,
        u.name,
        u.avatar_url
      FROM toki_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.toki_id = $1 AND tp.status IN ($2, $3)`,
      [tokiId, 'joined', 'approved']
    );

    // Check which participants the current user has already rated
    const alreadyRatedUsers = new Set<string>();
    
    for (const participant of participantsResult.rows) {
      if (participant.id === raterId) continue; // Skip self
      
      const ratingResult = await pool.query(
        'SELECT id FROM user_ratings WHERE rater_id = $1 AND rated_user_id = $2 AND toki_id = $3',
        [raterId, participant.id, tokiId]
      );
      
      if (ratingResult.rows.length > 0) {
        alreadyRatedUsers.add(participant.id);
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        participants: participantsResult.rows.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar_url,
          alreadyRated: alreadyRatedUsers.has(p.id)
        })),
        alreadyRatedUserIds: Array.from(alreadyRatedUsers)
      }
    });

  } catch (error) {
    console.error('Check ratings error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to check ratings'
    });
  }
});

export default router; 