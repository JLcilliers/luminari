'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AI_MODEL_COLORS, AI_MODEL_LABELS, type AIModel } from '@/lib/types'
import { useResponseStats } from '@/hooks'
import { PieChartIcon } from 'lucide-react'

interface ModelDistributionProps {
  projectId: string
}

export function ModelDistribution({ projectId }: ModelDistributionProps) {
  const { data: stats, isLoading } = useResponseStats(projectId)

  // Convert byModel to chart data format
  const chartData = stats?.byModel
    ? Object.entries(stats.byModel).map(([model, count]) => ({
        name: AI_MODEL_LABELS[model as AIModel] || model,
        value: count,
        model: model as AIModel,
      }))
    : []

  // Calculate percentages
  const total = chartData.reduce((sum, d) => sum + d.value, 0)
  const dataWithPercentage = chartData.map(d => ({
    ...d,
    percentage: total > 0 ? Math.round((d.value / total) * 100) : 0,
  }))

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Model Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (chartData.length === 0 || total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Model Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex flex-col items-center justify-center text-center">
            <PieChartIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg">No responses collected</h3>
            <p className="text-muted-foreground text-sm max-w-xs mt-1">
              Responses from different AI models will appear here once collected.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Model Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithPercentage}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {dataWithPercentage.map((entry) => (
                  <Cell
                    key={entry.model}
                    fill={AI_MODEL_COLORS[entry.model]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value, name, props) => [
                  `${value} (${props.payload.percentage}%)`,
                  'Responses'
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
