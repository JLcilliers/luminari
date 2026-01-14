import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIModel } from './types';

// Initialize clients (lazily to avoid errors when keys aren't set)
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;
let googleClient: GoogleGenerativeAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

function getGoogleAI(): GoogleGenerativeAI {
  if (!googleClient) {
    googleClient = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');
  }
  return googleClient;
}

export interface AIResponse {
  model: AIModel;
  responseText: string;
  success: boolean;
  error?: string;
  citedUrls?: string[];
}

export interface CollectionResult {
  responses: AIResponse[];
  successCount: number;
  failedCount: number;
}

// Query ChatGPT (OpenAI)
async function queryChatGPT(prompt: string): Promise<AIResponse> {
  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '';
    return {
      model: 'chatgpt',
      responseText: text,
      success: true,
      citedUrls: extractUrls(text),
    };
  } catch (error) {
    console.error('ChatGPT error:', error);
    return {
      model: 'chatgpt',
      responseText: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Query Claude (Anthropic)
async function queryClaude(prompt: string): Promise<AIResponse> {
  try {
    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0]?.type === 'text'
      ? response.content[0].text
      : '';
    return {
      model: 'claude',
      responseText: text,
      success: true,
      citedUrls: extractUrls(text),
    };
  } catch (error) {
    console.error('Claude error:', error);
    return {
      model: 'claude',
      responseText: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Query Gemini (Google)
async function queryGemini(prompt: string): Promise<AIResponse> {
  try {
    const google = getGoogleAI();
    const model = google.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return {
      model: 'gemini',
      responseText: text,
      success: true,
      citedUrls: extractUrls(text),
    };
  } catch (error) {
    console.error('Gemini error:', error);
    return {
      model: 'gemini',
      responseText: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Query Perplexity
async function queryPerplexity(prompt: string): Promise<AIResponse> {
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-small-128k-online',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    // Perplexity often includes citations in a specific format
    const citations = data.citations || [];

    return {
      model: 'perplexity',
      responseText: text,
      success: true,
      citedUrls: [...citations, ...extractUrls(text)],
    };
  } catch (error) {
    console.error('Perplexity error:', error);
    return {
      model: 'perplexity',
      responseText: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Query Copilot (uses OpenAI API since Microsoft Copilot doesn't have public API)
// For now, we'll use GPT-4 as a proxy for Copilot-like responses
async function queryCopilot(prompt: string): Promise<AIResponse> {
  try {
    const openai = getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Using GPT-4 as proxy for Copilot
      messages: [
        {
          role: 'system',
          content: 'You are a helpful AI assistant similar to Microsoft Copilot. Provide helpful, accurate information.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
    });

    const text = response.choices[0]?.message?.content || '';
    return {
      model: 'copilot',
      responseText: text,
      success: true,
      citedUrls: extractUrls(text),
    };
  } catch (error) {
    console.error('Copilot error:', error);
    return {
      model: 'copilot',
      responseText: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Extract URLs from text
function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s\)\]\}\"\'<>]+/g;
  const matches = text.match(urlRegex) || [];
  // Clean up and deduplicate
  const cleaned = matches.map(url => url.replace(/[.,;:!?]+$/, ''));
  return [...new Set(cleaned)];
}

// Check if brand is mentioned in response
export function checkBrandMention(text: string, brandName: string): boolean {
  const lowerText = text.toLowerCase();
  const lowerBrand = brandName.toLowerCase();

  // Check for exact match or common variations
  const variations = [
    lowerBrand,
    lowerBrand.replace(/\s+/g, ''),
    lowerBrand.replace(/\s+/g, '-'),
  ];

  return variations.some(v => lowerText.includes(v));
}

// Check if domain is cited in response
export function checkDomainCitation(citedUrls: string[], domain: string): boolean {
  const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
  return citedUrls.some(url => {
    try {
      const urlDomain = new URL(url).hostname.replace(/^www\./, '');
      return urlDomain.includes(cleanDomain) || cleanDomain.includes(urlDomain);
    } catch {
      return url.toLowerCase().includes(cleanDomain.toLowerCase());
    }
  });
}

// Simple sentiment analysis (returns -1 to 1)
export function analyzeSentiment(text: string, brandName: string): number | null {
  const lowerText = text.toLowerCase();
  const lowerBrand = brandName.toLowerCase();

  // Only analyze if brand is mentioned
  if (!lowerText.includes(lowerBrand)) {
    return null;
  }

  // Simple keyword-based sentiment
  const positiveWords = ['great', 'excellent', 'best', 'recommended', 'leading', 'top', 'popular', 'trusted', 'reliable', 'innovative', 'effective', 'powerful', 'impressive', 'outstanding'];
  const negativeWords = ['bad', 'poor', 'worst', 'avoid', 'issues', 'problems', 'complaints', 'expensive', 'overpriced', 'disappointing', 'limited', 'outdated', 'unreliable'];

  let score = 0;
  positiveWords.forEach(word => {
    if (lowerText.includes(word)) score += 0.1;
  });
  negativeWords.forEach(word => {
    if (lowerText.includes(word)) score -= 0.1;
  });

  // Clamp between -1 and 1
  return Math.max(-1, Math.min(1, score));
}

// Extract mentioned brands from response
export function extractMentionedBrands(text: string, knownCompetitors: string[]): string[] {
  const lowerText = text.toLowerCase();
  return knownCompetitors.filter(competitor =>
    lowerText.includes(competitor.toLowerCase())
  );
}

// Main collection function - queries all specified models
export async function collectResponses(
  prompt: string,
  models: AIModel[] = ['chatgpt', 'claude', 'gemini', 'perplexity', 'copilot']
): Promise<CollectionResult> {
  const queryFunctions: Record<AIModel, (prompt: string) => Promise<AIResponse>> = {
    chatgpt: queryChatGPT,
    claude: queryClaude,
    gemini: queryGemini,
    perplexity: queryPerplexity,
    copilot: queryCopilot,
  };

  // Query all models in parallel
  const promises = models.map(model => queryFunctions[model](prompt));
  const responses = await Promise.all(promises);

  const successCount = responses.filter(r => r.success).length;
  const failedCount = responses.filter(r => !r.success).length;

  return {
    responses,
    successCount,
    failedCount,
  };
}

// Query a single model
export async function collectSingleResponse(
  prompt: string,
  model: AIModel
): Promise<AIResponse> {
  const queryFunctions: Record<AIModel, (prompt: string) => Promise<AIResponse>> = {
    chatgpt: queryChatGPT,
    claude: queryClaude,
    gemini: queryGemini,
    perplexity: queryPerplexity,
    copilot: queryCopilot,
  };

  return queryFunctions[model](prompt);
}
