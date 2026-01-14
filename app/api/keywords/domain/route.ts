import { NextRequest, NextResponse } from 'next/server';

const getAuthHeader = () => {
  const login = process.env.DATAFORSEO_LOGIN || '';
  const password = process.env.DATAFORSEO_PASSWORD || '';

  if (!login || !password) {
    throw new Error('DataForSEO credentials not configured');
  }

  const credentials = Buffer.from(`${login}:${password}`).toString('base64');
  return `Basic ${credentials}`;
};

// Get keywords a domain ranks for (without GSC)
export async function POST(request: NextRequest) {
  try {
    const { domain, limit = 100, location_code = 2840 } = await request.json();

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Clean domain
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/^www\./, '');

    // Use DataForSEO's ranked_keywords endpoint
    const response = await fetch('https://api.dataforseo.com/v3/dataforseo_labs/google/ranked_keywords/live', {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        target: cleanDomain,
        location_code: location_code,
        language_code: 'en',
        limit: limit,
        order_by: ['keyword_data.keyword_info.search_volume,desc'],
        filters: [
          ['ranked_serp_element.serp_item.rank_absolute', '<=', 100]
        ]
      }]),
    });

    const data = await response.json();

    if (data.status_code !== 20000) {
      console.error('DataForSEO error:', data);
      return NextResponse.json({ error: data.status_message || 'API error' }, { status: 400 });
    }

    const items = data.tasks?.[0]?.result?.[0]?.items || [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keywords = items.map((item: any) => ({
      keyword: item.keyword_data?.keyword,
      searchVolume: item.keyword_data?.keyword_info?.search_volume || 0,
      position: item.ranked_serp_element?.serp_item?.rank_absolute || null,
      url: item.ranked_serp_element?.serp_item?.url || null,
      difficulty: item.keyword_data?.keyword_properties?.keyword_difficulty || null,
      cpc: item.keyword_data?.keyword_info?.cpc || null,
      competition: item.keyword_data?.keyword_info?.competition || null,
      intent: item.keyword_data?.search_intent_info?.main_intent || null,
    }));

    return NextResponse.json({
      domain: cleanDomain,
      totalKeywords: data.tasks?.[0]?.result?.[0]?.total_count || keywords.length,
      keywords
    });
  } catch (error) {
    console.error('Domain keywords error:', error);
    return NextResponse.json({ error: 'Failed to fetch domain keywords' }, { status: 500 });
  }
}
