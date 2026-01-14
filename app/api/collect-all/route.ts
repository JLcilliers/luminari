import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  collectResponses,
  checkBrandMention,
  checkDomainCitation,
  analyzeSentiment,
  extractMentionedBrands,
  AIResponse,
} from '@/lib/ai-providers';
import { AIModel } from '@/lib/types';

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Rate limiting: process prompts with a delay to avoid API rate limits
const DELAY_BETWEEN_PROMPTS = 2000; // 2 seconds between prompts

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, monitorId, limit = 10 } = body;

    if (!projectId && !monitorId) {
      return NextResponse.json(
        { error: 'Either projectId or monitorId is required' },
        { status: 400 }
      );
    }

    // Fetch prompts based on project or monitor
    let promptsQuery = supabase
      .from('prompts')
      .select(`
        id,
        prompt_text,
        monitor_id,
        monitors!inner (
          id,
          project_id,
          ai_models,
          projects!inner (
            id,
            tracked_brand,
            website_url,
            competitors (
              name
            )
          )
        )
      `)
      .limit(limit);

    if (monitorId) {
      promptsQuery = promptsQuery.eq('monitor_id', monitorId);
    } else if (projectId) {
      promptsQuery = promptsQuery.eq('monitors.project_id', projectId);
    }

    const { data: prompts, error: promptsError } = await promptsQuery;

    if (promptsError) {
      console.error('Prompts fetch error:', promptsError);
      return NextResponse.json(
        { error: 'Failed to fetch prompts' },
        { status: 500 }
      );
    }

    if (!prompts || prompts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No prompts found to collect',
        results: { total: 0, processed: 0, successful: 0, failed: 0 },
      });
    }

    console.log(`Starting bulk collection for ${prompts.length} prompts...`);

    const results = {
      total: prompts.length,
      processed: 0,
      successful: 0,
      failed: 0,
      responsessSaved: 0,
      citationsSaved: 0,
    };

    // Process each prompt sequentially to avoid rate limits
    for (const prompt of prompts) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const monitorData = prompt.monitors as any;
        const monitor = {
          ai_models: monitorData.ai_models as AIModel[],
          projects: monitorData.projects as {
            tracked_brand: string;
            website_url: string | null;
            competitors: { name: string }[] | null;
          },
        };
        const project = monitor.projects;
        const brandName = project.tracked_brand;
        const websiteUrl = project.website_url || '';
        const competitors = project.competitors?.map((c: { name: string }) => c.name) || [];
        const modelsToQuery = monitor.ai_models;

        console.log(`Collecting for: "${prompt.prompt_text.slice(0, 40)}..."`);

        // Collect responses
        const collectionResult = await collectResponses(prompt.prompt_text, modelsToQuery);

        // Process and save each response
        for (const aiResponse of collectionResult.responses) {
          if (!aiResponse.success) {
            results.failed++;
            continue;
          }

          const saved = await saveResponse(
            prompt.id,
            aiResponse,
            brandName,
            websiteUrl,
            competitors
          );

          if (saved.response) {
            results.responsessSaved++;
            results.successful++;
          }
          results.citationsSaved += saved.citationsCount;
        }

        // Update prompt's last collected timestamp
        await supabase
          .from('prompts')
          .update({ last_collected_at: new Date().toISOString() } as never)
          .eq('id', prompt.id);

        results.processed++;

        // Rate limiting delay
        if (results.processed < prompts.length) {
          await delay(DELAY_BETWEEN_PROMPTS);
        }

      } catch (error) {
        console.error(`Error processing prompt ${prompt.id}:`, error);
        results.failed++;
        results.processed++;
      }
    }

    console.log(`Bulk collection complete. Results:`, results);

    // Update visibility metrics after collection
    if (projectId) {
      await updateVisibilityMetrics(projectId);
    } else if (monitorId && prompts.length > 0) {
      // Get projectId from the first prompt's monitor
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const monitorData = prompts[0].monitors as any;
      if (monitorData?.project_id) {
        await updateVisibilityMetrics(monitorData.project_id);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });

  } catch (error) {
    console.error('Bulk collection error:', error);
    return NextResponse.json(
      { error: 'Bulk collection failed' },
      { status: 500 }
    );
  }
}

async function saveResponse(
  promptId: string,
  aiResponse: AIResponse,
  brandName: string,
  websiteUrl: string,
  competitors: string[]
): Promise<{ response: unknown; citationsCount: number }> {
  // Analyze the response
  const mentionsBrand = checkBrandMention(aiResponse.responseText, brandName);
  const citesDomain = checkDomainCitation(aiResponse.citedUrls || [], websiteUrl);
  const sentimentScore = analyzeSentiment(aiResponse.responseText, brandName);
  const brandsMentioned = extractMentionedBrands(aiResponse.responseText, [brandName, ...competitors]);

  // Save response to database
  const { data: response, error: responseError } = await supabase
    .from('responses')
    .insert({
      prompt_id: promptId,
      ai_model: aiResponse.model,
      response_text: aiResponse.responseText,
      sentiment_score: sentimentScore,
      mentions_brand: mentionsBrand,
      cites_domain: citesDomain,
      is_featured: false,
      brands_mentioned: brandsMentioned,
    })
    .select()
    .single();

  if (responseError) {
    console.error('Response save error:', responseError);
    return { response: null, citationsCount: 0 };
  }

  // Save citations
  let citationsCount = 0;
  if (aiResponse.citedUrls && aiResponse.citedUrls.length > 0) {
    for (const url of aiResponse.citedUrls) {
      const domain = extractDomain(url);
      if (domain) {
        const { error: citationError } = await supabase
          .from('citations')
          .insert({
            response_id: response.id,
            cited_domain: domain,
            cited_url: url,
            citation_context: null,
          });

        if (!citationError) {
          citationsCount++;
        }
      }
    }
  }

  return { response, citationsCount };
}

function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Update visibility_metrics table after collection
async function updateVisibilityMetrics(projectId: string): Promise<void> {
  try {
    // Get all responses for this project
    const { data: prompts } = await supabase
      .from('prompts')
      .select('id, monitors!inner(project_id)')
      .eq('monitors.project_id', projectId);

    if (!prompts || prompts.length === 0) return;

    const promptIds = prompts.map(p => p.id);

    // Get response stats
    const { data: responses } = await supabase
      .from('responses')
      .select('mentions_brand, cites_domain, sentiment_score')
      .in('prompt_id', promptIds);

    if (!responses || responses.length === 0) return;

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

    // Upsert to visibility_metrics
    const { error } = await supabase
      .from('visibility_metrics')
      .upsert({
        project_id: projectId,
        prompt_id: null, // Aggregate metrics for the whole project
        date: today,
        visibility_score: Math.round(visibilityScore * 10) / 10,
        mention_count: mentions,
        citation_count: citations,
        sentiment_avg: Math.round(avgSentiment * 100) / 100,
      }, { onConflict: 'project_id,prompt_id,date' });

    if (error) {
      console.error('Error updating visibility_metrics:', error);
    } else {
      console.log(`Updated visibility_metrics for project ${projectId}: score=${visibilityScore.toFixed(1)}, mentions=${mentions}, citations=${citations}`);
    }
  } catch (error) {
    console.error('Error in updateVisibilityMetrics:', error);
  }
}
