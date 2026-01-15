import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl, isGoogleOAuthConfigured } from '@/lib/google-oauth'

export async function GET(request: NextRequest) {
  try {
    // Check if Google OAuth is configured
    if (!isGoogleOAuthConfigured()) {
      return NextResponse.json(
        { error: 'Google OAuth not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment.' },
        { status: 500 }
      )
    }

    // Get project ID from query params
    const projectId = request.nextUrl.searchParams.get('projectId')
    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Generate state with project ID for callback
    const state = Buffer.from(JSON.stringify({ projectId })).toString('base64')

    // Determine redirect URI based on environment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
                    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                    'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/google/callback`

    // Generate OAuth URL and redirect
    const authUrl = getGoogleAuthUrl(redirectUri, state)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Google connect error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Google OAuth' },
      { status: 500 }
    )
  }
}
