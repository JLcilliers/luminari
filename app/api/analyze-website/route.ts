import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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

    // Fetch website content
    let websiteContent = '';
    try {
      // Fetch homepage
      const homeResponse = await fetch(websiteUrl, {
        headers: { 'User-Agent': 'Luminari Brand Analyzer/1.0' },
      });
      const homeHtml = await homeResponse.text();

      // Extract text content (basic HTML stripping)
      websiteContent = homeHtml
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 15000); // Limit content size

      // Try to fetch /about page if it exists
      try {
        const aboutUrl = new URL('/about', websiteUrl).toString();
        const aboutResponse = await fetch(aboutUrl, {
          headers: { 'User-Agent': 'Luminari Brand Analyzer/1.0' },
        });
        if (aboutResponse.ok) {
          const aboutHtml = await aboutResponse.text();
          const aboutText = aboutHtml
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 5000);
          websiteContent += '\n\nAbout Page:\n' + aboutText;
        }
      } catch (e) {
        // About page doesn't exist, continue
      }
    } catch (fetchError) {
      console.error('Failed to fetch website:', fetchError);
      // Continue with just the brand name if fetch fails
      websiteContent = `Brand name: ${brandName}. Website: ${websiteUrl}`;
    }

    // Use Claude to analyze and generate Brand Bible
    const prompt = `Analyze this website content and generate a comprehensive Brand Bible for "${brandName}".

Website URL: ${websiteUrl}

Website Content:
${websiteContent}

Based on this content, generate a Brand Bible with the following fields. Be specific and actionable. If you can't determine something from the content, make a reasonable inference based on the industry and brand name.

Return ONLY a JSON object with these exact fields:
{
  "industry": "The primary industry/category (e.g., 'SaaS', 'E-commerce', 'Healthcare')",
  "description": "A 2-3 sentence description of what the company/brand does",
  "target_audience": "Detailed description of the target audience (2-3 sentences)",
  "brand_voice": "One of: professional, casual, technical, friendly, authoritative",
  "tone_guidelines": "Specific guidelines for how the brand should communicate (2-3 sentences)",
  "key_differentiators": ["Array of 3-5 unique selling points"],
  "key_messages": ["Array of 3-5 core brand messages"],
  "important_keywords": ["Array of 10-15 important keywords/phrases for this brand"],
  "content_pillars": ["Array of 3-5 main content themes/topics"],
  "unique_selling_points": ["Array of 3-5 USPs"],
  "avoid_topics": ["Array of topics/themes to avoid in content"],
  "competitors": ["Array of 3-5 likely competitor brand names"]
}

Return ONLY the JSON object, no markdown formatting or explanation.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Parse the JSON response
    let brandBible;
    try {
      // Clean up response (remove any markdown code blocks)
      const cleanedResponse = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      brandBible = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse Brand Bible:', parseError);
      return NextResponse.json(
        { error: 'Failed to generate Brand Bible. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      brandBible: {
        name: brandName,
        tracked_brand: brandName,
        website_url: websiteUrl,
        ...brandBible,
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
