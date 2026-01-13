'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Link2, Eye, ThumbsUp, Loader2 } from 'lucide-react'
import { useResponseStats, useAggregatedMetrics } from '@/hooks'

export function StatsCards() {
  const { data: stats, isLoading: statsLoading } = useResponseStats()
  const { data: metrics, isLoading: metricsLoading } = useAggregatedMetrics()

  const isLoading = statsLoading || metricsLoading

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statCards = [
    {
      title: 'Visibility Score',
      value: metrics?.avgVisibility?.toFixed(1) || '0',
      subtitle: 'Average score',
      icon: Eye,
    },
    {
      title: 'Brand Mentions',
      value: stats?.mentions?.toString() || '0',
      subtitle: `${stats?.mentionRate?.toFixed(1) || 0}% mention rate`,
      icon: MessageSquare,
    },
    {
      title: 'Domain Citations',
      value: stats?.citations?.toString() || '0',
      subtitle: `${stats?.citationRate?.toFixed(1) || 0}% citation rate`,
      icon: Link2,
    },
    {
      title: 'Sentiment Score',
      value: metrics?.avgSentiment?.toFixed(2) || 'N/A',
      subtitle: 'Average sentiment',
      icon: ThumbsUp,
    },
  ]

  // Show empty state if no data
  if (stats?.total === 0) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">--</div>
              <p className="text-xs text-muted-foreground">No data yet</p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
