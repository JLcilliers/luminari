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
    }
  }
}

// Entity types
export interface Project {
  id: string
  name: string
  tracked_brand: string
  website_url: string | null
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
