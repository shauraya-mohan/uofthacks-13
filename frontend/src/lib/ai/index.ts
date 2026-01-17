/**
 * AI Analysis Service
 * Main entry point for accessibility barrier analysis
 *
 * Usage:
 *   import { analyzeBarrier } from '@/lib/ai';
 *   const result = await analyzeBarrier(buffer, mimeType, fileName);
 */

export type { AnalysisResult, AnalysisInput, AIProvider } from './types';

import type { AnalysisResult, AnalysisInput, AIProvider } from './types';
import { geminiProvider } from './gemini';
import { fallbackProvider } from './fallback';

/**
 * Ordered list of AI providers to try
 * First configured provider that succeeds is used
 */
const providers: AIProvider[] = [
  geminiProvider,
  fallbackProvider, // Always available as last resort
];

/**
 * Get the currently active AI provider
 */
export function getActiveProvider(): AIProvider {
  for (const provider of providers) {
    if (provider.isConfigured()) {
      return provider;
    }
  }
  return fallbackProvider;
}

/**
 * Analyze an accessibility barrier from image or video
 *
 * @param buffer - File buffer
 * @param mimeType - MIME type (e.g., 'image/jpeg', 'video/mp4')
 * @param fileName - Original file name
 * @returns Analysis result or null if all providers fail
 */
export async function analyzeBarrier(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<AnalysisResult> {
  const input: AnalysisInput = { buffer, mimeType, fileName };

  // Try each provider in order
  for (const provider of providers) {
    if (!provider.isConfigured()) {
      continue;
    }

    console.log(`Analyzing with ${provider.name}...`);

    try {
      const result = await provider.analyze(input);
      if (result) {
        console.log(`Analysis complete with ${provider.name}`);
        return result;
      }
    } catch (error) {
      console.error(`${provider.name} provider failed:`, error);
    }
  }

  // This should never happen since fallback is always available
  console.log('All providers failed, using fallback');
  const fallbackResult = await fallbackProvider.analyze(input);

  // Fallback always returns a result, but satisfy TypeScript
  if (!fallbackResult) {
    return {
      title: 'Analysis Unavailable',
      description: 'Unable to analyze the image at this time.',
      suggestedFix: 'Please try again or contact support.',
      category: 'other' as const,
      severity: 'medium' as const,
      confidence: 0.5,
    };
  }

  return fallbackResult;
}

/**
 * Check if AI analysis is available (any provider configured)
 */
export function isAIConfigured(): boolean {
  return providers.some(p => p.isConfigured() && p.name !== 'fallback');
}
