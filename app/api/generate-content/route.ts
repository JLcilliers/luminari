import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import type { ContentGenerationRequest, ContentType } from '@/lib/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function getContentTypePrompt(contentType: ContentType): string {
  switch (contentType) {
    case 'article':
      return 'Write a comprehensive, in-depth article'
    case 'listicle':
      return 'Write an engaging list-based article with numbered items'
    case 'comparison':
      return 'Write a detailed comparison article'
    case 'how-to':
      return 'Write a step-by-step how-to guide'
    case 'faq':
      return 'Write a comprehensive FAQ section with common questions and detailed answers'
    default:
      return 'Write a well-structured article'
  }
}

function buildPrompt(request: ContentGenerationRequest): string {
  const {
    promptText,
    contentType,
    targetKeywords,
    brandName,
    competitors = [],
    tone = 'professional',
    wordCountTarget = 1500,
  } = request

  const contentTypeInstruction = getContentTypePrompt(contentType)
  const competitorSection = competitors.length > 0
    ? `\n\nCompetitors to mention where relevant (but position ${brandName} favorably): ${competitors.join(', ')}`
    : ''

  return `You are an expert SEO and GEO (Generative Engine Optimization) content writer. Your goal is to create content that ranks well in both traditional search engines and AI-generated responses.

${contentTypeInstruction} on the following topic:

Topic/Query: "${promptText}"

Target Keywords: ${targetKeywords.join(', ')}

Brand to Feature: ${brandName}${competitorSection}

Writing Guidelines:
1. Tone: ${tone}
2. Target Word Count: ${wordCountTarget} words
3. Structure the content with clear headings (H2, H3)
4. Include the target keywords naturally throughout the text
5. Feature ${brandName} prominently and positively
6. Include specific, factual information that AI systems can cite
7. Add a compelling meta description at the very end (marked with "META_DESCRIPTION:")
8. Make the content comprehensive enough to fully answer the query

GEO Optimization Rules:
- Use clear, direct language that AI can easily parse
- Include statistics, facts, and specific details
- Structure content so AI can extract snippets
- Position ${brandName} as an authority on this topic
- Answer the core question directly within the first paragraph

Output the article with proper markdown formatting (# for H1, ## for H2, etc.).
At the end, include:
META_DESCRIPTION: [your meta description here]`
}

function extractMetaDescription(content: string): { content: string; metaDescription: string } {
  const metaMatch = content.match(/META_DESCRIPTION:\s*(.+?)(?:\n|$)/i)
  const metaDescription = metaMatch ? metaMatch[1].trim() : ''
  const cleanContent = content.replace(/META_DESCRIPTION:\s*.+?(?:\n|$)/gi, '').trim()
  return { content: cleanContent, metaDescription }
}

function calculateSeoScore(content: string, keywords: string[]): number {
  let score = 50 // Base score

  // Check for headings
  const h2Count = (content.match(/^##\s/gm) || []).length
  if (h2Count >= 3) score += 10
  if (h2Count >= 5) score += 5

  // Check word count
  const wordCount = content.split(/\s+/).length
  if (wordCount >= 1000) score += 10
  if (wordCount >= 1500) score += 5

  // Check keyword usage
  const lowerContent = content.toLowerCase()
  keywords.forEach(keyword => {
    const keywordLower = keyword.toLowerCase()
    const occurrences = (lowerContent.match(new RegExp(keywordLower, 'g')) || []).length
    if (occurrences >= 2) score += 3
    if (occurrences >= 5) score += 2
  })

  // Cap at 100
  return Math.min(score, 100)
}

export async function POST(request: NextRequest) {
  try {
    const body: ContentGenerationRequest = await request.json()

    if (!body.promptText || !body.brandName || !body.contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: promptText, brandName, contentType' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      )
    }

    const prompt = buildPrompt(body)

    // Generate content with Claude
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract text content
    const textContent = message.content.find(block => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response')
    }

    const rawContent = textContent.text
    const { content, metaDescription } = extractMetaDescription(rawContent)
    const wordCount = content.split(/\s+/).length
    const seoScore = calculateSeoScore(content, body.targetKeywords)

    // Generate title from content (first H1 or first line)
    const titleMatch = content.match(/^#\s+(.+?)$/m)
    const title = titleMatch ? titleMatch[1] : body.promptText.slice(0, 100)

    // Get project_id (assuming single project for now)
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .limit(1)
      .single()

    if (!project) {
      return NextResponse.json(
        { error: 'No project found. Please create a project first.' },
        { status: 400 }
      )
    }

    // Save to database
    const { data: savedContent, error: saveError } = await supabase
      .from('generated_content')
      .insert({
        project_id: project.id,
        prompt_id: body.promptId || null,
        title,
        content,
        content_type: body.contentType,
        status: 'completed',
        target_keywords: body.targetKeywords,
        word_count: wordCount,
        seo_score: seoScore,
        meta_description: metaDescription,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Error saving content:', saveError)
      // Still return the generated content even if save fails
      return NextResponse.json({
        success: true,
        content: {
          title,
          content,
          content_type: body.contentType,
          word_count: wordCount,
          seo_score: seoScore,
          meta_description: metaDescription,
          target_keywords: body.targetKeywords,
        },
        saved: false,
        error: 'Content generated but failed to save to database',
      })
    }

    return NextResponse.json({
      success: true,
      content: savedContent,
      saved: true,
    })
  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    )
  }
}
