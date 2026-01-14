import { NextRequest, NextResponse } from 'next/server';
import { collectSingleResponse } from '@/lib/ai-providers';
import type { AIModel } from '@/lib/types';

export async function GET(request: NextRequest) {
  const models: AIModel[] = ['chatgpt', 'claude', 'gemini', 'perplexity', 'copilot'];
  const testPrompt = 'Say hello in one word.';

  const results: Record<string, { success: boolean; error?: string; hasResponse: boolean }> = {};

  for (const model of models) {
    try {
      const response = await collectSingleResponse(testPrompt, model);
      results[model] = {
        success: response.success,
        error: response.error,
        hasResponse: response.responseText.length > 0,
      };
    } catch (error) {
      results[model] = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasResponse: false,
      };
    }
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results,
    summary: {
      working: Object.entries(results).filter(([, r]) => r.success).map(([m]) => m),
      failing: Object.entries(results).filter(([, r]) => !r.success).map(([m]) => m),
    },
  });
}
