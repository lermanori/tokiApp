import { pool } from '../config/database';
import { readFileSync } from 'fs';
import { join } from 'path';

async function seedNotifications() {
  try {
    console.log('🌱 Seeding scheduled notifications...\n');

    // Determine correct path (works for both ts-node and compiled JS)
    const sqlDir = __dirname.endsWith('scripts') ? __dirname : join(__dirname, '../scripts');

    const seedSql = readFileSync(
      join(sqlDir, 'seed-scheduled-notifications.sql'),
      'utf-8'
    );

    await pool.query(seedSql);
    console.log('✅ Scheduled notifications seeded successfully!\n');

    // Verify the seeded data
    const result = await pool.query(
      'SELECT id, title, day_of_week, hour, minute FROM scheduled_notifications ORDER BY day_of_week, hour, minute'
    );

    console.log(`📋 Seeded ${result.rows.length} notification(s):`);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    result.rows.forEach((row: any) => {
      const dayName = days[row.day_of_week];
      const time = `${row.hour.toString().padStart(2, '0')}:${row.minute.toString().padStart(2, '0')}`;
      console.log(`  - ${dayName} ${time}: ${row.title}`);
    });
    console.log('');

  } catch (error: any) {
    console.error('❌ Error seeding notifications:', error);
    throw error;
  }
}

// Run seed if called directly
if (require.main === module) {
  seedNotifications()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}

export default seedNotifications;

