import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { GeneratedContent, ContentGenerationRequest, ContentStatus } from '@/lib/types'

export function useGeneratedContent(limit = 20) {
  return useQuery({
    queryKey: ['generated-content', limit],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('generated_content')
        .select('*, prompt:prompts(prompt_text)')
        .order('created_at', { ascending: false })
        .limit(limit)

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

export function useContentStats() {
  return useQuery({
    queryKey: ['generated-content', 'stats'],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('generated_content')
        .select('content_type, status, word_count, seo_score')

      if (error) throw error
      if (!data) return {
        total: 0,
        byType: {},
        byStatus: {},
        avgWordCount: 0,
        avgSeoScore: 0,
      } as ContentStats

      const byType: Record<string, number> = {}
      const byStatus: Record<string, number> = {}
      let totalWordCount = 0
      let totalSeoScore = 0
      let seoScoreCount = 0

      data.forEach((item: { content_type: string; status: string; word_count: number | null; seo_score: number | null }) => {
        byType[item.content_type] = (byType[item.content_type] || 0) + 1
        byStatus[item.status] = (byStatus[item.status] || 0) + 1
        totalWordCount += item.word_count || 0
        if (item.seo_score !== null) {
          totalSeoScore += item.seo_score
          seoScoreCount++
        }
      })

      return {
        total: data.length,
        byType,
        byStatus,
        avgWordCount: data.length > 0 ? Math.round(totalWordCount / data.length) : 0,
        avgSeoScore: seoScoreCount > 0 ? Math.round(totalSeoScore / seoScoreCount) : 0,
      } as ContentStats
    },
  })
}
