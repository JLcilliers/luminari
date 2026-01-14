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

    // Prepare keywords for insertion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keywordsToInsert = keywords.map((k: any) => ({
      project_id: projectId,
      keyword: (typeof k === 'string' ? k : k.keyword).toLowerCase().trim(),
      search_volume: k.searchVolume || k.search_volume || null,
      difficulty: k.difficulty || null,
      current_position: k.position || k.current_position || null,
      ranking_url: k.url || k.ranking_url || null,
      cpc: k.cpc || null,
      competition: k.competition || null,
      intent: k.intent || null,
      source: source,
      last_updated: new Date().toISOString(),
    }));

    // Upsert keywords
    const { data, error } = await supabase
      .from('keywords')
      .upsert(keywordsToInsert, {
        onConflict: 'project_id,keyword',
        ignoreDuplicates: false
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to save keywords' }, { status: 500 });
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
