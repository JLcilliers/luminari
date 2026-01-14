/**
 * Streaming Content Pipeline API Route
 * Runs the 6-agent pipeline with Server-Sent Events for real-time progress
 */

import { NextRequest } from 'next/server';

// Vercel function configuration - extend timeout for long-running pipeline
export const maxDuration = 300; // 5 minutes max duration
export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { runContentPipeline } from '@/lib/content-pipeline';
import type { PipelineInput, PipelineStreamEvent, PipelineRequest } from '@/lib/content-pipeline/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const body: PipelineRequest = await request.json();

  const { projectId, topic, targetKeyword, secondaryKeywords, targetWordCount, contentType, additionalNotes } = body;

  // Validation
  if (!projectId || !topic || !targetKeyword) {
    return new Response(
      JSON.stringify({ error: 'projectId, topic, and targetKeyword are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper to write SSE events
  const writeEvent = async (event: PipelineStreamEvent) => {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    await writer.write(encoder.encode(data));
  };

  // Start the pipeline in the background
  (async () => {
    try {
      // Fetch project data
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        await writeEvent({
          type: 'error',
          message: 'Project not found',
          timestamp: new Date().toISOString(),
        });
        await writer.close();
        return;
      }

      // Build pipeline input
      const pipelineInput: PipelineInput = {
        projectId,
        topic,
        targetKeyword,
        secondaryKeywords: secondaryKeywords || [],
        targetWordCount: targetWordCount || 1500,
        contentType: contentType || 'article',
        additionalNotes,
        brandName: project.tracked_brand || project.name,
        websiteUrl: project.website_url,
        brandBible: project.brand_bible,
        siteContext: project.site_context || undefined,
      };

      // Send initial event
      await writeEvent({
        type: 'progress',
        stage: 'brand-analyzer',
        status: 'pending',
        message: 'Starting content pipeline...',
        progress: 0,
        timestamp: new Date().toISOString(),
      });

      // Run pipeline with progress callback
      const result = await runContentPipeline(pipelineInput, async (event) => {
        await writeEvent(event);
      });

      // Send final result
      if (result.success) {
        // Save to database
        if (result.finalOutput) {
          try {
            await supabase.from('generated_content').insert({
              project_id: projectId,
              title: result.stages.editedContent?.metaTitle || topic,
              meta_description: result.stages.editedContent?.metaDescription,
              content_markdown: result.finalOutput.markdown,
              content_html: result.finalOutput.html,
              content_json: result.finalOutput.json,
              schema_json: result.stages.schema?.jsonLd,
              target_keyword: targetKeyword,
              word_count: result.finalOutput.wordCount,
              seo_score: result.stages.editedContent?.seoScore,
              readability_score: result.stages.editedContent?.readabilityScore,
              pipeline_id: result.pipelineId,
              status: 'completed',
            });
          } catch (saveError) {
            console.warn('[Pipeline Stream] Failed to save:', saveError);
          }
        }

        await writeEvent({
          type: 'complete',
          message: 'Pipeline completed successfully',
          progress: 100,
          timestamp: new Date().toISOString(),
          data: {
            pipelineId: result.pipelineId,
            duration: result.duration,
            result: {
              title: result.stages.editedContent?.title,
              metaTitle: result.stages.editedContent?.metaTitle,
              metaDescription: result.stages.editedContent?.metaDescription,
              wordCount: result.finalOutput?.wordCount,
              seoScore: result.stages.editedContent?.seoScore,
              readabilityScore: result.stages.editedContent?.readabilityScore,
              markdown: result.finalOutput?.markdown,
              html: result.finalOutput?.html,
              json: result.finalOutput?.json,
              schema: result.stages.schema?.jsonLd,
              faqs: result.stages.editedContent?.faqs,
            },
          },
        });
      } else {
        await writeEvent({
          type: 'error',
          message: result.error || 'Pipeline failed',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[Pipeline Stream] Error:', error);
      await writeEvent({
        type: 'error',
        message: error instanceof Error ? error.message : 'Pipeline failed',
        timestamp: new Date().toISOString(),
      });
    } finally {
      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
