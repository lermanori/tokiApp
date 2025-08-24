import { pool } from '../src/config/database';

async function testSavedTokis() {
  try {
    console.log('🧪 Testing saved Tokis functionality...');
    
    // Get some active Tokis
    const tokiResult = await pool.query(
      "SELECT id, title FROM tokis WHERE status = 'active' ORDER BY created_at DESC LIMIT 5"
    );
    
    if (tokiResult.rows.length === 0) {
      console.log('❌ No active Tokis found for testing');
      return;
    }
    
    console.log('📋 Found Tokis for testing:');
    tokiResult.rows.forEach(toki => {
      console.log(`   - ${toki.title} (ID: ${toki.id})`);
    });
    
    // Test user ID (ori lerman)
    const testUserId = 'e06e2578-96c1-4882-b723-c7b3561a2f8e';
    
    console.log('\n📝 Adding test saved Tokis...');
    
    for (const toki of tokiResult.rows) {
      try {
        // Check if already saved
        const existingResult = await pool.query(
          'SELECT id FROM saved_tokis WHERE user_id = $1 AND toki_id = $2',
          [testUserId, toki.id]
        );
        
        if (existingResult.rows.length > 0) {
          console.log(`⚠️  Toki already saved: ${toki.title}`);
          continue;
        }
        
        // Save the Toki
        await pool.query(
          'INSERT INTO saved_tokis (user_id, toki_id) VALUES ($1, $2)',
          [testUserId, toki.id]
        );
        
        console.log(`✅ Saved Toki: ${toki.title}`);
        
      } catch (error) {
        console.error(`❌ Error saving Toki ${toki.title}:`, error);
      }
    }
    
    console.log('\n🔍 Checking saved Tokis...');
    
    const savedResult = await pool.query(
      `SELECT t.title, st.created_at 
       FROM saved_tokis st 
       JOIN tokis t ON st.toki_id = t.id 
       WHERE st.user_id = $1 
       ORDER BY st.created_at DESC`,
      [testUserId]
    );
    
    console.log('\n📊 Saved Tokis Summary:');
    savedResult.rows.forEach(row => {
      console.log(`   - ${row.title} (saved: ${row.created_at})`);
    });
    
    console.log('\n🎯 Saved Tokis test completed!');
    console.log('💡 Now you can test the saved Tokis page in the app.');
    
  } catch (error) {
    console.error('❌ Error testing saved Tokis:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testSavedTokis();
