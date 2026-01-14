/**
 * Content Pipeline API Route
 * Runs the 6-agent content generation pipeline
 */

import { NextRequest, NextResponse } from 'next/server';

// Vercel function configuration - extend timeout for long-running pipeline
// Pro plan allows up to 900 seconds (15 minutes)
export const maxDuration = 900;
export const dynamic = 'force-dynamic';
import { createClient } from '@supabase/supabase-js';
import { runContentPipeline } from '@/lib/content-pipeline';
import type { PipelineInput, PipelineRequest } from '@/lib/content-pipeline/types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body: PipelineRequest = await request.json();

    const { projectId, topic, targetKeyword, secondaryKeywords, targetWordCount, contentType, additionalNotes } = body;

    // Validation
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    if (!topic || !targetKeyword) {
      return NextResponse.json({ error: 'topic and targetKeyword are required' }, { status: 400 });
    }

    // Fetch project data for brand context
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Build pipeline input with project context
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

    // Run the pipeline
    console.log(`[Pipeline API] Starting pipeline for project ${projectId}`);
    const result = await runContentPipeline(pipelineInput);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Pipeline failed', pipelineId: result.pipelineId },
        { status: 500 }
      );
    }

    // Optionally save the generated content to the database
    if (result.finalOutput) {
      try {
        const { error: insertError } = await supabase.from('generated_content').insert({
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
          content_type: contentType || 'article',
          status: 'completed',
        });
        if (insertError) {
          console.error('[Pipeline API] Database insert error:', insertError);
        }
      } catch (saveError) {
        console.warn('[Pipeline API] Failed to save content to database:', saveError);
        // Don't fail the request if saving fails - the content is still generated
      }
    }

    return NextResponse.json({
      success: true,
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
    });
  } catch (error) {
    console.error('[Pipeline API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Pipeline failed' },
      { status: 500 }
    );
  }
}
