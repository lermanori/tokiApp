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

    // Migration 5: Push tokens
    try {
      console.log('📝 Migration 5: Creating push_tokens table...');
      const pushTokensSql = readFileSync(
        join(sqlDir, 'create-push-tokens.sql'),
        'utf-8'
      );
      await pool.query(pushTokensSql);
      console.log('✅ Push tokens migration completed\n');
    } catch (error: any) {
      if (error.code === '42P07' || error.message?.includes('already exists')) {
        console.log('ℹ️  Push tokens table already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 6: Add external_link column to tokis table
    try {
      console.log('📝 Migration 6: Adding external_link column to tokis table...');
      const externalLinkSql = readFileSync(
        join(sqlDir, 'add-external-link-column.sql'),
        'utf-8'
      );
      await pool.query(externalLinkSql);
      console.log('✅ External link column migration completed\n');
    } catch (error: any) {
      if (error.code === '42701' || error.message?.includes('already exists')) {
        console.log('ℹ️  External link column already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 7: App settings
    try {
      console.log('📝 Migration 7: Creating app_settings table and default values...');
      const appSettingsSql = readFileSync(
        join(sqlDir, 'create-app-settings.sql'),
        'utf-8'
      );
      await pool.query(appSettingsSql);
      console.log('✅ App settings migration completed\n');
    } catch (error: any) {
      if (error.code === '42P07' || error.message?.includes('already exists')) {
        console.log('ℹ️  app_settings table already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 8: User activity logs
    try {
      console.log('📝 Migration 8: Creating user_activity_logs table...');
      const activityLogsSql = readFileSync(
        join(sqlDir, 'create-user-activity-logs.sql'),
        'utf-8'
      );
      await pool.query(activityLogsSql);
      console.log('✅ User activity logs migration completed\n');
    } catch (error: any) {
      if (error.code === '42P07' || error.message?.includes('already exists')) {
        console.log('ℹ️  user_activity_logs table already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 9: Add invitation_credits column
    try {
      console.log('📝 Migration 9: Adding invitation_credits column to users table...');
      const invitationCreditsSql = readFileSync(
        join(sqlDir, 'add-invitation-credits-column.sql'),
        'utf-8'
      );
      await pool.query(invitationCreditsSql);
      console.log('✅ Invitation credits column migration completed\n');
    } catch (error: any) {
      if (error.code === '42701' || error.message?.includes('already exists')) {
        console.log('ℹ️  Invitation credits column already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 10: Create invitations table
    try {
      console.log('📝 Migration 10: Creating invitations table...');
      const invitationsSql = readFileSync(
        join(sqlDir, 'create-invitations-table.sql'),
        'utf-8'
      );
      await pool.query(invitationsSql);
      console.log('✅ Invitations table migration completed\n');
    } catch (error: any) {
      if (error.code === '42P07' || error.message?.includes('already exists')) {
        console.log('ℹ️  Invitations table already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 11: Add unlimited max attendees and auto-approve
    try {
      console.log('📝 Migration 11: Adding unlimited max attendees and auto-approve features...');
      const unlimitedAutoApproveSql = readFileSync(
        join(sqlDir, 'add-unlimited-and-autoapprove.sql'),
        'utf-8'
      );
      await pool.query(unlimitedAutoApproveSql);
      console.log('✅ Unlimited and auto-approve migration completed\n');
    } catch (error: any) {
      if (error.code === '42701' || error.code === '42703' || error.message?.includes('already exists') || error.message?.includes('does not exist')) {
        console.log('ℹ️  Unlimited/auto-approve migration already applied or column exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 12: Scheduled notifications
    try {
      console.log('📝 Migration 12: Creating scheduled_notifications table...');
      const scheduledNotificationsSql = readFileSync(
        join(sqlDir, 'create-scheduled-notifications-table.sql'),
        'utf-8'
      );
      await pool.query(scheduledNotificationsSql);
      console.log('✅ Scheduled notifications migration completed\n');
    } catch (error: any) {
      if (error.code === '42P07' || error.message?.includes('already exists')) {
        console.log('ℹ️  Scheduled notifications table already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 13: MCP API keys
    try {
      console.log('📝 Migration 13: Creating mcp_api_keys table...');
      const mcpKeysSql = readFileSync(
        join(sqlDir, 'create-mcp-api-keys.sql'),
        'utf-8'
      );
      await pool.query(mcpKeysSql);
      console.log('✅ MCP API keys migration completed\n');
    } catch (error: any) {
      if (error.code === '42P07' || error.message?.includes('already exists')) {
        console.log('ℹ️  mcp_api_keys table already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 14: Add user_id to mcp_api_keys
    try {
      console.log('📝 Migration 14: Adding user_id column to mcp_api_keys table...');
      const addUserIdSql = readFileSync(
        join(sqlDir, 'add-user-id-to-mcp-api-keys.sql'),
        'utf-8'
      );
      await pool.query(addUserIdSql);
      console.log('✅ user_id column migration completed\n');
    } catch (error: any) {
      if (error.code === '42701' || error.message?.includes('already exists')) {
        console.log('ℹ️  user_id column already exists, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 15: Add terms acceptance tracking
    try {
      console.log('📝 Migration 15: Adding terms acceptance columns to users table...');
      const termsAcceptanceSql = readFileSync(
        join(sqlDir, 'add-terms-acceptance-columns.sql'),
        'utf-8'
      );
      await pool.query(termsAcceptanceSql);
      console.log('✅ Terms acceptance columns migration completed\n');
    } catch (error: any) {
      if (error.code === '42701' || error.message?.includes('already exists')) {
        console.log('ℹ️  Terms acceptance columns already exist, skipping...\n');
      } else {
        throw error;
      }
    }

    // Migration 16: Create unified content_reports table
    try {
      console.log('📝 Migration 16: Creating content_reports table for unified reporting...');
      const contentReportsSql = readFileSync(
        join(sqlDir, 'create-unified-content-reports.sql'),
        'utf-8'
      );
      await pool.query(contentReportsSql);
      console.log('✅ Content reports table migration completed\n');
    } catch (error: any) {
      if (error.code === '42P07' || error.message?.includes('already exists')) {
        console.log('ℹ️  Content reports table already exists, skipping...\n');
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

