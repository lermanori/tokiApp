import { pool } from '../config/database';
import { CATEGORY_CONFIG } from '../config/categories';
import logger from './logger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MatchedToki {
  toki: any;
  imageBuffer?: Buffer;
  imageBuffers: Buffer[];
  matchedImageNames: string[];
}

// DEPRECATED: timeSlot is kept for backward compatibility only
// scheduledTime is now the single source of truth
const VALID_TIME_SLOTS = ['now', '30min', '1hour', '2hours', '3hours', 'tonight', 'tomorrow', 'morning', 'afternoon', 'evening'];
const VALID_VISIBILITY = ['public', 'connections', 'friends', 'private'];

/**
 * Validate image format using magic bytes
 */
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

/**
 * Validate required fields
 */
export function validateRequiredFields(toki: any): string[] {
  const errors: string[] = [];
  // scheduledTime is now required; timeSlot is deprecated
  const required = ['title', 'location', 'scheduledTime', 'category', 'host_id'];

  for (const field of required) {
    if (!toki[field] || (typeof toki[field] === 'string' && toki[field].trim() === '')) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  return errors;
}

/**
 * Validate category
 */
export function validateCategory(category: string): boolean {
  return Object.keys(CATEGORY_CONFIG).includes(category);
}

/**
 * Validate host_id exists in users table
 */
export async function validateHostId(hostId: string): Promise<boolean> {
  try {
    const result = await pool.query('SELECT id FROM users WHERE id = $1', [hostId]);
    return result.rows.length > 0;
  } catch (error) {
    logger.error('Error validating host_id:', error);
    return false;
  }
}

/**
 * Match images to tokis by filename
 */
export function matchImagesToTokis(
  tokis: any[],
  imageMap: Map<string, Buffer>
): MatchedToki[] {
  return tokis.map(toki => {
    const matchedImageNames: string[] = [];
    const imageBuffers: Buffer[] = [];

    // Handle single image field
    if (toki.image && typeof toki.image === 'string') {
      const imageName = toki.image;
      const buffer = imageMap.get(imageName);
      if (buffer) {
        matchedImageNames.push(imageName);
        imageBuffers.push(buffer);
      }
    }

    // Handle images array
    if (toki.images && Array.isArray(toki.images)) {
      for (const imageRef of toki.images) {
        const imageName = typeof imageRef === 'string' ? imageRef : imageRef.url || imageRef.name;
        if (imageName) {
          const buffer = imageMap.get(imageName);
          if (buffer) {
            if (!matchedImageNames.includes(imageName)) {
              matchedImageNames.push(imageName);
              imageBuffers.push(buffer);
            }
          }
        }
      }
    }

    return {
      toki,
      imageBuffer: imageBuffers[0],
      imageBuffers,
      matchedImageNames
    };
  });
}

/**
 * Validate a single toki with all rules
 */
export async function validateTokiData(
  toki: any,
  imageMap: Map<string, Buffer>,
  index: number
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate required fields
  const requiredErrors = validateRequiredFields(toki);
  errors.push(...requiredErrors);

  // Validate category
  if (toki.category && !validateCategory(toki.category)) {
    errors.push(`Invalid category: ${toki.category}. Must be one of: ${Object.keys(CATEGORY_CONFIG).join(', ')}`);
  }

  // Validate timeSlot (deprecated - warn but don't error)
  if (toki.timeSlot) {
    if (!VALID_TIME_SLOTS.includes(toki.timeSlot)) {
      warnings.push(`Invalid timeSlot: ${toki.timeSlot}. Must be one of: ${VALID_TIME_SLOTS.join(', ')}`);
    }
    warnings.push('timeSlot is deprecated - using scheduledTime as the source of truth');
  }

  // Validate visibility
  if (toki.visibility && !VALID_VISIBILITY.includes(toki.visibility)) {
    errors.push(`Invalid visibility: ${toki.visibility}. Must be one of: ${VALID_VISIBILITY.join(', ')}`);
  }

  // Validate maxAttendees
  if (toki.maxAttendees !== null && toki.maxAttendees !== undefined) {
    const maxAttendeesNum = typeof toki.maxAttendees === 'number' 
      ? toki.maxAttendees 
      : parseInt(toki.maxAttendees);
    
    if (isNaN(maxAttendeesNum) || maxAttendeesNum < 1 || maxAttendeesNum > 1000) {
      errors.push('maxAttendees must be between 1 and 1000, or null for unlimited');
    }
  }

  // Validate host_id exists
  if (toki.host_id) {
    const hostExists = await validateHostId(toki.host_id);
    if (!hostExists) {
      errors.push(`host_id "${toki.host_id}" does not exist in users table`);
    }
  }

  // Validate image references exist in zip
  const imageRefs: string[] = [];
  if (toki.image && typeof toki.image === 'string') {
    imageRefs.push(toki.image);
  }
  if (toki.images && Array.isArray(toki.images)) {
    toki.images.forEach((img: any) => {
      const imgName = typeof img === 'string' ? img : img.url || img.name;
      if (imgName) imageRefs.push(imgName);
    });
  }

  for (const imageRef of imageRefs) {
    const buffer = imageMap.get(imageRef);
    if (!buffer) {
      errors.push(`Referenced image file not found in zip: ${imageRef}`);
    } else {
      // Validate image format
      if (!validateImageMagicBytes(buffer)) {
        errors.push(`Invalid image format for ${imageRef}. Only JPEG, PNG, and WebP are supported`);
      }
      // Check image size (10MB limit)
      if (buffer.length > 10 * 1024 * 1024) {
        errors.push(`Image ${imageRef} exceeds 10MB size limit`);
      }
    }
  }

  // Warnings for optional fields
  if (!toki.description) {
    warnings.push('No description provided');
  }
  if (!toki.tags || !Array.isArray(toki.tags) || toki.tags.length === 0) {
    warnings.push('No tags provided');
  }
  if (!imageRefs.length) {
    warnings.push('No images provided');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
