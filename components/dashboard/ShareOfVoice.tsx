'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// Placeholder data for share of voice comparison
const data = [
  { domain: 'Your Brand', mentions: 45, fill: 'hsl(var(--primary))' },
  { domain: 'Competitor A', mentions: 38, fill: '#94a3b8' },
  { domain: 'Competitor B', mentions: 32, fill: '#94a3b8' },
  { domain: 'Competitor C', mentions: 28, fill: '#94a3b8' },
  { domain: 'Competitor D', mentions: 22, fill: '#94a3b8' },
]

export function ShareOfVoice() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Share of Voice</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis
                type="number"
                className="text-xs"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                type="category"
                dataKey="domain"
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
              <Bar
                dataKey="mentions"
                radius={[0, 4, 4, 0]}
                fill="hsl(var(--primary))"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
