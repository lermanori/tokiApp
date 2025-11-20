-- Toki Backend Database Schema Setup
-- Run this script in your Railway PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    bio TEXT,
    location VARCHAR(255),
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    avatar_url VARCHAR(500),
    verified BOOLEAN DEFAULT FALSE,
    rating NUMERIC(3,2) DEFAULT 0.00,
    member_since TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    verification_token VARCHAR(255),
    verification_token_expires TIMESTAMPTZ,
    reset_password_token VARCHAR(255),
    reset_password_expires TIMESTAMPTZ
);

-- Social links table (one-to-many with users)
CREATE TABLE IF NOT EXISTS user_social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'instagram', 'tiktok', 'linkedin', 'facebook'
  username VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User statistics table
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tokis_created INTEGER DEFAULT 0,
  tokis_joined INTEGER DEFAULT 0,
  connections_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- 2. Tokis (Activities) Table
CREATE TABLE IF NOT EXISTS tokis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  time_slot VARCHAR(50) NOT NULL, -- 'now', '30min', '1hour', '2hours', '3hours', 'tonight', 'tomorrow'
  scheduled_time TIMESTAMP,
  max_attendees INTEGER DEFAULT 10, -- NULL means unlimited
  current_attendees INTEGER DEFAULT 0,
  category VARCHAR(50) NOT NULL, -- 'sports', 'coffee', 'music', 'food', 'work', 'art', 'nature', 'drinks'
  visibility VARCHAR(20) DEFAULT 'public', -- 'public', 'connections', 'friends'
  image_url VARCHAR(500),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'completed'
  auto_approve BOOLEAN DEFAULT FALSE, -- If true, join requests are automatically approved
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Toki tags table (many-to-many)
CREATE TABLE IF NOT EXISTS toki_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID REFERENCES tokis(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Toki Participants Table
CREATE TABLE IF NOT EXISTS toki_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID REFERENCES tokis(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'joined', 'declined'
  joined_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(toki_id, user_id)
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID REFERENCES tokis(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'location'
  media_url VARCHAR(500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User Connections Table
CREATE TABLE IF NOT EXISTS user_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id)
);

-- 6. Saved Tokis Table
CREATE TABLE IF NOT EXISTS saved_tokis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  toki_id UUID REFERENCES tokis(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, toki_id)
);

-- 7. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'join_request', 'request_approved', 'new_message', 'connection_request'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  related_toki_id UUID REFERENCES tokis(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 8. Push Tokens Table
CREATE TABLE IF NOT EXISTS push_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL,
  platform VARCHAR(16) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- Create indexes for better performance
-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);
CREATE INDEX IF NOT EXISTS idx_users_coordinates ON users(latitude, longitude);

-- Tokis table indexes
CREATE INDEX IF NOT EXISTS idx_tokis_host_id ON tokis(host_id);
CREATE INDEX IF NOT EXISTS idx_tokis_category ON tokis(category);
CREATE INDEX IF NOT EXISTS idx_tokis_location ON tokis(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_tokis_created_at ON tokis(created_at);
CREATE INDEX IF NOT EXISTS idx_tokis_status ON tokis(status);

-- Participants table indexes
CREATE INDEX IF NOT EXISTS idx_participants_toki_id ON toki_participants(toki_id);
CREATE INDEX IF NOT EXISTS idx_participants_user_id ON toki_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_status ON toki_participants(status);

-- Messages table indexes
CREATE INDEX IF NOT EXISTS idx_messages_toki_id ON messages(toki_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Connections table indexes
CREATE INDEX IF NOT EXISTS idx_connections_requester ON user_connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_recipient ON user_connections(recipient_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON user_connections(status);

-- Full-text search setup for Tokis
ALTER TABLE tokis ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_tokis_search ON tokis USING gin(search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_toki_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS toki_search_update ON tokis;
CREATE TRIGGER toki_search_update
  BEFORE INSERT OR UPDATE ON tokis
  FOR EACH ROW EXECUTE FUNCTION update_toki_search_vector();

-- Create function to update user stats
CREATE OR REPLACE FUNCTION update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update tokis_created count
  UPDATE user_stats 
  SET tokis_created = (
    SELECT COUNT(*) FROM tokis WHERE host_id = NEW.host_id
  )
  WHERE user_id = NEW.host_id;
  
  -- Update tokis_joined count
  UPDATE user_stats 
  SET tokis_joined = (
    SELECT COUNT(*) FROM toki_participants 
    WHERE user_id = NEW.host_id AND status IN ('approved', 'joined')
  )
  WHERE user_id = NEW.host_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating user stats
CREATE TRIGGER update_user_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tokis
  FOR EACH ROW EXECUTE FUNCTION update_user_stats();

-- Create trigger for updating participant counts
CREATE OR REPLACE FUNCTION update_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE tokis 
    SET current_attendees = current_attendees + 1
    WHERE id = NEW.toki_id AND NEW.status = 'joined';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'joined' AND NEW.status = 'joined' THEN
      UPDATE tokis 
      SET current_attendees = current_attendees + 1
      WHERE id = NEW.toki_id;
    ELSIF OLD.status = 'joined' AND NEW.status != 'joined' THEN
      UPDATE tokis 
      SET current_attendees = current_attendees - 1
      WHERE id = NEW.toki_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'joined' THEN
      UPDATE tokis 
      SET current_attendees = current_attendees - 1
      WHERE id = OLD.toki_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_participant_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON toki_participants
  FOR EACH ROW EXECUTE FUNCTION update_participant_count(); 

-- User ratings and reviews table
CREATE TABLE IF NOT EXISTS user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rated_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one rating per user per event
  UNIQUE(rater_id, rated_user_id, toki_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_ratings_rated_user_id ON user_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_toki_id ON user_ratings(toki_id);
CREATE INDEX IF NOT EXISTS idx_user_ratings_created_at ON user_ratings(created_at);
CREATE INDEX IF NOT EXISTS idx_user_ratings_rater_id ON user_ratings(rater_id);

-- Add status column to tokis table if it doesn't exist
ALTER TABLE tokis ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'));

-- Add status column to toki_participants table if it doesn't exist
ALTER TABLE toki_participants ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'joined' CHECK (status IN ('pending', 'approved', 'joined', 'completed', 'declined'));

-- User blocking table
CREATE TABLE user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_user_id)
);

-- Add indexes for performance
CREATE INDEX idx_user_ratings_reviewer ON user_ratings(reviewer_id);
CREATE INDEX idx_user_ratings_reviewed ON user_ratings(reviewed_user_id);
CREATE INDEX idx_user_ratings_rating ON user_ratings(rating);
CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_user_id);

-- Update user_stats table to include rating statistics
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_ratings INTEGER DEFAULT 0;
ALTER TABLE user_stats ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Function to update user rating statistics
CREATE OR REPLACE FUNCTION update_user_rating_stats()
RETURNS trigger AS $$
BEGIN
  -- Update average rating and total ratings for the reviewed user
  UPDATE user_stats 
  SET 
    average_rating = (
      SELECT COALESCE(AVG(rating), 0.00) 
      FROM user_ratings 
      WHERE reviewed_user_id = NEW.reviewed_user_id
    ),
    total_ratings = (
      SELECT COUNT(*) 
      FROM user_ratings 
      WHERE reviewed_user_id = NEW.reviewed_user_id
    ),
    total_reviews = (
      SELECT COUNT(*) 
      FROM user_ratings 
      WHERE reviewed_user_id = NEW.reviewed_user_id AND review_text IS NOT NULL
    ),
    last_updated = NOW()
  WHERE user_id = NEW.reviewed_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update rating statistics
CREATE TRIGGER update_user_rating_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_ratings
  FOR EACH ROW EXECUTE FUNCTION update_user_rating_stats(); 

-- Conversation read state tracking
CREATE TABLE IF NOT EXISTS conversation_read_state (
    conversation_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    last_read_message_id BIGINT NOT NULL,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(conversation_id, user_id),
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(last_read_message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Toki read state tracking
CREATE TABLE IF NOT EXISTS toki_read_state (
    toki_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    last_read_message_id BIGINT NOT NULL,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(toki_id, user_id),
    FOREIGN KEY(toki_id) REFERENCES tokis(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(last_read_message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Saved Tokis table
CREATE TABLE IF NOT EXISTS saved_tokis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, toki_id)
);

-- Indexes for saved_tokis
CREATE INDEX IF NOT EXISTS idx_saved_tokis_user_id ON saved_tokis(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_tokis_toki_id ON saved_tokis(toki_id);
CREATE INDEX IF NOT EXISTS idx_saved_tokis_saved_at ON saved_tokis(saved_at);

-- Index for performance on messages table
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_id ON messages(conversation_id, id);
CREATE INDEX IF NOT EXISTS idx_messages_toki_id_id ON messages(toki_id, id);

-- Message reports table for moderation
CREATE TABLE IF NOT EXISTS message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for message reports
CREATE INDEX IF NOT EXISTS idx_message_reports_message_id ON message_reports(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_reporter_id ON message_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_status ON message_reports(status);
CREATE INDEX IF NOT EXISTS idx_message_reports_reported_at ON message_reports(reported_at); 