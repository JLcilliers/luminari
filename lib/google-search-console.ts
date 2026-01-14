// Google Search Console API Integration
// Requires OAuth2 refresh token for authentication

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN || '';

export interface GSCKeyword {
  keyword: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  url?: string;
}

export interface GSCPage {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

// Get OAuth2 access token from refresh token
async function getAccessToken(): Promise<string> {
  if (!GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google Search Console refresh token not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Get search analytics data from GSC
export async function getSearchAnalytics(
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: ('query' | 'page' | 'country' | 'device' | 'date')[] = ['query'],
  rowLimit: number = 1000
): Promise<GSCKeyword[]> {
  try {
    const accessToken = await getAccessToken();

    // URL encode the site URL for the API
    const encodedSiteUrl = encodeURIComponent(siteUrl);

    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions,
          rowLimit,
          dataState: 'final',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GSC API error: ${error}`);
    }

    const data = await response.json();

    if (data.rows) {
      return data.rows.map((row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
        keyword: row.keys[0], // First dimension is query
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr * 100, // Convert to percentage
        position: Math.round(row.position * 10) / 10,
        url: dimensions.includes('page') && row.keys.length > 1 ? row.keys[1] : undefined,
      }));
    }

    return [];
  } catch (error) {
    console.error('GSC getSearchAnalytics error:', error);
    throw error;
  }
}

// Get page performance data
export async function getPagePerformance(
  siteUrl: string,
  startDate: string,
  endDate: string,
  rowLimit: number = 1000
): Promise<GSCPage[]> {
  try {
    const accessToken = await getAccessToken();
    const encodedSiteUrl = encodeURIComponent(siteUrl);

    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['page'],
          rowLimit,
          dataState: 'final',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GSC API error: ${error}`);
    }

    const data = await response.json();

    if (data.rows) {
      return data.rows.map((row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
        url: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr * 100,
        position: Math.round(row.position * 10) / 10,
      }));
    }

    return [];
  } catch (error) {
    console.error('GSC getPagePerformance error:', error);
    throw error;
  }
}

// Get keywords for a specific page
export async function getKeywordsForPage(
  siteUrl: string,
  pageUrl: string,
  startDate: string,
  endDate: string,
  rowLimit: number = 500
): Promise<GSCKeyword[]> {
  try {
    const accessToken = await getAccessToken();
    const encodedSiteUrl = encodeURIComponent(siteUrl);

    const response = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate,
          endDate,
          dimensions: ['query'],
          dimensionFilterGroups: [{
            filters: [{
              dimension: 'page',
              expression: pageUrl,
            }]
          }],
          rowLimit,
          dataState: 'final',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GSC API error: ${error}`);
    }

    const data = await response.json();

    if (data.rows) {
      return data.rows.map((row: { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }) => ({
        keyword: row.keys[0],
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr * 100,
        position: Math.round(row.position * 10) / 10,
        url: pageUrl,
      }));
    }

    return [];
  } catch (error) {
    console.error('GSC getKeywordsForPage error:', error);
    throw error;
  }
}

// Check if GSC is configured
export function isGSCConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN);
}

// Get date range string for GSC (last N days)
export function getDateRange(days: number = 28): { startDate: string; endDate: string } {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3); // GSC data has ~3 day delay

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}
