-- Push Campaigns Table
-- Tracks push notification broadcasts and their performance metrics

CREATE TABLE IF NOT EXISTS push_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL, -- Internal name for the campaign (e.g., 'Tonight in TLV')
  title VARCHAR(255),         -- The actual push notification title
  body TEXT,                  -- The actual push notification body
  target_audience VARCHAR(50),-- e.g., 'all', 'nearby_users', 'inactive_users'
  sent_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_campaigns_created_at ON push_campaigns(created_at);

-- Add comment for documentation
COMMENT ON TABLE push_campaigns IS 'Tracks push notification broadcasts for analytics: sent counts and campaign metadata';
