'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, CheckCircle2, ExternalLink, Info, Loader2, Unplug, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useGoogleConnection, useUpdateGoogleProperties, useDisconnectGoogle } from '@/hooks'

interface GoogleConnectionCardProps {
  projectId: string
}

export function GoogleConnectionCard({ projectId }: GoogleConnectionCardProps) {
  const { data, isLoading, error, refetch } = useGoogleConnection(projectId)
  const updateProperties = useUpdateGoogleProperties()
  const disconnectGoogle = useDisconnectGoogle()

  const [selectedGSC, setSelectedGSC] = useState<string | null>(null)
  const [selectedGA4, setSelectedGA4] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Initialize selected values when data loads
  useEffect(() => {
    if (data?.connection) {
      setSelectedGSC(data.connection.gsc_property)
      setSelectedGA4(data.connection.ga4_property)
    }
  }, [data?.connection])

  // Check URL params for connection success/error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google_connected') === 'true') {
      refetch()
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('google_error')) {
      // Error will be shown in UI
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [refetch])

  const handleConnect = () => {
    window.location.href = `/api/google/connect?projectId=${projectId}`
  }

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your Google account?')) {
      await disconnectGoogle.mutateAsync(projectId)
    }
  }

  const handleUpdateProperties = async () => {
    try {
      await updateProperties.mutateAsync({
        projectId,
        gscProperty: selectedGSC,
        ga4Property: selectedGA4,
      })
      setSaveSuccess(true)
      toast.success('Properties saved successfully')
      // Reset success state after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      toast.error('Failed to save properties. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google Integration
          </CardTitle>
          <CardDescription>
            Connect your Google account to import Search Console data
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const isConnected = !!data?.connection

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Google Integration
        </CardTitle>
        <CardDescription>
          Connect your Google account to import Search Console data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isConnected && data.connection ? (
              <>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {data.connection.email}
                </span>
              </>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="h-3 w-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnectGoogle.isPending}
            >
              {disconnectGoogle.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Unplug className="h-4 w-4 mr-2" />
              )}
              Disconnect
            </Button>
          ) : (
            <Button onClick={handleConnect}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Connect Google Account
            </Button>
          )}
        </div>

        {/* Property Selection (only when connected) */}
        {isConnected && (
          <>
            <div className="border-t pt-6 space-y-4">
              {/* GSC Property */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Console Property</label>
                <Select
                  value={selectedGSC || 'none'}
                  onValueChange={(value) => setSelectedGSC(value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No property selected</SelectItem>
                    {data.gscProperties?.map((prop) => (
                      <SelectItem key={prop.siteUrl} value={prop.siteUrl}>
                        {prop.siteUrl.replace('sc-domain:', '')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {data.gscProperties?.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No Search Console properties found. Make sure you have access to at least one property in Google Search Console.
                  </p>
                )}
              </div>

              {/* GA4 Property */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Google Analytics 4 Property</label>
                <Select
                  value={selectedGA4 || 'none'}
                  onValueChange={(value) => setSelectedGA4(value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No property selected</SelectItem>
                    {data.ga4Properties?.map((account) => (
                      account.properties?.map((prop) => (
                        <SelectItem key={prop.name} value={prop.name}>
                          {prop.displayName} ({account.name})
                        </SelectItem>
                      ))
                    ))}
                  </SelectContent>
                </Select>
                {data.ga4Properties?.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No GA4 properties found. Make sure you have access to at least one property in Google Analytics.
                  </p>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleUpdateProperties}
                  disabled={updateProperties.isPending}
                  className={saveSuccess ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {updateProperties.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : saveSuccess ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : null}
                  {updateProperties.isPending ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Properties'}
                </Button>
              </div>
            </div>

            {/* Info about GSC data */}
            {selectedGSC && (
              <div className="flex gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-800">
                  With Search Console connected, you can import your actual keyword rankings and traffic data into Keyword Intel for better analysis.
                </p>
              </div>
            )}
          </>
        )}

        {/* Not connected info */}
        {!isConnected && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-medium">Benefits of connecting</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Import your actual keyword rankings from Google Search Console</li>
              <li>• See real impressions, clicks, and CTR for each keyword</li>
              <li>• Identify content gaps between your rankings and AI visibility</li>
              <li>• Track organic performance alongside AI mention data</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
