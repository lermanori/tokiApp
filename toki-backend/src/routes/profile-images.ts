import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { ImageService } from '../services/imageService';
import multer from 'multer';
import logger from '../utils/logger';

const router = Router();

// Configure multer for memory storage (we'll upload directly to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Upload/Update profile image
router.post('/upload', authenticateToken, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided',
        message: 'Please select an image to upload'
      });
    }

    // Validate the uploaded file
    const validation = ImageService.validateImage(req.file);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid image file',
        message: validation.error
      });
    }

    // Get current profile image to delete later
    const currentImageResult = await pool.query(
      'SELECT profile_image_public_id FROM users WHERE id = $1',
      [userId]
    );
    
    const currentPublicId = currentImageResult.rows[0]?.profile_image_public_id;

    // Upload new image to Cloudinary
    const uploadResult = await ImageService.uploadProfileImage(userId, req.file.buffer);
    
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Upload failed',
        message: uploadResult.error || 'Failed to upload image'
      });
    }

    // Update database with new image URL and public ID
    // Also update avatar_url to maintain compatibility with existing frontend
    logger.debug('🔄 Updating database with new image URL:', uploadResult.url);
    const updateResult = await pool.query(
      `UPDATE users 
       SET profile_image_url = $1, profile_image_public_id = $2, avatar_url = $3, updated_at = NOW()
       WHERE id = $4`,
      [uploadResult.url, uploadResult.publicId, uploadResult.url, userId]
    );
    logger.debug('✅ Database update result:', updateResult.rowCount, 'rows affected');
    
    // Verify the update worked by checking the database
    const verifyResult = await pool.query(
      'SELECT avatar_url, profile_image_url FROM users WHERE id = $1',
      [userId]
    );
    logger.debug('🔍 Verification - avatar_url:', verifyResult.rows[0]?.avatar_url);
    logger.debug('🔍 Verification - profile_image_url:', verifyResult.rows[0]?.profile_image_url);

    // Delete old image from Cloudinary if it exists
    if (currentPublicId) {
      await ImageService.deleteImage(currentPublicId);
    }

    // Get updated user data
    const userResult = await pool.query(
      'SELECT id, name, email, profile_image_url, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        user: userResult.rows[0],
        imageUrl: uploadResult.url,
        publicId: uploadResult.publicId
      }
    });

  } catch (error) {
    logger.error('Profile image upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to upload profile image'
    });
  }
});

// Remove profile image
router.delete('/remove', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    // Get current profile image
    const currentImageResult = await pool.query(
      'SELECT profile_image_public_id FROM users WHERE id = $1',
      [userId]
    );
    
    const currentPublicId = currentImageResult.rows[0]?.profile_image_public_id;

    if (!currentPublicId) {
      return res.status(404).json({
        success: false,
        error: 'No profile image found',
        message: 'User does not have a profile image to remove'
      });
    }

    // Delete image from Cloudinary
    const deleteResult = await ImageService.deleteImage(currentPublicId);
    
    if (!deleteResult) {
      logger.warn(`Failed to delete image from Cloudinary: ${currentPublicId}`);
    }

    // Update database to remove image references
    // Also clear avatar_url to maintain compatibility with existing frontend
    await pool.query(
      `UPDATE users 
       SET profile_image_url = NULL, profile_image_public_id = NULL, avatar_url = NULL, updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    // Get updated user data
    const userResult = await pool.query(
      'SELECT id, name, email, profile_image_url, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: 'Profile image removed successfully',
      data: {
        user: userResult.rows[0]
      }
    });

  } catch (error) {
    logger.error('Profile image removal error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to remove profile image'
    });
  }
});

// Get profile image info
router.get('/info', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const userResult = await pool.query(
      'SELECT id, name, profile_image_url, profile_image_public_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'User does not exist'
      });
    }

    const user = userResult.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        hasProfileImage: !!user.profile_image_url,
        imageUrl: user.profile_image_url,
        publicId: user.profile_image_public_id
      }
    });

  } catch (error) {
    logger.error('Profile image info error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to get profile image info'
    });
  }
});

export default router;
