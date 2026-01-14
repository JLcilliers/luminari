import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSearchAnalytics, getDateRange, isGSCConfigured } from '@/lib/google-search-console';
import { getKeywordData, getKeywordDifficulty } from '@/lib/dataforseo';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, source = 'both', days = 28 } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get project to find website URL
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('website_url')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!project.website_url) {
      return NextResponse.json(
        { error: 'Project does not have a website URL configured' },
        { status: 400 }
      );
    }

    const results = {
      gsc: { synced: 0, error: null as string | null },
      dataforseo: { synced: 0, error: null as string | null },
    };

    // Sync from Google Search Console
    if ((source === 'gsc' || source === 'both') && isGSCConfigured()) {
      try {
        const { startDate, endDate } = getDateRange(days);
        const gscKeywords = await getSearchAnalytics(
          project.website_url,
          startDate,
          endDate,
          ['query', 'page'],
          1000
        );

        if (gscKeywords.length > 0) {
          const keywordsToUpsert = gscKeywords.map(kw => ({
            project_id: projectId,
            keyword: kw.keyword.toLowerCase().trim(),
            clicks: kw.clicks,
            impressions: kw.impressions,
            ctr: kw.ctr,
            position: Math.round(kw.position),
            url: kw.url || null,
            source: 'gsc',
            last_updated: new Date().toISOString(),
          }));

          const { error } = await supabase
            .from('keywords')
            .upsert(keywordsToUpsert, { onConflict: 'project_id,keyword' });

          if (error) {
            results.gsc.error = error.message;
          } else {
            results.gsc.synced = keywordsToUpsert.length;
          }
        }
      } catch (error) {
        results.gsc.error = error instanceof Error ? error.message : 'Unknown GSC error';
      }
    } else if (source === 'gsc' || source === 'both') {
      results.gsc.error = 'Google Search Console not configured';
    }

    // Enrich with DataForSEO metrics
    if (source === 'dataforseo' || source === 'both') {
      try {
        // Get existing keywords that need metrics
        const { data: existingKeywords } = await supabase
          .from('keywords')
          .select('id, keyword')
          .eq('project_id', projectId)
          .or('search_volume.is.null,difficulty.is.null')
          .limit(200); // API limits

        if (existingKeywords && existingKeywords.length > 0) {
          const keywordStrings = existingKeywords.map(k => k.keyword);

          // Get search volume and CPC
          const keywordData = await getKeywordData(keywordStrings);
          const keywordDataMap = new Map(keywordData.map(k => [k.keyword.toLowerCase(), k]));

          // Get difficulty scores (batched to avoid rate limits)
          let difficulties: Record<string, number> = {};
          try {
            difficulties = await getKeywordDifficulty(keywordStrings.slice(0, 100));
          } catch {
            console.log('Skipping difficulty fetch - may exceed API limits');
          }

          // Update each keyword
          let updated = 0;
          for (const keyword of existingKeywords) {
            const data = keywordDataMap.get(keyword.keyword.toLowerCase());
            const difficulty = difficulties[keyword.keyword];

            if (data || difficulty !== undefined) {
              const updates: Record<string, unknown> = {
                last_updated: new Date().toISOString(),
              };

              if (data) {
                updates.search_volume = data.search_volume;
                updates.cpc = data.cpc;
                updates.competition = data.competition;
              }

              if (difficulty !== undefined) {
                updates.difficulty = difficulty;
              }

              const { error } = await supabase
                .from('keywords')
                .update(updates)
                .eq('id', keyword.id);

              if (!error) updated++;
            }
          }

          results.dataforseo.synced = updated;
        }
      } catch (error) {
        results.dataforseo.error = error instanceof Error ? error.message : 'Unknown DataForSEO error';
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Keywords sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync keywords' },
      { status: 500 }
    );
  }
}
