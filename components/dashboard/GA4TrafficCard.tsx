'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Users,
  Eye,
  Clock,
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react'
import { useGoogleConnection } from '@/hooks'
import { cn } from '@/lib/utils'

interface GA4TrafficCardProps {
  projectId: string
}

function MetricItem({
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
}: {
  label: string
  value: string
  icon: React.ElementType
  trend?: 'up' | 'down'
  trendValue?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-purple-100 rounded-lg">
        <Icon className="h-4 w-4 text-purple-600" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{value}</span>
          {trend && trendValue && (
            <span
              className={cn(
                'text-xs flex items-center gap-0.5',
                trend === 'up' ? 'text-green-500' : 'text-red-500'
              )}
            >
              {trend === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trendValue}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function GA4TrafficCard({ projectId }: GA4TrafficCardProps) {
  const { data: googleConnection, isLoading } = useGoogleConnection(projectId)

  const isConnected = !!googleConnection?.connection?.ga4_property

  // Mock data for demonstration (will be replaced with real API data)
  const mockData = useMemo(() => {
    if (!isConnected) return null

    // Generate 28-day trend
    const days = 28
    const chartData = Array.from({ length: days }, (_, i) => {
      const baseValue = 500 + Math.random() * 300
      const trendFactor = 1 + (i / days) * 0.15
      return {
        date: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toLocaleDateString(
          'en-US',
          { month: 'short', day: 'numeric' }
        ),
        sessions: Math.round(baseValue * trendFactor),
        users: Math.round(baseValue * 0.7 * trendFactor),
      }
    })

    return {
      sessions: Math.round(chartData.reduce((sum, d) => sum + d.sessions, 0)),
      users: Math.round(chartData.reduce((sum, d) => sum + d.users, 0)),
      pageviews: Math.round(chartData.reduce((sum, d) => sum + d.sessions * 2.3, 0)),
      bounceRate: 45.2,
      avgDuration: '2:34',
      chartData,
    }
  }, [isConnected])

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" />
            GA4 Traffic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
            <Skeleton className="h-[150px]" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Not connected - show placeholder
  if (!isConnected) {
    return null
  }

  if (!mockData) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              GA4 Traffic
            </CardTitle>
            <CardDescription>Last 28 days</CardDescription>
          </div>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            Analytics
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <MetricItem
            label="Sessions"
            value={mockData.sessions.toLocaleString()}
            icon={MousePointerClick}
            trend="up"
            trendValue="+8%"
          />
          <MetricItem
            label="Users"
            value={mockData.users.toLocaleString()}
            icon={Users}
            trend="up"
            trendValue="+12%"
          />
          <MetricItem
            label="Pageviews"
            value={mockData.pageviews.toLocaleString()}
            icon={Eye}
          />
          <MetricItem
            label="Bounce Rate"
            value={`${mockData.bounceRate}%`}
            icon={Clock}
            trend="down"
            trendValue="-3%"
          />
        </div>

        {/* Mini Chart */}
        <div className="h-[120px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockData.chartData}>
              <defs>
                <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9333ea" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#9333ea" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="sessions"
                name="Sessions"
                stroke="#9333ea"
                strokeWidth={2}
                fill="url(#colorSessions)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
