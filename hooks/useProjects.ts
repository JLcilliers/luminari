import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/lib/types'

export interface ProjectWithStats extends Project {
  prompt_count: number
  response_count: number
  mention_count: number
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      // First get all projects
      const { data: projects, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error

      // Then get stats for each project
      const projectsWithStats = await Promise.all(
        (projects as Project[]).map(async (project) => {
          // Get monitors for this project
          const { data: monitors } = await supabase
            .from('monitors')
            .select('id')
            .eq('project_id', project.id)
            .returns<{ id: string }[]>()

          const monitorIds = monitors?.map(m => m.id) || []

          if (monitorIds.length === 0) {
            return {
              ...project,
              prompt_count: 0,
              response_count: 0,
              mention_count: 0,
            } as ProjectWithStats
          }

          // Get prompts for these monitors
          const { data: prompts } = await supabase
            .from('prompts')
            .select('id')
            .in('monitor_id', monitorIds)
            .returns<{ id: string }[]>()

          const promptIds = prompts?.map(p => p.id) || []
          const promptCount = promptIds.length

          if (promptIds.length === 0) {
            return {
              ...project,
              prompt_count: promptCount,
              response_count: 0,
              mention_count: 0,
            } as ProjectWithStats
          }

          // Get responses for these prompts
          const { data: responses } = await supabase
            .from('responses')
            .select('mentions_brand')
            .in('prompt_id', promptIds)
            .returns<{ mentions_brand: boolean }[]>()

          const responseCount = responses?.length || 0
          const mentionCount = responses?.filter(r => r.mentions_brand).length || 0

          return {
            ...project,
            prompt_count: promptCount,
            response_count: responseCount,
            mention_count: mentionCount,
          } as ProjectWithStats
        })
      )

      return projectsWithStats
    },
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data as Project
    },
    enabled: !!id,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (project: Omit<Project, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(project as never)
        .select()
        .single()
      if (error) throw error
      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Project> & { id: string }) => {
      const { data, error } = await supabase
        .from('projects')
        .update(updates as never)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Project
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
