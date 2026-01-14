import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const { industry, services, targetAudience, competitors, existingKeywords = [] } = await request.json();

    const prompt = `You are an SEO keyword research expert. Generate keyword ideas for a business.

BUSINESS CONTEXT:
- Industry: ${industry || 'Not specified'}
- Services/Products: ${services?.join(', ') || 'Not specified'}
- Target Audience: ${targetAudience || 'General'}
- Competitors: ${competitors?.join(', ') || 'Not specified'}
- Already targeting: ${existingKeywords.slice(0, 20).join(', ') || 'None'}

Generate 30 high-value keyword opportunities. Include a mix of:
1. High-intent commercial keywords (people ready to buy/hire)
2. Informational keywords (people researching)
3. Local keywords (if applicable)
4. Long-tail keywords (specific, lower competition)
5. Question keywords (what, how, why, when)

For each keyword, estimate:
- Search intent (informational, commercial, transactional, navigational)
- Competition level (low, medium, high)
- Business value (low, medium, high)

Output JSON array:
[
  {
    "keyword": "keyword phrase",
    "intent": "commercial",
    "competition": "medium",
    "businessValue": "high",
    "reasoning": "Why this keyword matters for this business"
  }
]

Focus on keywords the business could realistically rank for. Avoid extremely competitive head terms unless the business has strong authority.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse keyword suggestions' }, { status: 500 });
    }

    const keywords = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ keywords });
  } catch (error) {
    console.error('AI discovery error:', error);
    return NextResponse.json({ error: 'Failed to generate keyword ideas' }, { status: 500 });
  }
}
