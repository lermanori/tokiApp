-- Boost Monetization Tables
-- Migration 20: Boost system for Toki monetization

-- 1. Boost Tiers (static lookup)
CREATE TABLE IF NOT EXISTS boost_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,          -- 'basic', 'standard', 'premium', 'pro_pack'
  display_name VARCHAR(100) NOT NULL,        -- 'Basic', 'Standard', 'Premium', 'Pro Pack'
  price_ils NUMERIC(10,2) NOT NULL,          -- Price in ILS (₪)
  total_hours INTEGER NOT NULL,              -- Number of boost hours included
  description TEXT,
  is_splittable BOOLEAN DEFAULT FALSE,       -- Pro Pack can split hours
  validity_days INTEGER DEFAULT NULL,        -- Pro Pack: 30 days to use hours
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 4 tiers
INSERT INTO boost_tiers (name, display_name, price_ils, total_hours, description, is_splittable, validity_days, sort_order)
VALUES
  ('basic',    'Basic',    29,  2,  '2 hours of priority placement + Featured badge + full insights', FALSE, NULL, 1),
  ('standard', 'Standard', 79,  6,  '6 hours of priority placement + Featured badge + full insights', FALSE, NULL, 2),
  ('premium',  'Premium',  139, 12, '12 hours of priority placement + Featured badge + full insights', FALSE, NULL, 3),
  ('pro_pack', 'Pro Pack',  229, 30, '30 hours of priority placement (splittable within 30 days) + Featured badge + full insights', TRUE, 30, 4)
ON CONFLICT (name) DO NOTHING;

-- 2. Boosts (purchased boost instances)
CREATE TABLE IF NOT EXISTS boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES boost_tiers(id),
  toki_id UUID REFERENCES tokis(id) ON DELETE SET NULL,   -- NULL for Pro Pack until activated on a specific toki
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_hours INTEGER NOT NULL,
  hours_used NUMERIC(10,2) DEFAULT 0,
  hours_remaining NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'purchased' CHECK (status IN ('purchased', 'active', 'paused', 'expired', 'completed')),
  payment_method VARCHAR(50) DEFAULT 'manual',            -- 'manual', 'stripe', 'apple_iap', etc.
  payment_reference VARCHAR(255),                         -- External payment ID or manual note
  payment_amount NUMERIC(10,2),
  payment_currency VARCHAR(10) DEFAULT 'ILS',
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,                                 -- Pro Pack: purchase_date + 30 days
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boosts_host_id ON boosts(host_id);
CREATE INDEX IF NOT EXISTS idx_boosts_toki_id ON boosts(toki_id);
CREATE INDEX IF NOT EXISTS idx_boosts_status ON boosts(status);

-- 3. Boost Activations (tracks individual activation sessions, especially for Pro Pack)
CREATE TABLE IF NOT EXISTS boost_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boost_id UUID NOT NULL REFERENCES boosts(id) ON DELETE CASCADE,
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  hours_allocated NUMERIC(10,2) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  actual_end_at TIMESTAMPTZ,                              -- Set when manually paused or expired
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boost_activations_boost_id ON boost_activations(boost_id);
CREATE INDEX IF NOT EXISTS idx_boost_activations_toki_id ON boost_activations(toki_id);
CREATE INDEX IF NOT EXISTS idx_boost_activations_status ON boost_activations(status);
CREATE INDEX IF NOT EXISTS idx_boost_activations_ends_at ON boost_activations(ends_at);

-- 4. Toki Engagement Events (real-time visibility tracking for boosted Tokis)
CREATE TABLE IF NOT EXISTS toki_engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  boost_id UUID REFERENCES boosts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,    -- NULL for anonymous views
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('view', 'open', 'save', 'join_request', 'chat_join')),
  is_during_boost BOOLEAN DEFAULT FALSE,                   -- True if event occurred while boost was active
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_engagement_toki_id ON toki_engagement_events(toki_id);
CREATE INDEX IF NOT EXISTS idx_engagement_boost_id ON toki_engagement_events(boost_id);
CREATE INDEX IF NOT EXISTS idx_engagement_event_type ON toki_engagement_events(event_type);
CREATE INDEX IF NOT EXISTS idx_engagement_created_at ON toki_engagement_events(created_at);
CREATE INDEX IF NOT EXISTS idx_engagement_during_boost ON toki_engagement_events(is_during_boost);

-- 5. "Did you go?" Responses
CREATE TABLE IF NOT EXISTS did_you_go_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  response BOOLEAN NOT NULL,                               -- TRUE = "Yes, I went", FALSE = "No"
  prompted_at TIMESTAMPTZ,                                 -- When the card was shown
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(toki_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_did_you_go_toki_id ON did_you_go_responses(toki_id);
CREATE INDEX IF NOT EXISTS idx_did_you_go_user_id ON did_you_go_responses(user_id);

-- 6. "Did you go?" Pending prompts (tracks which users should see the survey)
CREATE TABLE IF NOT EXISTS did_you_go_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toki_id UUID NOT NULL REFERENCES tokis(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'shown', 'responded', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                                  -- ~48h after creation
  UNIQUE(toki_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_dyg_prompts_user_status ON did_you_go_prompts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_dyg_prompts_toki_id ON did_you_go_prompts(toki_id);

-- 7. Add boost columns to tokis table
ALTER TABLE tokis ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT FALSE;
ALTER TABLE tokis ADD COLUMN IF NOT EXISTS active_boost_id UUID REFERENCES boosts(id) ON DELETE SET NULL;
