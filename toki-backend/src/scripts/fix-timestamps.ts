import { pool } from '../config/database';

async function fixTimestamps() {
  try {
    console.log('🔧 Starting timestamp fix...');
    
    // Check current message count
    const countResult = await pool.query('SELECT COUNT(*) as count FROM messages');
    console.log(`📊 Found ${countResult.rows[0].count} messages to potentially fix`);
    
    // Update all messages by adding 2 hours to compensate for timezone issue
    const result = await pool.query(`
      UPDATE messages 
      SET created_at = created_at + INTERVAL '2 hours' 
      WHERE created_at < NOW() - INTERVAL '1 hour'
      RETURNING id, created_at
    `);
    
    console.log(`✅ Fixed ${result.rows.length} message timestamps`);
    
    if (result.rows.length > 0) {
      console.log('📝 Sample fixed timestamps:');
      result.rows.slice(0, 3).forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.id}: ${row.created_at}`);
      });
    }
    
    console.log('🎉 Timestamp fix completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing timestamps:', error);
    process.exit(1);
  }
}

fixTimestamps();
