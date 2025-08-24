import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dsq1ocdl1',
  api_key: '772281827225297',
  api_secret: '9wQnRq87JX2tSyqb4uQl5cgaHbM',
});

export default cloudinary;

// Helper function to generate upload path
export const generateUploadPath = (type: 'profile' | 'toki', id: string): string => {
  const timestamp = Date.now();
  return `toki/${type}s/${type === 'profile' ? 'user' : 'toki'}_${id}_${timestamp}`;
};

// Helper function to generate public ID (without folder prefix duplication)
export const generatePublicId = (type: 'profile' | 'toki', id: string): string => {
  const timestamp = Date.now();
  return `${type === 'profile' ? 'user' : 'toki'}_${id}_${timestamp}`;
};

// Helper function to generate full public ID with folder
export const generateFullPublicId = (type: 'profile' | 'toki', id: string): string => {
  const timestamp = Date.now();
  const folder = `toki/${type}s`;
  const filename = `${type === 'profile' ? 'user' : 'toki'}_${id}_${timestamp}`;
  return `${folder}/${filename}`;
};

// Helper function to get optimized image URL
export const getOptimizedImageUrl = (publicId: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpg' | 'png' | 'webp';
} = {}): string => {
  const { width, height, quality = 'auto', format = 'auto' } = options;
  
  let url = cloudinary.url(publicId, {
    width,
    height,
    quality,
    format,
    fetch_format: 'auto',
    crop: 'fill',
  });
  
  return url;
};
