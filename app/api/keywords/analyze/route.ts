import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import type { KeywordAnalysisRequest, KeywordAnalysisResponse, Keyword, KeywordSource } from '@/lib/types'
import { calculateOpportunityScore } from '@/lib/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface GeneratedKeyword {
  keyword: string
  search_volume?: number
  keyword_difficulty?: number
  cpc?: number
  intent_type?: 'informational' | 'commercial' | 'transactional' | 'navigational'
  relevance_reason?: string
}

// Generate keywords using Claude for "Plan" analysis
async function generatePlanKeywords(
  seedKeywords: string[],
  projectId: string
): Promise<Partial<Keyword>[]> {
  // Get project info for context
  const { data: project } = await supabase
    .from('projects')
    .select('tracked_brand, industry, description, important_keywords')
    .eq('id', projectId)
    .single()

  const brandContext = project
    ? `Brand: ${project.tracked_brand}
Industry: ${project.industry || 'Not specified'}
Description: ${project.description || 'Not specified'}
Existing Keywords: ${(project.important_keywords || []).join(', ')}`
    : ''

  const prompt = `You are an SEO keyword research expert. Generate 15-20 related keywords based on the seed keywords provided.

${brandContext}

Seed Keywords: ${seedKeywords.join(', ')}

For each keyword, provide:
1. The keyword phrase
2. Estimated monthly search volume (100-100000)
3. Keyword difficulty (0-100, where higher is more competitive)
4. Estimated CPC in USD (0.10-50.00)
5. Search intent: informational, commercial, transactional, or navigational

Focus on keywords that would help the brand rank in AI-generated responses.

Return ONLY a JSON array with this exact structure:
[
  {
    "keyword": "example keyword phrase",
    "search_volume": 1000,
    "keyword_difficulty": 45,
    "cpc": 2.50,
    "intent_type": "informational",
    "relevance_reason": "Brief reason why this is relevant"
  }
]

Ensure you return valid JSON only, no markdown or explanation.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const textContent = message.content.find((block) => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response')
  }

  // Parse the JSON response
  const jsonMatch = textContent.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Could not parse keywords from response')
  }

  const generatedKeywords: GeneratedKeyword[] = JSON.parse(jsonMatch[0])

  // Transform to our keyword format
  return generatedKeywords.map((gk) => ({
    project_id: projectId,
    keyword: gk.keyword,
    source: 'plan' as KeywordSource,
    search_volume: gk.search_volume,
    keyword_difficulty: gk.keyword_difficulty,
    cpc: gk.cpc,
    intent_type: gk.intent_type,
    content_gap_pct: 100, // Assume 100% gap for new keywords
    in_cart: false,
    sent_to_launchpad: false,
    content_created: false,
  }))
}

// Analyze competitor domain for keywords
async function analyzeCompetitorKeywords(
  competitorDomain: string,
  projectId: string
): Promise<Partial<Keyword>[]> {
  // Get project info for context
  const { data: project } = await supabase
    .from('projects')
    .select('tracked_brand, industry, website_url, important_keywords')
    .eq('id', projectId)
    .single()

  const brandContext = project
    ? `Your Brand: ${project.tracked_brand}
Your Industry: ${project.industry || 'Not specified'}
Your Website: ${project.website_url || 'Not specified'}`
    : ''

  const prompt = `You are an SEO competitive analysis expert. Analyze the competitor domain and suggest keywords they likely rank for that could benefit our brand.

${brandContext}

Competitor Domain: ${competitorDomain}

Based on the competitor domain name and typical industry patterns, generate 15-20 keywords that:
1. The competitor likely ranks for
2. Would be valuable for our brand to target
3. Represent content gaps we should fill

For each keyword, provide:
1. The keyword phrase
2. Estimated monthly search volume (100-100000)
3. Keyword difficulty (0-100)
4. Estimated CPC in USD (0.10-50.00)
5. Search intent: informational, commercial, transactional, or navigational
6. Content gap percentage (0-100): How much of a gap exists compared to competitor

Return ONLY a JSON array with this exact structure:
[
  {
    "keyword": "example keyword phrase",
    "search_volume": 1000,
    "keyword_difficulty": 45,
    "cpc": 2.50,
    "intent_type": "commercial",
    "content_gap_pct": 80
  }
]

Ensure you return valid JSON only, no markdown or explanation.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const textContent = message.content.find((block) => block.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in response')
  }

  // Parse the JSON response
  const jsonMatch = textContent.text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) {
    throw new Error('Could not parse keywords from response')
  }

  const generatedKeywords: GeneratedKeyword[] = JSON.parse(jsonMatch[0])

  // Transform to our keyword format
  return generatedKeywords.map((gk) => ({
    project_id: projectId,
    keyword: gk.keyword,
    source: 'compete' as KeywordSource,
    search_volume: gk.search_volume,
    keyword_difficulty: gk.keyword_difficulty,
    cpc: gk.cpc,
    intent_type: gk.intent_type,
    competitor_source: competitorDomain,
    content_gap_pct: (gk as { content_gap_pct?: number }).content_gap_pct || 50,
    in_cart: false,
    sent_to_launchpad: false,
    content_created: false,
  }))
}

export async function POST(request: NextRequest) {
  try {
    const body: KeywordAnalysisRequest = await request.json()

    if (!body.projectId || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, type' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    let keywords: Partial<Keyword>[] = []

    if (body.type === 'plan') {
      if (!body.seedKeywords || body.seedKeywords.length === 0) {
        return NextResponse.json(
          { error: 'seedKeywords required for plan analysis' },
          { status: 400 }
        )
      }
      keywords = await generatePlanKeywords(body.seedKeywords, body.projectId)
    } else if (body.type === 'compete') {
      if (!body.competitorDomain) {
        return NextResponse.json(
          { error: 'competitorDomain required for compete analysis' },
          { status: 400 }
        )
      }
      keywords = await analyzeCompetitorKeywords(body.competitorDomain, body.projectId)

      // Update competitor domain with keywords found count
      await supabase
        .from('competitor_domains')
        .update({
          keywords_found: keywords.length,
          last_analyzed: new Date().toISOString(),
        })
        .eq('project_id', body.projectId)
        .eq('domain', body.competitorDomain.replace(/^https?:\/\//, '').replace(/\/$/, ''))
    }

    // Calculate opportunity scores for all keywords
    const keywordsWithScores = keywords.map((kw) => ({
      ...kw,
      opportunity_score: calculateOpportunityScore(kw),
    }))

    // Insert keywords into database (upsert to handle duplicates)
    const { data: savedKeywords, error: insertError } = await supabase
      .from('keywords')
      .upsert(
        keywordsWithScores.map((kw) => ({
          project_id: kw.project_id,
          keyword: kw.keyword,
          source: kw.source,
          search_volume: kw.search_volume,
          keyword_difficulty: kw.keyword_difficulty,
          cpc: kw.cpc,
          intent_type: kw.intent_type,
          competitor_source: kw.competitor_source,
          content_gap_pct: kw.content_gap_pct,
          opportunity_score: kw.opportunity_score,
          in_cart: kw.in_cart,
          sent_to_launchpad: kw.sent_to_launchpad,
          content_created: kw.content_created,
          last_updated: new Date().toISOString(),
        })),
        { onConflict: 'project_id,keyword,source' }
      )
      .select()

    if (insertError) {
      console.error('Error saving keywords:', insertError)
      return NextResponse.json(
        {
          success: false,
          error: 'Keywords generated but failed to save to database',
          keywords: keywordsWithScores,
        },
        { status: 500 }
      )
    }

    const response: KeywordAnalysisResponse = {
      success: true,
      keywords: savedKeywords as Keyword[],
      source: body.type === 'plan' ? 'plan' : 'compete',
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Keyword analysis error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze keywords',
        keywords: [],
        source: 'plan',
      },
      { status: 500 }
    )
  }
}
