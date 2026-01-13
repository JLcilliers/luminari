import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  LaunchpadItem,
  LaunchpadStats,
  LaunchpadFilters,
  LaunchpadSource,
  PromptWithLaunchpad,
  Keyword,
} from '@/lib/types'
import { calculateLaunchpadPriority } from '@/lib/types'

// Transform a prompt into a LaunchpadItem
function promptToLaunchpadItem(prompt: PromptWithLaunchpad, projectId: string): LaunchpadItem {
  const priority = calculateLaunchpadPriority({
    source: 'answer_gap',
    visibility_pct: prompt.visibility_pct ?? 0,
    content_gap_pct: prompt.content_gap_pct ?? 100,
    intent_type: prompt.intent_type,
  })

  return {
    id: `prompt_${prompt.id}`,
    project_id: projectId,
    source: 'answer_gap',
    title: prompt.prompt_text,
    priority_score: priority,
    visibility_pct: prompt.visibility_pct,
    content_gap_pct: prompt.content_gap_pct ?? 100,
    intent_type: prompt.intent_type,
    content_created: prompt.content_created ?? false,
    last_content_id: prompt.last_content_id,
    created_at: prompt.created_at,
    original_prompt: prompt,
  }
}

// Transform a keyword into a LaunchpadItem
function keywordToLaunchpadItem(keyword: Keyword): LaunchpadItem {
  const priority = calculateLaunchpadPriority({
    source: 'keyword_fueler',
    content_gap_pct: keyword.content_gap_pct,
    search_volume: keyword.search_volume,
    keyword_difficulty: keyword.keyword_difficulty,
    intent_type: keyword.intent_type,
  })

  return {
    id: `keyword_${keyword.id}`,
    project_id: keyword.project_id,
    source: 'keyword_fueler',
    title: keyword.keyword,
    priority_score: priority,
    content_gap_pct: keyword.content_gap_pct,
    search_volume: keyword.search_volume,
    keyword_difficulty: keyword.keyword_difficulty,
    intent_type: keyword.intent_type,
    content_created: keyword.content_created,
    created_at: keyword.created_at,
    original_keyword: keyword,
  }
}

// Fetch all launchpad items (combined prompts and keywords)
export function useLaunchpadItems(projectId?: string, filters?: LaunchpadFilters) {
  return useQuery({
    queryKey: ['launchpad-items', projectId, filters],
    queryFn: async () => {
      const items: LaunchpadItem[] = []

      // Fetch prompts with low visibility (answer gaps) - only if filter allows
      if (!filters?.source || filters.source === 'all' || filters.source === 'answer_gap') {
        // Get monitors for this project first
        const { data: monitors } = await supabase
          .from('monitors')
          .select('id')
          .eq('project_id', projectId!) as { data: { id: string }[] | null }

        if (monitors && monitors.length > 0) {
          const monitorIds = monitors.map((m) => m.id)

          // Get prompts with low visibility (< 50%)
          const { data: prompts, error: promptsError } = await supabase
            .from('prompts')
            .select('*')
            .in('monitor_id', monitorIds)
            .or('visibility_pct.is.null,visibility_pct.lt.50')
            .order('visibility_pct', { ascending: true, nullsFirst: true })

          if (!promptsError && prompts) {
            for (const prompt of prompts) {
              items.push(promptToLaunchpadItem(prompt as PromptWithLaunchpad, projectId!))
            }
          }
        }
      }

      // Fetch keywords sent to launchpad - only if filter allows
      if (!filters?.source || filters.source === 'all' || filters.source === 'keyword_fueler') {
        const { data: keywords, error: keywordsError } = await supabase
          .from('keywords')
          .select('*')
          .eq('project_id', projectId!)
          .eq('sent_to_launchpad', true)
          .order('opportunity_score', { ascending: false })

        if (!keywordsError && keywords) {
          for (const keyword of keywords) {
            items.push(keywordToLaunchpadItem(keyword as Keyword))
          }
        }
      }

      // Apply content created filter
      let filteredItems = items
      if (filters?.contentCreated === 'created') {
        filteredItems = items.filter((item) => item.content_created)
      } else if (filters?.contentCreated === 'pending') {
        filteredItems = items.filter((item) => !item.content_created)
      }

      // Apply search filter
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase()
        filteredItems = filteredItems.filter((item) =>
          item.title.toLowerCase().includes(searchLower)
        )
      }

      // Apply sorting
      const sortBy = filters?.sortBy || 'priority'
      const sortOrder = filters?.sortOrder || 'desc'

      filteredItems.sort((a, b) => {
        let comparison = 0
        switch (sortBy) {
          case 'priority':
            comparison = a.priority_score - b.priority_score
            break
          case 'visibility':
            comparison = (a.visibility_pct ?? 0) - (b.visibility_pct ?? 0)
            break
          case 'content_gap':
            comparison = a.content_gap_pct - b.content_gap_pct
            break
          case 'created_at':
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            break
        }
        return sortOrder === 'asc' ? comparison : -comparison
      })

      return filteredItems
    },
    enabled: !!projectId,
  })
}

// Get launchpad statistics
export function useLaunchpadStats(projectId?: string) {
  return useQuery({
    queryKey: ['launchpad-stats', projectId],
    queryFn: async (): Promise<LaunchpadStats> => {
      const items: LaunchpadItem[] = []

      // Get monitors for this project
      const { data: monitors } = await supabase
        .from('monitors')
        .select('id')
        .eq('project_id', projectId!) as { data: { id: string }[] | null }

      // Fetch prompts with low visibility
      if (monitors && monitors.length > 0) {
        const monitorIds = monitors.map((m) => m.id)
        const { data: prompts } = await supabase
          .from('prompts')
          .select('*')
          .in('monitor_id', monitorIds)
          .or('visibility_pct.is.null,visibility_pct.lt.50')

        if (prompts) {
          for (const prompt of prompts) {
            items.push(promptToLaunchpadItem(prompt as PromptWithLaunchpad, projectId!))
          }
        }
      }

      // Fetch keywords sent to launchpad
      const { data: keywords } = await supabase
        .from('keywords')
        .select('*')
        .eq('project_id', projectId!)
        .eq('sent_to_launchpad', true)

      if (keywords) {
        for (const keyword of keywords) {
          items.push(keywordToLaunchpadItem(keyword as Keyword))
        }
      }

      const answerGapCount = items.filter((i) => i.source === 'answer_gap').length
      const keywordCount = items.filter((i) => i.source === 'keyword_fueler').length
      const contentCreated = items.filter((i) => i.content_created).length
      const avgPriority =
        items.length > 0
          ? Math.round(items.reduce((sum, i) => sum + i.priority_score, 0) / items.length)
          : 0

      // Get top 5 priority items
      const topPriorityItems = [...items]
        .sort((a, b) => b.priority_score - a.priority_score)
        .slice(0, 5)

      return {
        totalItems: items.length,
        answerGapCount,
        keywordCount,
        contentCreated,
        avgPriority,
        topPriorityItems,
      }
    },
    enabled: !!projectId,
  })
}

// Mark a launchpad item as content created
export function useMarkContentCreated() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      item,
      contentId,
    }: {
      item: LaunchpadItem
      contentId: string
    }) => {
      if (item.source === 'answer_gap' && item.original_prompt) {
        // Update prompt
        const promptId = item.original_prompt.id
        const { error } = await supabase
          .from('prompts')
          .update({
            content_created: true,
            last_content_id: contentId,
          } as never)
          .eq('id', promptId)

        if (error) throw error
      } else if (item.source === 'keyword_fueler' && item.original_keyword) {
        // Update keyword
        const keywordId = item.original_keyword.id
        const { error } = await supabase
          .from('keywords')
          .update({ content_created: true } as never)
          .eq('id', keywordId)

        if (error) throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['launchpad-items'] })
      queryClient.invalidateQueries({ queryKey: ['launchpad-stats'] })
      if (variables.item.source === 'keyword_fueler') {
        queryClient.invalidateQueries({ queryKey: ['keywords'] })
        queryClient.invalidateQueries({ queryKey: ['launchpad-keywords'] })
      }
    },
  })
}

// Add a prompt to launchpad (from Answer Gaps page)
export function useAddPromptToLaunchpad() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      promptId,
      contentGapPct = 100,
    }: {
      promptId: string
      contentGapPct?: number
    }) => {
      const { error } = await supabase
        .from('prompts')
        .update({
          in_launchpad: true,
          content_gap_pct: contentGapPct,
        } as never)
        .eq('id', promptId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['launchpad-items'] })
      queryClient.invalidateQueries({ queryKey: ['launchpad-stats'] })
      queryClient.invalidateQueries({ queryKey: ['prompts'] })
    },
  })
}

// Remove an item from launchpad
export function useRemoveFromLaunchpad() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: LaunchpadItem) => {
      if (item.source === 'answer_gap' && item.original_prompt) {
        // For prompts, mark as not in launchpad
        const { error } = await supabase
          .from('prompts')
          .update({ in_launchpad: false } as never)
          .eq('id', item.original_prompt.id)

        if (error) throw error
      } else if (item.source === 'keyword_fueler' && item.original_keyword) {
        // For keywords, mark as not sent to launchpad
        const { error } = await supabase
          .from('keywords')
          .update({ sent_to_launchpad: false } as never)
          .eq('id', item.original_keyword.id)

        if (error) throw error
      }
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ['launchpad-items'] })
      queryClient.invalidateQueries({ queryKey: ['launchpad-stats'] })
      if (item.source === 'keyword_fueler') {
        queryClient.invalidateQueries({ queryKey: ['keywords'] })
        queryClient.invalidateQueries({ queryKey: ['launchpad-keywords'] })
      }
    },
  })
}
