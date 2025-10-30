-- Create table to allow users to hide specific Tokis from their public profile
CREATE TABLE IF NOT EXISTS user_hidden_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, toki_id)
);

CREATE INDEX IF NOT EXISTS idx_uha_user_id ON user_hidden_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_uha_toki_id ON user_hidden_activities(toki_id);


