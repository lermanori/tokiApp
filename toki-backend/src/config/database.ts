import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const poolConfig: PoolConfig = {
  connectionString: databaseUrl,
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 10000, // Close idle clients after 10 seconds
  connectionTimeoutMillis: 10000, // Give up after 5s if a connection cannot be established
  keepAlive: true,
  ssl: { rejectUnauthorized: false },
  // Ensure all database operations use UTC timezone
  options: '--timezone=UTC'
};

// Set process timezone to UTC to avoid timezone issues
process.env.TZ = 'UTC';

export const pool = new Pool(poolConfig);

// Test the database connection and set timezone
export async function testDatabaseConnection() {
  try {
    const client = await pool.connect();
    
    // Explicitly set timezone to UTC for this connection
    await client.query("SET TIME ZONE 'UTC'");
    // Guard against long-running queries on this connection
    await client.query("SET statement_timeout = '5s'");
    await client.query("SET idle_in_transaction_session_timeout = '5s'");
    
    // Verify timezone setting
    const timezoneResult = await client.query('SHOW TIME ZONE');
    console.log('✅ Database connection successful!');
    console.log('⏰ Database timezone:', timezoneResult.rows[0].TimeZone);
    
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Set timezone for all new connections
export async function setDatabaseTimezone() {
  try {
    await pool.query("SET TIME ZONE 'UTC'");
    console.log('⏰ Database timezone set to UTC');
  } catch (error) {
    console.error('❌ Failed to set database timezone:', error);
  }
}

// Database table names
export const TABLES = {
  USERS: 'users',
  USER_SOCIAL_LINKS: 'user_social_links',
  USER_STATS: 'user_stats',
  TOKIS: 'tokis',
  TOKI_TAGS: 'toki_tags',
  TOKI_PARTICIPANTS: 'toki_participants',
  MESSAGES: 'messages',
  USER_CONNECTIONS: 'user_connections',
  SAVED_TOKIS: 'saved_tokis',
  NOTIFICATIONS: 'notifications'
} as const;

export default pool; 