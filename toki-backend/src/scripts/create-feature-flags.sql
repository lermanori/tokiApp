CREATE TABLE IF NOT EXISTS feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL
);

INSERT INTO feature_flags (key, enabled, description)
VALUES ('boosts', FALSE, 'Boost monetization: paid promotion of tokis, engagement insights, did-you-go prompts')
ON CONFLICT (key) DO NOTHING;
