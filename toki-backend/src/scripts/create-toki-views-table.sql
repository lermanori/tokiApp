-- Create toki_views table for tracking analytics
CREATE TABLE IF NOT EXISTS toki_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance on analytics queries
CREATE INDEX IF NOT EXISTS idx_toki_views_toki_id ON toki_views(toki_id);
CREATE INDEX IF NOT EXISTS idx_toki_views_viewed_at ON toki_views(viewed_at);

COMMENT ON TABLE toki_views IS 'Tracks each time a Toki is viewed by a user or guest. Used for admin analytics and popular content ranking.';
