-- Create email templates table
-- Stores customizable email templates for admin use

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(100) UNIQUE NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_text TEXT NOT NULL,
  variables JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default waitlist welcome template
INSERT INTO email_templates (template_name, subject, body_text, variables) 
VALUES (
  'waitlist_welcome',
  'You''re in. 🖤',
  'Hey,\n\nYou''re officially on the waitlist for Toki.\nYou''re number **#{position}** on the **{city}** list.\nWe''ll let you know the moment you can drop in.\n\nIn the meantime, don''t be a stranger.\nTell your people. The more of us here, the better it gets.\n\n—\nToki',
  '{"position": "number", "city": "string", "name": "string"}'::jsonb
) ON CONFLICT DO NOTHING;

-- Add index for faster lookups by name
CREATE INDEX IF NOT EXISTS idx_email_templates_name ON email_templates(template_name);

