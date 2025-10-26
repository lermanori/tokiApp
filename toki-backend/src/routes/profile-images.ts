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
router.post('/upload', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    let imageBuffer: Buffer;
    
    // Check if request is multipart (React Native) or JSON (Web)
    const contentType = req.headers['content-type'] || '';
    const isJsonRequest = contentType.includes('application/json');
    
    logger.debug('🔍 Request content-type:', contentType);
    logger.debug('🔍 All headers:', req.headers);
    logger.debug('🔍 Is JSON request:', isJsonRequest);
    logger.debug('🔍 Request body type:', typeof req.body);
    logger.debug('🔍 Request body keys:', Object.keys(req.body || {}));
    
    if (!isJsonRequest) {
      // Handle multipart/form-data (React Native)
      logger.debug('🔍 Processing as multipart/form-data');
      const multerMiddleware = upload.single('image');
      await new Promise((resolve, reject) => {
        multerMiddleware(req, res, (err) => {
          if (err) reject(err);
          else resolve(undefined);
        });
      });
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided',
          message: 'Please select an image to upload'
        });
      }

      const file = req.file as Express.Multer.File; // Type assertion to help TypeScript
      const validation = ImageService.validateImage(file);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid image file',
          message: validation.error
        });
      }

      imageBuffer = file.buffer;
    } else {
      // Handle JSON with base64 data (Web)
      logger.debug('🔍 Processing as JSON with base64 data');
      logger.debug('🔍 Full request body:', JSON.stringify(req.body, null, 2));
      logger.debug('🔍 Request body keys:', Object.keys(req.body || {}));
      
      const { image, userId: requestUserId } = req.body;
      
      logger.debug('🔍 Image data present:', !!image);
      logger.debug('🔍 Image data type:', typeof image);
      logger.debug('🔍 Image data length:', image?.length || 0);
      logger.debug('🔍 UserId from body:', requestUserId);
      
      if (!image) {
        logger.error('🔍 No image data found in request body');
        return res.status(400).json({
          success: false,
          error: 'No image data provided',
          message: 'Please provide image data'
        });
      }

      // Extract base64 data from data URI
      let base64Data = image;
      if (image.startsWith('data:image/')) {
        base64Data = image.split(',')[1];
        logger.debug('🔍 Extracted base64 data length:', base64Data.length);
      }

      // Convert base64 to buffer
      try {
        imageBuffer = Buffer.from(base64Data, 'base64');
        logger.debug('🔍 Image buffer created, size:', imageBuffer.length);
      } catch (error) {
        logger.error('🔍 Base64 conversion error:', error);
        return res.status(400).json({
          success: false,
          error: 'Invalid image data',
          message: 'Failed to process image data'
        });
      }
    }

    // Get current profile image to delete later
    const currentImageResult = await pool.query(
      'SELECT profile_image_public_id FROM users WHERE id = $1',
      [userId]
    );
    
    const currentPublicId = currentImageResult.rows[0]?.profile_image_public_id;

    // Upload new image to Cloudinary
    const uploadResult = await ImageService.uploadProfileImage(userId, imageBuffer);
    
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
