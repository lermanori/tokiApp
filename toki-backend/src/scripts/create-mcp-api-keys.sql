-- Create MCP API keys table for admin-only MCP access
CREATE TABLE IF NOT EXISTS mcp_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['admin'],
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP NULL,
  revoked_at TIMESTAMP NULL
);

CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_active
  ON mcp_api_keys ((revoked_at IS NULL));


