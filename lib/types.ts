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
      keywords: {
        Row: Keyword
        Insert: Omit<Keyword, 'id' | 'created_at' | 'last_updated'>
        Update: Partial<Omit<Keyword, 'id'>>
      }
      keyword_cart: {
        Row: KeywordCartItem
        Insert: Omit<KeywordCartItem, 'id' | 'added_at'>
        Update: Partial<Omit<KeywordCartItem, 'id'>>
      }
      competitor_domains: {
        Row: CompetitorDomain
        Insert: Omit<CompetitorDomain, 'id' | 'added_at'>
        Update: Partial<Omit<CompetitorDomain, 'id'>>
      }
    }
  }
}

// Brand Voice types
export type BrandVoice = 'professional' | 'casual' | 'technical' | 'friendly' | 'authoritative'

export const BRAND_VOICE_OPTIONS: { value: BrandVoice; label: string; description: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Formal, business-like communication' },
  { value: 'casual', label: 'Casual', description: 'Friendly, conversational tone' },
  { value: 'technical', label: 'Technical', description: 'Detailed, expert-level content' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, approachable style' },
  { value: 'authoritative', label: 'Authoritative', description: 'Confident, expert positioning' },
]

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
  // Enhanced Brand Bible fields (Phase 5A)
  target_audience?: string
  brand_voice?: BrandVoice
  tone_guidelines?: string
  key_differentiators?: string[]
  important_keywords?: string[]
  content_pillars?: string[]
  avoid_topics?: string[]
  unique_selling_points?: string[]
  target_personas?: string[]
  // Health Score fields
  health_score?: number
  health_updated_at?: string
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
  last_collected_at?: string
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
  // Pipeline columns
  content_markdown?: string
  content_html?: string
  content_json?: Record<string, unknown>
  schema_json?: Record<string, unknown>
  faq_schema?: Record<string, unknown>
  article_schema?: Record<string, unknown>
  readability_score?: number
  pipeline_metadata?: Record<string, unknown>
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

// Health Score Types (Phase 5A)
export interface HealthScoreBreakdown {
  brandCompletion: number      // 0-100, weight: 20%
  promptCoverage: number       // 0-100, weight: 25%
  responseCollection: number   // 0-100, weight: 20%
  contentGeneration: number    // 0-100, weight: 20%
  gapCoverage: number          // 0-100, weight: 15%
}

export interface HealthScoreData {
  score: number                // 0-100 weighted total
  breakdown: HealthScoreBreakdown
  lastUpdated: string | null
  trend: 'up' | 'down' | 'stable'
  recommendations: string[]
}

export const HEALTH_SCORE_WEIGHTS = {
  brandCompletion: 0.20,
  promptCoverage: 0.25,
  responseCollection: 0.20,
  contentGeneration: 0.20,
  gapCoverage: 0.15,
} as const

export const HEALTH_SCORE_THRESHOLDS = {
  excellent: 80,
  good: 60,
  fair: 40,
  poor: 0,
} as const

export type HealthScoreRating = 'excellent' | 'good' | 'fair' | 'poor'

export function getHealthScoreRating(score: number): HealthScoreRating {
  if (score >= HEALTH_SCORE_THRESHOLDS.excellent) return 'excellent'
  if (score >= HEALTH_SCORE_THRESHOLDS.good) return 'good'
  if (score >= HEALTH_SCORE_THRESHOLDS.fair) return 'fair'
  return 'poor'
}

export const HEALTH_SCORE_COLORS: Record<HealthScoreRating, string> = {
  excellent: '#22c55e', // green-500
  good: '#3b82f6',      // blue-500
  fair: '#f59e0b',      // amber-500
  poor: '#ef4444',      // red-500
}

// ==========================================
// Phase 5B: Keyword Fueler Types
// ==========================================

export type KeywordSource = 'mine' | 'plan' | 'compete' | 'manual' | 'gsc' | 'dataforseo'
export type KeywordIntent = 'informational' | 'commercial' | 'transactional' | 'navigational'
export type KeywordTrend = 'up' | 'down' | 'stable'

export const KEYWORD_SOURCE_LABELS: Record<KeywordSource, string> = {
  mine: 'Mining',
  plan: 'Planning',
  compete: 'Competitive',
  manual: 'Manual',
  gsc: 'Google Search Console',
  dataforseo: 'DataForSEO',
}

export const KEYWORD_INTENT_LABELS: Record<KeywordIntent, string> = {
  informational: 'Informational',
  commercial: 'Commercial',
  transactional: 'Transactional',
  navigational: 'Navigational',
}

export const KEYWORD_INTENT_COLORS: Record<KeywordIntent, string> = {
  informational: '#3b82f6', // blue
  commercial: '#22c55e',    // green
  transactional: '#f59e0b', // amber
  navigational: '#8b5cf6',  // purple
}

export interface Keyword {
  id: string
  project_id: string
  keyword: string
  source: KeywordSource
  position?: number
  search_volume?: number
  keyword_difficulty?: number
  cpc?: number
  trend?: KeywordTrend
  landing_page?: string
  competitor_source?: string
  intent_type?: KeywordIntent
  content_gap_pct: number
  opportunity_score: number
  in_cart: boolean
  sent_to_launchpad: boolean
  content_created: boolean
  last_updated: string
  created_at: string
  // GSC data fields
  gsc_clicks?: number
  gsc_impressions?: number
  gsc_ctr?: number
  gsc_position?: number
  gsc_last_synced?: string
}

export interface KeywordCartItem {
  id: string
  project_id: string
  keyword_id: string
  added_at: string
  keyword?: Keyword // Joined data
}

export interface CompetitorDomain {
  id: string
  project_id: string
  domain: string
  added_at: string
  last_analyzed?: string
  keywords_found: number
}

export interface KeywordAnalysisRequest {
  projectId: string
  type: 'plan' | 'compete'
  seedKeywords?: string[]  // For plan type
  competitorDomain?: string // For compete type
}

export interface KeywordAnalysisResponse {
  success: boolean
  keywords: Keyword[]
  source: KeywordSource
  error?: string
}

// ==========================================
// Phase 5C: Visibility Launchpad Types
// ==========================================

export type LaunchpadSource = 'answer_gap' | 'keyword_fueler'

export const LAUNCHPAD_SOURCE_LABELS: Record<LaunchpadSource, string> = {
  answer_gap: 'Answer Gap',
  keyword_fueler: 'Keyword Fueler',
}

export const LAUNCHPAD_SOURCE_COLORS: Record<LaunchpadSource, string> = {
  answer_gap: '#ef4444',     // red - gaps need attention
  keyword_fueler: '#3b82f6', // blue - keywords
}

// Extended Prompt type with launchpad fields
export interface PromptWithLaunchpad extends Prompt {
  in_launchpad?: boolean
  launch_priority?: number
  content_gap_pct?: number
  content_created?: boolean
  last_content_id?: string
}

// Unified Launchpad Item that can represent both prompts and keywords
export interface LaunchpadItem {
  id: string
  project_id: string
  source: LaunchpadSource
  title: string               // prompt_text or keyword
  priority_score: number      // Calculated priority
  visibility_pct?: number     // For prompts
  content_gap_pct: number     // 0-100, gap in content coverage
  search_volume?: number      // For keywords
  keyword_difficulty?: number // For keywords
  intent_type?: string        // informational, commercial, etc.
  content_created: boolean
  last_content_id?: string
  created_at: string
  // Original data references
  original_prompt?: PromptWithLaunchpad
  original_keyword?: Keyword
}

export interface LaunchpadStats {
  totalItems: number
  answerGapCount: number
  keywordCount: number
  contentCreated: number
  avgPriority: number
  topPriorityItems: LaunchpadItem[]
}

export interface LaunchpadFilters {
  source: LaunchpadSource | 'all'
  sortBy: 'priority' | 'visibility' | 'content_gap' | 'created_at'
  sortOrder: 'asc' | 'desc'
  contentCreated: 'all' | 'created' | 'pending'
  search: string
}

// Priority score calculation for unified ranking
export function calculateLaunchpadPriority(item: {
  source: LaunchpadSource
  visibility_pct?: number
  content_gap_pct: number
  search_volume?: number
  keyword_difficulty?: number
  intent_type?: string
}): number {
  let score = 0

  if (item.source === 'answer_gap') {
    // For prompts: lower visibility = higher priority
    if (item.visibility_pct !== undefined) {
      // 0% visibility = 40 points, 100% = 0 points
      score += Math.round((100 - item.visibility_pct) * 0.4)
    }
    // Content gap also matters
    score += Math.round(item.content_gap_pct * 0.3)
  } else {
    // For keywords from Keyword Fueler
    // Higher search volume = higher priority
    if (item.search_volume) {
      if (item.search_volume >= 10000) score += 30
      else if (item.search_volume >= 1000) score += 20
      else if (item.search_volume >= 100) score += 10
    }
    // Lower difficulty = higher priority
    if (item.keyword_difficulty !== undefined) {
      if (item.keyword_difficulty <= 20) score += 20
      else if (item.keyword_difficulty <= 40) score += 15
      else if (item.keyword_difficulty <= 60) score += 10
    }
    // Content gap matters for keywords too
    score += Math.round(item.content_gap_pct * 0.2)
  }

  // Commercial/transactional intent boosts priority
  if (item.intent_type === 'transactional') score += 15
  else if (item.intent_type === 'commercial') score += 10

  return Math.min(Math.max(score, 0), 100)
}

// Opportunity score calculation helper
export function calculateOpportunityScore(keyword: Partial<Keyword>): number {
  let score = 50 // Base score

  // Higher volume = higher opportunity
  if (keyword.search_volume) {
    if (keyword.search_volume >= 10000) score += 20
    else if (keyword.search_volume >= 1000) score += 15
    else if (keyword.search_volume >= 100) score += 10
  }

  // Lower difficulty = higher opportunity
  if (keyword.keyword_difficulty !== undefined) {
    if (keyword.keyword_difficulty <= 20) score += 20
    else if (keyword.keyword_difficulty <= 40) score += 15
    else if (keyword.keyword_difficulty <= 60) score += 10
    else score -= 10
  }

  // Higher content gap = higher opportunity (brand not ranking)
  if (keyword.content_gap_pct !== undefined) {
    score += Math.round(keyword.content_gap_pct * 0.2)
  }

  // Commercial/transactional intent = higher opportunity
  if (keyword.intent_type === 'transactional') score += 10
  else if (keyword.intent_type === 'commercial') score += 5

  return Math.min(Math.max(score, 0), 100)
}

// ==========================================
// Extended Brand Bible Types (Crawler)
// ==========================================

export interface ExtendedBrandBible {
  name: string
  tracked_brand: string
  website_url: string
  industry: string
  sub_industry?: string
  description: string
  target_audience: string
  secondary_audiences?: string[]
  brand_voice: BrandVoice
  tone_guidelines: string
  key_differentiators: string[]
  key_messages: string[]
  important_keywords: string[]
  content_pillars: string[]
  unique_selling_points: string[]
  products_services?: string[]
  pricing_model?: string
  avoid_topics: string[]
  competitors: string[]
  brand_personality_traits?: string[]
  customer_pain_points?: string[]
  proof_points?: string[]
}

export interface CrawlStats {
  pagesCrawled: number
  sitemapFound: boolean
  duration: number
  pageTypes: Record<string, number>
}

// ==========================================
// Google Integration Types
// ==========================================

export interface GoogleConnection {
  id: string
  project_id: string
  google_email: string
  google_sub?: string
  access_token: string
  refresh_token?: string
  token_expiry: string
  scopes?: string[]
  gsc_property?: string
  ga4_property?: string
  connected_at: string
  updated_at: string
}

export interface GSCProperty {
  siteUrl: string
  permissionLevel: string
}

export interface GA4Property {
  name: string
  id: string
  displayName: string
}

export interface GA4Account {
  name: string
  id: string
  properties: GA4Property[]
}

export interface GSCKeywordData {
  keyword: string
  clicks: number
  impressions: number
  ctr: number
  position: number
  url?: string
}

export interface GSCPageData {
  url: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}
