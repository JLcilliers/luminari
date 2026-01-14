'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, PieChart } from 'lucide-react'
import { useBrandMentions, useProject, useCompetitors } from '@/hooks'

interface ShareOfVoiceProps {
  projectId: string
}

export function ShareOfVoice({ projectId }: ShareOfVoiceProps) {
  const { data: brandMentions, isLoading: mentionsLoading } = useBrandMentions(projectId)
  const { data: project, isLoading: projectLoading } = useProject(projectId)
  const { data: competitors, isLoading: competitorsLoading } = useCompetitors(projectId)

  const isLoading = mentionsLoading || projectLoading || competitorsLoading
  const trackedBrand = project?.tracked_brand

  // Build chart data from brand mentions
  const chartData = brandMentions?.slice(0, 6).map(item => {
    const isTracked = trackedBrand && item.brand.toLowerCase() === trackedBrand.toLowerCase()
    const isCompetitor = competitors?.some(c =>
      c.name.toLowerCase() === item.brand.toLowerCase()
    )

    return {
      name: item.brand,
      mentions: item.count,
      isTracked,
      isCompetitor,
    }
  }) || []

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Share of Voice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Share of Voice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
            <PieChart className="h-12 w-12 mb-3 opacity-50" />
            <p>No brand mentions yet</p>
            <p className="text-sm">Collect AI responses to see share of voice</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share of Voice</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis
                type="number"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value) => [value, 'Mentions']}
              />
              <Bar dataKey="mentions" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.isTracked ? 'hsl(var(--primary))' : '#94a3b8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span>Your Brand</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-slate-400" />
            <span>Competitors</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
