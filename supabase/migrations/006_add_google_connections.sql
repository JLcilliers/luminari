-- Google Connections table for OAuth tokens per project
-- This allows each brand/project to have its own Google connection

CREATE TABLE IF NOT EXISTS google_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  google_sub TEXT, -- Google's unique user ID
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMPTZ NOT NULL,
  scopes TEXT[], -- Array of granted scopes
  gsc_property TEXT, -- Selected Google Search Console property
  ga4_property TEXT, -- Selected GA4 property
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each project can only have one Google connection
  CONSTRAINT unique_project_google UNIQUE (project_id)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_google_connections_project_id ON google_connections(project_id);

-- Add GSC-related columns to keywords table
ALTER TABLE keywords
  ADD COLUMN IF NOT EXISTS gsc_clicks INTEGER,
  ADD COLUMN IF NOT EXISTS gsc_impressions INTEGER,
  ADD COLUMN IF NOT EXISTS gsc_ctr DECIMAL(5,4),
  ADD COLUMN IF NOT EXISTS gsc_position DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS gsc_last_synced TIMESTAMPTZ;

-- Update source type to include 'gsc' for Google Search Console imported keywords
-- Note: The source column is TEXT type, so we just need to allow 'gsc' as a valid value

COMMENT ON TABLE google_connections IS 'Stores Google OAuth tokens per project for GSC and GA4 integration';
COMMENT ON COLUMN google_connections.gsc_property IS 'Selected GSC property URL (e.g., sc-domain:example.com)';
COMMENT ON COLUMN google_connections.ga4_property IS 'Selected GA4 property ID';
COMMENT ON COLUMN keywords.gsc_clicks IS 'Clicks from Google Search Console';
COMMENT ON COLUMN keywords.gsc_impressions IS 'Impressions from Google Search Console';
COMMENT ON COLUMN keywords.gsc_ctr IS 'Click-through rate from GSC (0.0-1.0)';
COMMENT ON COLUMN keywords.gsc_position IS 'Average position from GSC';
