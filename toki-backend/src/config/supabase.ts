import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client for public operations (anonymously)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Create Supabase client for admin operations (with service role)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

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

export default supabase; 