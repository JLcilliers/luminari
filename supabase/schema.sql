-- PromptWatch Clone Database Schema
-- Run this in your Supabase SQL editor to create the tables

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tracked_brand TEXT NOT NULL,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monitors table
CREATE TABLE monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  language TEXT DEFAULT 'en',
  location TEXT DEFAULT 'US',
  ai_models TEXT[] DEFAULT '{"chatgpt","claude","gemini","perplexity","copilot"}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompts table
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  intent_type TEXT CHECK (intent_type IN ('organic', 'commercial')) DEFAULT 'organic',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Responses table
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES prompts(id) ON DELETE CASCADE,
  ai_model TEXT NOT NULL,
  response_text TEXT NOT NULL,
  sentiment_score FLOAT,
  mentions_brand BOOLEAN DEFAULT false,
  cites_domain BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  collected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Citations table
CREATE TABLE citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID REFERENCES responses(id) ON DELETE CASCADE,
  cited_domain TEXT NOT NULL,
  cited_url TEXT,
  citation_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visibility metrics (aggregated daily)
CREATE TABLE visibility_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  visibility_score FLOAT DEFAULT 0,
  mention_count INT DEFAULT 0,
  citation_count INT DEFAULT 0,
  sentiment_avg FLOAT,
  UNIQUE(project_id, prompt_id, date)
);

-- Indexes for performance
CREATE INDEX idx_responses_prompt ON responses(prompt_id);
CREATE INDEX idx_responses_collected ON responses(collected_at DESC);
CREATE INDEX idx_citations_domain ON citations(cited_domain);
CREATE INDEX idx_visibility_date ON visibility_metrics(project_id, date DESC);
CREATE INDEX idx_monitors_project ON monitors(project_id);
CREATE INDEX idx_prompts_monitor ON prompts(monitor_id);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE visibility_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth)
CREATE POLICY "Allow all access to projects" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all access to monitors" ON monitors FOR ALL USING (true);
CREATE POLICY "Allow all access to prompts" ON prompts FOR ALL USING (true);
CREATE POLICY "Allow all access to responses" ON responses FOR ALL USING (true);
CREATE POLICY "Allow all access to citations" ON citations FOR ALL USING (true);
CREATE POLICY "Allow all access to visibility_metrics" ON visibility_metrics FOR ALL USING (true);
