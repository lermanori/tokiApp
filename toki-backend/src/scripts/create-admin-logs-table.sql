-- Create admin_logs table for tracking blocks and other admin actions
-- This table provides an audit trail for Apple App Review compliance

CREATE TABLE IF NOT EXISTS admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(50) NOT NULL, -- 'user_block', 'user_unblock', 'content_delete', etc.
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_id UUID, -- User ID, Toki ID, etc.
  target_type VARCHAR(50), -- 'user', 'toki', 'message'
  details JSONB, -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for admin_logs performance
CREATE INDEX IF NOT EXISTS idx_admin_logs_action_type ON admin_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_target ON admin_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);

-- Comment on table
COMMENT ON TABLE admin_logs IS 'Admin activity logs for tracking user blocks and other moderation actions. Required for Apple App Review Guideline 1.2 compliance.';
