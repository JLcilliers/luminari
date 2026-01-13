'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Loader2, TrendingUp } from 'lucide-react'
import { useBrandMentions, useProjects } from '@/hooks'

export function TopBrands() {
  const { data: brandMentions, isLoading } = useBrandMentions()
  const { data: projects } = useProjects()
  const trackedBrand = projects?.[0]?.tracked_brand

  // Calculate total mentions for percentages
  const totalMentions = brandMentions?.reduce((sum, b) => sum + b.count, 0) || 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Top Brands Mentioned
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : brandMentions && brandMentions.length > 0 ? (
          <div className="space-y-4">
            {brandMentions.slice(0, 5).map((item, index) => {
              const percentage = totalMentions > 0 ? (item.count / totalMentions) * 100 : 0
              const isTrackedBrand = trackedBrand && item.brand.toLowerCase() === trackedBrand.toLowerCase()

              return (
                <div key={item.brand} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <span className={`text-sm font-medium ${isTrackedBrand ? 'text-primary' : ''}`}>
                        {item.brand}
                      </span>
                      {isTrackedBrand && (
                        <Badge variant="secondary" className="text-xs">
                          Your Brand
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {item.count} mentions
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isTrackedBrand ? 'bg-primary' : 'bg-slate-400'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No brand mentions tracked yet</p>
            <p className="text-sm">Collect AI responses to see brand mentions</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
