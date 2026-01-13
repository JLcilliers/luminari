import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useCitations() {
  return useQuery({
    queryKey: ['citations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citations')
        .select('*, response:responses(ai_model, prompt:prompts(prompt_text))')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data
    },
  })
}

export interface DomainCount {
  domain: string
  count: number
}

export function useCitationsByDomain() {
  return useQuery({
    queryKey: ['citations', 'by-domain'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citations')
        .select('cited_domain')
        .returns<{ cited_domain: string }[]>()

      if (error) throw error
      if (!data) return []

      // Group by domain
      const domainCounts: Record<string, number> = {}
      data.forEach(c => {
        domainCounts[c.cited_domain] = (domainCounts[c.cited_domain] || 0) + 1
      })

      // Convert to sorted array
      return Object.entries(domainCounts)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count) as DomainCount[]
    },
  })
}

export function useCitationStats() {
  return useQuery({
    queryKey: ['citations', 'stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('citations')
        .select('cited_domain')
        .returns<{ cited_domain: string }[]>()

      if (error) throw error
      if (!data) return { total: 0, uniqueDomains: 0 }

      const uniqueDomains = new Set(data.map(c => c.cited_domain))

      return {
        total: data.length,
        uniqueDomains: uniqueDomains.size,
      }
    },
  })
}
