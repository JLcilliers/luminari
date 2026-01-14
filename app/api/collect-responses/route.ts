import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  collectResponses,
  checkBrandMention,
  checkDomainCitation,
  analyzeSentiment,
  extractMentionedBrands,
} from '@/lib/ai-providers';
import { AIModel } from '@/lib/types';

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { promptId, models } = body;

    if (!promptId) {
      return NextResponse.json(
        { error: 'Prompt ID is required' },
        { status: 400 }
      );
    }

    // Fetch the prompt and its associated project/monitor data
    const { data: prompt, error: promptError } = await supabase
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
      .eq('id', promptId)
      .single();

    if (promptError || !prompt) {
      console.error('Prompt fetch error:', promptError);
      return NextResponse.json(
        { error: 'Prompt not found' },
        { status: 404 }
      );
    }

    // Extract data from joined query
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

    // Use specified models or fall back to monitor's configured models
    const modelsToQuery: AIModel[] = models || monitor.ai_models;

    // Collect responses from AI models
    console.log(`Collecting responses for prompt: "${prompt.prompt_text.slice(0, 50)}..." from ${modelsToQuery.join(', ')}`);
    const result = await collectResponses(prompt.prompt_text, modelsToQuery);

    // Process and save each response
    const savedResponses = [];
    const savedCitations = [];

    for (const aiResponse of result.responses) {
      if (!aiResponse.success) {
        console.error(`${aiResponse.model} failed:`, aiResponse.error);
        continue;
      }

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
          is_featured: false, // Can be updated later based on analysis
          brands_mentioned: brandsMentioned,
        })
        .select()
        .single();

      if (responseError) {
        console.error('Response save error:', responseError);
        continue;
      }

      savedResponses.push(response);

      // Save citations
      if (aiResponse.citedUrls && aiResponse.citedUrls.length > 0) {
        for (const url of aiResponse.citedUrls) {
          const domain = extractDomain(url);
          if (domain) {
            const { data: citation, error: citationError } = await supabase
              .from('citations')
              .insert({
                response_id: response.id,
                cited_domain: domain,
                cited_url: url,
                citation_context: null, // Could extract context around URL in the future
              })
              .select()
              .single();

            if (!citationError) {
              savedCitations.push(citation);
            }
          }
        }
      }
    }

    // Update prompt's last collected timestamp (if column exists)
    await supabase
      .from('prompts')
      .update({ last_collected_at: new Date().toISOString() } as never)
      .eq('id', promptId);

    return NextResponse.json({
      success: true,
      promptId,
      results: {
        total: modelsToQuery.length,
        successful: result.successCount,
        failed: result.failedCount,
        responsessSaved: savedResponses.length,
        citationsSaved: savedCitations.length,
      },
      responses: savedResponses,
    });

  } catch (error) {
    console.error('Collection error:', error);
    return NextResponse.json(
      { error: 'Collection failed' },
      { status: 500 }
    );
  }
}

function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
