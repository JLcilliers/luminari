/**
 * Brand Overview Generation Service
 *
 * This module handles the orchestration of brand overview generation
 * for a project/client. It wraps the existing crawler and AI generation
 * logic with status tracking and error handling.
 */

import Anthropic from '@anthropic-ai/sdk';
import { crawlWebsite, CrawlResult, NavigationItem } from '@/lib/crawler';
import { supabase } from '@/lib/supabase';
import type { BrandOverview, BrandOverviewStatus, ExtendedBrandBible } from '@/lib/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GenerateBrandOverviewOptions {
  projectId: string;
  websiteUrl: string;
  brandName?: string;
  force?: boolean; // Allow regeneration even if COMPLETE
}

export interface GenerateBrandOverviewResult {
  success: boolean;
  status: BrandOverviewStatus;
  overview?: BrandOverview;
  error?: string;
}

/**
 * Generate a brand overview for a project.
 *
 * This function is idempotent:
 * - If generation is already RUNNING, returns early with 202-like response
 * - If COMPLETE and force=false, returns existing data
 * - If COMPLETE and force=true, regenerates
 * - If FAILED or PENDING, starts/restarts generation
 */
export async function generateBrandOverviewForProject(
  options: GenerateBrandOverviewOptions
): Promise<GenerateBrandOverviewResult> {
  const { projectId, websiteUrl, brandName, force = false } = options;

  try {
    // Check for existing overview
    const { data: existingData } = await supabase
      .from('brand_overviews')
      .select('*')
      .eq('project_id', projectId)
      .single();

    const existing = existingData as BrandOverview | null;

    // Handle idempotency cases
    if (existing) {
      if (existing.status === 'RUNNING') {
        // Already running, don't start another
        return {
          success: true,
          status: 'RUNNING',
          overview: existing,
        };
      }

      if (existing.status === 'COMPLETE' && !force) {
        // Already complete and not forcing regeneration
        return {
          success: true,
          status: 'COMPLETE',
          overview: existing,
        };
      }

      // Update existing to RUNNING
      await supabase
        .from('brand_overviews')
        .update({
          status: 'RUNNING',
          error: null,
          warnings: null,
        } as never)
        .eq('id', existing.id);
    } else {
      // Create new record in RUNNING state
      const { error: insertError } = await supabase
        .from('brand_overviews')
        .insert({
          project_id: projectId,
          source_url: websiteUrl,
          status: 'RUNNING',
        } as never);

      if (insertError) {
        console.error('Failed to create brand overview record:', insertError);
        return {
          success: false,
          status: 'FAILED',
          error: 'Failed to initialize brand overview generation',
        };
      }
    }

    // Get the current record
    const { data: recordData } = await supabase
      .from('brand_overviews')
      .select('*')
      .eq('project_id', projectId)
      .single();

    const record = recordData as BrandOverview | null;

    if (!record) {
      return {
        success: false,
        status: 'FAILED',
        error: 'Failed to retrieve brand overview record',
      };
    }

    // Run generation (this is the main work)
    const result = await runGeneration(record.id, projectId, websiteUrl, brandName);

    return result;
  } catch (error) {
    console.error('Brand overview generation error:', error);

    // Try to update status to FAILED
    try {
      await supabase
        .from('brand_overviews')
        .update({
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Generation failed',
        } as never)
        .eq('project_id', projectId);
    } catch {
      // Ignore update error
    }

    return {
      success: false,
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Generation failed',
    };
  }
}

/**
 * Run the actual generation pipeline
 */
async function runGeneration(
  overviewId: string,
  projectId: string,
  websiteUrl: string,
  brandName?: string
): Promise<GenerateBrandOverviewResult> {
  const warnings: string[] = [];

  try {
    // Normalize URL
    let normalizedUrl = websiteUrl;
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Step 1: Crawl the website
    console.log(`[BrandOverview] Starting crawl of ${normalizedUrl} for project ${projectId}`);
    let crawlResult: CrawlResult;

    try {
      crawlResult = await crawlWebsite(normalizedUrl);
      console.log(`[BrandOverview] Crawled ${crawlResult.pagesCrawled} pages in ${crawlResult.crawlDuration}ms`);
    } catch (crawlError) {
      console.error('[BrandOverview] Crawl failed:', crawlError);
      warnings.push(`Crawl failed: ${crawlError instanceof Error ? crawlError.message : 'Unknown error'}`);

      // Continue with empty crawl result - we can still try to generate with minimal data
      crawlResult = createEmptyCrawlResult(websiteUrl);
    }

    // Step 2: Determine the best brand name
    let resolvedBrandName = brandName;
    if (!resolvedBrandName) {
      // Try to get from project
      const { data: projectData } = await supabase
        .from('projects')
        .select('tracked_brand, name')
        .eq('id', projectId)
        .single();

      const project = projectData as { tracked_brand: string; name: string } | null;
      resolvedBrandName = project?.tracked_brand || project?.name;
    }

    if (!resolvedBrandName && crawlResult.brandInfo) {
      resolvedBrandName = crawlResult.brandInfo.recommendedName;
    }

    if (!resolvedBrandName) {
      resolvedBrandName = new URL(normalizedUrl).hostname.replace('www.', '');
    }

    // Step 3: Generate Brand Bible using AI
    console.log(`[BrandOverview] Generating brand bible for "${resolvedBrandName}"`);
    const brandBible = await generateBrandBible(resolvedBrandName, normalizedUrl, crawlResult);

    // Step 4: Generate markdown summary
    const summaryMd = generateMarkdownSummary(brandBible);

    // Step 5: Update database with success
    const { data: updated, error: updateError } = await supabase
      .from('brand_overviews')
      .update({
        status: 'COMPLETE',
        summary_md: summaryMd,
        raw_json: brandBible as never,
        warnings: warnings.length > 0 ? warnings.join('\n') : null,
        error: null,
      } as never)
      .eq('id', overviewId)
      .select()
      .single();

    if (updateError) {
      console.error('[BrandOverview] Failed to update record:', updateError);
      throw new Error('Failed to save brand overview');
    }

    // Also update the project with brand bible data
    await updateProjectWithBrandBible(projectId, brandBible);

    console.log(`[BrandOverview] Generation complete for project ${projectId}`);

    return {
      success: true,
      status: 'COMPLETE',
      overview: updated as BrandOverview,
    };
  } catch (error) {
    console.error('[BrandOverview] Generation failed:', error);

    // Update database with failure
    await supabase
      .from('brand_overviews')
      .update({
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Generation failed',
        warnings: warnings.length > 0 ? warnings.join('\n') : null,
      } as never)
      .eq('id', overviewId);

    return {
      success: false,
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'Generation failed',
    };
  }
}

/**
 * Create an empty crawl result for fallback scenarios
 */
function createEmptyCrawlResult(websiteUrl: string): CrawlResult {
  const domain = new URL(websiteUrl).hostname;
  return {
    domain,
    pagesCrawled: 0,
    pages: [],
    sitemapFound: false,
    crawlDuration: 0,
    aggregatedContent: {
      companyInfo: '',
      productsAndServices: '',
      valuePropositions: '',
      targetAudience: '',
      blogTopics: '',
      pricingInfo: '',
      teamInfo: '',
      allHeadings: [],
      allContent: '',
      navigationText: '',
    },
    navigation: [],
    brandInfo: {
      logoText: null,
      titleBrandName: null,
      ogSiteName: null,
      schemaOrgName: null,
      footerCompanyName: null,
      aboutPageName: null,
      recommendedName: domain,
      confidence: 'low',
      domainBasedName: domain,
    },
    blogInfo: {
      hasBlog: false,
      blogUrl: null,
      blogPosts: [],
      blogTopics: [],
    },
    servicesInfo: {
      services: [],
      practiceAreas: [],
      serviceUrls: [],
    },
  };
}

/**
 * Generate Brand Bible using Claude AI
 * This is adapted from the existing /api/analyze-website implementation
 */
async function generateBrandBible(
  brandName: string,
  websiteUrl: string,
  crawlResult: CrawlResult
): Promise<ExtendedBrandBible> {
  const { aggregatedContent, brandInfo, blogInfo, servicesInfo, navigation } = crawlResult;

  // Build navigation section
  const navigationSection = navigation && navigation.length > 0
    ? formatNavigation(navigation)
    : 'No navigation structure extracted';

  // Build brand name verification section
  const brandNameSection = brandInfo
    ? `
BRAND NAME VERIFICATION:
- Recommended Name: ${brandInfo.recommendedName} (Confidence: ${brandInfo.confidence})
- From Logo: ${brandInfo.logoText || 'Not found'}
- From Title: ${brandInfo.titleBrandName || 'Not found'}
- From Schema.org: ${brandInfo.schemaOrgName || 'Not found'}
- From Open Graph: ${brandInfo.ogSiteName || 'Not found'}
- From Footer: ${brandInfo.footerCompanyName || 'Not found'}
- Domain-based: ${brandInfo.domainBasedName}`
    : '';

  // Build blog section
  const blogSection = blogInfo
    ? `
BLOG/CONTENT DETECTION:
- Has Blog: ${blogInfo.hasBlog ? 'YES' : 'NO'}
- Blog URL: ${blogInfo.blogUrl || 'Not found'}
- Blog Posts Found: ${blogInfo.blogPosts.length}
- Blog Topics: ${blogInfo.blogTopics.length > 0 ? blogInfo.blogTopics.join(', ') : 'None detected'}`
    : '';

  // Build services section
  const servicesSection = servicesInfo
    ? `
SERVICES/PRACTICE AREAS FROM NAVIGATION:
${servicesInfo.services.length > 0 ? `Services: ${servicesInfo.services.join(', ')}` : ''}
${servicesInfo.practiceAreas.length > 0 ? `Practice Areas: ${servicesInfo.practiceAreas.join(', ')}` : ''}`
    : '';

  const prompt = `You are a brand strategist analyzing a company's website to create a comprehensive Brand Bible.

CONFIRMED BRAND NAME: ${brandName}
WEBSITE: ${websiteUrl}
PAGES CRAWLED: ${crawlResult.pagesCrawled}
${brandNameSection}

=== WEBSITE NAVIGATION STRUCTURE ===
${navigationSection}
${servicesSection}
${blogSection}

=== COMPANY INFORMATION (Homepage & About) ===
${aggregatedContent.companyInfo || 'No company information available'}

=== PRODUCTS & SERVICES ===
${aggregatedContent.productsAndServices || 'No products/services information available'}

=== VALUE PROPOSITIONS ===
${aggregatedContent.valuePropositions || 'No value propositions found'}

=== TARGET AUDIENCE SIGNALS ===
${aggregatedContent.targetAudience || 'No target audience signals found'}

=== PRICING INFORMATION ===
${aggregatedContent.pricingInfo || 'No pricing page found'}

=== BLOG/CONTENT TOPICS ===
${aggregatedContent.blogTopics || 'No blog content found'}

=== TEAM INFORMATION ===
${aggregatedContent.teamInfo || 'No team information found'}

=== ALL PAGE HEADINGS ===
${aggregatedContent.allHeadings.slice(0, 50).join('\n') || 'No headings extracted'}

---

Based on this website analysis, generate a detailed Brand Bible. Be specific and use actual information from the content. Do not make up information - if something is unclear, make reasonable inferences based on the available data.

Return ONLY a JSON object with these exact fields:
{
  "name": "Brand name",
  "tracked_brand": "Brand name for tracking",
  "website_url": "Website URL",
  "industry": "Primary industry/category",
  "sub_industry": "More specific sub-category if applicable",
  "description": "3-4 sentence description of what the company does",
  "target_audience": "Detailed description of primary target audience",
  "secondary_audiences": ["Array of secondary audience segments"],
  "brand_voice": "One of: professional, casual, technical, friendly, authoritative",
  "tone_guidelines": "Specific guidelines for brand communication style",
  "key_differentiators": ["Array of unique differentiators"],
  "key_messages": ["Array of core brand messages"],
  "important_keywords": ["Array of important keywords"],
  "content_pillars": ["Array of main content themes"],
  "unique_selling_points": ["Array of USPs"],
  "products_services": ["Array of products or services"],
  "pricing_model": "Description of pricing model if found",
  "avoid_topics": ["Array of topics to avoid"],
  "competitors": ["Array of likely competitors"],
  "brand_personality_traits": ["Array of personality traits"],
  "customer_pain_points": ["Array of customer problems solved"],
  "proof_points": ["Array of case studies, testimonials, or statistics"]
}

Return ONLY the JSON object, no markdown formatting.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  // Parse JSON response
  try {
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const brandBible = JSON.parse(cleanedResponse);

    return {
      name: brandName,
      tracked_brand: brandName,
      website_url: websiteUrl,
      ...brandBible,
    };
  } catch (parseError) {
    console.error('[BrandOverview] Failed to parse AI response:', parseError);
    throw new Error('Failed to parse brand overview from AI');
  }
}

/**
 * Format navigation structure for the prompt
 */
function formatNavigation(navigation: NavigationItem[], depth = 0): string {
  if (!navigation || navigation.length === 0) return '';

  let result = '';
  for (const item of navigation) {
    const indent = '  '.repeat(depth);
    result += `${indent}- ${item.text}\n`;
    if (item.children && item.children.length > 0) {
      result += formatNavigation(item.children, depth + 1);
    }
  }
  return result;
}

/**
 * Generate a markdown summary from the brand bible
 */
function generateMarkdownSummary(brandBible: ExtendedBrandBible): string {
  const sections: string[] = [];

  sections.push(`# ${brandBible.tracked_brand} Brand Overview`);
  sections.push('');

  if (brandBible.description) {
    sections.push('## About');
    sections.push(brandBible.description);
    sections.push('');
  }

  if (brandBible.industry) {
    sections.push(`**Industry:** ${brandBible.industry}${brandBible.sub_industry ? ` / ${brandBible.sub_industry}` : ''}`);
    sections.push('');
  }

  if (brandBible.target_audience) {
    sections.push('## Target Audience');
    sections.push(brandBible.target_audience);
    sections.push('');
  }

  if (brandBible.unique_selling_points && brandBible.unique_selling_points.length > 0) {
    sections.push('## Unique Selling Points');
    brandBible.unique_selling_points.forEach(usp => {
      sections.push(`- ${usp}`);
    });
    sections.push('');
  }

  if (brandBible.key_differentiators && brandBible.key_differentiators.length > 0) {
    sections.push('## Key Differentiators');
    brandBible.key_differentiators.forEach(diff => {
      sections.push(`- ${diff}`);
    });
    sections.push('');
  }

  if (brandBible.products_services && brandBible.products_services.length > 0) {
    sections.push('## Products & Services');
    brandBible.products_services.forEach(ps => {
      sections.push(`- ${ps}`);
    });
    sections.push('');
  }

  if (brandBible.brand_voice) {
    sections.push('## Brand Voice');
    sections.push(`**Voice:** ${brandBible.brand_voice}`);
    if (brandBible.tone_guidelines) {
      sections.push(`\n${brandBible.tone_guidelines}`);
    }
    sections.push('');
  }

  if (brandBible.important_keywords && brandBible.important_keywords.length > 0) {
    sections.push('## Important Keywords');
    sections.push(brandBible.important_keywords.join(', '));
    sections.push('');
  }

  if (brandBible.competitors && brandBible.competitors.length > 0) {
    sections.push('## Competitors');
    brandBible.competitors.forEach(comp => {
      sections.push(`- ${comp}`);
    });
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Update the project record with brand bible data
 */
async function updateProjectWithBrandBible(
  projectId: string,
  brandBible: ExtendedBrandBible
): Promise<void> {
  try {
    await supabase
      .from('projects')
      .update({
        industry: brandBible.industry,
        description: brandBible.description,
        target_audience: brandBible.target_audience,
        brand_voice: brandBible.brand_voice,
        tone_guidelines: brandBible.tone_guidelines,
        key_differentiators: brandBible.key_differentiators,
        key_messages: brandBible.key_messages,
        important_keywords: brandBible.important_keywords,
        content_pillars: brandBible.content_pillars,
        unique_selling_points: brandBible.unique_selling_points,
        avoid_topics: brandBible.avoid_topics,
      } as never)
      .eq('id', projectId);
  } catch (error) {
    console.error('[BrandOverview] Failed to update project:', error);
    // Non-fatal - the brand overview is still saved
  }
}

/**
 * Get the current brand overview for a project
 */
export async function getBrandOverview(projectId: string): Promise<BrandOverview | null> {
  const { data, error } = await supabase
    .from('brand_overviews')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as BrandOverview;
}
