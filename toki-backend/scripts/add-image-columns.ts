import { pool } from '../src/config/database';

async function addImageColumns() {
  try {
    console.log('🔄 Adding image columns to database...');

    // Add profile_image_url to users table
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url TEXT;
    `);
    console.log('✅ Added profile_image_url to users table');

    // Add profile_image_public_id to users table
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_public_id TEXT;
    `);
    console.log('✅ Added profile_image_public_id to users table');

    // Add image_urls array to tokis table
    await pool.query(`
      ALTER TABLE tokis ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
    `);
    console.log('✅ Added image_urls to tokis table');

    // Add image_public_ids array to tokis table
    await pool.query(`
      ALTER TABLE tokis ADD COLUMN IF NOT EXISTS image_public_ids TEXT[] DEFAULT '{}';
    `);
    console.log('✅ Added image_public_ids to tokis table');

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_profile_image ON users(profile_image_url);
    `);
    console.log('✅ Created index for users profile image');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tokis_image_urls ON tokis USING GIN(image_urls);
    `);
    console.log('✅ Created index for tokis image URLs');

    // Add comments for documentation
    await pool.query(`
      COMMENT ON COLUMN users.profile_image_url IS 'URL of user profile image stored in Cloudinary';
    `);
    await pool.query(`
      COMMENT ON COLUMN users.profile_image_public_id IS 'Cloudinary public ID for profile image';
    `);
    await pool.query(`
      COMMENT ON COLUMN tokis.image_urls IS 'Array of Toki image URLs stored in Cloudinary';
    `);
    await pool.query(`
      COMMENT ON COLUMN tokis.image_public_ids IS 'Array of Cloudinary public IDs for Toki images';
    `);
    console.log('✅ Added column comments');

    console.log('🎉 Database migration completed successfully!');
    console.log('📊 New columns added:');
    console.log('   - users.profile_image_url');
    console.log('   - users.profile_image_public_id');
    console.log('   - tokis.image_urls');
    console.log('   - tokis.image_public_ids');

  } catch (error) {
    console.error('❌ Database migration failed:', error);
  } finally {
    await pool.end();
  }
}

// Run the migration
addImageColumns();
