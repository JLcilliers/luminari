import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getValidAccessToken } from '@/lib/google-oauth'
import type { GoogleConnection, GSCPageData } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Fetch top pages from Google Search Console
 */
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')
    const days = parseInt(request.nextUrl.searchParams.get('days') || '28')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get Google connection for this project
    const { data: connection, error: connError } = await supabase
      .from('google_connections' as 'projects')
      .select('*')
      .eq('project_id' as 'id', projectId)
      .single() as { data: GoogleConnection | null; error: Error | null }

    if (connError || !connection) {
      return NextResponse.json(
        { error: 'No Google connection found. Please connect your Google account first.' },
        { status: 404 }
      )
    }

    if (!connection.gsc_property) {
      return NextResponse.json(
        { error: 'No Search Console property selected. Please select a property in Settings.' },
        { status: 400 }
      )
    }

    // Get valid access token (refresh if needed)
    const { accessToken, newExpiry } = await getValidAccessToken(
      connection.access_token,
      connection.refresh_token || null,
      new Date(connection.token_expiry)
    )

    // Update tokens if refreshed
    if (newExpiry) {
      await supabase
        .from('google_connections' as 'projects')
        .update({
          access_token: accessToken,
          token_expiry: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id' as 'id', connection.id)
    }

    // Calculate date range (GSC has 2-3 day delay)
    const endDate = new Date()
    endDate.setDate(endDate.getDate() - 3)
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - days)

    const formatDate = (d: Date) => d.toISOString().split('T')[0]

    // Fetch search analytics data by page
    // Use the GSC property URL as-is (either sc-domain:example.com or https://example.com/)
    const siteUrl = connection.gsc_property

    console.log('[GSC Pages API] Fetching pages for property:', siteUrl)
    console.log('[GSC Pages API] Date range:', formatDate(startDate), 'to', formatDate(endDate))

    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          dimensions: ['page'],
          rowLimit: limit,
          dataState: 'final',
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[GSC Pages API] Error response:', response.status, errorText)

      // Parse error for more context
      let errorMessage = 'Failed to fetch GSC pages data'
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message
        }
        if (errorJson.error?.status === 'PERMISSION_DENIED') {
          errorMessage = 'Permission denied. Please ensure the Search Console property is verified and accessible.'
        } else if (errorJson.error?.status === 'NOT_FOUND') {
          errorMessage = 'Search Console property not found. Please verify the property exists.'
        }
      } catch {
        // Keep default error message
      }

      return NextResponse.json({
        error: errorMessage,
        details: errorText,
        property: siteUrl
      }, { status: response.status })
    }

    const data = await response.json()
    console.log('[GSC Pages API] Success - found', data.rows?.length || 0, 'pages')

    // Transform to our format
    const pages: GSCPageData[] = (data.rows || []).map((row: {
      keys: string[]
      clicks: number
      impressions: number
      ctr: number
      position: number
    }) => ({
      url: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: Math.round(row.position * 10) / 10,
    }))

    return NextResponse.json({
      pages,
      dateRange: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
      property: connection.gsc_property,
    })
  } catch (error) {
    console.error('GSC pages fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch GSC pages data' }, { status: 500 })
  }
}
