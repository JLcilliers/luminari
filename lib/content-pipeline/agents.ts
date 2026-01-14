/**
 * Individual agent modules for the 6-agent content pipeline
 */

import { callClaude } from './ai-client';
import {
  BRAND_ANALYZER_SYSTEM,
  buildBrandAnalyzerPrompt,
  CONTENT_PLANNER_SYSTEM,
  buildContentPlannerPrompt,
  WRITER_SYSTEM,
  buildWriterPrompt,
  EDITOR_SYSTEM,
  buildEditorPrompt,
  SCHEMA_GENERATOR_SYSTEM,
  buildSchemaGeneratorPrompt,
  OUTPUT_GENERATOR_SYSTEM,
  buildOutputGeneratorPrompt,
} from './prompts';
import type {
  BrandAnalysis,
  ContentPlan,
  WrittenContent,
  EditedContent,
  GeneratedSchema,
  ContentOutput,
} from './types';

// =============================================================================
// AGENT 1: BRAND ANALYZER
// =============================================================================
export async function runBrandAnalyzer(input: {
  brandName: string;
  websiteUrl?: string;
  brandBible?: Record<string, unknown>;
  siteContext?: string;
}): Promise<BrandAnalysis> {
  console.log('[Brand Analyzer] Starting brand analysis...');

  const prompt = buildBrandAnalyzerPrompt(
    input.brandName,
    input.websiteUrl,
    input.brandBible,
    input.siteContext
  );

  const result = await callClaude<BrandAnalysis>(BRAND_ANALYZER_SYSTEM, prompt, {
    temperature: 0.2,
    maxTokens: 4000,
  });

  console.log('[Brand Analyzer] Analysis complete:', result.identity.name);
  return result;
}

// =============================================================================
// AGENT 2: CONTENT PLANNER
// =============================================================================
export async function runContentPlanner(input: {
  brandAnalysis: BrandAnalysis;
  topic: string;
  targetKeyword: string;
  secondaryKeywords: string[];
  targetWordCount: number;
  contentType: string;
  additionalNotes?: string;
}): Promise<ContentPlan> {
  console.log('[Content Planner] Creating content plan...');

  const prompt = buildContentPlannerPrompt(
    JSON.stringify(input.brandAnalysis, null, 2),
    input.topic,
    input.targetKeyword,
    input.secondaryKeywords,
    input.targetWordCount,
    input.contentType,
    input.additionalNotes
  );

  const result = await callClaude<ContentPlan>(CONTENT_PLANNER_SYSTEM, prompt, {
    temperature: 0.3,
    maxTokens: 6000,
  });

  console.log('[Content Planner] Plan created:', result.title);
  return result;
}

// =============================================================================
// AGENT 3: WRITER
// =============================================================================
export async function runWriter(input: {
  brandAnalysis: BrandAnalysis;
  contentPlan: ContentPlan;
  siteContext?: string;
}): Promise<WrittenContent> {
  console.log('[Writer] Writing content...');

  const prompt = buildWriterPrompt(
    JSON.stringify(input.brandAnalysis, null, 2),
    JSON.stringify(input.contentPlan, null, 2),
    input.siteContext
  );

  const result = await callClaude<WrittenContent>(WRITER_SYSTEM, prompt, {
    temperature: 0.4,
    maxTokens: 12000,
  });

  console.log('[Writer] Content written:', result.totalWordCount, 'words');
  return result;
}

// =============================================================================
// AGENT 4: EDITOR
// =============================================================================
export async function runEditor(input: {
  brandAnalysis: BrandAnalysis;
  writtenContent: WrittenContent;
  siteContext?: string;
}): Promise<EditedContent> {
  console.log('[Editor] Editing content...');

  const prompt = buildEditorPrompt(
    JSON.stringify(input.brandAnalysis, null, 2),
    JSON.stringify(input.writtenContent, null, 2),
    input.siteContext
  );

  const result = await callClaude<EditedContent>(EDITOR_SYSTEM, prompt, {
    temperature: 0.2,
    maxTokens: 12000,
  });

  console.log('[Editor] Editing complete. SEO Score:', result.seoScore);
  return result;
}

// =============================================================================
// AGENT 5: SCHEMA GENERATOR
// =============================================================================
export async function runSchemaGenerator(input: {
  brandAnalysis: BrandAnalysis;
  editedContent: EditedContent;
  contentType: string;
}): Promise<GeneratedSchema> {
  console.log('[Schema Generator] Generating schema...');

  const prompt = buildSchemaGeneratorPrompt(
    JSON.stringify(input.brandAnalysis, null, 2),
    JSON.stringify(input.editedContent, null, 2),
    input.contentType
  );

  const result = await callClaude<GeneratedSchema>(SCHEMA_GENERATOR_SYSTEM, prompt, {
    temperature: 0.1,
    maxTokens: 4000,
  });

  console.log('[Schema Generator] Schema generated');
  return result;
}

// =============================================================================
// AGENT 6: OUTPUT GENERATOR
// =============================================================================
export async function runOutputGenerator(input: {
  editedContent: EditedContent;
  schema: GeneratedSchema;
}): Promise<ContentOutput> {
  console.log('[Output Generator] Generating outputs...');

  const prompt = buildOutputGeneratorPrompt(
    JSON.stringify(input.editedContent, null, 2),
    JSON.stringify(input.schema, null, 2)
  );

  const result = await callClaude<ContentOutput>(OUTPUT_GENERATOR_SYSTEM, prompt, {
    temperature: 0.1,
    maxTokens: 16000,
  });

  console.log('[Output Generator] Outputs generated:', result.wordCount, 'words');
  return result;
}
