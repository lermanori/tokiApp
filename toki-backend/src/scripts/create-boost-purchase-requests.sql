-- Boost purchase request authorization flow

CREATE TABLE IF NOT EXISTS boost_purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID NOT NULL REFERENCES boost_tiers(id),
  toki_id UUID REFERENCES tokis(id) ON DELETE SET NULL,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  boost_id UUID REFERENCES boosts(id) ON DELETE SET NULL,
  payment_amount NUMERIC(10,2) NOT NULL,
  payment_currency VARCHAR(10) NOT NULL DEFAULT 'ILS',
  status VARCHAR(20) NOT NULL DEFAULT 'pending_code'
    CHECK (status IN ('pending_code', 'code_issued', 'approved', 'expired', 'cancelled')),
  authorization_code VARCHAR(64),
  code_generated_at TIMESTAMPTZ,
  code_expires_at TIMESTAMPTZ,
  code_redeemed_at TIMESTAMPTZ,
  redeemed_at TIMESTAMPTZ,
  generated_by_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boost_purchase_requests_host_id
  ON boost_purchase_requests(host_id);
CREATE INDEX IF NOT EXISTS idx_boost_purchase_requests_toki_id
  ON boost_purchase_requests(toki_id);
CREATE INDEX IF NOT EXISTS idx_boost_purchase_requests_status
  ON boost_purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_boost_purchase_requests_code
  ON boost_purchase_requests(authorization_code);

CREATE TABLE IF NOT EXISTS boost_purchase_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES boost_purchase_requests(id) ON DELETE CASCADE,
  actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('host', 'admin', 'system')),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_boost_purchase_request_events_request_id
  ON boost_purchase_request_events(request_id, created_at DESC);
