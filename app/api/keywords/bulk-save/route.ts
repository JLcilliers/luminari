import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { projectId, keywords, source = 'manual' } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: 'No keywords provided' }, { status: 400 });
    }

    // Map source to allowed values in DB schema
    const sourceMap: Record<string, string> = {
      'ai_discovery': 'manual',
      'brand_bible': 'manual',
      'domain_scan': 'dataforseo',
      'manual': 'manual',
      'gsc': 'gsc',
      'dataforseo': 'dataforseo',
    };
    const dbSource = sourceMap[source] || 'manual';

    // Map intent to allowed values in DB schema
    const intentMap: Record<string, string> = {
      'informational': 'informational',
      'commercial': 'commercial',
      'transactional': 'transactional',
      'navigational': 'navigational',
    };

    // Prepare keywords for insertion (using correct DB column names)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keywordsToInsert = keywords.map((k: any) => ({
      project_id: projectId,
      keyword: (typeof k === 'string' ? k : k.keyword).toLowerCase().trim(),
      search_volume: k.searchVolume || k.search_volume || null,
      keyword_difficulty: k.difficulty || k.keyword_difficulty || null,
      position: k.position || k.current_position || null,
      landing_page: k.url || k.ranking_url || k.landing_page || null,
      cpc: k.cpc || null,
      intent_type: intentMap[(k.intent || '').toLowerCase()] || null,
      source: dbSource,
    }));

    // Upsert keywords (unique constraint is on project_id, keyword, source)
    const { data, error } = await supabase
      .from('keywords')
      .upsert(keywordsToInsert, {
        onConflict: 'project_id,keyword,source',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to save keywords', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      saved: data?.length || 0,
      message: `Saved ${data?.length || 0} keywords`
    });
  } catch (error) {
    console.error('Bulk save error:', error);
    return NextResponse.json({ error: 'Failed to save keywords' }, { status: 500 });
  }
}
