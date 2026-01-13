// Database types for Supabase
export type Database = {
  public: {
    Tables: {
      projects: {
        Row: Project
        Insert: Omit<Project, 'id' | 'created_at'>
        Update: Partial<Omit<Project, 'id'>>
      }
      monitors: {
        Row: Monitor
        Insert: Omit<Monitor, 'id' | 'created_at'>
        Update: Partial<Omit<Monitor, 'id'>>
      }
      prompts: {
        Row: Prompt
        Insert: Omit<Prompt, 'id' | 'created_at'>
        Update: Partial<Omit<Prompt, 'id'>>
      }
      responses: {
        Row: Response
        Insert: Omit<Response, 'id' | 'collected_at'>
        Update: Partial<Omit<Response, 'id'>>
      }
      citations: {
        Row: Citation
        Insert: Omit<Citation, 'id' | 'created_at'>
        Update: Partial<Omit<Citation, 'id'>>
      }
      visibility_metrics: {
        Row: VisibilityMetric
        Insert: Omit<VisibilityMetric, 'id'>
        Update: Partial<Omit<VisibilityMetric, 'id'>>
      }
      competitors: {
        Row: Competitor
        Insert: Omit<Competitor, 'id' | 'created_at'>
        Update: Partial<Omit<Competitor, 'id'>>
      }
      personas: {
        Row: Persona
        Insert: Omit<Persona, 'id' | 'created_at'>
        Update: Partial<Omit<Persona, 'id'>>
      }
      generated_content: {
        Row: GeneratedContent
        Insert: Omit<GeneratedContent, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<GeneratedContent, 'id'>>
      }
    }
  }
}

// Entity types
export interface Project {
  id: string
  name: string
  tracked_brand: string
  website_url: string | null
  industry?: string
  description?: string
  key_messages?: string[]
  sitemap_url?: string
  indexed_pages?: number
  created_at: string
}

export interface Competitor {
  id: string
  project_id: string
  name: string
  website_url?: string
  created_at: string
}

export interface Persona {
  id: string
  project_id: string
  name: string
  description?: string
  age_range?: string
  traits: string[]
  created_at: string
}

export interface Monitor {
  id: string
  project_id: string
  name: string
  language: string
  location: string
  ai_models: AIModel[]
  is_active: boolean
  created_at: string
}

export interface Prompt {
  id: string
  monitor_id: string
  prompt_text: string
  intent_type: 'organic' | 'commercial'
  tags: string[]
  search_volume?: number
  difficulty_score?: number
  visibility_pct?: number
  created_at: string
}

export interface Response {
  id: string
  prompt_id: string
  ai_model: AIModel
  response_text: string
  sentiment_score: number | null
  mentions_brand: boolean
  cites_domain: boolean
  is_featured: boolean
  brands_mentioned?: string[]
  collected_at: string
}

export interface Citation {
  id: string
  response_id: string
  cited_domain: string
  cited_url: string | null
  citation_context: string | null
  created_at: string
}

export interface VisibilityMetric {
  id: string
  project_id: string
  prompt_id: string | null
  date: string
  visibility_score: number
  mention_count: number
  citation_count: number
  sentiment_avg: number | null
}

// Enums and constants
export type AIModel = 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'copilot'

export const AI_MODELS: AIModel[] = ['chatgpt', 'claude', 'gemini', 'perplexity', 'copilot']

export const AI_MODEL_LABELS: Record<AIModel, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  copilot: 'Copilot'
}

export const AI_MODEL_COLORS: Record<AIModel, string> = {
  chatgpt: '#10a37f',
  claude: '#d97706',
  gemini: '#4285f4',
  perplexity: '#6366f1',
  copilot: '#0078d4'
}

// Intent types
export type IntentType = 'organic' | 'commercial'

export const INTENT_TYPES: { value: IntentType; label: string }[] = [
  { value: 'organic', label: 'Organic' },
  { value: 'commercial', label: 'Commercial' }
]

// Helper types for joined data
export interface ResponseWithPrompt extends Response {
  prompt?: Prompt
}

export interface PromptWithMonitor extends Prompt {
  monitor?: Monitor
}

export interface MonitorWithProject extends Monitor {
  project?: Project
}

// Dashboard aggregation types
export interface VisibilityTrend {
  date: string
  visibility_score: number
  mention_count: number
  citation_count: number
}

export interface ModelDistribution {
  model: AIModel
  count: number
  percentage: number
}

export interface ShareOfVoice {
  domain: string
  mentions: number
  percentage: number
}

// Content Generation Types
export type ContentType = 'article' | 'listicle' | 'comparison' | 'how-to' | 'faq'

export const CONTENT_TYPES: { value: ContentType; label: string; description: string }[] = [
  { value: 'article', label: 'Article', description: 'In-depth article covering the topic comprehensively' },
  { value: 'listicle', label: 'Listicle', description: 'List-based article (e.g., "10 Best...")' },
  { value: 'comparison', label: 'Comparison', description: 'Compare your brand with competitors' },
  { value: 'how-to', label: 'How-To Guide', description: 'Step-by-step tutorial or guide' },
  { value: 'faq', label: 'FAQ', description: 'Frequently asked questions format' },
]

export type ContentStatus = 'generating' | 'completed' | 'failed' | 'draft' | 'published'

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  generating: 'Generating',
  completed: 'Completed',
  failed: 'Failed',
  draft: 'Draft',
  published: 'Published',
}

export interface GeneratedContent {
  id: string
  project_id: string
  prompt_id: string | null
  title: string
  content: string
  content_type: ContentType
  status: ContentStatus
  target_keywords: string[]
  word_count: number
  seo_score?: number
  meta_description?: string
  created_at: string
  updated_at: string
}

export interface ContentGenerationRequest {
  promptId?: string
  promptText: string
  contentType: ContentType
  targetKeywords: string[]
  brandName: string
  competitors?: string[]
  tone?: 'professional' | 'casual' | 'authoritative' | 'friendly'
  wordCountTarget?: number
}
