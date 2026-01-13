-- Migration: Add generated_content table for AI-powered content generation
-- Run this in your Supabase SQL editor

-- Generated Content table
CREATE TABLE generated_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'listicle', 'comparison', 'how-to', 'faq')),
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed', 'draft', 'published')),
  target_keywords TEXT[] DEFAULT '{}',
  word_count INT DEFAULT 0,
  seo_score INT,
  meta_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_generated_content_project ON generated_content(project_id);
CREATE INDEX idx_generated_content_status ON generated_content(status);
CREATE INDEX idx_generated_content_created ON generated_content(created_at DESC);

-- Enable Row Level Security
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (since no auth)
CREATE POLICY "Allow all access to generated_content" ON generated_content FOR ALL USING (true);
