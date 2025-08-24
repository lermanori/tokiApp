import { pool } from '../src/config/database';

async function testDifferentRatings() {
  try {
    console.log('🧪 Testing rating system with different ratings...');
    
    // Get some recent Tokis to test with
    const tokiResult = await pool.query(
      "SELECT id, title FROM tokis WHERE title LIKE '%Coffee%' OR title LIKE '%Yoga%' OR title LIKE '%Networking%' ORDER BY created_at DESC LIMIT 3"
    );
    
    if (tokiResult.rows.length === 0) {
      console.log('❌ No Tokis found for testing');
      return;
    }
    
    console.log('📋 Found Tokis for testing:');
    tokiResult.rows.forEach(toki => {
      console.log(`   - ${toki.title} (ID: ${toki.id})`);
    });
    
    // Test users
    const testUsers = [
      { id: 'e06e2578-96c1-4882-b723-c7b3561a2f8e', name: 'ori lerman' },
      { id: 'b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c', name: 'alice' },
      { id: '4f32ebc5-ff82-416c-9bac-896539ecd905', name: 'test' },
      { id: '17b60e04-7237-46ab-a2f4-d404de21209d', name: 'john' }
    ];
    
    // Test different rating combinations
    const testRatings = [
      // Test 1: ori rates alice with 3 stars
      {
        raterId: 'e06e2578-96c1-4882-b723-c7b3561a2f8e',
        ratedUserId: 'b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c',
        tokiId: tokiResult.rows[0].id,
        rating: 3,
        reviewText: 'Good participant, but could be more punctual'
      },
      // Test 2: alice rates ori with 4 stars
      {
        raterId: 'b2069d88-6bf9-4c8c-a1a1-5d23368d7f1c',
        ratedUserId: 'e06e2578-96c1-4882-b723-c7b3561a2f8e',
        tokiId: tokiResult.rows[1].id,
        rating: 4,
        reviewText: 'Great host, very organized event'
      },
      // Test 3: test rates john with 2 stars
      {
        raterId: '4f32ebc5-ff82-416c-9bac-896539ecd905',
        ratedUserId: '17b60e04-7237-46ab-a2f4-d404de21209d',
        tokiId: tokiResult.rows[2].id,
        rating: 2,
        reviewText: 'Event was okay, but could be better'
      },
      // Test 4: john rates test with 1 star
      {
        raterId: '17b60e04-7237-46ab-a2f4-d404de21209d',
        ratedUserId: '4f32ebc5-ff82-416c-9bac-896539ecd905',
        tokiId: tokiResult.rows[0].id,
        rating: 1,
        reviewText: 'Poor experience, would not recommend'
      },
      // Test 5: ori rates test with 5 stars
      {
        raterId: 'e06e2578-96c1-4882-b723-c7b3561a2f8e',
        ratedUserId: '4f32ebc5-ff82-416c-9bac-896539ecd905',
        tokiId: tokiResult.rows[1].id,
        rating: 5,
        reviewText: 'Excellent participant, very engaged'
      }
    ];
    
    console.log('\n📝 Adding test ratings with different values...');
    
    for (const testRating of testRatings) {
      try {
        // Check if rating already exists
        const existingResult = await pool.query(
          'SELECT id FROM user_ratings WHERE rater_id = $1 AND rated_user_id = $2 AND toki_id = $3',
          [testRating.raterId, testRating.ratedUserId, testRating.tokiId]
        );
        
        if (existingResult.rows.length > 0) {
          console.log(`⚠️  Rating already exists for ${testRating.raterId} -> ${testRating.ratedUserId} on ${testRating.tokiId}`);
          continue;
        }
        
        // Insert the test rating
        await pool.query(
          `INSERT INTO user_ratings (rater_id, rated_user_id, toki_id, rating, review_text)
           VALUES ($1, $2, $3, $4, $5)`,
          [testRating.raterId, testRating.ratedUserId, testRating.tokiId, testRating.rating, testRating.reviewText]
        );
        
        const raterName = testUsers.find(u => u.id === testRating.raterId)?.name;
        const ratedName = testUsers.find(u => u.id === testRating.ratedUserId)?.name;
        
        console.log(`✅ Added ${testRating.rating}⭐ rating: ${raterName} -> ${ratedName}`);
        
      } catch (error) {
        console.error(`❌ Error adding rating:`, error);
      }
    }
    
    console.log('\n🔍 Checking updated rating averages...');
    
    const updatedRatings = await pool.query(
      `SELECT 
        rated_user_id,
        COUNT(*) as total_ratings,
        AVG(rating) as average_rating,
        MIN(rating) as min_rating,
        MAX(rating) as max_rating
       FROM user_ratings 
       GROUP BY rated_user_id 
       ORDER BY average_rating DESC`
    );
    
    console.log('\n📊 Current Rating Summary:');
    updatedRatings.rows.forEach(row => {
      const userName = testUsers.find(u => u.id === row.rated_user_id)?.name || 'Unknown';
      console.log(`${userName}:`);
      console.log(`   Total Ratings: ${row.total_ratings}`);
      console.log(`   Average: ${parseFloat(row.average_rating).toFixed(2)}⭐`);
      console.log(`   Range: ${row.min_rating}⭐ - ${row.max_rating}⭐`);
      console.log('');
    });
    
    console.log('🎯 Rating system test completed!');
    console.log('💡 Now you can test the /me endpoint to see if ratings are calculated correctly.');
    
  } catch (error) {
    console.error('❌ Error testing ratings:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testDifferentRatings();
