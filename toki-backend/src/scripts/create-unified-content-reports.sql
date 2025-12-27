-- Create unified content_reports table for all content types (Tokis, Users, Messages)
-- This table provides a centralized reporting system for Apple App Review compliance

CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL, -- 'toki', 'user', 'message'
  content_id UUID NOT NULL,
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_reports_content_type ON content_reports(content_type);
CREATE INDEX IF NOT EXISTS idx_content_reports_content_id ON content_reports(content_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_id ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_reported_at ON content_reports(reported_at);

-- Composite index for common queries (filtering by type and ID)
CREATE INDEX IF NOT EXISTS idx_content_reports_type_id ON content_reports(content_type, content_id);

-- Prevent duplicate pending reports from same user for same content
-- This ensures users can't spam reports for the same content
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_content_report 
  ON content_reports(reporter_id, content_type, content_id) 
  WHERE status = 'pending';

-- Comment on table
COMMENT ON TABLE content_reports IS 'Unified reporting table for all user-generated content types (Tokis, Users, Messages). Required for Apple App Review Guideline 1.2 compliance.';
