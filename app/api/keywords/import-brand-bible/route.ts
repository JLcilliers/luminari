import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    // Fetch project with brand bible
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const brandBible = (project as any).brand_bible || {};

    // Collect keywords from various brand bible fields
    const keywordSources: string[] = [];

    // Direct keywords field
    if (brandBible.keywords && Array.isArray(brandBible.keywords)) {
      keywordSources.push(...brandBible.keywords);
    }

    // Services as keywords
    if (brandBible.services && Array.isArray(brandBible.services)) {
      keywordSources.push(...brandBible.services);
    }

    // Products as keywords
    if (brandBible.products && Array.isArray(brandBible.products)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      brandBible.products.forEach((p: any) => {
        if (typeof p === 'string') keywordSources.push(p);
        else if (p.name) keywordSources.push(p.name);
      });
    }

    // Content pillars as keywords
    if (brandBible.content_pillars && Array.isArray(brandBible.content_pillars)) {
      keywordSources.push(...brandBible.content_pillars);
    }

    // contentPillars (camelCase variant)
    if (brandBible.contentPillars && Array.isArray(brandBible.contentPillars)) {
      keywordSources.push(...brandBible.contentPillars);
    }

    // Pain points can suggest keywords
    if (brandBible.pain_points && Array.isArray(brandBible.pain_points)) {
      keywordSources.push(...brandBible.pain_points.slice(0, 10));
    }

    // painPoints (camelCase variant)
    if (brandBible.painPoints && Array.isArray(brandBible.painPoints)) {
      keywordSources.push(...brandBible.painPoints.slice(0, 10));
    }

    // Deduplicate and clean
    const uniqueKeywords = [...new Set(keywordSources)]
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 2 && k.length < 100);

    if (uniqueKeywords.length === 0) {
      return NextResponse.json({
        imported: 0,
        message: 'No keywords found in Brand Bible. Try running the website crawler first.'
      });
    }

    // Prepare keywords for insertion
    const keywordsToInsert = uniqueKeywords.map(keyword => ({
      project_id: projectId,
      keyword: keyword,
      source: 'brand_bible',
      created_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    }));

    // Upsert keywords (ignore duplicates)
    const { data, error } = await supabase
      .from('keywords')
      .upsert(keywordsToInsert, {
        onConflict: 'project_id,keyword',
        ignoreDuplicates: true
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to save keywords' }, { status: 500 });
    }

    return NextResponse.json({
      imported: uniqueKeywords.length,
      keywords: uniqueKeywords,
      message: `Imported ${uniqueKeywords.length} keywords from Brand Bible`
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Failed to import keywords' }, { status: 500 });
  }
}
