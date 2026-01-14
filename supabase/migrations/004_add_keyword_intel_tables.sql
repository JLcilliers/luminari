-- Keyword Intel & Content Optimizer Tables
-- Run this in your Supabase SQL editor

-- Keywords table - Main storage for keyword data from GSC/DataForSEO
CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  search_volume INT,
  cpc FLOAT,
  competition FLOAT,
  difficulty INT,
  position INT,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  ctr FLOAT DEFAULT 0,
  source TEXT CHECK (source IN ('gsc', 'dataforseo', 'manual')) DEFAULT 'manual',
  intent_type TEXT CHECK (intent_type IN ('informational', 'commercial', 'transactional', 'navigational')),
  url TEXT,
  is_tracked BOOLEAN DEFAULT false,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, keyword)
);

-- Keyword history table - Track position changes over time
CREATE TABLE keyword_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id UUID REFERENCES keywords(id) ON DELETE CASCADE,
  position INT,
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  ctr FLOAT DEFAULT 0,
  recorded_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(keyword_id, recorded_date)
);

-- Competitor keywords table - Store competitor keyword analysis
CREATE TABLE competitor_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  competitor_domain TEXT NOT NULL,
  keyword TEXT NOT NULL,
  position INT,
  search_volume INT,
  traffic_share FLOAT,
  url TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, competitor_domain, keyword)
);

-- Optimization tasks table - For Content Optimizer workflow
CREATE TABLE optimization_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  keyword_id UUID REFERENCES keywords(id) ON DELETE SET NULL,
  target_url TEXT NOT NULL,
  target_keyword TEXT NOT NULL,
  current_position INT,
  target_position INT DEFAULT 1,
  page_content TEXT,
  ai_analysis JSONB,
  recommendations JSONB,
  status TEXT CHECK (status IN ('pending', 'analyzing', 'optimized', 'published', 'failed')) DEFAULT 'pending',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_keywords_project ON keywords(project_id);
CREATE INDEX idx_keywords_tracked ON keywords(project_id, is_tracked) WHERE is_tracked = true;
CREATE INDEX idx_keywords_volume ON keywords(search_volume DESC NULLS LAST);
CREATE INDEX idx_keywords_position ON keywords(position ASC NULLS LAST);
CREATE INDEX idx_keyword_history_date ON keyword_history(keyword_id, recorded_date DESC);
CREATE INDEX idx_competitor_keywords_project ON competitor_keywords(project_id);
CREATE INDEX idx_competitor_keywords_domain ON competitor_keywords(project_id, competitor_domain);
CREATE INDEX idx_optimization_tasks_project ON optimization_tasks(project_id);
CREATE INDEX idx_optimization_tasks_status ON optimization_tasks(project_id, status);

-- Enable Row Level Security
ALTER TABLE keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE keyword_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimization_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth)
CREATE POLICY "Allow all access to keywords" ON keywords FOR ALL USING (true);
CREATE POLICY "Allow all access to keyword_history" ON keyword_history FOR ALL USING (true);
CREATE POLICY "Allow all access to competitor_keywords" ON competitor_keywords FOR ALL USING (true);
CREATE POLICY "Allow all access to optimization_tasks" ON optimization_tasks FOR ALL USING (true);
