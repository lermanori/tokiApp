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

router.put('/:id/complete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const hostId = (req as any).user.id;

    // Check if Toki exists and user is the host
    const tokiResult = await pool.query(
      'SELECT host_id, status FROM tokis WHERE id = $1',
      [id]
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (tokiResult.rows[0].host_id !== hostId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only the host can complete the Toki'
      });
    }

    if (tokiResult.rows[0].status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Already completed',
        message: 'This Toki is already marked as completed'
      });
    }

    // Update Toki status to completed
    const result = await pool.query(
      'UPDATE tokis SET status = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      ['completed', new Date(), id]
    );

    // Update all participants' join status to completed
    await pool.query(
      'UPDATE toki_participants SET status = $1, updated_at = $2 WHERE toki_id = $3',
      ['completed', new Date(), id]
    );

    console.log(`✅ Toki ${id} completed by host ${hostId}`);

    return res.status(200).json({
      success: true,
      message: 'Toki completed successfully',
      data: {
        id: result.rows[0].id,
        status: result.rows[0].status,
        updatedAt: result.rows[0].updated_at
      }
    });

  } catch (error) {
    console.error('Complete Toki error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to complete Toki'
    });
  }
});

// Upload image for a Toki (only by host)
router.post('/:id/image', authenticateToken, uploadSingleImage, handleUploadError, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image provided',
        message: 'Please provide an image file'
      });
    }

    // Check if Toki exists and user is the host
    const existingResult = await pool.query(
      'SELECT host_id, image_url FROM tokis WHERE id = $1 AND status = $2',
      [id, 'active']
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (existingResult.rows[0].host_id !== req.user!.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You can only upload images for Tokis you host'
      });
    }

    // Generate the image URL
    const imageUrl = `/uploads/${req.file.filename}`;

    // Update the Toki with the new image URL
    const result = await pool.query(
      'UPDATE tokis SET image_url = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [imageUrl, new Date(), id]
    );

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        id: result.rows[0].id,
        imageUrl: result.rows[0].image_url
      }
    });

  } catch (error) {
    console.error('Upload image error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to upload image'
    });
  }
});


export default router;
