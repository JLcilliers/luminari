import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Response, AIModel } from '@/lib/types'

export interface ResponseWithPrompt {
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
  prompt?: {
    prompt_text: string
  } | null
}

export function useResponses(projectId?: string, promptId?: string) {
  return useQuery({
    queryKey: ['responses', projectId, promptId],
    queryFn: async () => {
      let query = supabase
        .from('responses')
        .select('*, prompt:prompts(prompt_text, monitor:monitors(project_id))')
        .order('collected_at', { ascending: false })
        .limit(100)

      if (promptId) {
        query = query.eq('prompt_id', promptId)
      }

      const { data, error } = await query
      if (error) throw error

      // Filter by projectId if provided (through prompt → monitor relationship)
      type ResponseWithMonitor = ResponseWithPrompt & {
        prompt?: { prompt_text: string; monitor?: { project_id: string } | null } | null
      }
      let responses = data as ResponseWithMonitor[]
      if (projectId) {
        responses = responses.filter(r => r.prompt?.monitor?.project_id === projectId)
      }

      return responses as ResponseWithPrompt[]
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

export function useResponseStats(projectId?: string) {
  return useQuery({
    queryKey: ['responses', 'stats', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responses')
        .select('ai_model, mentions_brand, cites_domain, prompt:prompts(monitor:monitors(project_id))')
        .returns<{ ai_model: string; mentions_brand: boolean; cites_domain: boolean; prompt?: { monitor?: { project_id: string } | null } | null }[]>()

      if (error) throw error
      if (!data) return { total: 0, byModel: {}, mentions: 0, citations: 0, mentionRate: 0, citationRate: 0 } as ResponseStats

      // Filter by projectId if provided
      let filteredData = data
      if (projectId) {
        filteredData = data.filter(r => r.prompt?.monitor?.project_id === projectId)
      }

      const total = filteredData.length
      const byModel: Record<string, number> = {}
      let mentions = 0
      let citations = 0

      filteredData.forEach(r => {
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

export function useRecentResponses(projectId?: string, limit = 10) {
  return useQuery({
    queryKey: ['responses', 'recent', projectId, limit],
    queryFn: async () => {
      type RecentResponse = ResponseWithPrompt & {
        prompt?: { prompt_text: string; monitor?: { name: string; project_id: string } | null } | null
      }
      const { data, error } = await supabase
        .from('responses')
        .select('*, prompt:prompts(prompt_text, monitor:monitors(name, project_id))')
        .order('collected_at', { ascending: false })
        .limit(limit * 2) // Fetch more to allow for filtering
        .returns<RecentResponse[]>()

      if (error) throw error
      if (!data) return []

      // Filter by projectId if provided
      let responses = data
      if (projectId) {
        responses = responses.filter(r => r.prompt?.monitor?.project_id === projectId)
      }

      return responses.slice(0, limit)
    },
  })
}

export interface BrandMentionCount {
  brand: string
  count: number
}

export function useBrandMentions(projectId?: string) {
  return useQuery({
    queryKey: ['responses', 'brand-mentions', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responses')
        .select('brands_mentioned, prompt:prompts(monitor:monitors(project_id))')
        .returns<{ brands_mentioned: string[] | null; prompt?: { monitor?: { project_id: string } | null } | null }[]>()

      if (error) throw error
      if (!data) return []

      // Filter by projectId if provided
      let filteredData = data
      if (projectId) {
        filteredData = data.filter(r => r.prompt?.monitor?.project_id === projectId)
      }

      // Count brand mentions
      const brandCounts: Record<string, number> = {}
      filteredData.forEach(r => {
        if (r.brands_mentioned) {
          r.brands_mentioned.forEach(brand => {
            brandCounts[brand] = (brandCounts[brand] || 0) + 1
          })
        }
      })

      // Convert to sorted array
      return Object.entries(brandCounts)
        .map(([brand, count]) => ({ brand, count }))
        .sort((a, b) => b.count - a.count) as BrandMentionCount[]
    },
  })
}
