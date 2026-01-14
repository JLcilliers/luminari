import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AIModel } from '@/lib/types'

export interface CitationWithResponse {
  id: string
  response_id: string
  cited_domain: string
  cited_url: string | null
  citation_context: string | null
  created_at: string
  response?: {
    ai_model: AIModel
    prompt?: {
      prompt_text: string
    } | null
  } | null
}

export function useCitations(projectId?: string) {
  return useQuery({
    queryKey: ['citations', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citations')
        .select('*, response:responses(ai_model, prompt:prompts(prompt_text, monitor:monitors(project_id)))')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error

      // Filter by projectId if provided
      type CitationWithProject = CitationWithResponse & {
        response?: {
          ai_model: AIModel
          prompt?: { prompt_text: string; monitor?: { project_id: string } | null } | null
        } | null
      }
      let citations = data as CitationWithProject[]
      if (projectId) {
        citations = citations.filter(c => c.response?.prompt?.monitor?.project_id === projectId)
      }

      return citations as CitationWithResponse[]
    },
  })
}

export interface DomainCount {
  domain: string
  count: number
}

export function useCitationsByDomain(projectId?: string) {
  return useQuery({
    queryKey: ['citations', 'by-domain', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citations')
        .select('cited_domain, response:responses(prompt:prompts(monitor:monitors(project_id)))')
        .returns<{ cited_domain: string; response?: { prompt?: { monitor?: { project_id: string } | null } | null } | null }[]>()

      if (error) throw error
      if (!data) return []

      // Filter by projectId if provided
      let filteredData = data
      if (projectId) {
        filteredData = data.filter(c => c.response?.prompt?.monitor?.project_id === projectId)
      }

      // Group by domain
      const domainCounts: Record<string, number> = {}
      filteredData.forEach(c => {
        domainCounts[c.cited_domain] = (domainCounts[c.cited_domain] || 0) + 1
      })

      // Convert to sorted array
      return Object.entries(domainCounts)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count) as DomainCount[]
    },
  })
}

export function useCitationStats(projectId?: string) {
  return useQuery({
    queryKey: ['citations', 'stats', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citations')
        .select('cited_domain, response:responses(prompt:prompts(monitor:monitors(project_id)))')
        .returns<{ cited_domain: string; response?: { prompt?: { monitor?: { project_id: string } | null } | null } | null }[]>()

      if (error) throw error
      if (!data) return { total: 0, uniqueDomains: 0 }

      // Filter by projectId if provided
      let filteredData = data
      if (projectId) {
        filteredData = data.filter(c => c.response?.prompt?.monitor?.project_id === projectId)
      }

      const uniqueDomains = new Set(filteredData.map(c => c.cited_domain))

      return {
        total: filteredData.length,
        uniqueDomains: uniqueDomains.size,
      }
    },
  })
}
