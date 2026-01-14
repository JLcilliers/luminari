import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const getAuthHeader = () => {
  const login = process.env.DATAFORSEO_LOGIN || '';
  const password = process.env.DATAFORSEO_PASSWORD || '';

  if (!login || !password) {
    throw new Error('DataForSEO credentials not configured');
  }

  const credentials = Buffer.from(`${login}:${password}`).toString('base64');
  return `Basic ${credentials}`;
};

export async function POST(request: NextRequest) {
  try {
    const { projectId, keywordIds } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Fetch keywords to enrich
    let query = supabase
      .from('keywords')
      .select('id, keyword')
      .eq('project_id', projectId)
      .is('search_volume', null); // Only enrich keywords without volume

    if (keywordIds && keywordIds.length > 0) {
      query = query.in('id', keywordIds);
    }

    const { data: keywords, error: fetchError } = await query.limit(100);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 });
    }

    if (!keywords || keywords.length === 0) {
      return NextResponse.json({ enriched: 0, message: 'No keywords to enrich' });
    }

    // Get search volume from DataForSEO
    const keywordStrings = keywords.map(k => k.keyword);

    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        keywords: keywordStrings,
        location_code: 2840,
        language_code: 'en',
      }]),
    });

    const data = await response.json();

    if (data.status_code !== 20000) {
      return NextResponse.json({ error: data.status_message || 'DataForSEO API error' }, { status: 400 });
    }

    // Parse results and create update map
    const results = data.tasks?.[0]?.result || [];
    const volumeMap = new Map();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    results.forEach((item: any) => {
      volumeMap.set(item.keyword.toLowerCase(), {
        search_volume: item.search_volume,
        cpc: item.cpc,
        competition: item.competition,
      });
    });

    // Update each keyword
    let enrichedCount = 0;
    for (const kw of keywords) {
      const volumeData = volumeMap.get(kw.keyword.toLowerCase());
      if (volumeData) {
        const { error: updateError } = await supabase
          .from('keywords')
          .update({
            search_volume: volumeData.search_volume,
            cpc: volumeData.cpc,
            competition: volumeData.competition,
            last_updated: new Date().toISOString(),
          })
          .eq('id', kw.id);

        if (!updateError) {
          enrichedCount++;
        }
      }
    }

    return NextResponse.json({
      enriched: enrichedCount,
      total: keywords.length,
      message: `Enriched ${enrichedCount} keywords with search volume data`
    });
  } catch (error) {
    console.error('Enrich error:', error);
    return NextResponse.json({ error: 'Failed to enrich keywords' }, { status: 500 });
  }
}
