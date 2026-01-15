import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
  fetchGSCProperties,
} from '@/lib/google-oauth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')
    const error = request.nextUrl.searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error)
      const redirectUrl = new URL('/brand/settings', request.url)
      redirectUrl.searchParams.set('google_error', error)
      return NextResponse.redirect(redirectUrl)
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/brand/settings?google_error=missing_params', request.url))
    }

    // Decode state to get project ID
    let projectId: string
    try {
      const decodedState = JSON.parse(Buffer.from(state, 'base64').toString())
      projectId = decodedState.projectId
    } catch {
      return NextResponse.redirect(new URL('/brand/settings?google_error=invalid_state', request.url))
    }

    // Determine redirect URI (must match what was used in connect)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/google/callback`

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri)

    // Get user info
    const userInfo = await getGoogleUserInfo(tokens.access_token)

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000)

    // Fetch available GSC properties to pre-populate
    let gscProperties: { siteUrl: string }[] = []
    try {
      gscProperties = await fetchGSCProperties(tokens.access_token)
    } catch (e) {
      console.warn('Could not fetch GSC properties:', e)
    }

    // Upsert Google connection for this project
    // Note: Using type assertion since google_connections table may not be in generated types yet
    const { error: upsertError } = await supabase
      .from('google_connections' as 'projects')
      .upsert({
        project_id: projectId,
        google_email: userInfo.email,
        google_sub: userInfo.sub,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        token_expiry: tokenExpiry.toISOString(),
        scopes: tokens.scope.split(' '),
        // Auto-select first GSC property if only one
        gsc_property: gscProperties.length === 1 ? gscProperties[0].siteUrl : null,
        updated_at: new Date().toISOString(),
      } as never, {
        onConflict: 'project_id',
      })

    if (upsertError) {
      console.error('Failed to save Google connection:', upsertError)
      return NextResponse.redirect(
        new URL(`/brand/${projectId}/settings?google_error=save_failed`, request.url)
      )
    }

    // Redirect to settings page with success
    return NextResponse.redirect(
      new URL(`/brand/${projectId}/settings?google_connected=true`, request.url)
    )
  } catch (error) {
    console.error('Google callback error:', error)
    return NextResponse.redirect(new URL('/brand/settings?google_error=callback_failed', request.url))
  }
}
