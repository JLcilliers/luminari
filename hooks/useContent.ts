import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { GeneratedContent, ContentGenerationRequest, ContentStatus } from '@/lib/types'

export function useGeneratedContent(projectId?: string, limit = 50) {
  return useQuery({
    queryKey: ['generated-content', projectId, limit],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('generated_content')
        .select('*, prompt:prompts(prompt_text, monitor:monitors(project_id))')
        .order('created_at', { ascending: false })
        .limit(limit)

      // Filter by project_id directly if provided (works for pipeline-generated content)
      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error

      return data as (GeneratedContent & { prompt?: { prompt_text: string } | null })[]
    },
  })
}

export function useGeneratedContentItem(id: string) {
  return useQuery({
    queryKey: ['generated-content', 'detail', id],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('generated_content')
        .select('*, prompt:prompts(prompt_text, monitor:monitors(name))')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as GeneratedContent & {
        prompt?: {
          prompt_text: string
          monitor?: { name: string } | null
        } | null
      }
    },
    enabled: !!id,
  })
}

export function useGenerateContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: ContentGenerationRequest) => {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate content')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-content'] })
    },
  })
}

export function useUpdateContentStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ContentStatus }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('generated_content')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as GeneratedContent
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-content'] })
    },
  })
}

export function useDeleteContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('generated_content')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-content'] })
    },
  })
}

export interface ContentStats {
  total: number
  byType: Record<string, number>
  byStatus: Record<string, number>
  avgWordCount: number
  avgSeoScore: number
}

export function useContentStats(projectId?: string) {
  return useQuery({
    queryKey: ['generated-content', 'stats', projectId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from('generated_content')
        .select('content_type, status, word_count, seo_score')

      // Filter by project_id directly if provided
      if (projectId) {
        query = query.eq('project_id', projectId)
      }

      const { data, error } = await query

      if (error) throw error
      if (!data) return {
        total: 0,
        byType: {},
        byStatus: {},
        avgWordCount: 0,
        avgSeoScore: 0,
      } as ContentStats

      type ContentStatsItem = {
        content_type: string
        status: string
        word_count: number | null
        seo_score: number | null
      }
      const filteredData = data as ContentStatsItem[]

      const byType: Record<string, number> = {}
      const byStatus: Record<string, number> = {}
      let totalWordCount = 0
      let totalSeoScore = 0
      let seoScoreCount = 0

      filteredData.forEach((item) => {
        byType[item.content_type] = (byType[item.content_type] || 0) + 1
        byStatus[item.status] = (byStatus[item.status] || 0) + 1
        totalWordCount += item.word_count || 0
        if (item.seo_score !== null) {
          totalSeoScore += item.seo_score
          seoScoreCount++
        }
      })

      return {
        total: filteredData.length,
        byType,
        byStatus,
        avgWordCount: filteredData.length > 0 ? Math.round(totalWordCount / filteredData.length) : 0,
        avgSeoScore: seoScoreCount > 0 ? Math.round(totalSeoScore / seoScoreCount) : 0,
      } as ContentStats
    },
  })
}

// Content Optimizer Hooks

export interface OptimizationTask {
  id: string
  project_id: string
  keyword_id: string | null
  target_url: string
  target_keyword: string
  current_position: number | null
  target_position: number
  page_content: string | null
  ai_analysis: ContentAnalysis | null
  recommendations: OptimizationRecommendation[] | null
  status: 'pending' | 'analyzing' | 'optimized' | 'published' | 'failed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  created_at: string
  updated_at: string
}

export interface ContentAnalysis {
  seoScore: number
  readabilityScore: number
  keywordDensity: number
  wordCount: number
  recommendations: OptimizationRecommendation[]
  optimizedTitle?: string
  optimizedMetaDescription?: string
  suggestedHeadings?: string[]
  suggestedKeywords?: string[]
}

export interface OptimizationRecommendation {
  category: string
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  currentState?: string
  suggestedFix?: string
}

export function useOptimizationTasks(projectId?: string, status?: string) {
  return useQuery({
    queryKey: ['optimization-tasks', projectId, status],
    queryFn: async () => {
      const params = new URLSearchParams({ projectId: projectId! })
      if (status) params.set('status', status)

      const response = await fetch(`/api/content/optimize?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch optimization tasks')
      }
      const data = await response.json()
      return data.tasks as OptimizationTask[]
    },
    enabled: !!projectId,
  })
}

export function useAnalyzeContent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      projectId,
      targetUrl,
      targetKeyword,
      pageContent,
    }: {
      projectId: string
      targetUrl?: string
      targetKeyword: string
      pageContent?: string
    }) => {
      const response = await fetch('/api/content/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          targetUrl,
          targetKeyword,
          pageContent,
          action: 'analyze',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to analyze content')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['optimization-tasks', variables.projectId] })
    },
  })
}

export function useGenerateOptimizedContent() {
  return useMutation({
    mutationFn: async ({
      projectId,
      targetKeyword,
      pageContent,
    }: {
      projectId: string
      targetKeyword: string
      pageContent?: string
    }) => {
      const response = await fetch('/api/content/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          targetKeyword,
          pageContent,
          action: 'generate-content',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate content')
      }

      return response.json()
    },
  })
}

export function useQuickSuggestions() {
  return useMutation({
    mutationFn: async ({
      projectId,
      targetKeyword,
      pageContent,
    }: {
      projectId: string
      targetKeyword: string
      pageContent: string
    }) => {
      const response = await fetch('/api/content/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          targetKeyword,
          pageContent,
          action: 'get-suggestions',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get suggestions')
      }

      return response.json()
    },
  })
}

// Content Pipeline Hooks

export interface PipelineStreamEvent {
  type: 'progress' | 'stage-complete' | 'error' | 'complete'
  stage?: string
  status?: string
  message: string
  progress?: number
  data?: unknown
  timestamp: string
}

export interface PipelineRequest {
  projectId: string
  topic: string
  targetKeyword: string
  secondaryKeywords?: string[]
  targetWordCount?: number
  contentType?: 'article' | 'blog-post' | 'guide' | 'how-to'
  additionalNotes?: string
}

export interface PipelineResult {
  pipelineId: string
  duration: number
  result: {
    title?: string
    metaTitle?: string
    metaDescription?: string
    wordCount?: number
    seoScore?: number
    readabilityScore?: number
    markdown?: string
    html?: string
    json?: unknown
    schema?: string
    faqs?: { question: string; answer: string }[]
  }
}

export function useContentPipeline() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (request: PipelineRequest) => {
      const response = await fetch('/api/content/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Pipeline failed')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-content'] })
    },
  })
}

export function useStreamingContentPipeline() {
  return {
    run: async (
      request: PipelineRequest,
      onEvent: (event: PipelineStreamEvent) => void
    ): Promise<PipelineResult | null> => {
      const response = await fetch('/api/content/pipeline/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Pipeline failed')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let finalResult: PipelineResult | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6)) as PipelineStreamEvent
              onEvent(event)

              if (event.type === 'complete' && event.data) {
                finalResult = event.data as PipelineResult
              }
            } catch (e) {
              console.warn('Failed to parse SSE event:', e)
            }
          }
        }
      }

      return finalResult
    },
  }
}
