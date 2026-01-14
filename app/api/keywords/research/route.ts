import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getRelatedKeywords,
  getSerpResults,
  getCompetitorKeywords,
  getKeywordData,
} from '@/lib/dataforseo';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, type, keyword, domain, limit = 50 } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    switch (type) {
      case 'related': {
        // Get related keyword suggestions
        if (!keyword) {
          return NextResponse.json(
            { error: 'keyword is required for related search' },
            { status: 400 }
          );
        }

        const relatedKeywords = await getRelatedKeywords(keyword, 2840, limit);

        return NextResponse.json({
          success: true,
          type: 'related',
          seedKeyword: keyword,
          keywords: relatedKeywords,
        });
      }

      case 'serp': {
        // Get SERP results for a keyword
        if (!keyword) {
          return NextResponse.json(
            { error: 'keyword is required for SERP search' },
            { status: 400 }
          );
        }

        const serpResults = await getSerpResults(keyword, 2840, limit);

        return NextResponse.json({
          success: true,
          type: 'serp',
          keyword,
          results: serpResults,
        });
      }

      case 'competitor': {
        // Get competitor domain keywords
        if (!domain) {
          return NextResponse.json(
            { error: 'domain is required for competitor search' },
            { status: 400 }
          );
        }

        const competitorKeywords = await getCompetitorKeywords(domain, 2840, limit);

        // Save to competitor_keywords table
        if (competitorKeywords.length > 0) {
          const toUpsert = competitorKeywords.map(kw => ({
            project_id: projectId,
            competitor_domain: domain,
            keyword: kw.keyword.toLowerCase().trim(),
            position: kw.position,
            search_volume: kw.search_volume,
            traffic_share: kw.traffic_share,
            url: kw.url,
            last_updated: new Date().toISOString(),
          }));

          await supabase
            .from('competitor_keywords')
            .upsert(toUpsert, { onConflict: 'project_id,competitor_domain,keyword' });
        }

        return NextResponse.json({
          success: true,
          type: 'competitor',
          domain,
          keywords: competitorKeywords,
        });
      }

      case 'bulk-metrics': {
        // Get metrics for multiple keywords
        const { keywords } = body;
        if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
          return NextResponse.json(
            { error: 'keywords array is required for bulk-metrics' },
            { status: 400 }
          );
        }

        const keywordData = await getKeywordData(keywords.slice(0, 1000));

        return NextResponse.json({
          success: true,
          type: 'bulk-metrics',
          keywords: keywordData,
        });
      }

      case 'gap-analysis': {
        // Find keywords competitors rank for but we don't
        if (!domain) {
          return NextResponse.json(
            { error: 'domain is required for gap analysis' },
            { status: 400 }
          );
        }

        // Get our current keywords
        const { data: ourKeywords } = await supabase
          .from('keywords')
          .select('keyword')
          .eq('project_id', projectId);

        const ourKeywordSet = new Set((ourKeywords || []).map(k => k.keyword.toLowerCase()));

        // Get competitor keywords
        const competitorKeywords = await getCompetitorKeywords(domain, 2840, 200);

        // Find gap (keywords they have that we don't)
        const gapKeywords = competitorKeywords
          .filter(kw => !ourKeywordSet.has(kw.keyword.toLowerCase()))
          .sort((a, b) => (b.search_volume || 0) - (a.search_volume || 0));

        return NextResponse.json({
          success: true,
          type: 'gap-analysis',
          competitorDomain: domain,
          gapKeywords,
          totalGap: gapKeywords.length,
          ourKeywordsCount: ourKeywordSet.size,
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid research type. Use: related, serp, competitor, bulk-metrics, or gap-analysis' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Keyword research error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform keyword research' },
      { status: 500 }
    );
  }
}
