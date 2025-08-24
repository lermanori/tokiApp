import { pool } from '../src/config/database';

// Sample coordinates for Tel Aviv area
const telAvivCoordinates = [
  { lat: 32.0853, lng: 34.7818 }, // Tel Aviv center
  { lat: 32.0667, lng: 34.7833 }, // Jaffa
  { lat: 32.0800, lng: 34.7800 }, // Florentin
  { lat: 32.0900, lng: 34.7900 }, // Neve Tzedek
  { lat: 32.0700, lng: 34.7700 }, // Bat Yam
  { lat: 32.1000, lng: 34.8000 }, // Ramat Gan
  { lat: 32.0600, lng: 34.7600 }, // Holon
  { lat: 32.1200, lng: 34.8200 }, // Givatayim
];

async function addUserCoordinates() {
  try {
    console.log('🗺️ Adding coordinates to existing users...');
    
    // First, add the coordinate columns if they don't exist
    try {
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8),
        ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8)
      `);
      console.log('✅ Coordinate columns added to users table');
    } catch (error) {
      console.log('ℹ️ Coordinate columns already exist or error:', error);
    }
    
    // Get all users without coordinates
    const usersResult = await pool.query(
      'SELECT id, name, location FROM users WHERE latitude IS NULL OR longitude IS NULL'
    );
    
    if (usersResult.rows.length === 0) {
      console.log('ℹ️ All users already have coordinates');
      return;
    }
    
    console.log(`📋 Found ${usersResult.rows.length} users without coordinates`);
    
    // Add coordinates to each user
    for (let i = 0; i < usersResult.rows.length; i++) {
      const user = usersResult.rows[i];
      const coords = telAvivCoordinates[i % telAvivCoordinates.length];
      
      try {
        await pool.query(
          'UPDATE users SET latitude = $1, longitude = $2 WHERE id = $3',
          [coords.lat, coords.lng, user.id]
        );
        
        console.log(`✅ Added coordinates for ${user.name}: ${coords.lat}, ${coords.lng}`);
      } catch (error) {
        console.error(`❌ Failed to add coordinates for ${user.name}:`, error);
      }
    }
    
    // Verify the update
    const verifyResult = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
    );
    
    console.log(`🎯 Total users with coordinates: ${verifyResult.rows[0].count}`);
    console.log('✅ User coordinates update completed!');
    
  } catch (error) {
    console.error('❌ Error adding user coordinates:', error);
  } finally {
    await pool.end();
  }
}

// Run the script
addUserCoordinates();
