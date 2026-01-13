import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import type { ContentGenerationRequest, ContentType, Project, BrandVoice } from '@/lib/types'

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

function getBrandVoiceDescription(brandVoice: BrandVoice): string {
  switch (brandVoice) {
    case 'professional':
      return 'formal, business-like, and polished'
    case 'casual':
      return 'friendly, conversational, and relaxed'
    case 'technical':
      return 'detailed, expert-level, and precise'
    case 'friendly':
      return 'warm, approachable, and personable'
    case 'authoritative':
      return 'confident, expert, and commanding respect'
    default:
      return 'professional and clear'
  }
}

interface EnhancedContentRequest extends ContentGenerationRequest {
  project?: Project
}

function buildPrompt(request: EnhancedContentRequest): string {
  const {
    promptText,
    contentType,
    targetKeywords,
    brandName,
    competitors = [],
    tone = 'professional',
    wordCountTarget = 1500,
    project,
  } = request

  const contentTypeInstruction = getContentTypePrompt(contentType)
  const competitorSection = competitors.length > 0
    ? `\n\nCompetitors to mention where relevant (but position ${brandName} favorably): ${competitors.join(', ')}`
    : ''

  // Build enhanced brand context from project Brand Bible
  let brandContext = ''
  if (project) {
    const parts: string[] = []

    if (project.description) {
      parts.push(`Brand Description: ${project.description}`)
    }

    if (project.industry) {
      parts.push(`Industry: ${project.industry}`)
    }

    if (project.target_audience) {
      parts.push(`Target Audience: ${project.target_audience}`)
    }

    if (project.brand_voice) {
      const voiceDesc = getBrandVoiceDescription(project.brand_voice)
      parts.push(`Brand Voice: ${voiceDesc}`)
    }

    if (project.tone_guidelines) {
      parts.push(`Tone Guidelines: ${project.tone_guidelines}`)
    }

    if (project.unique_selling_points && project.unique_selling_points.length > 0) {
      parts.push(`Unique Selling Points:\n${project.unique_selling_points.map(usp => `  - ${usp}`).join('\n')}`)
    }

    if (project.key_differentiators && project.key_differentiators.length > 0) {
      parts.push(`Key Differentiators:\n${project.key_differentiators.map(d => `  - ${d}`).join('\n')}`)
    }

    if (project.content_pillars && project.content_pillars.length > 0) {
      parts.push(`Content Pillars (focus areas): ${project.content_pillars.join(', ')}`)
    }

    if (project.key_messages && project.key_messages.length > 0) {
      parts.push(`Key Messages to Convey:\n${project.key_messages.map(m => `  - ${m}`).join('\n')}`)
    }

    if (parts.length > 0) {
      brandContext = `\n\n=== BRAND BIBLE CONTEXT ===\n${parts.join('\n\n')}\n=== END BRAND BIBLE ===`
    }
  }

  // Build keywords section with important keywords from brand
  let allKeywords = [...targetKeywords]
  if (project?.important_keywords && project.important_keywords.length > 0) {
    // Add brand keywords that aren't already in target keywords
    const additionalKeywords = project.important_keywords.filter(
      k => !targetKeywords.map(t => t.toLowerCase()).includes(k.toLowerCase())
    )
    allKeywords = [...targetKeywords, ...additionalKeywords.slice(0, 5)]
  }

  // Build topics to avoid section
  let avoidSection = ''
  if (project?.avoid_topics && project.avoid_topics.length > 0) {
    avoidSection = `\n\nTopics to AVOID (do not mention or associate with the brand):\n${project.avoid_topics.map(t => `  - ${t}`).join('\n')}`
  }

  // Determine the tone based on brand voice if available
  const effectiveTone = project?.brand_voice
    ? getBrandVoiceDescription(project.brand_voice)
    : tone

  return `You are an expert SEO and GEO (Generative Engine Optimization) content writer. Your goal is to create content that ranks well in both traditional search engines and AI-generated responses.
${brandContext}
${contentTypeInstruction} on the following topic:

Topic/Query: "${promptText}"

Target Keywords: ${allKeywords.join(', ')}

Brand to Feature: ${brandName}${competitorSection}${avoidSection}

Writing Guidelines:
1. Tone: ${effectiveTone}
2. Target Word Count: ${wordCountTarget} words
3. Structure the content with clear headings (H2, H3)
4. Include the target keywords naturally throughout the text
5. Feature ${brandName} prominently and positively
6. Include specific, factual information that AI systems can cite
7. Add a compelling meta description at the very end (marked with "META_DESCRIPTION:")
8. Make the content comprehensive enough to fully answer the query
${project?.unique_selling_points && project.unique_selling_points.length > 0
  ? `9. Highlight these unique selling points naturally: ${project.unique_selling_points.slice(0, 3).join(', ')}`
  : ''}

GEO Optimization Rules:
- Use clear, direct language that AI can easily parse
- Include statistics, facts, and specific details
- Structure content so AI can extract snippets
- Position ${brandName} as an authority on this topic
- Answer the core question directly within the first paragraph
${project?.key_differentiators && project.key_differentiators.length > 0
  ? `- Emphasize these differentiators: ${project.key_differentiators.slice(0, 3).join(', ')}`
  : ''}

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

function calculateSeoScore(content: string, keywords: string[], project?: Project): number {
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

  // Bonus for brand keywords usage
  if (project?.important_keywords) {
    project.important_keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase()
      if (lowerContent.includes(keywordLower)) {
        score += 2
      }
    })
  }

  // Bonus for mentioning unique selling points
  if (project?.unique_selling_points) {
    project.unique_selling_points.forEach(usp => {
      const uspLower = usp.toLowerCase()
      // Check if key words from USP appear in content
      const uspWords = uspLower.split(/\s+/).filter(w => w.length > 4)
      const foundWords = uspWords.filter(w => lowerContent.includes(w))
      if (foundWords.length >= Math.ceil(uspWords.length / 2)) {
        score += 2
      }
    })
  }

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

    // Get full project data including Brand Bible fields
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .limit(1)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'No project found. Please create a project first.' },
        { status: 400 }
      )
    }

    // Build the enhanced prompt with Brand Bible context
    const prompt = buildPrompt({
      ...body,
      project: project as Project,
    })

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
    const seoScore = calculateSeoScore(content, body.targetKeywords, project as Project)

    // Generate title from content (first H1 or first line)
    const titleMatch = content.match(/^#\s+(.+?)$/m)
    const title = titleMatch ? titleMatch[1] : body.promptText.slice(0, 100)

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
