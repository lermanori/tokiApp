-- Migration: Create waitlist_signups table
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  phone text,
  location text,
  reason text,
  platform text,
  created_at timestamptz NOT NULL DEFAULT now()
);
