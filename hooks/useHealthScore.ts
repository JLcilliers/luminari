import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  Project,
  HealthScoreData,
  HealthScoreBreakdown,
} from '@/lib/types'
import { HEALTH_SCORE_WEIGHTS } from '@/lib/types'

// Helper type for Supabase query results
type MonitorRow = { id: string }
type PromptRow = { id: string }
type ResponseRow = { id: string; prompt_id: string; mentions_brand: boolean }
type ContentRow = { id: string; status: string }

// Calculate brand completion score based on filled Brand Bible fields
function calculateBrandCompletion(project: Project): number {
  const requiredFields = [
    'tracked_brand',
    'website_url',
    'industry',
    'description',
  ]
  const enhancedFields = [
    'target_audience',
    'brand_voice',
    'tone_guidelines',
    'key_differentiators',
    'important_keywords',
    'content_pillars',
    'unique_selling_points',
  ]

  let score = 0

  // Check required fields (weighted higher)
  requiredFields.forEach((field) => {
    const value = project[field as keyof Project]
    if (value && (typeof value !== 'string' || value.trim() !== '')) {
      score += 1.5
    }
  })

  // Check enhanced fields
  enhancedFields.forEach((field) => {
    const value = project[field as keyof Project]
    if (value) {
      if (Array.isArray(value) && value.length > 0) {
        score += 1
      } else if (typeof value === 'string' && value.trim() !== '') {
        score += 1
      }
    }
  })

  const maxScore = requiredFields.length * 1.5 + enhancedFields.length
  return Math.round((score / maxScore) * 100)
}

// Calculate prompt coverage score
async function calculatePromptCoverage(projectId: string): Promise<number> {
  // Get monitors for the project
  const { data: monitors } = await supabase
    .from('monitors')
    .select('id')
    .eq('project_id', projectId) as { data: MonitorRow[] | null }

  if (!monitors || monitors.length === 0) return 0

  const monitorIds = monitors.map((m) => m.id)

  // Get prompts for these monitors
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id')
    .in('monitor_id', monitorIds) as { data: PromptRow[] | null }

  if (!prompts) return 0

  // Target: at least 10 prompts for full score
  const targetPrompts = 10
  const coverage = Math.min(prompts.length / targetPrompts, 1)
  return Math.round(coverage * 100)
}

// Calculate response collection score
async function calculateResponseCollection(projectId: string): Promise<number> {
  // Get monitors for the project
  const { data: monitors } = await supabase
    .from('monitors')
    .select('id')
    .eq('project_id', projectId) as { data: MonitorRow[] | null }

  if (!monitors || monitors.length === 0) return 0

  const monitorIds = monitors.map((m) => m.id)

  // Get prompts for these monitors
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id')
    .in('monitor_id', monitorIds) as { data: PromptRow[] | null }

  if (!prompts || prompts.length === 0) return 0

  const promptIds = prompts.map((p) => p.id)

  // Get responses for these prompts
  const { data: responses } = await supabase
    .from('responses')
    .select('id, prompt_id')
    .in('prompt_id', promptIds) as { data: Array<{ id: string; prompt_id: string }> | null }

  if (!responses) return 0

  // Calculate average responses per prompt (target: 3+ per prompt)
  const avgResponses = responses.length / prompts.length
  const targetAvg = 3
  const collection = Math.min(avgResponses / targetAvg, 1)
  return Math.round(collection * 100)
}

// Calculate content generation score
async function calculateContentGeneration(projectId: string): Promise<number> {
  const { data: content } = await supabase
    .from('generated_content')
    .select('id, status')
    .eq('project_id', projectId) as { data: ContentRow[] | null }

  if (!content || content.length === 0) return 0

  // Target: at least 5 pieces of content, bonus for published
  const targetContent = 5
  const publishedCount = content.filter(
    (c) => c.status === 'published'
  ).length
  const completedCount = content.filter(
    (c) => c.status === 'completed' || c.status === 'published'
  ).length

  const baseScore = Math.min(completedCount / targetContent, 1) * 80
  const publishedBonus = Math.min(publishedCount / 3, 1) * 20

  return Math.round(baseScore + publishedBonus)
}

// Calculate gap coverage score
async function calculateGapCoverage(projectId: string): Promise<number> {
  // Get monitors for the project
  const { data: monitors } = await supabase
    .from('monitors')
    .select('id')
    .eq('project_id', projectId) as { data: MonitorRow[] | null }

  if (!monitors || monitors.length === 0) return 0

  const monitorIds = monitors.map((m) => m.id)

  // Get prompts for these monitors
  const { data: prompts } = await supabase
    .from('prompts')
    .select('id')
    .in('monitor_id', monitorIds) as { data: PromptRow[] | null }

  if (!prompts || prompts.length === 0) return 0

  const promptIds = prompts.map((p) => p.id)

  // Get responses and check brand mentions
  const { data: responses } = await supabase
    .from('responses')
    .select('id, prompt_id, mentions_brand')
    .in('prompt_id', promptIds) as { data: ResponseRow[] | null }

  if (!responses || responses.length === 0) return 0

  // Calculate what percentage of prompts have at least one brand mention
  const promptsWithMentions = new Set(
    responses
      .filter((r) => r.mentions_brand)
      .map((r) => r.prompt_id)
  )

  const coverage = promptsWithMentions.size / prompts.length
  return Math.round(coverage * 100)
}

// Generate recommendations based on breakdown
function generateRecommendations(breakdown: HealthScoreBreakdown): string[] {
  const recommendations: string[] = []

  if (breakdown.brandCompletion < 50) {
    recommendations.push('Complete your Brand Bible in Settings to improve AI content quality')
  }
  if (breakdown.promptCoverage < 50) {
    recommendations.push('Add more prompts to your monitors to track wider visibility')
  }
  if (breakdown.responseCollection < 50) {
    recommendations.push('Collect more AI responses to get accurate visibility data')
  }
  if (breakdown.contentGeneration < 30) {
    recommendations.push('Generate content using the Create Content feature to fill gaps')
  }
  if (breakdown.gapCoverage < 50) {
    recommendations.push('Focus on prompts where your brand is not being mentioned')
  }

  if (recommendations.length === 0) {
    recommendations.push('Great job! Keep monitoring and creating content to maintain visibility')
  }

  return recommendations
}

// Main hook to calculate health score
export function useHealthScore(projectId?: string) {
  return useQuery({
    queryKey: ['health-score', projectId],
    queryFn: async (): Promise<HealthScoreData> => {
      // Get the project
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId!)
        .single()

      if (error) throw error
      if (!project) throw new Error('Project not found')

      // Calculate all breakdown scores in parallel
      const [promptCoverage, responseCollection, contentGeneration, gapCoverage] =
        await Promise.all([
          calculatePromptCoverage(projectId!),
          calculateResponseCollection(projectId!),
          calculateContentGeneration(projectId!),
          calculateGapCoverage(projectId!),
        ])

      const brandCompletion = calculateBrandCompletion(project as Project)

      const breakdown: HealthScoreBreakdown = {
        brandCompletion,
        promptCoverage,
        responseCollection,
        contentGeneration,
        gapCoverage,
      }

      // Calculate weighted total score
      const score = Math.round(
        breakdown.brandCompletion * HEALTH_SCORE_WEIGHTS.brandCompletion +
        breakdown.promptCoverage * HEALTH_SCORE_WEIGHTS.promptCoverage +
        breakdown.responseCollection * HEALTH_SCORE_WEIGHTS.responseCollection +
        breakdown.contentGeneration * HEALTH_SCORE_WEIGHTS.contentGeneration +
        breakdown.gapCoverage * HEALTH_SCORE_WEIGHTS.gapCoverage
      )

      // Determine trend (compare to stored health_score)
      const previousScore = (project as Project).health_score || 0
      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (score > previousScore + 5) trend = 'up'
      else if (score < previousScore - 5) trend = 'down'

      const recommendations = generateRecommendations(breakdown)

      return {
        score,
        breakdown,
        lastUpdated: (project as Project).health_updated_at || null,
        trend,
        recommendations,
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Hook to update health score in the database
export function useUpdateHealthScore() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId, score }: { projectId: string; score: number }) => {
      const { data, error } = await supabase
        .from('projects')
        .update({
          health_score: score,
          health_updated_at: new Date().toISOString(),
        } as never)
        .eq('id', projectId)
        .select()
        .single()

      if (error) throw error
      return data as Project
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['health-score', variables.projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}
