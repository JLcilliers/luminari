'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Settings, ArrowRight, Search, BarChart3 } from 'lucide-react'
import { useGoogleConnection } from '@/hooks'

interface GoogleConnectCTAProps {
  projectId: string
}

export function GoogleConnectCTA({ projectId }: GoogleConnectCTAProps) {
  const { data: googleConnection, isLoading } = useGoogleConnection(projectId)

  // Loading state
  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardContent className="py-8">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  // Already connected
  if (googleConnection?.connection) {
    return null
  }

  return (
    <Card className="col-span-full border-dashed border-2 bg-gradient-to-br from-blue-50/50 to-green-50/50 dark:from-blue-950/20 dark:to-green-950/20">
      <CardContent className="py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            {/* Google Logo */}
            <div className="relative">
              <div className="p-4 bg-white rounded-2xl shadow-md">
                <svg className="h-12 w-12" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </div>
              {/* Decorative icons */}
              <div className="absolute -top-2 -right-2 p-1.5 bg-blue-500 rounded-full text-white shadow-sm">
                <Search className="h-3 w-3" />
              </div>
              <div className="absolute -bottom-2 -left-2 p-1.5 bg-purple-500 rounded-full text-white shadow-sm">
                <BarChart3 className="h-3 w-3" />
              </div>
            </div>

            {/* Content */}
            <div>
              <h3 className="text-xl font-semibold mb-1">Connect Google Services</h3>
              <p className="text-muted-foreground max-w-md">
                Import your keyword rankings from Search Console and view traffic data from Google Analytics
                to get a complete picture of your organic performance.
              </p>
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  Search Console keywords
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  Click & impression data
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  GA4 traffic metrics
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Link href={`/brand/${projectId}/settings?tab=google`}>
            <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
              <Settings className="h-4 w-4" />
              Connect Google
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
