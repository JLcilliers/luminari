import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Prompt } from '@/lib/types'

export interface PromptWithResponses {
  id: string
  monitor_id: string
  prompt_text: string
  intent_type: 'organic' | 'commercial'
  tags: string[]
  search_volume?: number
  difficulty_score?: number
  visibility_pct?: number
  created_at: string
  monitor?: { name: string } | null
  responses?: Array<{
    id: string
    mentions_brand: boolean
    brands_mentioned?: string[]
  }>
}

export function usePrompts(projectId?: string, monitorId?: string) {
  return useQuery({
    queryKey: ['prompts', projectId, monitorId],
    queryFn: async () => {
      let query = supabase
        .from('prompts')
        .select('*, monitor:monitors(name, project_id), responses(id, mentions_brand, brands_mentioned)')
        .order('created_at', { ascending: false })

      if (monitorId) {
        query = query.eq('monitor_id', monitorId)
      }

      const { data, error } = await query
      if (error) throw error

      // Filter by projectId if provided (through the monitor relationship)
      let prompts = data as (PromptWithResponses & { monitor?: { name: string; project_id: string } | null })[]
      if (projectId) {
        prompts = prompts.filter(p => p.monitor?.project_id === projectId)
      }

      return prompts as PromptWithResponses[]
    },
    enabled: !projectId || !!projectId, // Always enabled, projectId is optional filter
  })
}

export function usePrompt(id: string) {
  return useQuery({
    queryKey: ['prompts', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prompts')
        .select('*, monitor:monitors(name), responses(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreatePrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (prompt: Omit<Prompt, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('prompts')
        .insert(prompt as never)
        .select()
        .single()
      if (error) throw error
      return data as Prompt
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
    },
  })
}

export function useUpdatePrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Prompt> & { id: string }) => {
      const { data, error } = await supabase
        .from('prompts')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Prompt
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
    },
  })
}

export function useDeletePrompt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
    },
  })
}
