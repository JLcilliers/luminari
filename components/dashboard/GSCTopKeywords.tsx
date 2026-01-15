'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  MousePointerClick,
  Target,
} from 'lucide-react'
import { useGoogleConnection, useGSCKeywords } from '@/hooks'
import { cn } from '@/lib/utils'

interface GSCTopKeywordsProps {
  projectId: string
}

function KeywordRow({
  keyword,
  clicks,
  impressions,
  position,
  trend,
}: {
  keyword: string
  clicks: number
  impressions: number
  position: number
  trend: 'up' | 'down' | 'stable'
}) {
  const getPositionColor = (pos: number) => {
    if (pos <= 3) return 'text-green-600 bg-green-50'
    if (pos <= 10) return 'text-blue-600 bg-blue-50'
    if (pos <= 20) return 'text-yellow-600 bg-yellow-50'
    return 'text-muted-foreground bg-muted'
  }

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate max-w-[180px]">{keyword}</span>
          {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500 flex-shrink-0" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500 flex-shrink-0" />}
          {trend === 'stable' && <Minus className="h-3 w-3 text-muted-foreground flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MousePointerClick className="h-3 w-3" />
            {clicks.toLocaleString()}
          </span>
          <span>{impressions.toLocaleString()} imp</span>
        </div>
      </div>
      <Badge variant="outline" className={cn('ml-2 font-medium', getPositionColor(position))}>
        #{position.toFixed(0)}
      </Badge>
    </div>
  )
}

export function GSCTopKeywords({ projectId }: GSCTopKeywordsProps) {
  const { data: googleConnection, isLoading: connectionLoading } = useGoogleConnection(projectId)
  const { data: gscData, isLoading: gscLoading } = useGSCKeywords(
    projectId,
    !!googleConnection?.connection?.gsc_property
  )

  const isLoading = connectionLoading || gscLoading
  const isConnected = !!googleConnection?.connection?.gsc_property

  // Get top 5 keywords sorted by clicks
  const topKeywords = useMemo(() => {
    if (!gscData?.keywords?.length) return []

    return [...gscData.keywords]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5)
      .map((kw) => ({
        keyword: kw.keyword,
        clicks: kw.clicks,
        impressions: kw.impressions,
        position: kw.position,
        // Mock trend based on position
        trend: (kw.position <= 10 ? 'up' : kw.position <= 20 ? 'stable' : 'down') as
          | 'up'
          | 'down'
          | 'stable',
      }))
  }, [gscData])

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Top GSC Keywords
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-12 ml-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Not connected - handled by GoogleConnectCTA
  if (!isConnected) {
    return null
  }

  // Empty state
  if (topKeywords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Top GSC Keywords
          </CardTitle>
          <CardDescription>Top performing keywords from Search Console</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Target className="h-10 w-10 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No keyword data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Top GSC Keywords
            </CardTitle>
            <CardDescription>Top performing keywords by clicks</CardDescription>
          </div>
          <Link href={`/brand/${projectId}/keyword-intel?tab=gsc`}>
            <Button variant="ghost" size="sm">
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {topKeywords.map((kw) => (
            <KeywordRow
              key={kw.keyword}
              keyword={kw.keyword}
              clicks={kw.clicks}
              impressions={kw.impressions}
              position={kw.position}
              trend={kw.trend}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
