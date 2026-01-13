import { StatsCards } from '@/components/dashboard/StatsCards'
import { VisibilityChart } from '@/components/dashboard/VisibilityChart'
import { ModelDistribution } from '@/components/dashboard/ModelDistribution'
import { ShareOfVoice } from '@/components/dashboard/ShareOfVoice'
import { RecentResponses } from '@/components/dashboard/RecentResponses'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your brand visibility across AI platforms
        </p>
      </div>

      <StatsCards />

      <div className="grid gap-6 lg:grid-cols-3">
        <VisibilityChart />
        <ModelDistribution />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentResponses />
        <ShareOfVoice />
      </div>
    </div>
  )
}
