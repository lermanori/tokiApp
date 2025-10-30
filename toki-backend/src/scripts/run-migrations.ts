import { pool } from '../config/database';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigrations() {
  try {
    console.log('🔄 Running database migrations...\n');

    // Determine correct path (works for both ts-node and compiled JS)
    const sqlDir = __dirname.endsWith('scripts') ? __dirname : join(__dirname, '../scripts');

    // Migration 1: Add admin role
    try {
      console.log('📝 Migration 1: Adding admin role to users table...');
      const adminRoleSql = readFileSync(
        join(sqlDir, 'add-admin-role.sql'),
        'utf-8'
      );
      await pool.query(adminRoleSql);
      console.log('✅ Admin role migration completed\n');
    } catch (error: any) {
      if (error.code === '42701' || error.message?.includes('already exists')) {
        console.log('ℹ️  Admin role column already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 2: Algorithm hyperparameters
    try {
      console.log('📝 Migration 2: Creating algorithm_hyperparameters table...');
      const algorithmSql = readFileSync(
        join(sqlDir, 'create-algorithm-hyperparameters.sql'),
        'utf-8'
      );
      await pool.query(algorithmSql);
      console.log('✅ Algorithm hyperparameters migration completed\n');
    } catch (error: any) {
      if (error.code === '42P07' || error.message?.includes('already exists')) {
        console.log('ℹ️  Algorithm hyperparameters table already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 3: Email templates
    try {
      console.log('📝 Migration 3: Creating email_templates table...');
      const emailTemplatesSql = readFileSync(
        join(sqlDir, 'create-email-templates.sql'),
        'utf-8'
      );
      await pool.query(emailTemplatesSql);
      console.log('✅ Email templates migration completed\n');
    } catch (error: any) {
      if (error.code === '42P07' || error.message?.includes('already exists')) {
        console.log('ℹ️  Email templates table already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 4: User hidden activities
    try {
      console.log('📝 Migration 4: Creating user_hidden_activities table...');
      const hiddenActivitiesSql = readFileSync(
        join(sqlDir, 'create-user-hidden-activities.sql'),
        'utf-8'
      );
      await pool.query(hiddenActivitiesSql);
      console.log('✅ User hidden activities migration completed\n');
    } catch (error: any) {
      if (error.code === '42P07' || error.message?.includes('already exists')) {
        console.log('ℹ️  user_hidden_activities already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error: any) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default runMigrations;

