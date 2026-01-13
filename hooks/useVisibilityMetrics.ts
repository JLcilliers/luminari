import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface VisibilityTrendData {
  date: string
  visibility_score: number
  mention_count: number
  citation_count: number
}

interface MetricsRow {
  visibility_score: number
  mention_count: number
  citation_count: number
  sentiment_avg: number | null
}

export function useVisibilityTrend(projectId?: string, days = 30) {
  return useQuery({
    queryKey: ['visibility', projectId, days],
    queryFn: async () => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const query = projectId
        ? supabase
            .from('visibility_metrics')
            .select('date, visibility_score, mention_count, citation_count')
            .eq('project_id', projectId)
            .gte('date', startDate.toISOString().split('T')[0])
            .order('date', { ascending: true })
        : supabase
            .from('visibility_metrics')
            .select('date, visibility_score, mention_count, citation_count')
            .gte('date', startDate.toISOString().split('T')[0])
            .order('date', { ascending: true })

      const { data, error } = await query

      if (error) throw error
      return (data || []) as VisibilityTrendData[]
    },
  })
}

export function useVisibilityScore(projectId?: string) {
  return useQuery({
    queryKey: ['visibility', 'current', projectId],
    queryFn: async () => {
      const query = projectId
        ? supabase
            .from('visibility_metrics')
            .select('visibility_score, date')
            .eq('project_id', projectId)
            .order('date', { ascending: false })
            .limit(1)
        : supabase
            .from('visibility_metrics')
            .select('visibility_score, date')
            .order('date', { ascending: false })
            .limit(1)

      const { data, error } = await query

      if (error) throw error
      const result = data as { visibility_score: number; date: string }[] | null
      return result?.[0] || null
    },
  })
}

export function useAggregatedMetrics(projectId?: string) {
  return useQuery({
    queryKey: ['visibility', 'aggregated', projectId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const query = projectId
        ? supabase
            .from('visibility_metrics')
            .select('visibility_score, mention_count, citation_count, sentiment_avg')
            .eq('project_id', projectId)
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        : supabase
            .from('visibility_metrics')
            .select('visibility_score, mention_count, citation_count, sentiment_avg')
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

      const { data, error } = await query

      if (error) throw error

      const typedData = (data || []) as MetricsRow[]

      if (typedData.length === 0) {
        return {
          avgVisibility: 0,
          totalMentions: 0,
          totalCitations: 0,
          avgSentiment: null,
        }
      }

      const totalMentions = typedData.reduce((sum, d) => sum + (d.mention_count || 0), 0)
      const totalCitations = typedData.reduce((sum, d) => sum + (d.citation_count || 0), 0)
      const avgVisibility = typedData.reduce((sum, d) => sum + (d.visibility_score || 0), 0) / typedData.length

      const sentimentValues = typedData.filter(d => d.sentiment_avg !== null).map(d => d.sentiment_avg!)
      const avgSentiment = sentimentValues.length > 0
        ? sentimentValues.reduce((sum, s) => sum + s, 0) / sentimentValues.length
        : null

      return {
        avgVisibility: Math.round(avgVisibility * 10) / 10,
        totalMentions,
        totalCitations,
        avgSentiment: avgSentiment !== null ? Math.round(avgSentiment * 100) / 100 : null,
      }
    },
  })
}
