'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, Fuel, CheckCircle, TrendingUp, Loader2 } from 'lucide-react'
import type { LaunchpadStats as Stats } from '@/lib/types'
import { LAUNCHPAD_SOURCE_LABELS, LAUNCHPAD_SOURCE_COLORS } from '@/lib/types'

interface LaunchpadStatsProps {
  stats?: Stats
  isLoading: boolean
}

export function LaunchpadStats({ stats, isLoading }: LaunchpadStatsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const pendingCount = stats.totalItems - stats.contentCreated
  const completionPct =
    stats.totalItems > 0 ? Math.round((stats.contentCreated / stats.totalItems) * 100) : 0

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {/* Total Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalItems}</div>
          <p className="text-xs text-muted-foreground">
            {pendingCount} pending • {stats.contentCreated} complete
          </p>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Answer Gaps */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Answer Gaps</CardTitle>
          <Target className="h-4 w-4" style={{ color: LAUNCHPAD_SOURCE_COLORS.answer_gap }} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.answerGapCount}</div>
          <p className="text-xs text-muted-foreground">
            Prompts with low visibility
          </p>
          <Badge
            variant="outline"
            className="mt-2"
            style={{ borderColor: LAUNCHPAD_SOURCE_COLORS.answer_gap, color: LAUNCHPAD_SOURCE_COLORS.answer_gap }}
          >
            {LAUNCHPAD_SOURCE_LABELS.answer_gap}
          </Badge>
        </CardContent>
      </Card>

      {/* Keywords */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Keywords</CardTitle>
          <Fuel className="h-4 w-4" style={{ color: LAUNCHPAD_SOURCE_COLORS.keyword_fueler }} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.keywordCount}</div>
          <p className="text-xs text-muted-foreground">
            From Keyword Fueler
          </p>
          <Badge
            variant="outline"
            className="mt-2"
            style={{ borderColor: LAUNCHPAD_SOURCE_COLORS.keyword_fueler, color: LAUNCHPAD_SOURCE_COLORS.keyword_fueler }}
          >
            {LAUNCHPAD_SOURCE_LABELS.keyword_fueler}
          </Badge>
        </CardContent>
      </Card>

      {/* Average Priority */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Priority</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgPriority}</div>
          <p className="text-xs text-muted-foreground">
            Score out of 100
          </p>
          <Badge
            variant={stats.avgPriority >= 60 ? 'default' : stats.avgPriority >= 40 ? 'secondary' : 'outline'}
            className="mt-2"
          >
            {stats.avgPriority >= 60 ? 'High Priority' : stats.avgPriority >= 40 ? 'Medium' : 'Low'}
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}
