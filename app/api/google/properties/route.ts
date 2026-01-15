import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  getValidAccessToken,
  fetchGSCProperties,
  fetchGA4Properties,
  refreshAccessToken,
} from '@/lib/google-oauth'
import type { GoogleConnection } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
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
        { error: 'No Google connection found for this project' },
        { status: 404 }
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

    // Fetch properties in parallel
    const [gscProperties, ga4Properties] = await Promise.all([
      fetchGSCProperties(accessToken).catch((e) => {
        console.warn('Failed to fetch GSC properties:', e)
        return []
      }),
      fetchGA4Properties(accessToken).catch((e) => {
        console.warn('Failed to fetch GA4 properties:', e)
        return []
      }),
    ])

    return NextResponse.json({
      connection: {
        id: connection.id,
        email: connection.google_email,
        gsc_property: connection.gsc_property,
        ga4_property: connection.ga4_property,
        connected_at: connection.connected_at,
      },
      gscProperties,
      ga4Properties,
    })
  } catch (error) {
    console.error('Fetch properties error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Google properties' },
      { status: 500 }
    )
  }
}

// Update selected properties
export async function POST(request: NextRequest) {
  try {
    const { projectId, gscProperty, ga4Property } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Update Google connection with selected properties
    const { error } = await supabase
      .from('google_connections' as 'projects')
      .update({
        gsc_property: gscProperty || null,
        ga4_property: ga4Property || null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('project_id' as 'id', projectId)

    if (error) {
      console.error('Failed to update properties:', error)
      return NextResponse.json(
        { error: 'Failed to update selected properties' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update properties error:', error)
    return NextResponse.json(
      { error: 'Failed to update properties' },
      { status: 500 }
    )
  }
}
