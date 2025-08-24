import cloudinary, { generateUploadPath, generateFullPublicId, getOptimizedImageUrl } from '../config/cloudinary';

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
              console.error('Cloudinary upload error:', error);
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
      console.error('Profile image upload error:', error);
      return {
        success: false,
        error: 'Failed to upload profile image'
      };
    }
  }

  // Upload Toki image
  static async uploadTokiImage(tokiId: string, imageBuffer: Buffer): Promise<UploadResult> {
    try {
      const folder = 'toki/tokis';
      const publicId = `toki_${tokiId}_${Date.now()}`;
      
      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            resource_type: 'image',
            folder: folder,
            public_id: publicId,
            transformation: [
              { width: 800, height: 600, crop: 'fill' },
              { quality: 'auto', fetch_format: 'auto' }
            ],
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
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
      console.error('Toki image upload error:', error);
      return {
        success: false,
        error: 'Failed to upload Toki image'
      };
    }
  }

  // Delete image from Cloudinary
  static async deleteImage(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Image deletion error:', error);
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
