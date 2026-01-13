import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { crawlWebsite, CrawlResult } from '@/lib/crawler';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { websiteUrl, brandName } = await request.json();

    if (!websiteUrl || !brandName) {
      return NextResponse.json(
        { error: 'Website URL and brand name are required' },
        { status: 400 }
      );
    }

    // Normalize URL
    let normalizedUrl = websiteUrl;
    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    // Step 1: Crawl the entire website
    console.log(`Starting crawl of ${normalizedUrl}`);
    const crawlResult = await crawlWebsite(normalizedUrl);
    console.log(`Crawled ${crawlResult.pagesCrawled} pages in ${crawlResult.crawlDuration}ms`);

    // Step 2: Generate Brand Bible from aggregated content
    const brandBible = await generateBrandBible(brandName, normalizedUrl, crawlResult);

    return NextResponse.json({
      success: true,
      brandBible,
      crawlStats: {
        pagesCrawled: crawlResult.pagesCrawled,
        sitemapFound: crawlResult.sitemapFound,
        duration: crawlResult.crawlDuration,
        pageTypes: getPageTypeStats(crawlResult),
      },
    });

  } catch (error) {
    console.error('Website analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}

function getPageTypeStats(crawlResult: CrawlResult): Record<string, number> {
  const stats: Record<string, number> = {};
  crawlResult.pages.forEach(page => {
    stats[page.pageType] = (stats[page.pageType] || 0) + 1;
  });
  return stats;
}

async function generateBrandBible(
  brandName: string,
  websiteUrl: string,
  crawlResult: CrawlResult
) {
  const { aggregatedContent } = crawlResult;

  const prompt = `You are a brand strategist analyzing a company's website to create a comprehensive Brand Bible.

BRAND NAME: ${brandName}
WEBSITE: ${websiteUrl}
PAGES CRAWLED: ${crawlResult.pagesCrawled}

=== COMPANY INFORMATION (Homepage & About) ===
${aggregatedContent.companyInfo}

=== PRODUCTS & SERVICES ===
${aggregatedContent.productsAndServices}

=== VALUE PROPOSITIONS ===
${aggregatedContent.valuePropositions}

=== TARGET AUDIENCE SIGNALS ===
${aggregatedContent.targetAudience}

=== PRICING INFORMATION ===
${aggregatedContent.pricingInfo || 'No pricing page found'}

=== BLOG/CONTENT TOPICS ===
${aggregatedContent.blogTopics || 'No blog content found'}

=== TEAM INFORMATION ===
${aggregatedContent.teamInfo || 'No team information found'}

=== ALL PAGE HEADINGS ===
${aggregatedContent.allHeadings.slice(0, 50).join('\n')}

---

Based on this comprehensive website analysis, generate a detailed Brand Bible. Be specific and use actual information from the content. Do not make up information - if something is unclear, make reasonable inferences based on the available data.

Return ONLY a JSON object with these exact fields:
{
  "industry": "Primary industry/category",
  "sub_industry": "More specific sub-category if applicable",
  "description": "3-4 sentence description of what the company does, their main offerings, and value proposition",
  "target_audience": "Detailed description of primary target audience including demographics, job roles, company types, and use cases (3-4 sentences)",
  "secondary_audiences": ["Array of secondary audience segments"],
  "brand_voice": "One of: professional, casual, technical, friendly, authoritative",
  "tone_guidelines": "Specific guidelines for brand communication style (2-3 sentences)",
  "key_differentiators": ["Array of 5-7 unique differentiators based on actual website content"],
  "key_messages": ["Array of 5-7 core brand messages/taglines found on the site"],
  "important_keywords": ["Array of 15-20 important keywords found throughout the site"],
  "content_pillars": ["Array of 4-6 main content themes based on blog/resources"],
  "unique_selling_points": ["Array of 5-7 USPs based on features/benefits mentioned"],
  "products_services": ["Array of main products or services offered"],
  "pricing_model": "Description of pricing model if found (e.g., 'Freemium with Pro tier', 'Enterprise sales', 'Per-seat SaaS')",
  "avoid_topics": ["Array of topics that seem inconsistent with the brand or should be avoided"],
  "competitors": ["Array of 3-5 likely competitors based on industry and positioning"],
  "brand_personality_traits": ["Array of 5 personality traits that describe the brand"],
  "customer_pain_points": ["Array of 3-5 customer problems the brand solves"],
  "proof_points": ["Array of any case studies, testimonials, or statistics mentioned"]
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
  let brandBible;
  try {
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    brandBible = JSON.parse(cleanedResponse);
  } catch (parseError) {
    console.error('Failed to parse Brand Bible:', parseError);
    throw new Error('Failed to generate Brand Bible');
  }

  return {
    name: brandName,
    tracked_brand: brandName,
    website_url: websiteUrl,
    ...brandBible,
  };
}
