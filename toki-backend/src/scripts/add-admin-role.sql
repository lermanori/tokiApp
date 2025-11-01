-- Add admin role to users table
-- Run this script to add role column and enable admin functionality

ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' 
  CHECK (role IN ('user', 'admin'));

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Grant admin role to specific users (run manually after migration)
-- Example: UPDATE users SET role = 'admin' WHERE email = 'admin@toki-app.com';


