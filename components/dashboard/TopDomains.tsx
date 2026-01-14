'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, Loader2, ExternalLink } from 'lucide-react'
import { useCitationsByDomain, useProject } from '@/hooks'

interface TopDomainsProps {
  projectId: string
}

export function TopDomains({ projectId }: TopDomainsProps) {
  const { data: domains, isLoading } = useCitationsByDomain(projectId)
  const { data: project } = useProject(projectId)
  const trackedDomain = project?.website_url
    ? new URL(project.website_url).hostname.replace('www.', '')
    : null

  // Calculate total citations for percentages
  const totalCitations = domains?.reduce((sum, d) => sum + d.count, 0) || 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Top Cited Domains
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : domains && domains.length > 0 ? (
          <div className="space-y-4">
            {domains.slice(0, 5).map((item, index) => {
              const percentage = totalCitations > 0 ? (item.count / totalCitations) * 100 : 0
              const isTrackedDomain = trackedDomain && item.domain.replace('www.', '').includes(trackedDomain)

              return (
                <div key={item.domain} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <a
                        href={`https://${item.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm font-medium hover:underline flex items-center gap-1 ${
                          isTrackedDomain ? 'text-primary' : ''
                        }`}
                      >
                        {item.domain}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {isTrackedDomain && (
                        <Badge variant="secondary" className="text-xs">
                          Your Domain
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {item.count} citations
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {percentage.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isTrackedDomain ? 'bg-primary' : 'bg-slate-400'}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No citations tracked yet</p>
            <p className="text-sm">Collect AI responses to see cited domains</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
