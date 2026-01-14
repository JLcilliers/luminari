'use client';

import { useParams } from 'next/navigation';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { VisibilityChart } from '@/components/dashboard/VisibilityChart';
import { ModelDistribution } from '@/components/dashboard/ModelDistribution';
import { ShareOfVoice } from '@/components/dashboard/ShareOfVoice';
import { RecentResponses } from '@/components/dashboard/RecentResponses';
import { TopBrands } from '@/components/dashboard/TopBrands';
import { TopDomains } from '@/components/dashboard/TopDomains';
import { HealthScore } from '@/components/dashboard/HealthScore';
import { SetupChecklist } from '@/components/dashboard/SetupChecklist';

export default function DashboardPage() {
  const params = useParams();
  const brandId = params.brandId as string;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor your brand visibility across AI platforms
        </p>
      </div>

      <SetupChecklist projectId={brandId} />

      <StatsCards projectId={brandId} />

      <div className="grid gap-6 lg:grid-cols-3">
        <VisibilityChart projectId={brandId} />
        <HealthScore projectId={brandId} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ModelDistribution projectId={brandId} />
        <TopBrands projectId={brandId} />
        <TopDomains projectId={brandId} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentResponses projectId={brandId} />
        <ShareOfVoice projectId={brandId} />
      </div>
    </div>
  );
}
