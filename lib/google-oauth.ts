// Google OAuth2 helper functions for GSC and GA4 integration

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''

// OAuth2 scopes required for GSC and GA4
export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/webmasters.readonly', // Search Console
  'https://www.googleapis.com/auth/analytics.readonly',   // Google Analytics
]

/**
 * Generate Google OAuth2 authorization URL
 */
export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline', // Required for refresh token
    prompt: 'consent select_account', // Always show account selector
    include_granted_scopes: 'true',
    scope: GOOGLE_SCOPES.join(' '),
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || 'Token exchange failed')
  }

  return response.json()
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
  token_type: string
  scope: string
}> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || 'Token refresh failed')
  }

  return response.json()
}

/**
 * Get user info from Google
 */
export async function getGoogleUserInfo(accessToken: string): Promise<{
  sub: string
  email: string
  name?: string
  picture?: string
}> {
  const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get user info')
  }

  return response.json()
}

/**
 * Get valid access token, refreshing if needed
 */
export async function getValidAccessToken(
  accessToken: string,
  refreshToken: string | null,
  tokenExpiry: Date
): Promise<{ accessToken: string; newExpiry?: Date }> {
  // Check if token is expired (with 5 minute buffer)
  const now = new Date()
  const buffer = 5 * 60 * 1000 // 5 minutes

  if (tokenExpiry.getTime() > now.getTime() + buffer) {
    // Token is still valid
    return { accessToken }
  }

  // Token is expired or about to expire, refresh it
  if (!refreshToken) {
    throw new Error('Token expired and no refresh token available')
  }

  const tokens = await refreshAccessToken(refreshToken)
  const newExpiry = new Date(Date.now() + tokens.expires_in * 1000)

  return {
    accessToken: tokens.access_token,
    newExpiry,
  }
}

/**
 * Fetch Google Search Console properties
 */
export async function fetchGSCProperties(accessToken: string): Promise<Array<{
  siteUrl: string
  permissionLevel: string
}>> {
  const response = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch GSC properties: ${error}`)
  }

  const data = await response.json()
  return data.siteEntry || []
}

/**
 * Fetch Google Analytics 4 accounts and properties
 */
export async function fetchGA4Properties(accessToken: string): Promise<Array<{
  name: string
  id: string
  properties: Array<{
    name: string
    id: string
    displayName: string
  }>
}>> {
  // First, get accounts
  const accountsResponse = await fetch(
    'https://analyticsadmin.googleapis.com/v1alpha/accounts',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )

  if (!accountsResponse.ok) {
    const error = await accountsResponse.text()
    throw new Error(`Failed to fetch GA4 accounts: ${error}`)
  }

  const accountsData = await accountsResponse.json()
  const accounts = accountsData.accounts || []
  const result: Array<{
    name: string
    id: string
    properties: Array<{ name: string; id: string; displayName: string }>
  }> = []

  // For each account, get properties
  for (const account of accounts) {
    const propertiesResponse = await fetch(
      `https://analyticsadmin.googleapis.com/v1alpha/properties?filter=parent:${account.name}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (propertiesResponse.ok) {
      const propertiesData = await propertiesResponse.json()
      if (propertiesData.properties && propertiesData.properties.length > 0) {
        result.push({
          name: account.displayName,
          id: account.name,
          properties: propertiesData.properties.map((prop: { name: string; displayName: string }) => ({
            name: prop.name,
            id: prop.name.split('/').pop(),
            displayName: prop.displayName,
          })),
        })
      }
    }
  }

  return result
}

/**
 * Check if Google OAuth is configured
 */
export function isGoogleOAuthConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)
}
