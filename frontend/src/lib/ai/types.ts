/**
 * AI Analysis Types
 * Shared types for AI-powered accessibility barrier analysis
 */

import type { Category, Severity } from '../types';

/**
 * Result of AI analysis on an image or video
 */
export interface AnalysisResult {
  title: string;
  description: string;
  suggestedFix: string;
  category: Category;
  severity: Severity;
  confidence: number;
}

/**
 * Input for AI analysis
 */
export interface AnalysisInput {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}

/**
 * AI Provider interface - implement this for different AI backends
 */
export interface AIProvider {
  name: string;
  isConfigured(): boolean;
  analyze(input: AnalysisInput): Promise<AnalysisResult | null>;
}
