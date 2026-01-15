import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { crawlWebsite, CrawlResult, NavigationItem } from '@/lib/crawler';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { websiteUrl, brandName: userProvidedBrandName } = await request.json();

    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'Website URL is required' },
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

    // Step 2: Determine the best brand name to use
    // Prefer extracted brand name with high/medium confidence over user-provided name
    let brandName = userProvidedBrandName;
    if (crawlResult.brandInfo) {
      const { recommendedName, confidence, domainBasedName } = crawlResult.brandInfo;

      // Check if user-provided name looks like a domain-based abbreviation
      const userNameLooksLikeDomain = userProvidedBrandName &&
        (userProvidedBrandName.toLowerCase().includes(domainBasedName.toLowerCase()) ||
         domainBasedName.toLowerCase().includes(userProvidedBrandName.toLowerCase().replace(/\s+/g, '')));

      // Use extracted name if we have high/medium confidence and it's different from domain
      if ((confidence === 'high' || confidence === 'medium') &&
          recommendedName !== domainBasedName) {
        brandName = recommendedName;
        console.log(`Using extracted brand name: "${recommendedName}" (confidence: ${confidence})`);
      } else if (userNameLooksLikeDomain && recommendedName !== domainBasedName) {
        // User provided a domain-like name but we found a better one
        brandName = recommendedName;
        console.log(`Overriding domain-like user name with extracted: "${recommendedName}"`);
      }
    }

    // Fallback if no brand name available
    if (!brandName) {
      brandName = crawlResult.brandInfo?.recommendedName || new URL(normalizedUrl).hostname.replace('www.', '');
    }

    // Step 3: Generate Brand Bible from aggregated content
    const brandBible = await generateBrandBible(brandName, normalizedUrl, crawlResult);

    return NextResponse.json({
      success: true,
      brandBible,
      crawlStats: {
        pagesCrawled: crawlResult.pagesCrawled,
        sitemapFound: crawlResult.sitemapFound,
        duration: crawlResult.crawlDuration,
        pageTypes: getPageTypeStats(crawlResult),
        brandInfo: crawlResult.brandInfo,
        blogInfo: crawlResult.blogInfo,
        servicesInfo: crawlResult.servicesInfo,
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

// Helper to format navigation structure for prompt
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

async function generateBrandBible(
  brandName: string,
  websiteUrl: string,
  crawlResult: CrawlResult
) {
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
- Domain-based: ${brandInfo.domainBasedName}

IMPORTANT: Use the Recommended Name "${brandInfo.recommendedName}" NOT the domain-based name unless they are the same. The domain often contains abbreviations (e.g., "amglaw.com" for "Allred, Maroko & Goldberg").`
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
${servicesInfo.practiceAreas.length > 0 ? `Practice Areas: ${servicesInfo.practiceAreas.join(', ')}` : ''}

IMPORTANT: For law firms and professional services, include ALL practice areas/services listed in navigation. Do not omit any.`
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

CRITICAL INSTRUCTIONS:
1. Use the CONFIRMED BRAND NAME "${brandName}" - do NOT use domain abbreviations
2. For law firms: Include ALL practice areas from navigation in the description and products_services
3. If a Blog section was detected in navigation, include "Blog" or "News/Articles" in content_pillars
4. Cross-reference navigation items with page content to ensure nothing is missed
5. For professional services, list EVERY service/practice area found, not just the most prominent ones

Based on this comprehensive website analysis, generate a detailed Brand Bible. Be specific and use actual information from the content. Do not make up information - if something is unclear, make reasonable inferences based on the available data.

Return ONLY a JSON object with these exact fields:
{
  "industry": "Primary industry/category",
  "sub_industry": "More specific sub-category if applicable",
  "description": "3-4 sentence description of what the company does, their main offerings, and value proposition. For law firms, mention ALL practice areas.",
  "target_audience": "Detailed description of primary target audience including demographics, job roles, company types, and use cases (3-4 sentences)",
  "secondary_audiences": ["Array of secondary audience segments"],
  "brand_voice": "One of: professional, casual, technical, friendly, authoritative",
  "tone_guidelines": "Specific guidelines for brand communication style (2-3 sentences)",
  "key_differentiators": ["Array of 5-7 unique differentiators based on actual website content"],
  "key_messages": ["Array of 5-7 core brand messages/taglines found on the site"],
  "important_keywords": ["Array of 15-20 important keywords found throughout the site"],
  "content_pillars": ["Array of 4-6 main content themes - MUST include Blog/News if detected"],
  "unique_selling_points": ["Array of 5-7 USPs based on features/benefits mentioned"],
  "products_services": ["Array of ALL main products or services offered - include every practice area for law firms"],
  "pricing_model": "Description of pricing model if found (e.g., 'Freemium with Pro tier', 'Enterprise sales', 'Contingency fee')",
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
