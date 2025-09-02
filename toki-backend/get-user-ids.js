const { Pool } = require('pg');

// Create a pool using the Railway database connection
const pool = new Pool({
  connectionString: 'postgresql://postgres:RAdJaSFfwdtycrnutZvwEfRoGFbZhviG@centerbeam.proxy.rlwy.net:41158/railway'
});

async function getUserIds() {
  try {
    console.log('🔍 Getting user IDs from database...');
    
    const result = await pool.query('SELECT id, name, email FROM users LIMIT 10');
    
    console.log('✅ Found users:');
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

getUserIds();
