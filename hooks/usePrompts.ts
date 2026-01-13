import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Prompt } from '@/lib/types'

export function usePrompts(monitorId?: string) {
  return useQuery({
    queryKey: ['prompts', monitorId],
    queryFn: async () => {
      let query = supabase
        .from('prompts')
        .select('*, monitor:monitors(name)')
        .order('created_at', { ascending: false })

      if (monitorId) {
        query = query.eq('monitor_id', monitorId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
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
