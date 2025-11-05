-- Create toki_invite_links table for URL-based invites
CREATE TABLE IF NOT EXISTS toki_invite_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code VARCHAR(32) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited uses
  used_count INTEGER DEFAULT 0,
  custom_message TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_toki_invite_links_code ON toki_invite_links(invite_code);
CREATE INDEX IF NOT EXISTS idx_toki_invite_links_toki ON toki_invite_links(toki_id);
CREATE INDEX IF NOT EXISTS idx_toki_invite_links_active ON toki_invite_links(is_active);
CREATE INDEX IF NOT EXISTS idx_toki_invite_links_created_by ON toki_invite_links(created_by);

-- Add constraint to ensure only one active link per toki
CREATE UNIQUE INDEX IF NOT EXISTS idx_toki_invite_links_active_toki 
ON toki_invite_links(toki_id) 
WHERE is_active = true;

-- Add comment for documentation
COMMENT ON TABLE toki_invite_links IS 'Stores invite links for tokis that allow users to join via URL';
COMMENT ON COLUMN toki_invite_links.invite_code IS 'Short, shareable code for the invite link';
COMMENT ON COLUMN toki_invite_links.max_uses IS 'Maximum number of uses allowed (NULL = unlimited)';
COMMENT ON COLUMN toki_invite_links.used_count IS 'Number of times this link has been used';
COMMENT ON COLUMN toki_invite_links.is_active IS 'Whether this invite link is currently active';

















