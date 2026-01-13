'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AI_MODEL_LABELS, AI_MODEL_COLORS, type AIModel } from '@/lib/types'
import { useRecentResponses } from '@/hooks'
import { FileText } from 'lucide-react'
import { formatDistanceToNow } from '@/lib/utils'

function getSentimentColor(score: number | null) {
  if (score === null) return 'text-muted-foreground'
  if (score >= 0.7) return 'text-green-600'
  if (score >= 0.4) return 'text-yellow-600'
  return 'text-red-600'
}

function getSentimentLabel(score: number | null) {
  if (score === null) return 'N/A'
  if (score >= 0.7) return 'Positive'
  if (score >= 0.4) return 'Neutral'
  return 'Negative'
}

export function RecentResponses() {
  const { data: responses, isLoading } = useRecentResponses(5)

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Recent Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="h-5 w-3/4 bg-muted animate-pulse rounded mb-2" />
                <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!responses || responses.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Recent Responses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg">No responses yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mt-1">
              AI responses will appear here once you start collecting data from your monitors.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Recent Responses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {responses.map((response: any) => (
            <div
              key={response.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex-1 space-y-1">
                <p className="font-medium line-clamp-1">
                  {response.prompt?.prompt_text || 'Unknown prompt'}
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: AI_MODEL_COLORS[response.ai_model as AIModel],
                      color: AI_MODEL_COLORS[response.ai_model as AIModel],
                    }}
                  >
                    {AI_MODEL_LABELS[response.ai_model as AIModel] || response.ai_model}
                  </Badge>
                  <span>{formatDistanceToNow(response.collected_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {response.mentions_brand && (
                  <Badge variant="secondary">Mentioned</Badge>
                )}
                {response.cites_domain && (
                  <Badge variant="secondary">Cited</Badge>
                )}
                <span className={`text-sm font-medium ${getSentimentColor(response.sentiment_score)}`}>
                  {getSentimentLabel(response.sentiment_score)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
