import express, { Request, Response } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { ImageService } from '../services/imageService';
import { pool } from '../config/database';
import logger from '../utils/logger';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Upload Toki image
router.post('/upload/:tokiId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tokiId = req.params.tokiId;
    const userId = (req as any).user.id;
    let imageBuffer: Buffer;
    
    // Check if request is multipart (React Native) or JSON (Web)
    const contentType = req.headers['content-type'] || '';
    const isJsonRequest = contentType.includes('application/json');
    
    logger.debug('🔍 Toki image request content-type:', contentType);
    logger.debug('🔍 Is JSON request:', isJsonRequest);
    
    if (!isJsonRequest) {
      // Handle multipart/form-data (React Native)
      logger.debug('🔍 Processing toki image as multipart/form-data');
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

      const file = req.file as Express.Multer.File;
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
      logger.debug('🔍 Processing toki image as JSON with base64 data');
      
      const { image } = req.body;
      
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
        logger.debug('🔍 Toki image buffer created, size:', imageBuffer.length);
      } catch (error) {
        logger.error('🔍 Base64 conversion error:', error);
        return res.status(400).json({
          success: false,
          error: 'Invalid image data',
          message: 'Failed to process image data'
        });
      }
    }

    // Check if user owns this Toki
    const tokiResult = await pool.query(
      'SELECT host_id FROM tokis WHERE id = $1',
      [tokiId]
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (tokiResult.rows[0].host_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'You can only upload images to Tokis you host'
      });
    }

    // Upload image to Cloudinary
    const uploadResult = await ImageService.uploadTokiImage(tokiId, imageBuffer);
    
    if (!uploadResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Upload failed',
        message: uploadResult.error || 'Failed to upload image'
      });
    }

    // Update database with new image URL and public ID
    await pool.query(
      `UPDATE tokis 
       SET image_urls = array_append(image_urls, $1), 
           image_public_ids = array_append(image_public_ids, $2),
           updated_at = NOW()
       WHERE id = $3`,
      [uploadResult.url, uploadResult.publicId, tokiId]
    );

    // Get updated Toki data
    const updatedTokiResult = await pool.query(
      'SELECT id, title, image_urls, image_public_ids, updated_at FROM tokis WHERE id = $1',
      [tokiId]
    );

    return res.status(200).json({
      success: true,
      message: 'Toki image uploaded successfully',
      data: {
        toki: updatedTokiResult.rows[0],
        imageUrl: uploadResult.url,
        publicId: uploadResult.publicId
      }
    });

  } catch (error) {
    logger.error('Toki image upload error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to upload Toki image'
    });
  }
});

// Delete Toki image
router.delete('/delete/:tokiId/:publicId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tokiId = req.params.tokiId;
    const publicId = req.params.publicId;
    const userId = (req as any).user.id;

    // Check if user owns this Toki
    const tokiResult = await pool.query(
      'SELECT host_id, image_urls, image_public_ids FROM tokis WHERE id = $1',
      [tokiId]
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    if (tokiResult.rows[0].host_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'You can only delete images from Tokis you host'
      });
    }

    const toki = tokiResult.rows[0];
    const imageIndex = toki.image_public_ids.indexOf(publicId);

    if (imageIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Image not found',
        message: 'The specified image does not exist in this Toki'
      });
    }

    // Delete image from Cloudinary
    const deleteResult = await ImageService.deleteImage(publicId);
    
    if (!deleteResult) {
      logger.warn(`Failed to delete image from Cloudinary: ${publicId}`);
    }

    // Remove image from database arrays
    const newImageUrls = [...toki.image_urls];
    const newImagePublicIds = [...toki.image_public_ids];
    newImageUrls.splice(imageIndex, 1);
    newImagePublicIds.splice(imageIndex, 1);

    await pool.query(
      `UPDATE tokis 
       SET image_urls = $1, image_public_ids = $2, updated_at = NOW()
       WHERE id = $3`,
      [newImageUrls, newImagePublicIds, tokiId]
    );

    return res.status(200).json({
      success: true,
      message: 'Toki image deleted successfully'
    });

  } catch (error) {
    logger.error('Toki image deletion error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to delete Toki image'
    });
  }
});

// Get Toki images info
router.get('/info/:tokiId', async (req: Request, res: Response) => {
  try {
    const tokiId = req.params.tokiId;

    const tokiResult = await pool.query(
      'SELECT id, title, image_urls, image_public_ids FROM tokis WHERE id = $1',
      [tokiId]
    );

    if (tokiResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Toki not found',
        message: 'The specified Toki does not exist'
      });
    }

    const toki = tokiResult.rows[0];
    const images = toki.image_urls.map((url: string, index: number) => ({
      url,
      publicId: toki.image_public_ids[index]
    }));

    return res.status(200).json({
      success: true,
      data: {
        tokiId: toki.id,
        title: toki.title,
        images,
        totalImages: images.length
      }
    });

  } catch (error) {
    logger.error('Get Toki images info error:', error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to get Toki images info'
    });
  }
});

export default router;
