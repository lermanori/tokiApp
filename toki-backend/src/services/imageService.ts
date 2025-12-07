import cloudinary, { generateUploadPath, generateFullPublicId, getOptimizedImageUrl } from '../config/cloudinary';
import logger from '../utils/logger';

export interface UploadResult {
  success: boolean;
  publicId?: string;
  url?: string;
  error?: string;
}

export interface ImageValidation {
  isValid: boolean;
  error?: string;
}

// Helper function to validate image format using magic bytes
function validateImageMagicBytes(buffer: Buffer): boolean {
  if (buffer.length < 12) {
    return false;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return true;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    return true;
  }

  // WebP: RIFF at start (52 49 46 46), WEBP at offset 8 (57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && // R
    buffer[1] === 0x49 && // I
    buffer[2] === 0x46 && // F
    buffer[3] === 0x46 && // F
    buffer[8] === 0x57 && // W
    buffer[9] === 0x45 && // E
    buffer[10] === 0x42 && // B
    buffer[11] === 0x50   // P
  ) {
    return true;
  }

  return false;
}

// Helper function to parse aspect ratio string (e.g., "4:3", "1:1") and return dimensions
function getDimensionsFromAspectRatio(aspectRatio?: string): { width: number; height: number } {
  if (!aspectRatio) {
    // Default to 4:3 for tokis
    return { width: 800, height: 600 };
  }

  const parts = aspectRatio.split(':');
  if (parts.length !== 2) {
    // Invalid format, default to 4:3
    return { width: 800, height: 600 };
  }

  const ratio = parseFloat(parts[0]) / parseFloat(parts[1]);
  
  if (aspectRatio === '1:1') {
    return { width: 600, height: 600 };
  } else if (aspectRatio === '4:3') {
    return { width: 800, height: 600 };
  } else {
    // For other ratios, use 800px width and calculate height
    return { width: 800, height: Math.round(800 / ratio) };
  }
}

export class ImageService {
  // Validate image file
  static validateImage(file: Express.Multer.File): ImageValidation {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      return {
        isValid: false,
        error: 'Only JPEG, PNG, and WebP images are allowed'
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'Image size must be less than 10MB'
      };
    }

    return { isValid: true };
  }

  // Upload profile image
  static async uploadProfileImage(userId: string, imageBuffer: Buffer): Promise<UploadResult> {
    try {
      const folder = 'toki/profiles';
      const publicId = `user_${userId}_${Date.now()}`;
      
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: folder,
            public_id: publicId,
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto', fetch_format: 'auto' }
            ],
          },
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload error:', error);
              resolve({
                success: false,
                error: 'Failed to upload image to Cloudinary'
              });
            } else if (result) {
              resolve({
                success: true,
                publicId: result.public_id,
                url: result.secure_url
              });
            } else {
              resolve({
                success: false,
                error: 'Upload completed but no result returned'
              });
            }
          }
        ).end(imageBuffer);
      });

    } catch (error) {
      logger.error('Profile image upload error:', error);
      return {
        success: false,
        error: 'Failed to upload profile image'
      };
    }
  }

  // Upload Toki image
  static async uploadTokiImage(
    tokiId: string, 
    imageBuffer: Buffer, 
    aspectRatio?: string
  ): Promise<UploadResult> {
    try {
      const folder = 'toki/tokis';
      const publicId = `toki_${tokiId}_${Date.now()}`;
      const { width, height } = getDimensionsFromAspectRatio(aspectRatio);
      
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: folder,
            public_id: publicId,
            transformation: [
              { width, height, crop: 'fill' },
              { quality: 'auto', fetch_format: 'auto' }
            ],
          },
          (error, result) => {
            if (error) {
              logger.error('Cloudinary upload error:', error);
              resolve({
                success: false,
                error: 'Failed to upload image to Cloudinary'
              });
            } else if (result) {
              resolve({
                success: true,
                publicId: result.public_id,
                url: result.secure_url
              });
            } else {
              resolve({
                success: false,
                error: 'Upload completed but no result returned'
              });
            }
          }
        ).end(imageBuffer);
      });

    } catch (error) {
      logger.error('Toki image upload error:', error);
      return {
        success: false,
        error: 'Failed to upload Toki image'
      };
    }
  }

  // Copy and transform image from URL
  static async copyAndTransformImage(
    url: string,
    tokiId: string,
    aspectRatio?: string
  ): Promise<UploadResult> {
    const startTime = Date.now();
    logger.info(`📥 [ImageService] Starting image download from URL: ${url}`);

    try {
      // Download with timeout and redirect handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      let response: Response | null = null;
      let redirectCount = 0;
      let currentUrl = url;

      // Handle redirects (up to 3)
      while (redirectCount < 3) {
        try {
          response = await fetch(currentUrl, {
            signal: controller.signal,
            redirect: 'manual', // Handle redirects manually
            headers: {
              'User-Agent': 'Toki-Backend/1.0',
            },
          });

          // Check for redirect
          if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (location) {
              currentUrl = new URL(location, currentUrl).href;
              redirectCount++;
              logger.debug(`🔄 [ImageService] Following redirect ${redirectCount}/3 to: ${currentUrl}`);
              continue;
            }
          }
          break;
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            logger.warn(`⏱️ [ImageService] Download timeout for URL: ${url}`);
            return {
              success: false,
              error: 'Download timeout (15s limit exceeded)'
            };
          }
          throw fetchError;
        }
      }

      clearTimeout(timeoutId);

      // Ensure we have a response
      if (!response) {
        logger.warn(`❌ [ImageService] No response received for URL: ${url}`);
        return {
          success: false,
          error: 'No response received from server'
        };
      }

      // Validate HTTP status
      if (!response.ok || response.status < 200 || response.status >= 300) {
        logger.warn(`❌ [ImageService] HTTP error ${response.status} for URL: ${url}`);
        return {
          success: false,
          error: `HTTP error: ${response.status} ${response.statusText}`
        };
      }

      // Validate MIME type
      const contentType = response.headers.get('content-type') || '';
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.some(type => contentType.includes(type))) {
        logger.warn(`❌ [ImageService] Invalid content type "${contentType}" for URL: ${url}`);
        return {
          success: false,
          error: `Invalid content type: ${contentType}. Only JPEG, PNG, and WebP are allowed.`
        };
      }

      // Validate size from Content-Length header
      const contentLength = response.headers.get('content-length');
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (contentLength && parseInt(contentLength) > maxSize) {
        logger.warn(`❌ [ImageService] Image too large (${contentLength} bytes) for URL: ${url}`);
        return {
          success: false,
          error: `Image too large: ${contentLength} bytes (max 10MB)`
        };
      }

      // Download and validate buffer
      logger.debug(`⬇️ [ImageService] Downloading image data from: ${url}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Validate actual buffer size
      if (buffer.length > maxSize) {
        logger.warn(`❌ [ImageService] Image buffer too large (${buffer.length} bytes) for URL: ${url}`);
        return {
          success: false,
          error: `Image too large: ${buffer.length} bytes (max 10MB)`
        };
      }

      // Validate magic bytes
      const isValidImage = validateImageMagicBytes(buffer);
      if (!isValidImage) {
        logger.warn(`❌ [ImageService] Invalid or corrupted image data for URL: ${url}`);
        return {
          success: false,
          error: 'Invalid or corrupted image data'
        };
      }

      const downloadTime = Date.now() - startTime;
      logger.info(`✅ [ImageService] Image downloaded successfully (${buffer.length} bytes, ${downloadTime}ms): ${url}`);

      // Upload to Cloudinary with same transformations as base64 uploads
      const folder = 'toki/tokis';
      const publicId = `toki_${tokiId}_${Date.now()}`;
      const { width, height } = getDimensionsFromAspectRatio(aspectRatio);

      logger.debug(`☁️ [ImageService] Uploading to Cloudinary with dimensions ${width}x${height}...`);

      return new Promise((resolve) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: folder,
            public_id: publicId,
            transformation: [
              { width, height, crop: 'fill' },
              { quality: 'auto', fetch_format: 'auto' }
            ],
          },
          (error, result) => {
            const totalTime = Date.now() - startTime;
            if (error) {
              logger.error(`❌ [ImageService] Cloudinary upload error for URL ${url}:`, error);
              resolve({
                success: false,
                error: 'Failed to upload image to Cloudinary'
              });
            } else if (result) {
              logger.info(`✅ [ImageService] Image reprocessed successfully (${totalTime}ms): ${url} → ${result.secure_url}`);
              resolve({
                success: true,
                publicId: result.public_id,
                url: result.secure_url
              });
            } else {
              logger.warn(`⚠️ [ImageService] Upload completed but no result returned for URL: ${url}`);
              resolve({
                success: false,
                error: 'Upload completed but no result returned'
              });
            }
          }
        ).end(buffer);
      });

    } catch (error: any) {
      const totalTime = Date.now() - startTime;
      logger.error(`❌ [ImageService] Error processing image from URL ${url} (${totalTime}ms):`, error);
      
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Download timeout (15s limit exceeded)'
        };
      }
      
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: `Network error: ${error.message}`
        };
      }

      return {
        success: false,
        error: `Failed to process image: ${error.message || String(error)}`
      };
    }
  }

  // Delete image from Cloudinary
  static async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      logger.error('Image deletion error:', error);
      return false;
    }
  }

  // Get optimized image URL
  static getOptimizedUrl(publicId: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'jpg' | 'png' | 'webp';
  }): string {
    return getOptimizedImageUrl(publicId, options);
  }
}
