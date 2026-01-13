'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Rocket, Loader2, RefreshCw, Target, Fuel } from 'lucide-react'
import { LaunchpadStats, LaunchpadTable, LaunchpadFilters } from '@/components/launchpad'
import {
  useProjects,
  useLaunchpadItems,
  useLaunchpadStats,
} from '@/hooks'
import type { LaunchpadFilters as Filters, LaunchpadItem } from '@/lib/types'

export default function VisibilityLaunchpadPage() {
  const router = useRouter()
  const { data: projects, isLoading: projectsLoading } = useProjects()
  const projectId = projects?.[0]?.id

  const [filters, setFilters] = useState<Filters>({
    source: 'all',
    sortBy: 'priority',
    sortOrder: 'desc',
    contentCreated: 'pending',
    search: '',
  })

  const {
    data: items,
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useLaunchpadItems(projectId, filters)

  const { data: stats, isLoading: statsLoading } = useLaunchpadStats(projectId)

  const handleCreateContent = (item: LaunchpadItem) => {
    // Navigate to create-content page with pre-filled data
    const params = new URLSearchParams()
    params.set('source', item.source)
    params.set('title', item.title)

    if (item.source === 'answer_gap' && item.original_prompt) {
      params.set('promptId', item.original_prompt.id)
    } else if (item.source === 'keyword_fueler' && item.original_keyword) {
      params.set('keywordId', item.original_keyword.id)
      params.set('keyword', item.original_keyword.keyword)
    }

    router.push(`/create-content?${params.toString()}`)
  }

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!projectId) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visibility Launchpad</h1>
          <p className="text-muted-foreground">
            No project found. Please create a project first.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Rocket className="h-8 w-8 text-primary" />
            Visibility Launchpad
          </h1>
          <p className="text-muted-foreground">
            Your unified command center for content opportunities
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetchItems()}
          disabled={itemsLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${itemsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <LaunchpadStats stats={stats} isLoading={statsLoading} />

      {/* Quick Info Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-red-50 to-background dark:from-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-red-500" />
              Answer Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Prompts where your brand has low or no visibility. Creating content for these gaps
              can improve your AI presence.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Fuel className="h-4 w-4 text-blue-500" />
              Keyword Fueler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Keywords sent from the Keyword Fueler cart. These are high-opportunity keywords
              identified through mining, planning, or competitive analysis.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Content Opportunities</CardTitle>
          <CardDescription>
            All items needing content creation, ranked by priority score
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <LaunchpadFilters filters={filters} onFiltersChange={setFilters} />

          {/* Table */}
          <LaunchpadTable
            items={items || []}
            isLoading={itemsLoading}
            projectId={projectId}
            onCreateContent={handleCreateContent}
            emptyMessage={
              filters.source === 'answer_gap'
                ? 'No answer gaps found. Monitor prompts to identify visibility opportunities.'
                : filters.source === 'keyword_fueler'
                ? 'No keywords in launchpad. Add keywords from Keyword Fueler to get started.'
                : 'No opportunities in launchpad yet. Add prompts from Answer Gaps or keywords from Keyword Fueler.'
            }
          />
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Use the Launchpad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">1. Review Opportunities</h4>
              <p className="text-muted-foreground">
                Items are ranked by priority score. Higher scores indicate better content
                opportunities based on visibility gaps and keyword metrics.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">2. Create Content</h4>
              <p className="text-muted-foreground">
                Click "Create" on any item to generate AI-optimized content. The content will be
                tailored to improve your visibility for that topic.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">3. Track Progress</h4>
              <p className="text-muted-foreground">
                Use the status filter to see pending vs created items. Monitor your progress toward
                better AI visibility coverage.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
