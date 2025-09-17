-- Create table to hide Tokis from specific users
CREATE TABLE IF NOT EXISTS toki_hidden_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (toki_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_toki_hidden_users_toki_id ON toki_hidden_users(toki_id);
CREATE INDEX IF NOT EXISTS idx_toki_hidden_users_user_id ON toki_hidden_users(user_id);

