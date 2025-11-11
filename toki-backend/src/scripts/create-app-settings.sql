-- Create simple key-value settings table
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default password reset expiry to 2 hours
INSERT INTO app_settings(key, value)
VALUES ('password_reset_expiry_hours', '2'::jsonb)
ON CONFLICT (key) DO NOTHING;


