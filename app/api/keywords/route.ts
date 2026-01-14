import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET - Fetch keywords for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const tracked = searchParams.get('tracked');
    const source = searchParams.get('source');
    const sortBy = searchParams.get('sortBy') || 'search_volume';
    const sortDir = searchParams.get('sortDir') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('keywords')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId);

    if (tracked === 'true') {
      query = query.eq('is_tracked', true);
    }

    if (source) {
      query = query.eq('source', source);
    }

    // Handle sorting
    const ascending = sortDir === 'asc';
    query = query.order(sortBy, { ascending, nullsFirst: false });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data: keywords, error, count } = await query;

    if (error) {
      console.error('Keywords fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch keywords' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      keywords,
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Keywords GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch keywords' },
      { status: 500 }
    );
  }
}

// POST - Add new keywords
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, keywords } = body;

    if (!projectId || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { error: 'projectId and keywords array are required' },
        { status: 400 }
      );
    }

    const keywordsToInsert = keywords.map((kw: { keyword: string; search_volume?: number; cpc?: number; competition?: number; difficulty?: number; intent_type?: string; url?: string; source?: string }) => ({
      project_id: projectId,
      keyword: kw.keyword.toLowerCase().trim(),
      search_volume: kw.search_volume || null,
      cpc: kw.cpc || null,
      competition: kw.competition || null,
      difficulty: kw.difficulty || null,
      intent_type: kw.intent_type || null,
      url: kw.url || null,
      source: kw.source || 'manual',
      is_tracked: false,
    }));

    const { data, error } = await supabase
      .from('keywords')
      .upsert(keywordsToInsert, { onConflict: 'project_id,keyword' })
      .select();

    if (error) {
      console.error('Keywords insert error:', error);
      return NextResponse.json(
        { error: 'Failed to add keywords' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      added: data.length,
      keywords: data,
    });
  } catch (error) {
    console.error('Keywords POST error:', error);
    return NextResponse.json(
      { error: 'Failed to add keywords' },
      { status: 500 }
    );
  }
}

// PATCH - Update keyword (e.g., toggle tracking)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywordId, updates } = body;

    if (!keywordId || !updates) {
      return NextResponse.json(
        { error: 'keywordId and updates are required' },
        { status: 400 }
      );
    }

    const allowedFields = ['is_tracked', 'intent_type', 'url'];
    const filteredUpdates: Record<string, unknown> = { last_updated: new Date().toISOString() };

    for (const field of allowedFields) {
      if (field in updates) {
        filteredUpdates[field] = updates[field];
      }
    }

    const { data, error } = await supabase
      .from('keywords')
      .update(filteredUpdates)
      .eq('id', keywordId)
      .select()
      .single();

    if (error) {
      console.error('Keywords update error:', error);
      return NextResponse.json(
        { error: 'Failed to update keyword' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      keyword: data,
    });
  } catch (error) {
    console.error('Keywords PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to update keyword' },
      { status: 500 }
    );
  }
}

// DELETE - Remove keywords
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywordIds } = body;

    if (!keywordIds || !Array.isArray(keywordIds) || keywordIds.length === 0) {
      return NextResponse.json(
        { error: 'keywordIds array is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('keywords')
      .delete()
      .in('id', keywordIds);

    if (error) {
      console.error('Keywords delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete keywords' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: keywordIds.length,
    });
  } catch (error) {
    console.error('Keywords DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete keywords' },
      { status: 500 }
    );
  }
}
