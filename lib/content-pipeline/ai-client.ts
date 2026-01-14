/**
 * AI client for the content pipeline
 * Uses Anthropic Claude API
 */

import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

/**
 * Get or create Anthropic client instance
 */
export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

/**
 * Call Claude with a system prompt and user message
 * Returns the parsed JSON response
 */
export async function callClaude<T>(
  systemPrompt: string,
  userMessage: string,
  options: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const {
    model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
    temperature = 0.3,
    maxTokens = 8000,
    timeoutMs = 300000, // 5 minutes for long content generation
  } = options;

  const client = getAnthropicClient();

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Claude API timeout after ${timeoutMs / 1000}s`));
      }, timeoutMs);
    });

    // Create API call promise
    const apiPromise = client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    });

    // Race between API call and timeout
    const response = await Promise.race([apiPromise, timeoutPromise]);

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    // Parse JSON response
    let jsonText = content.text;

    // Handle code fence wrapped JSON
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    // Clean up any trailing content after the JSON
    const lastBrace = jsonText.lastIndexOf('}');
    if (lastBrace !== -1) {
      jsonText = jsonText.substring(0, lastBrace + 1);
    }

    try {
      return JSON.parse(jsonText) as T;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw text:', content.text.substring(0, 500));
      throw new Error(`Failed to parse Claude response as JSON: ${parseError}`);
    }
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number; error?: { message?: string } };

    // Handle timeout errors
    if (err.message?.includes('timeout')) {
      console.error('[AI] Claude API timeout:', err.message);
      throw error;
    }

    // Handle Anthropic API errors
    if (err.status === 401) {
      throw new Error('Invalid API key. Please check your ANTHROPIC_API_KEY.');
    } else if (err.status === 404) {
      throw new Error(`Model '${model}' not found. Your API key may not have access to this model.`);
    } else if (err.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    } else if (err.error?.message) {
      throw new Error(`Anthropic API error: ${err.error.message}`);
    } else if (err.message) {
      throw new Error(`Claude API error: ${err.message}`);
    }
    throw error;
  }
}

/**
 * Word count utility
 */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}
