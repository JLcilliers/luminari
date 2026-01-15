import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getValidAccessToken } from '@/lib/google-oauth'
import type { GoogleConnection } from '@/lib/types'

export const dynamic = 'force-dynamic'

interface GA4MetricValue {
  value: string
}

interface GA4DimensionValue {
  value: string
}

interface GA4Row {
  metricValues: GA4MetricValue[]
  dimensionValues?: GA4DimensionValue[]
}

interface GA4Response {
  rows?: GA4Row[]
  totals?: GA4Row[]
}

/**
 * Fetch overview metrics from Google Analytics 4
 */
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')
    const days = parseInt(request.nextUrl.searchParams.get('days') || '28')

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

    if (!connection.ga4_property) {
      return NextResponse.json(
        { error: 'No GA4 property selected. Please select a property in Settings.' },
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

    // GA4 property ID format: properties/123456789
    const propertyId = connection.ga4_property

    // Fetch overview metrics
    const metricsResponse = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [
            {
              startDate: `${days}daysAgo`,
              endDate: 'yesterday',
            },
          ],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'screenPageViews' },
            { name: 'bounceRate' },
            { name: 'averageSessionDuration' },
          ],
        }),
      }
    )

    if (!metricsResponse.ok) {
      const error = await metricsResponse.text()
      console.error('GA4 API error:', error)
      return NextResponse.json({ error: 'Failed to fetch GA4 data' }, { status: 500 })
    }

    const metricsData: GA4Response = await metricsResponse.json()

    // Fetch daily sessions for chart
    const dailyResponse = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [
            {
              startDate: `${days}daysAgo`,
              endDate: 'yesterday',
            },
          ],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
          ],
          orderBys: [
            { dimension: { dimensionName: 'date' } },
          ],
        }),
      }
    )

    let dailyData: { date: string; sessions: number; users: number }[] = []
    if (dailyResponse.ok) {
      const daily: GA4Response = await dailyResponse.json()
      dailyData = (daily.rows || []).map((row) => ({
        date: row.dimensionValues?.[0]?.value || '',
        sessions: parseInt(row.metricValues[0]?.value || '0'),
        users: parseInt(row.metricValues[1]?.value || '0'),
      }))
    }

    // Fetch traffic sources
    const sourcesResponse = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [
            {
              startDate: `${days}daysAgo`,
              endDate: 'yesterday',
            },
          ],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [
            { metric: { metricName: 'sessions' }, desc: true },
          ],
          limit: 10,
        }),
      }
    )

    let trafficSources: { source: string; sessions: number }[] = []
    if (sourcesResponse.ok) {
      const sources: GA4Response = await sourcesResponse.json()
      trafficSources = (sources.rows || []).map((row) => ({
        source: row.dimensionValues?.[0]?.value || 'Unknown',
        sessions: parseInt(row.metricValues[0]?.value || '0'),
      }))
    }

    // Fetch top landing pages
    const pagesResponse = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [
            {
              startDate: `${days}daysAgo`,
              endDate: 'yesterday',
            },
          ],
          dimensions: [{ name: 'landingPagePlusQueryString' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'bounceRate' },
          ],
          orderBys: [
            { metric: { metricName: 'sessions' }, desc: true },
          ],
          limit: 20,
        }),
      }
    )

    let topPages: { page: string; sessions: number; users: number; bounceRate: number }[] = []
    if (pagesResponse.ok) {
      const pages: GA4Response = await pagesResponse.json()
      topPages = (pages.rows || []).map((row) => ({
        page: row.dimensionValues?.[0]?.value || '/',
        sessions: parseInt(row.metricValues[0]?.value || '0'),
        users: parseInt(row.metricValues[1]?.value || '0'),
        bounceRate: parseFloat(row.metricValues[2]?.value || '0') * 100,
      }))
    }

    // Parse overview metrics
    const row = metricsData.rows?.[0]
    const overview = {
      sessions: parseInt(row?.metricValues[0]?.value || '0'),
      users: parseInt(row?.metricValues[1]?.value || '0'),
      pageviews: parseInt(row?.metricValues[2]?.value || '0'),
      bounceRate: parseFloat(row?.metricValues[3]?.value || '0') * 100,
      avgSessionDuration: parseFloat(row?.metricValues[4]?.value || '0'),
    }

    return NextResponse.json({
      overview,
      dailyData,
      trafficSources,
      topPages,
      dateRange: {
        start: `${days}daysAgo`,
        end: 'yesterday',
      },
      property: connection.ga4_property,
    })
  } catch (error) {
    console.error('GA4 fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch GA4 data' }, { status: 500 })
  }
}
