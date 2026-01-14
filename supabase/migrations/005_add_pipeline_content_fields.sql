-- Migration: Add pipeline content fields to generated_content table
-- Run this in your Supabase SQL editor

-- Add new columns for pipeline output
ALTER TABLE generated_content
ADD COLUMN IF NOT EXISTS content_markdown TEXT,
ADD COLUMN IF NOT EXISTS content_html TEXT,
ADD COLUMN IF NOT EXISTS content_json JSONB,
ADD COLUMN IF NOT EXISTS schema_json TEXT,
ADD COLUMN IF NOT EXISTS readability_score INT,
ADD COLUMN IF NOT EXISTS pipeline_id TEXT,
ADD COLUMN IF NOT EXISTS target_keyword TEXT;

-- Update content_type constraint to allow more types
ALTER TABLE generated_content DROP CONSTRAINT IF EXISTS generated_content_content_type_check;
ALTER TABLE generated_content ADD CONSTRAINT generated_content_content_type_check
  CHECK (content_type IN ('article', 'listicle', 'comparison', 'how-to', 'faq', 'blog-post', 'guide'));

-- Make content column nullable since we now use content_markdown
ALTER TABLE generated_content ALTER COLUMN content DROP NOT NULL;

-- Index for pipeline_id lookups
CREATE INDEX IF NOT EXISTS idx_generated_content_pipeline ON generated_content(pipeline_id);
