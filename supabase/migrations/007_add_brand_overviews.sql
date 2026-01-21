-- Brand Overviews table for auto-generated brand analysis
-- This table stores the status and results of brand overview generation

-- Create enum-like check for status
CREATE TABLE brand_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Source URL used for crawling
  source_url TEXT NOT NULL,

  -- Generation status: PENDING, RUNNING, COMPLETE, FAILED
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED')),

  -- The final readable brand overview in markdown format
  summary_md TEXT,

  -- Optional structured output from AI generation (stores BrandBible JSON)
  raw_json JSONB,

  -- Crawl/generation warnings (non-fatal issues)
  warnings TEXT,

  -- Failure message (safe, non-sensitive error info)
  error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one overview per project (can regenerate/update existing)
  UNIQUE(project_id)
);

-- Indexes for performance
CREATE INDEX idx_brand_overviews_project ON brand_overviews(project_id);
CREATE INDEX idx_brand_overviews_status ON brand_overviews(status);

-- Enable Row Level Security
ALTER TABLE brand_overviews ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (matching existing pattern)
CREATE POLICY "Allow all access to brand_overviews" ON brand_overviews FOR ALL USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brand_overviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on any change
CREATE TRIGGER brand_overviews_updated_at
  BEFORE UPDATE ON brand_overviews
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_overviews_updated_at();
