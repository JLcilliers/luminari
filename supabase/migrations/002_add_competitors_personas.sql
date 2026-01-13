-- Phase 4A: Add Competitors, Personas, and extend existing tables
-- Run this in Supabase SQL Editor

-- 1. Competitors table
CREATE TABLE IF NOT EXISTS competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Personas table
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  age_range TEXT,
  traits TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Extend projects table for Brand Book
ALTER TABLE projects ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS key_messages TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sitemap_url TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS indexed_pages INT DEFAULT 0;

-- 4. Extend prompts table
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS search_volume INT;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS difficulty_score FLOAT;
ALTER TABLE prompts ADD COLUMN IF NOT EXISTS visibility_pct FLOAT DEFAULT 0;

-- 5. Extend responses for competitor brand tracking
ALTER TABLE responses ADD COLUMN IF NOT EXISTS brands_mentioned TEXT[] DEFAULT '{}';

-- 6. Enable RLS
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Allow all competitors" ON competitors;
DROP POLICY IF EXISTS "Allow all personas" ON personas;

CREATE POLICY "Allow all competitors" ON competitors FOR ALL USING (true);
CREATE POLICY "Allow all personas" ON personas FOR ALL USING (true);

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_competitors_project ON competitors(project_id);
CREATE INDEX IF NOT EXISTS idx_personas_project ON personas(project_id);
