import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    // Get all prompts for this project
    const { data: prompts } = await supabase
      .from('prompts')
      .select('id, monitors!inner(project_id)')
      .eq('monitors.project_id', projectId);

    if (!prompts || prompts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No prompts found for this project',
        metrics: null,
      });
    }

    const promptIds = prompts.map(p => p.id);

    // Get response stats
    const { data: responses } = await supabase
      .from('responses')
      .select('mentions_brand, cites_domain, sentiment_score')
      .in('prompt_id', promptIds);

    if (!responses || responses.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No responses found for this project',
        metrics: null,
      });
    }

    const total = responses.length;
    const mentions = responses.filter(r => r.mentions_brand).length;
    const citations = responses.filter(r => r.cites_domain).length;

    // Calculate average sentiment (only from non-null values)
    const sentimentValues = responses
      .map(r => r.sentiment_score)
      .filter((s): s is number => s !== null);
    const avgSentiment = sentimentValues.length > 0
      ? sentimentValues.reduce((sum, s) => sum + s, 0) / sentimentValues.length
      : 0.5; // Default to neutral

    // Calculate visibility score (weighted: mentions 60%, citations 40%)
    const mentionRate = total > 0 ? (mentions / total) * 100 : 0;
    const citationRate = total > 0 ? (citations / total) * 100 : 0;
    const visibilityScore = (mentionRate * 0.6) + (citationRate * 0.4);

    const today = new Date().toISOString().split('T')[0];

    const metrics = {
      project_id: projectId,
      prompt_id: null, // Aggregate metrics for the whole project
      date: today,
      visibility_score: Math.round(visibilityScore * 10) / 10,
      mention_count: mentions,
      citation_count: citations,
      sentiment_avg: Math.round(avgSentiment * 100) / 100,
    };

    // Upsert to visibility_metrics
    const { error } = await supabase
      .from('visibility_metrics')
      .upsert(metrics, { onConflict: 'project_id,prompt_id,date' });

    if (error) {
      console.error('Error updating visibility_metrics:', error);
      return NextResponse.json(
        { error: 'Failed to update metrics', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Updated visibility metrics for project`,
      metrics,
      stats: {
        totalResponses: total,
        mentions,
        citations,
        mentionRate: mentionRate.toFixed(1) + '%',
        citationRate: citationRate.toFixed(1) + '%',
        sentimentAvg: avgSentiment.toFixed(2),
      },
    });

  } catch (error) {
    console.error('Update metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to update metrics' },
      { status: 500 }
    );
  }
}
