import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface OptimizationRecommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  currentState?: string;
  suggestedFix?: string;
}

interface ContentAnalysis {
  seoScore: number;
  readabilityScore: number;
  keywordDensity: number;
  wordCount: number;
  recommendations: OptimizationRecommendation[];
  optimizedTitle?: string;
  optimizedMetaDescription?: string;
  suggestedHeadings?: string[];
  suggestedKeywords?: string[];
}

// POST - Analyze and optimize content
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, targetUrl, targetKeyword, pageContent, action = 'analyze' } = body;

    if (!projectId || !targetKeyword) {
      return NextResponse.json(
        { error: 'projectId and targetKeyword are required' },
        { status: 400 }
      );
    }

    // Get project info for brand context
    const { data: project } = await supabase
      .from('projects')
      .select('tracked_brand, website_url, industry')
      .eq('id', projectId)
      .single();

    const brandName = project?.tracked_brand || 'the brand';
    const industry = project?.industry || 'general';

    if (action === 'analyze') {
      // Full content analysis
      const analysis = await analyzeContent(
        pageContent || '',
        targetKeyword,
        brandName,
        industry
      );

      // Save optimization task to database
      const { data: task, error } = await supabase
        .from('optimization_tasks')
        .upsert({
          project_id: projectId,
          target_url: targetUrl || '',
          target_keyword: targetKeyword,
          page_content: pageContent,
          ai_analysis: analysis,
          recommendations: analysis.recommendations,
          status: 'analyzing',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'project_id,target_url' })
        .select()
        .single();

      if (error) {
        console.error('Error saving optimization task:', error);
      }

      return NextResponse.json({
        success: true,
        taskId: task?.id,
        analysis,
      });
    } else if (action === 'generate-content') {
      // Generate optimized content based on keyword
      const optimizedContent = await generateOptimizedContent(
        targetKeyword,
        brandName,
        industry,
        pageContent
      );

      return NextResponse.json({
        success: true,
        content: optimizedContent,
      });
    } else if (action === 'get-suggestions') {
      // Get quick suggestions without full analysis
      const suggestions = await getQuickSuggestions(
        pageContent || '',
        targetKeyword
      );

      return NextResponse.json({
        success: true,
        suggestions,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: analyze, generate-content, or get-suggestions' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Content optimization error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to optimize content' },
      { status: 500 }
    );
  }
}

// GET - Fetch optimization tasks for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const status = searchParams.get('status');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('optimization_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: tasks, error } = await query;

    if (error) {
      console.error('Error fetching optimization tasks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tasks' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error fetching optimization tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

async function analyzeContent(
  content: string,
  targetKeyword: string,
  brandName: string,
  industry: string
): Promise<ContentAnalysis> {
  const wordCount = content.split(/\s+/).filter(w => w).length;

  // Calculate keyword density
  const keywordRegex = new RegExp(targetKeyword, 'gi');
  const keywordMatches = content.match(keywordRegex) || [];
  const keywordDensity = wordCount > 0 ? (keywordMatches.length / wordCount) * 100 : 0;

  // Use AI for comprehensive analysis
  const prompt = `Analyze this content for SEO optimization targeting the keyword "${targetKeyword}" for a ${industry} brand called "${brandName}".

Content to analyze:
${content.slice(0, 3000)}

Provide a JSON response with:
1. seoScore (0-100): Overall SEO optimization score
2. readabilityScore (0-100): Content readability score
3. recommendations: Array of objects with:
   - category: "title" | "meta" | "headings" | "content" | "keywords" | "structure" | "links"
   - priority: "high" | "medium" | "low"
   - title: Short recommendation title
   - description: Detailed explanation
   - currentState: What's currently wrong (if applicable)
   - suggestedFix: Specific fix suggestion
4. optimizedTitle: Suggested SEO-optimized title tag (50-60 chars)
5. optimizedMetaDescription: Suggested meta description (150-160 chars)
6. suggestedHeadings: Array of 3-5 suggested H2/H3 headings
7. suggestedKeywords: Array of 5-10 related keywords to include

Focus on 2026 SEO best practices including:
- E-E-A-T signals (Experience, Expertise, Authoritativeness, Trust)
- User intent optimization
- AI-friendly content structure
- Semantic keyword usage
- Content depth and comprehensiveness

Return ONLY valid JSON, no markdown.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const aiAnalysis = JSON.parse(completion.choices[0]?.message?.content || '{}');

    return {
      seoScore: aiAnalysis.seoScore || 50,
      readabilityScore: aiAnalysis.readabilityScore || 50,
      keywordDensity: Math.round(keywordDensity * 100) / 100,
      wordCount,
      recommendations: aiAnalysis.recommendations || [],
      optimizedTitle: aiAnalysis.optimizedTitle,
      optimizedMetaDescription: aiAnalysis.optimizedMetaDescription,
      suggestedHeadings: aiAnalysis.suggestedHeadings,
      suggestedKeywords: aiAnalysis.suggestedKeywords,
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    // Return basic analysis if AI fails
    return {
      seoScore: 50,
      readabilityScore: 50,
      keywordDensity: Math.round(keywordDensity * 100) / 100,
      wordCount,
      recommendations: [
        {
          category: 'content',
          priority: 'medium',
          title: 'Review Content Length',
          description: `Your content has ${wordCount} words. Aim for 1500-2500 words for comprehensive coverage.`,
        },
        {
          category: 'keywords',
          priority: 'medium',
          title: 'Keyword Density',
          description: `Current keyword density is ${keywordDensity.toFixed(2)}%. Aim for 1-2%.`,
        },
      ],
    };
  }
}

async function generateOptimizedContent(
  targetKeyword: string,
  brandName: string,
  industry: string,
  existingContent?: string
): Promise<{
  title: string;
  metaDescription: string;
  outline: string[];
  introduction: string;
  sections: { heading: string; content: string }[];
}> {
  const prompt = `Create SEO-optimized content structure for the keyword "${targetKeyword}" for a ${industry} brand called "${brandName}".

${existingContent ? `Existing content to improve:\n${existingContent.slice(0, 1500)}` : ''}

Generate a JSON response with:
1. title: SEO-optimized title (50-60 characters)
2. metaDescription: Compelling meta description (150-160 characters)
3. outline: Array of 5-7 main section headings
4. introduction: Engaging introduction paragraph (100-150 words)
5. sections: Array of objects with:
   - heading: Section heading
   - content: 150-200 word section content

Focus on:
- User intent and search behavior
- E-E-A-T principles
- Natural keyword integration
- Clear, actionable content
- AI-friendly structure for featured snippets

Return ONLY valid JSON.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 3000,
  });

  return JSON.parse(completion.choices[0]?.message?.content || '{}');
}

async function getQuickSuggestions(
  content: string,
  targetKeyword: string
): Promise<string[]> {
  const suggestions: string[] = [];
  const lowerContent = content.toLowerCase();
  const lowerKeyword = targetKeyword.toLowerCase();

  // Check keyword in first 100 words
  const first100Words = content.split(/\s+/).slice(0, 100).join(' ').toLowerCase();
  if (!first100Words.includes(lowerKeyword)) {
    suggestions.push(`Include "${targetKeyword}" in the first 100 words of your content`);
  }

  // Check word count
  const wordCount = content.split(/\s+/).filter(w => w).length;
  if (wordCount < 300) {
    suggestions.push('Content is too short. Aim for at least 1500 words for comprehensive coverage');
  } else if (wordCount < 1000) {
    suggestions.push('Consider expanding your content to 1500+ words for better rankings');
  }

  // Check keyword density
  const keywordRegex = new RegExp(targetKeyword, 'gi');
  const matches = content.match(keywordRegex) || [];
  const density = (matches.length / wordCount) * 100;

  if (density < 0.5) {
    suggestions.push(`Low keyword density (${density.toFixed(1)}%). Include "${targetKeyword}" more naturally`);
  } else if (density > 3) {
    suggestions.push(`High keyword density (${density.toFixed(1)}%). Reduce to avoid over-optimization`);
  }

  // Check for headings
  if (!content.includes('<h2') && !content.includes('## ')) {
    suggestions.push('Add H2 headings to structure your content for better readability');
  }

  // Check for lists
  if (!content.includes('<ul') && !content.includes('<ol') && !content.includes('- ')) {
    suggestions.push('Add bullet points or numbered lists to improve scannability');
  }

  return suggestions;
}
