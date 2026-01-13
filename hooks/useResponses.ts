import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Response, AIModel } from '@/lib/types'

export function useResponses(promptId?: string) {
  return useQuery({
    queryKey: ['responses', promptId],
    queryFn: async () => {
      let query = supabase
        .from('responses')
        .select('*, prompt:prompts(prompt_text)')
        .order('collected_at', { ascending: false })
        .limit(50)

      if (promptId) {
        query = query.eq('prompt_id', promptId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useResponse(id: string) {
  return useQuery({
    queryKey: ['responses', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responses')
        .select('*, prompt:prompts(prompt_text, monitor:monitors(name)), citations(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export interface ResponseStats {
  total: number
  byModel: Record<string, number>
  mentionRate: number
  citationRate: number
  mentions: number
  citations: number
}

export function useResponseStats() {
  return useQuery({
    queryKey: ['responses', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responses')
        .select('ai_model, mentions_brand, cites_domain')
        .returns<{ ai_model: string; mentions_brand: boolean; cites_domain: boolean }[]>()

      if (error) throw error
      if (!data) return { total: 0, byModel: {}, mentions: 0, citations: 0, mentionRate: 0, citationRate: 0 } as ResponseStats

      const total = data.length
      const byModel: Record<string, number> = {}
      let mentions = 0
      let citations = 0

      data.forEach(r => {
        byModel[r.ai_model] = (byModel[r.ai_model] || 0) + 1
        if (r.mentions_brand) mentions++
        if (r.cites_domain) citations++
      })

      return {
        total,
        byModel,
        mentions,
        citations,
        mentionRate: total > 0 ? (mentions / total) * 100 : 0,
        citationRate: total > 0 ? (citations / total) * 100 : 0,
      } as ResponseStats
    },
  })
}

export function useRecentResponses(limit = 10) {
  return useQuery({
    queryKey: ['responses', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responses')
        .select('*, prompt:prompts(prompt_text, monitor:monitors(name))')
        .order('collected_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data
    },
  })
}
