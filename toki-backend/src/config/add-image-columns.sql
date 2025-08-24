-- Add image URL columns to users and tokis tables

-- Add profile_image_url to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_public_id TEXT;

-- Add image_urls array to tokis table
ALTER TABLE tokis ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
ALTER TABLE tokis ADD COLUMN IF NOT EXISTS image_public_ids TEXT[] DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_profile_image ON users(profile_image_url);
CREATE INDEX IF NOT EXISTS idx_tokis_image_urls ON tokis USING GIN(image_urls);

-- Add comments for documentation
COMMENT ON COLUMN users.profile_image_url IS 'URL of user profile image stored in Cloudinary';
COMMENT ON COLUMN users.profile_image_public_id IS 'Cloudinary public ID for profile image';
COMMENT ON COLUMN tokis.image_urls IS 'Array of Toki image URLs stored in Cloudinary';
COMMENT ON COLUMN tokis.image_public_ids IS 'Array of Cloudinary public IDs for Toki images';
