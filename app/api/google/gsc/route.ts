import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getValidAccessToken } from '@/lib/google-oauth'
import type { GSCKeywordData, GoogleConnection } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Fetch keywords from Google Search Console
 */
export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')
    const days = parseInt(request.nextUrl.searchParams.get('days') || '28')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '1000')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    // Get Google connection for this project
    // Note: Using type assertion since google_connections table may not be in generated types yet
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

    // Fetch search analytics data
    // Use the GSC property URL as-is (either sc-domain:example.com or https://example.com/)
    const siteUrl = connection.gsc_property

    console.log('[GSC API] Fetching data for property:', siteUrl)
    console.log('[GSC API] Date range:', formatDate(startDate), 'to', formatDate(endDate))

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
          dimensions: ['query', 'page'],
          rowLimit: limit,
          dataState: 'final',
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[GSC API] Error response:', response.status, errorText)

      // Parse error for more context
      let errorMessage = 'Failed to fetch GSC data'
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message
        }
        // Check for common issues
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
    console.log('[GSC API] Success - found', data.rows?.length || 0, 'rows')

    // Transform to our format
    const keywords: GSCKeywordData[] = (data.rows || []).map((row: {
      keys: string[]
      clicks: number
      impressions: number
      ctr: number
      position: number
    }) => ({
      keyword: row.keys[0],
      url: row.keys[1],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: Math.round(row.position * 10) / 10,
    }))

    return NextResponse.json({
      keywords,
      dateRange: {
        start: formatDate(startDate),
        end: formatDate(endDate),
      },
      property: connection.gsc_property,
    })
  } catch (error) {
    console.error('GSC fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch GSC data' }, { status: 500 })
  }
}

/**
 * Import GSC keywords into the keywords table
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, keywords } = await request.json()

    if (!projectId || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: 'Project ID and keywords array are required' },
        { status: 400 }
      )
    }

    // Get project info for domain matching
    const { data: project } = await supabase
      .from('projects')
      .select('website_url')
      .eq('id', projectId)
      .single() as { data: { website_url: string | null } | null }

    const projectDomain = project?.website_url
      ? new URL(project.website_url).hostname.replace('www.', '')
      : null

    // Prepare keywords for upsert
    const keywordsToInsert = keywords.map((kw: GSCKeywordData) => {
      // Calculate content gap - if we're ranking, gap is lower
      const contentGapPct = kw.position && kw.position <= 10 ? 0 : kw.position <= 30 ? 50 : 100

      // Calculate opportunity score based on GSC data
      let opportunityScore = 50
      if (kw.impressions >= 1000) opportunityScore += 20
      else if (kw.impressions >= 100) opportunityScore += 10
      if (kw.position <= 10) opportunityScore -= 20 // Already ranking well
      else if (kw.position <= 20) opportunityScore += 10 // Room for improvement
      else opportunityScore += 20 // High opportunity

      return {
        project_id: projectId,
        keyword: kw.keyword,
        source: 'gsc',
        search_volume: null, // GSC doesn't provide this
        position: kw.position ? Math.round(kw.position) : null,
        landing_page: kw.url || null,
        content_gap_pct: contentGapPct,
        opportunity_score: Math.min(Math.max(opportunityScore, 0), 100),
        in_cart: false,
        sent_to_launchpad: false,
        content_created: false,
        gsc_clicks: kw.clicks,
        gsc_impressions: kw.impressions,
        gsc_ctr: kw.ctr,
        gsc_position: kw.position,
        gsc_last_synced: new Date().toISOString(),
      }
    })

    // Upsert keywords (update if same keyword exists for project)
    // Note: Using type assertion for new GSC fields that may not be in generated types
    const { data, error } = await supabase
      .from('keywords')
      .upsert(keywordsToInsert as never[], {
        onConflict: 'project_id,keyword',
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error('Failed to import GSC keywords:', error)
      return NextResponse.json({ error: 'Failed to import keywords' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      imported: keywords.length,
    })
  } catch (error) {
    console.error('GSC import error:', error)
    return NextResponse.json({ error: 'Failed to import GSC keywords' }, { status: 500 })
  }
}
