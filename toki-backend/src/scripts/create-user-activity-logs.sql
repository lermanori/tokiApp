-- User Activity Logs Table
-- Tracks user activity events: logins, WebSocket connections, and disconnections

CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL, -- 'login', 'connect', 'disconnect'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_event_type ON user_activity_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_event_time ON user_activity_logs(user_id, event_type, created_at);

-- Add comment for documentation
COMMENT ON TABLE user_activity_logs IS 'Tracks user activity events for analytics: login events, WebSocket connections, and disconnections';
COMMENT ON COLUMN user_activity_logs.event_type IS 'Type of event: login (authentication), connect (WebSocket connection), disconnect (WebSocket disconnection)';

