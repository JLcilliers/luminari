import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { GeneratedContent, ContentGenerationRequest, ContentStatus } from '@/lib/types'

export function useGeneratedContent(projectId?: string, limit = 50) {
  return useQuery({
    queryKey: ['generated-content', projectId, limit],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('generated_content')
        .select('*, prompt:prompts(prompt_text, monitor:monitors(project_id))')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      // Filter by projectId if provided
      type ContentWithProject = GeneratedContent & {
        prompt?: { prompt_text: string; monitor?: { project_id: string } | null } | null
      }
      let content = data as ContentWithProject[]
      if (projectId) {
        content = content.filter(c => c.prompt?.monitor?.project_id === projectId)
      }

      return content as (GeneratedContent & { prompt?: { prompt_text: string } | null })[]
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
      const { data, error } = await (supabase as any)
        .from('generated_content')
        .select('content_type, status, word_count, seo_score, prompt:prompts(monitor:monitors(project_id))')

      if (error) throw error
      if (!data) return {
        total: 0,
        byType: {},
        byStatus: {},
        avgWordCount: 0,
        avgSeoScore: 0,
      } as ContentStats

      // Filter by projectId if provided
      type ContentStatsItem = {
        content_type: string
        status: string
        word_count: number | null
        seo_score: number | null
        prompt?: { monitor?: { project_id: string } | null } | null
      }
      let filteredData = data as ContentStatsItem[]
      if (projectId) {
        filteredData = filteredData.filter(item => item.prompt?.monitor?.project_id === projectId)
      }

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
