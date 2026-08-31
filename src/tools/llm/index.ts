import 'dotenv/config';
import type { ILLMProvider } from './types.js';
import { MockLLMProvider } from './mock-provider.js';
import { GeminiLLMProvider } from './gemini-provider.js';

export * from './types.js';
export * from './mock-provider.js';
export * from './gemini-provider.js';

export function getLLMProvider(): ILLMProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim().length > 0) {
    console.log('[LLM Factory] GEMINI_API_KEY detected. Initializing GeminiLLMProvider.');
    return new GeminiLLMProvider(apiKey.trim());
  }

  console.log('[LLM Factory] GEMINI_API_KEY not found. Falling back to MockLLMProvider.');
  return new MockLLMProvider();
}
