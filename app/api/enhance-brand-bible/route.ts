import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface BrandBibleData {
  name: string;
  tracked_brand: string;
  website_url: string;
  industry: string;
  description: string;
  key_messages: string[];
  target_audience: string;
  brand_voice: string;
  tone_guidelines: string;
  key_differentiators: string[];
  important_keywords: string[];
  content_pillars: string[];
  avoid_topics: string[];
  unique_selling_points: string[];
  target_personas: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { projectId, currentData } = await request.json();

    if (!projectId || !currentData) {
      return NextResponse.json(
        { error: 'Project ID and current data are required' },
        { status: 400 }
      );
    }

    // Get the project's edit history for context
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    // Generate enhanced Brand Bible
    const enhancedData = await enhanceBrandBible(currentData, project);

    return NextResponse.json({
      success: true,
      enhancedData,
      suggestions: enhancedData._suggestions || [],
    });

  } catch (error) {
    console.error('Brand Bible enhancement error:', error);
    return NextResponse.json(
      { error: 'Enhancement failed. Please try again.' },
      { status: 500 }
    );
  }
}

async function enhanceBrandBible(
  currentData: BrandBibleData,
  existingProject: any
): Promise<BrandBibleData & { _suggestions?: string[] }> {

  const prompt = `You are a brand strategist and AI visibility expert. Your task is to enhance a Brand Bible to improve how AI systems understand and represent this brand.

CURRENT BRAND BIBLE DATA:
${JSON.stringify(currentData, null, 2)}

${existingProject?.products_services ? `
ADDITIONAL CONTEXT FROM WEBSITE ANALYSIS:
- Products/Services: ${JSON.stringify(existingProject.products_services)}
- Competitors: ${JSON.stringify(existingProject.competitors || [])}
- Customer Pain Points: ${JSON.stringify(existingProject.customer_pain_points || [])}
- Proof Points: ${JSON.stringify(existingProject.proof_points || [])}
` : ''}

YOUR TASK:
1. Analyze the current Brand Bible data
2. Identify gaps or weak areas
3. Enhance and expand each field with more specific, actionable content
4. Maintain the brand's authentic voice while optimizing for AI visibility
5. Keep ALL existing content the user has added - only enhance, don't remove

ENHANCEMENT GUIDELINES:
- key_differentiators: Should be specific and quantifiable where possible
- important_keywords: Include both primary and long-tail keywords
- content_pillars: Should align with search intent and industry trends
- unique_selling_points: Focus on tangible benefits, not features
- key_messages: Should be memorable and quotable
- target_personas: Include job titles, pain points, and goals
- avoid_topics: Include competitor names and off-brand topics

Return a JSON object with the same structure as the input, but with enhanced values.
Also include a "_suggestions" array with 3-5 brief suggestions for the user about what was improved.

Return ONLY the JSON object, no markdown formatting.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  // Parse JSON response
  let enhancedData;
  try {
    const cleanedResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    enhancedData = JSON.parse(cleanedResponse);
  } catch (parseError) {
    console.error('Failed to parse enhanced Brand Bible:', parseError);
    // Return original data if parsing fails
    return { ...currentData, _suggestions: ['AI enhancement encountered an error. Please try again.'] };
  }

  // Ensure we don't lose any existing data
  const mergedData: BrandBibleData & { _suggestions?: string[] } = {
    name: enhancedData.name || currentData.name,
    tracked_brand: enhancedData.tracked_brand || currentData.tracked_brand,
    website_url: enhancedData.website_url || currentData.website_url,
    industry: enhancedData.industry || currentData.industry,
    description: enhancedData.description || currentData.description,
    target_audience: enhancedData.target_audience || currentData.target_audience,
    brand_voice: enhancedData.brand_voice || currentData.brand_voice,
    tone_guidelines: enhancedData.tone_guidelines || currentData.tone_guidelines,
    // For arrays, merge and dedupe
    key_messages: dedupeArray([
      ...(currentData.key_messages || []),
      ...(enhancedData.key_messages || []),
    ]),
    key_differentiators: dedupeArray([
      ...(currentData.key_differentiators || []),
      ...(enhancedData.key_differentiators || []),
    ]),
    important_keywords: dedupeArray([
      ...(currentData.important_keywords || []),
      ...(enhancedData.important_keywords || []),
    ]),
    content_pillars: dedupeArray([
      ...(currentData.content_pillars || []),
      ...(enhancedData.content_pillars || []),
    ]),
    avoid_topics: dedupeArray([
      ...(currentData.avoid_topics || []),
      ...(enhancedData.avoid_topics || []),
    ]),
    unique_selling_points: dedupeArray([
      ...(currentData.unique_selling_points || []),
      ...(enhancedData.unique_selling_points || []),
    ]),
    target_personas: dedupeArray([
      ...(currentData.target_personas || []),
      ...(enhancedData.target_personas || []),
    ]),
    _suggestions: enhancedData._suggestions || [],
  };

  return mergedData;
}

function dedupeArray(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter(item => {
    const normalized = item.toLowerCase().trim();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
