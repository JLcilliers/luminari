import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Competitor } from '@/lib/types'

export function useCompetitors(projectId?: string) {
  return useQuery({
    queryKey: ['competitors', projectId],
    queryFn: async () => {
      const query = projectId
        ? supabase
            .from('competitors')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true })
        : supabase
            .from('competitors')
            .select('*')
            .order('created_at', { ascending: true })

      const { data, error } = await query
      if (error) throw error
      return data as Competitor[]
    },
  })
}

export function useCompetitor(id: string) {
  return useQuery({
    queryKey: ['competitors', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitors')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Competitor
    },
    enabled: !!id,
  })
}

export function useCreateCompetitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (competitor: Omit<Competitor, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('competitors')
        .insert(competitor as never)
        .select()
        .single()
      if (error) throw error
      return data as Competitor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
    },
  })
}

export function useUpdateCompetitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Competitor> & { id: string }) => {
      const { data, error } = await supabase
        .from('competitors')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Competitor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
    },
  })
}

export function useDeleteCompetitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('competitors')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
    },
  })
}
