-- Add new Brand Bible fields to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS sub_industry TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS secondary_audiences TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS products_services TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pricing_model TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS brand_personality_traits TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS customer_pain_points TEXT[] DEFAULT '{}';
ALTER TABLE projects ADD COLUMN IF NOT EXISTS proof_points TEXT[] DEFAULT '{}';

-- Store crawl metadata (optional - for tracking crawl history)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS crawl_stats JSONB;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_crawled_at TIMESTAMPTZ;
