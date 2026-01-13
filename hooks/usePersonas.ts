import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Persona } from '@/lib/types'

export function usePersonas(projectId?: string) {
  return useQuery({
    queryKey: ['personas', projectId],
    queryFn: async () => {
      const query = projectId
        ? supabase
            .from('personas')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true })
        : supabase
            .from('personas')
            .select('*')
            .order('created_at', { ascending: true })

      const { data, error } = await query
      if (error) throw error
      return data as Persona[]
    },
  })
}

export function usePersona(id: string) {
  return useQuery({
    queryKey: ['personas', 'detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Persona
    },
    enabled: !!id,
  })
}

export function useCreatePersona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (persona: Omit<Persona, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('personas')
        .insert(persona as never)
        .select()
        .single()
      if (error) throw error
      return data as Persona
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] })
    },
  })
}

export function useUpdatePersona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Persona> & { id: string }) => {
      const { data, error } = await supabase
        .from('personas')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Persona
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] })
    },
  })
}

export function useDeletePersona() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('personas')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] })
    },
  })
}
