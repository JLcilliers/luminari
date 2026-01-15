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

/**
 * Helper function to escape HTML entities
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate markdown from edited content
 */
function generateMarkdown(content: EditedContent): string {
  const parts: string[] = [];

  // Title
  parts.push(`# ${content.title}\n`);

  // Introduction
  parts.push(content.introduction + '\n');

  // Sections
  for (const section of content.sections) {
    parts.push(`## ${section.heading}\n`);
    parts.push(section.content + '\n');
  }

  // Conclusion
  if (content.conclusion) {
    parts.push(`## Conclusion\n`);
    parts.push(content.conclusion + '\n');
  }

  // FAQs
  if (content.faqs && content.faqs.length > 0) {
    parts.push(`## Frequently Asked Questions\n`);
    for (const faq of content.faqs) {
      parts.push(`### ${faq.question}\n`);
      parts.push(faq.answer + '\n');
    }
  }

  return parts.join('\n');
}

/**
 * Generate HTML from edited content
 */
function generateHtml(content: EditedContent, schema: GeneratedSchema): string {
  const parts: string[] = [];

  parts.push('<!DOCTYPE html>');
  parts.push('<html lang="en">');
  parts.push('<head>');
  parts.push(`  <meta charset="UTF-8">`);
  parts.push(`  <meta name="viewport" content="width=device-width, initial-scale=1.0">`);
  parts.push(`  <title>${escapeHtml(content.metaTitle)}</title>`);
  parts.push(`  <meta name="description" content="${escapeHtml(content.metaDescription)}">`);

  // JSON-LD Schema
  parts.push(`  <script type="application/ld+json">`);
  parts.push(`    ${schema.jsonLd}`);
  parts.push(`  </script>`);
  parts.push('</head>');
  parts.push('<body>');
  parts.push('<article>');

  // Title
  parts.push(`  <h1>${escapeHtml(content.title)}</h1>`);

  // Introduction
  parts.push(`  <div class="introduction">`);
  parts.push(`    <p>${escapeHtml(content.introduction)}</p>`);
  parts.push(`  </div>`);

  // Sections
  for (const section of content.sections) {
    parts.push(`  <section>`);
    parts.push(`    <h2>${escapeHtml(section.heading)}</h2>`);
    // Split content into paragraphs
    const paragraphs = section.content.split('\n\n').filter((p) => p.trim());
    for (const para of paragraphs) {
      parts.push(`    <p>${escapeHtml(para)}</p>`);
    }
    parts.push(`  </section>`);
  }

  // Conclusion
  if (content.conclusion) {
    parts.push(`  <section class="conclusion">`);
    parts.push(`    <h2>Conclusion</h2>`);
    parts.push(`    <p>${escapeHtml(content.conclusion)}</p>`);
    parts.push(`  </section>`);
  }

  // FAQs
  if (content.faqs && content.faqs.length > 0) {
    parts.push(`  <section class="faqs">`);
    parts.push(`    <h2>Frequently Asked Questions</h2>`);
    for (const faq of content.faqs) {
      parts.push(`    <div class="faq-item" itemscope itemtype="https://schema.org/Question">`);
      parts.push(`      <h3 itemprop="name">${escapeHtml(faq.question)}</h3>`);
      parts.push(`      <div itemscope itemprop="acceptedAnswer" itemtype="https://schema.org/Answer">`);
      parts.push(`        <p itemprop="text">${escapeHtml(faq.answer)}</p>`);
      parts.push(`      </div>`);
      parts.push(`    </div>`);
    }
    parts.push(`  </section>`);
  }

  parts.push('</article>');
  parts.push('</body>');
  parts.push('</html>');

  return parts.join('\n');
}

/**
 * Generate JSON structure from edited content
 */
function generateJson(
  content: EditedContent,
  schema: GeneratedSchema
): ContentOutput['json'] {
  return {
    meta: {
      title: content.metaTitle,
      description: content.metaDescription,
      keywords: [], // Could be extracted from content in the future
    },
    content: {
      title: content.title,
      introduction: content.introduction,
      sections: content.sections,
      conclusion: content.conclusion,
      faqs: content.faqs,
    },
    schema: schema,
  };
}

export async function runOutputGenerator(input: {
  editedContent: EditedContent;
  schema: GeneratedSchema;
}): Promise<ContentOutput> {
  console.log('[Output Generator] Generating outputs...');

  // Generate outputs directly from the structured content
  // This avoids the large JSON response issue from Claude
  const markdown = generateMarkdown(input.editedContent);
  const html = generateHtml(input.editedContent, input.schema);
  const json = generateJson(input.editedContent, input.schema);

  const result: ContentOutput = {
    markdown,
    html,
    json,
    wordCount: input.editedContent.totalWordCount,
  };

  console.log('[Output Generator] Outputs generated:', result.wordCount, 'words');
  return result;
}
