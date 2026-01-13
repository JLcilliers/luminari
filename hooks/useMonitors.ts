import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Monitor } from '@/lib/types'

export function useMonitors(projectId?: string) {
  return useQuery({
    queryKey: ['monitors', projectId],
    queryFn: async () => {
      const query = projectId
        ? supabase
            .from('monitors')
            .select('*, prompts(id)')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false })
        : supabase
            .from('monitors')
            .select('*, prompts(id)')
            .order('created_at', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      return data as (Monitor & { prompts?: { id: string }[] })[]
    },
  })
}

export function useMonitor(id: string) {
  return useQuery({
    queryKey: ['monitors', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monitors')
        .select('*, prompts(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreateMonitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (monitor: Omit<Monitor, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('monitors')
        .insert(monitor as never)
        .select()
        .single()
      if (error) throw error
      return data as Monitor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] })
    },
  })
}

export function useUpdateMonitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Monitor> & { id: string }) => {
      const { data, error } = await supabase
        .from('monitors')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Monitor
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] })
    },
  })
}

export function useDeleteMonitor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('monitors')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitors'] })
    },
  })
}
