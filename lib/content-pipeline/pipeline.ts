/**
 * Pipeline orchestrator for the 6-agent content generation pipeline
 */

import { randomUUID } from 'crypto';
import {
  runBrandAnalyzer,
  runContentPlanner,
  runWriter,
  runEditor,
  runSchemaGenerator,
  runOutputGenerator,
} from './agents';
import type {
  PipelineInput,
  PipelineResult,
  PipelineProgress,
  PipelineStage,
  PipelineStreamEvent,
  BrandAnalysis,
  ContentPlan,
  WrittenContent,
  EditedContent,
  GeneratedSchema,
  ContentOutput,
} from './types';

type ProgressCallback = (event: PipelineStreamEvent) => void;

const STAGES: { stage: PipelineStage; label: string; weight: number }[] = [
  { stage: 'brand-analyzer', label: 'Analyzing brand DNA', weight: 10 },
  { stage: 'content-planner', label: 'Creating content plan', weight: 15 },
  { stage: 'writer', label: 'Writing content', weight: 30 },
  { stage: 'editor', label: 'Editing and polishing', weight: 25 },
  { stage: 'schema-generator', label: 'Generating schema', weight: 10 },
  { stage: 'output-generator', label: 'Creating outputs', weight: 10 },
];

function calculateProgress(stageIndex: number): number {
  let progress = 0;
  for (let i = 0; i < stageIndex; i++) {
    progress += STAGES[i].weight;
  }
  return progress;
}

/**
 * Run the full 6-agent content pipeline
 */
export async function runContentPipeline(
  input: PipelineInput,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const pipelineId = randomUUID();
  const startTime = Date.now();
  const progressLog: PipelineProgress[] = [];

  const emit = (event: Omit<PipelineStreamEvent, 'timestamp'>) => {
    const fullEvent: PipelineStreamEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    if (onProgress) {
      onProgress(fullEvent);
    }
    progressLog.push({
      stage: event.stage || 'brand-analyzer',
      status: event.status || 'running',
      message: event.message,
      progress: event.progress || 0,
      timestamp: new Date(),
      data: event.data,
    });
  };

  const result: PipelineResult = {
    success: false,
    pipelineId,
    stages: {},
    progress: progressLog,
    duration: 0,
  };

  try {
    // Default values
    const targetWordCount = input.targetWordCount || 1500;
    const contentType = input.contentType || 'article';
    const secondaryKeywords = input.secondaryKeywords || [];

    // ==========================================================================
    // STAGE 1: BRAND ANALYZER
    // ==========================================================================
    emit({
      type: 'progress',
      stage: 'brand-analyzer',
      status: 'running',
      message: 'Analyzing brand DNA...',
      progress: calculateProgress(0),
    });

    let brandAnalysis: BrandAnalysis;
    try {
      brandAnalysis = await runBrandAnalyzer({
        brandName: input.brandName || 'Brand',
        websiteUrl: input.websiteUrl,
        brandBible: input.brandBible,
        siteContext: input.siteContext,
      });
      result.stages.brandAnalysis = brandAnalysis;

      emit({
        type: 'stage-complete',
        stage: 'brand-analyzer',
        status: 'completed',
        message: 'Brand analysis complete',
        progress: calculateProgress(1),
        data: { identity: brandAnalysis.identity },
      });
    } catch (error) {
      // Use fallback brand analysis if the agent fails
      console.warn('[Pipeline] Brand analyzer failed, using fallback:', error);
      brandAnalysis = {
        identity: {
          name: input.brandName || 'Brand',
          industry: 'general',
        },
        voice: {
          tone: 'professional',
          personality: ['helpful', 'knowledgeable'],
          writingStyle: 'clear and informative',
          vocabularyLevel: 'intermediate',
          doList: ['be helpful', 'be accurate'],
          dontList: ['be vague', 'make claims without evidence'],
        },
        contentGuidelines: ['Write clearly', 'Focus on value'],
        keyMessages: [],
        contextSummary: `Content for ${input.brandName || 'the brand'}`,
      };
      result.stages.brandAnalysis = brandAnalysis;

      emit({
        type: 'stage-complete',
        stage: 'brand-analyzer',
        status: 'completed',
        message: 'Brand analysis complete (fallback)',
        progress: calculateProgress(1),
      });
    }

    // ==========================================================================
    // STAGE 2: CONTENT PLANNER
    // ==========================================================================
    emit({
      type: 'progress',
      stage: 'content-planner',
      status: 'running',
      message: 'Creating content plan...',
      progress: calculateProgress(1),
    });

    const contentPlan: ContentPlan = await runContentPlanner({
      brandAnalysis,
      topic: input.topic,
      targetKeyword: input.targetKeyword,
      secondaryKeywords,
      targetWordCount,
      contentType,
      additionalNotes: input.additionalNotes,
    });
    result.stages.contentPlan = contentPlan;

    emit({
      type: 'stage-complete',
      stage: 'content-planner',
      status: 'completed',
      message: `Content plan created: "${contentPlan.title}"`,
      progress: calculateProgress(2),
      data: { title: contentPlan.title, sections: contentPlan.sections.length },
    });

    // ==========================================================================
    // STAGE 3: WRITER
    // ==========================================================================
    emit({
      type: 'progress',
      stage: 'writer',
      status: 'running',
      message: 'Writing content...',
      progress: calculateProgress(2),
    });

    const writtenContent: WrittenContent = await runWriter({
      brandAnalysis,
      contentPlan,
      siteContext: input.siteContext,
    });
    result.stages.writtenContent = writtenContent;

    emit({
      type: 'stage-complete',
      stage: 'writer',
      status: 'completed',
      message: `Content written: ${writtenContent.totalWordCount} words`,
      progress: calculateProgress(3),
      data: { wordCount: writtenContent.totalWordCount },
    });

    // ==========================================================================
    // STAGE 4: EDITOR
    // ==========================================================================
    emit({
      type: 'progress',
      stage: 'editor',
      status: 'running',
      message: 'Editing and polishing content...',
      progress: calculateProgress(3),
    });

    const editedContent: EditedContent = await runEditor({
      brandAnalysis,
      writtenContent,
      siteContext: input.siteContext,
    });
    result.stages.editedContent = editedContent;

    emit({
      type: 'stage-complete',
      stage: 'editor',
      status: 'completed',
      message: `Editing complete. SEO Score: ${editedContent.seoScore}/100`,
      progress: calculateProgress(4),
      data: { seoScore: editedContent.seoScore, readabilityScore: editedContent.readabilityScore },
    });

    // ==========================================================================
    // STAGE 5: SCHEMA GENERATOR
    // ==========================================================================
    emit({
      type: 'progress',
      stage: 'schema-generator',
      status: 'running',
      message: 'Generating structured data schema...',
      progress: calculateProgress(4),
    });

    const schema: GeneratedSchema = await runSchemaGenerator({
      brandAnalysis,
      editedContent,
      contentType,
    });
    result.stages.schema = schema;

    emit({
      type: 'stage-complete',
      stage: 'schema-generator',
      status: 'completed',
      message: 'Schema generated (Article + FAQPage)',
      progress: calculateProgress(5),
    });

    // ==========================================================================
    // STAGE 6: OUTPUT GENERATOR
    // ==========================================================================
    emit({
      type: 'progress',
      stage: 'output-generator',
      status: 'running',
      message: 'Generating final outputs...',
      progress: calculateProgress(5),
    });

    const output: ContentOutput = await runOutputGenerator({
      editedContent,
      schema,
    });
    result.stages.output = output;
    result.finalOutput = output;

    emit({
      type: 'stage-complete',
      stage: 'output-generator',
      status: 'completed',
      message: 'All outputs generated successfully',
      progress: 100,
      data: { wordCount: output.wordCount },
    });

    // ==========================================================================
    // PIPELINE COMPLETE
    // ==========================================================================
    result.success = true;
    result.duration = Date.now() - startTime;

    emit({
      type: 'complete',
      message: `Pipeline completed in ${(result.duration / 1000).toFixed(1)}s`,
      progress: 100,
      data: {
        pipelineId,
        duration: result.duration,
        wordCount: output.wordCount,
        seoScore: editedContent.seoScore,
      },
    });

    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.error = errorMessage;
    result.duration = Date.now() - startTime;

    emit({
      type: 'error',
      status: 'failed',
      message: `Pipeline failed: ${errorMessage}`,
      progress: progressLog[progressLog.length - 1]?.progress || 0,
    });

    return result;
  }
}

/**
 * Create a streaming pipeline that yields events
 */
export async function* streamContentPipeline(
  input: PipelineInput
): AsyncGenerator<PipelineStreamEvent, PipelineResult, unknown> {
  const events: PipelineStreamEvent[] = [];
  let finalResult: PipelineResult | null = null;

  const result = await runContentPipeline(input, (event) => {
    events.push(event);
  });

  // Yield all collected events
  for (const event of events) {
    yield event;
  }

  finalResult = result;
  return finalResult;
}
