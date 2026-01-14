/**
 * Content Pipeline - 6-Agent Content Generation System
 *
 * Agents:
 * 1. Brand Analyzer - Extracts brand DNA and voice
 * 2. Content Planner - Creates content structure and outline
 * 3. Writer - Generates the actual content
 * 4. Editor - Polishes and optimizes
 * 5. Schema Generator - Creates JSON-LD (FAQPage, BlogPosting)
 * 6. Output Generator - HTML, Markdown, JSON exports
 */

export * from './types';
export * from './agents';
export { runContentPipeline, streamContentPipeline } from './pipeline';
