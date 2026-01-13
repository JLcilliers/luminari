'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, ThumbsUp, ThumbsDown, Minus, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useResponses } from '@/hooks'
import { AI_MODEL_LABELS, AI_MODEL_COLORS, type AIModel } from '@/lib/types'

const SENTIMENT_COLORS = {
  positive: '#22c55e',
  neutral: '#f59e0b',
  negative: '#ef4444',
}

function getSentimentLabel(score: number | null): 'positive' | 'neutral' | 'negative' {
  if (score === null) return 'neutral'
  if (score >= 0.7) return 'positive'
  if (score >= 0.4) return 'neutral'
  return 'negative'
}

function getSentimentIcon(score: number | null) {
  if (score === null) return <Minus className="h-4 w-4 text-muted-foreground" />
  if (score >= 0.7) return <ThumbsUp className="h-4 w-4 text-green-600" />
  if (score >= 0.4) return <Minus className="h-4 w-4 text-yellow-600" />
  return <ThumbsDown className="h-4 w-4 text-red-600" />
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SentimentPage() {
  const { data: responses, isLoading } = useResponses()

  // Calculate sentiment breakdown
  const sentimentStats = useMemo(() => {
    if (!responses) return { positive: 0, neutral: 0, negative: 0, total: 0, avgScore: 0 }

    const stats = { positive: 0, neutral: 0, negative: 0, total: 0, scoreSum: 0, scored: 0 }

    responses.forEach(r => {
      stats.total++
      if (r.sentiment_score !== null) {
        stats.scoreSum += r.sentiment_score
        stats.scored++
      }
      const label = getSentimentLabel(r.sentiment_score)
      stats[label]++
    })

    return {
      positive: stats.positive,
      neutral: stats.neutral,
      negative: stats.negative,
      total: stats.total,
      avgScore: stats.scored > 0 ? stats.scoreSum / stats.scored : 0,
    }
  }, [responses])

  // Pie chart data
  const pieData = useMemo(() => [
    { name: 'Positive', value: sentimentStats.positive, color: SENTIMENT_COLORS.positive },
    { name: 'Neutral', value: sentimentStats.neutral, color: SENTIMENT_COLORS.neutral },
    { name: 'Negative', value: sentimentStats.negative, color: SENTIMENT_COLORS.negative },
  ], [sentimentStats])

  // Sentiment by AI model
  const sentimentByModel = useMemo(() => {
    if (!responses) return []

    const modelStats: Record<string, { positive: number; neutral: number; negative: number; total: number }> = {}

    responses.forEach(r => {
      const model = r.ai_model
      if (!modelStats[model]) {
        modelStats[model] = { positive: 0, neutral: 0, negative: 0, total: 0 }
      }
      modelStats[model].total++
      const label = getSentimentLabel(r.sentiment_score)
      modelStats[model][label]++
    })

    return Object.entries(modelStats).map(([model, stats]) => ({
      model,
      modelLabel: AI_MODEL_LABELS[model as AIModel] || model,
      positive: stats.positive,
      neutral: stats.neutral,
      negative: stats.negative,
      positiveRate: stats.total > 0 ? (stats.positive / stats.total) * 100 : 0,
    })).sort((a, b) => b.positiveRate - a.positiveRate)
  }, [responses])

  // Recent negative responses (for attention)
  const negativeResponses = useMemo(() => {
    if (!responses) return []
    return responses
      .filter(r => r.sentiment_score !== null && r.sentiment_score < 0.4)
      .slice(0, 5)
  }, [responses])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sentiment Analysis</h1>
          <p className="text-muted-foreground">
            Analyze how AI models perceive and talk about your brand
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sentiment Analysis</h1>
        <p className="text-muted-foreground">
          Analyze how AI models perceive and talk about your brand
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Sentiment
            </CardTitle>
            {sentimentStats.avgScore >= 0.6 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : sentimentStats.avgScore >= 0.4 ? (
              <Minus className="h-4 w-4 text-yellow-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(sentimentStats.avgScore * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Overall brand perception
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Positive
            </CardTitle>
            <ThumbsUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{sentimentStats.positive}</div>
            <p className="text-xs text-muted-foreground">
              {sentimentStats.total > 0
                ? `${((sentimentStats.positive / sentimentStats.total) * 100).toFixed(1)}% of responses`
                : 'No responses yet'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Neutral
            </CardTitle>
            <Minus className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{sentimentStats.neutral}</div>
            <p className="text-xs text-muted-foreground">
              {sentimentStats.total > 0
                ? `${((sentimentStats.neutral / sentimentStats.total) * 100).toFixed(1)}% of responses`
                : 'No responses yet'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Negative
            </CardTitle>
            <ThumbsDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{sentimentStats.negative}</div>
            <p className="text-xs text-muted-foreground">
              {sentimentStats.total > 0
                ? `${((sentimentStats.negative / sentimentStats.total) * 100).toFixed(1)}% of responses`
                : 'No responses yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sentiment Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sentiment Distribution</CardTitle>
            <CardDescription>Breakdown of sentiment across all responses</CardDescription>
          </CardHeader>
          <CardContent>
            {sentimentStats.total === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Minus className="h-12 w-12 mb-3 opacity-50" />
                <p>No sentiment data yet</p>
                <p className="text-sm">Collect AI responses to see sentiment analysis</p>
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [value, 'Responses']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sentiment by AI Model */}
        <Card>
          <CardHeader>
            <CardTitle>Sentiment by AI Model</CardTitle>
            <CardDescription>How each AI model perceives your brand</CardDescription>
          </CardHeader>
          <CardContent>
            {sentimentByModel.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Minus className="h-12 w-12 mb-3 opacity-50" />
                <p>No model data yet</p>
                <p className="text-sm">Collect AI responses to see model comparison</p>
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sentimentByModel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis
                      type="number"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      type="category"
                      dataKey="modelLabel"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      width={80}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="positive" name="Positive" stackId="a" fill={SENTIMENT_COLORS.positive} />
                    <Bar dataKey="neutral" name="Neutral" stackId="a" fill={SENTIMENT_COLORS.neutral} />
                    <Bar dataKey="negative" name="Negative" stackId="a" fill={SENTIMENT_COLORS.negative} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Negative Responses Requiring Attention */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Responses Requiring Attention
          </CardTitle>
          <CardDescription>
            Recent responses with negative sentiment that may need review
          </CardDescription>
        </CardHeader>
        <CardContent>
          {negativeResponses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ThumbsUp className="h-12 w-12 mx-auto mb-3 opacity-50 text-green-600" />
              <p>No negative responses found</p>
              <p className="text-sm">Great job! Your brand perception is looking positive</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Response Preview</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {negativeResponses.map((response) => {
                  const prompt = response.prompt as { prompt_text: string } | null
                  return (
                    <TableRow key={response.id}>
                      <TableCell className="max-w-[200px]">
                        <span className="line-clamp-1 font-medium">
                          {prompt?.prompt_text || 'Unknown prompt'}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        <span className="line-clamp-2 text-sm text-muted-foreground">
                          {response.response_text}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: AI_MODEL_COLORS[response.ai_model as AIModel],
                            color: AI_MODEL_COLORS[response.ai_model as AIModel],
                          }}
                        >
                          {AI_MODEL_LABELS[response.ai_model as AIModel]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getSentimentIcon(response.sentiment_score)}
                          <span className="text-sm text-red-600">
                            {response.sentiment_score !== null
                              ? `${(response.sentiment_score * 100).toFixed(0)}%`
                              : 'N/A'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(response.collected_at)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
