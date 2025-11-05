#!/usr/bin/env node
/**
 * Cleanup script: Remove duplicate system notifications for connection requests
 * 
 * This script deletes redundant notifications from the 'notifications' table
 * that were created for connection requests and accepted connections.
 * These are now handled by the unified notifications endpoint pulling directly
 * from the user_connections table.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function cleanupDuplicateNotifications() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Searching for duplicate connection notifications...\n');

    // Find and delete system notifications for connection_request
    const connectionRequestResult = await client.query(`
      DELETE FROM notifications 
      WHERE type = 'connection_request'
      RETURNING id, user_id, title, created_at
    `);
    
    console.log(`✅ Deleted ${connectionRequestResult.rowCount} connection_request notifications`);
    if (connectionRequestResult.rowCount > 0) {
      console.log('   Sample deleted:', connectionRequestResult.rows.slice(0, 3));
    }

    // Find and delete system notifications for request_approved (accepted connections)
    const requestApprovedResult = await client.query(`
      DELETE FROM notifications 
      WHERE type = 'request_approved'
      RETURNING id, user_id, title, created_at
    `);
    
    console.log(`✅ Deleted ${requestApprovedResult.rowCount} request_approved notifications`);
    if (requestApprovedResult.rowCount > 0) {
      console.log('   Sample deleted:', requestApprovedResult.rows.slice(0, 3));
    }

    // Find and delete system notifications for request_declined
    const requestDeclinedResult = await client.query(`
      DELETE FROM notifications 
      WHERE type = 'request_declined'
      RETURNING id, user_id, title, created_at
    `);
    
    console.log(`✅ Deleted ${requestDeclinedResult.rowCount} request_declined notifications`);
    if (requestDeclinedResult.rowCount > 0) {
      console.log('   Sample deleted:', requestDeclinedResult.rows.slice(0, 3));
    }

    const totalDeleted = connectionRequestResult.rowCount + 
                        requestApprovedResult.rowCount + 
                        requestDeclinedResult.rowCount;

    console.log(`\n🎉 Cleanup complete! Total notifications deleted: ${totalDeleted}`);
    console.log('\nℹ️  These notifications are now managed by the unified endpoint.');
    console.log('   Connection data is pulled directly from user_connections table.\n');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the cleanup
cleanupDuplicateNotifications()
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

















