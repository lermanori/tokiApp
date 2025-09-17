-- Create table for Toki invites
CREATE TABLE IF NOT EXISTS toki_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited', -- invited | accepted | declined
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (toki_id, invited_user_id)
);

CREATE INDEX IF NOT EXISTS idx_toki_invites_toki_id ON toki_invites(toki_id);
CREATE INDEX IF NOT EXISTS idx_toki_invites_invited_user_id ON toki_invites(invited_user_id);

