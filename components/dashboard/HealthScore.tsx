'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Lightbulb } from 'lucide-react'
import { useHealthScore, useUpdateHealthScore } from '@/hooks'
import { getHealthScoreRating, HEALTH_SCORE_COLORS, type HealthScoreRating } from '@/lib/types'
import { useEffect } from 'react'

interface HealthScoreProps {
  projectId: string
}

function CircularProgress({ score, rating }: { score: number; rating: HealthScoreRating }) {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (score / 100) * circumference
  const color = HEALTH_SCORE_COLORS[rating]

  return (
    <div className="relative w-32 h-32">
      <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-muted-foreground uppercase">{rating}</span>
      </div>
    </div>
  )
}

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return (
      <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
        <TrendingUp className="h-3 w-3 mr-1" />
        Improving
      </Badge>
    )
  }
  if (trend === 'down') {
    return (
      <Badge variant="default" className="bg-red-500/10 text-red-500 border-red-500/20">
        <TrendingDown className="h-3 w-3 mr-1" />
        Declining
      </Badge>
    )
  }
  return (
    <Badge variant="secondary">
      <Minus className="h-3 w-3 mr-1" />
      Stable
    </Badge>
  )
}

function BreakdownItem({
  label,
  score,
  weight,
}: {
  label: string
  score: number
  weight: number
}) {
  const contribution = Math.round(score * weight)
  const rating = getHealthScoreRating(score)
  const color = HEALTH_SCORE_COLORS[rating]

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium" style={{ color }}>
          {score}%
          <span className="text-xs text-muted-foreground ml-1">
            (+{contribution})
          </span>
        </span>
      </div>
      <Progress value={score} className="h-1.5" />
    </div>
  )
}

export function HealthScore({ projectId }: HealthScoreProps) {
  const { data: healthData, isLoading, error } = useHealthScore(projectId)
  const updateHealthScore = useUpdateHealthScore()

  // Update health score in database when calculated
  useEffect(() => {
    if (healthData && projectId) {
      updateHealthScore.mutate({
        projectId,
        score: healthData.score,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthData?.score, projectId])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Calculating Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse space-y-4 w-full">
              <div className="h-32 w-32 mx-auto rounded-full bg-muted" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-6 bg-muted rounded" />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !healthData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Unable to calculate health score</p>
            <p className="text-sm text-muted-foreground">
              Please try again later
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const rating = getHealthScoreRating(healthData.score)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Visibility Health
            </CardTitle>
            <CardDescription>
              Overall platform effectiveness score
            </CardDescription>
          </div>
          <TrendIndicator trend={healthData.trend} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score */}
        <div className="flex items-center justify-center">
          <CircularProgress score={healthData.score} rating={rating} />
        </div>

        {/* Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Score Breakdown</h4>
          <BreakdownItem
            label="Brand Completion"
            score={healthData.breakdown.brandCompletion}
            weight={0.20}
          />
          <BreakdownItem
            label="Prompt Coverage"
            score={healthData.breakdown.promptCoverage}
            weight={0.25}
          />
          <BreakdownItem
            label="Response Collection"
            score={healthData.breakdown.responseCollection}
            weight={0.20}
          />
          <BreakdownItem
            label="Content Generation"
            score={healthData.breakdown.contentGeneration}
            weight={0.20}
          />
          <BreakdownItem
            label="Gap Coverage"
            score={healthData.breakdown.gapCoverage}
            weight={0.15}
          />
        </div>

        {/* Recommendations */}
        {healthData.recommendations.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Recommendations
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {healthData.recommendations.slice(0, 3).map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Last Updated */}
        {healthData.lastUpdated && (
          <p className="text-xs text-muted-foreground text-center">
            Last updated: {new Date(healthData.lastUpdated).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
