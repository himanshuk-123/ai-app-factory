import 'dotenv/config';
import type { IStitchProvider } from './types.js';
import { StitchMCPProvider } from './stitch-mcp-provider.js';
import { MockStitchProvider } from './mock-provider.js';

export * from './types.js';
export * from './stitch-mcp-provider.js';
export * from './mock-provider.js';

export function getStitchProvider(): IStitchProvider {
  const apiKey = process.env.STITCH_API_KEY || process.env.GEMINI_API_KEY;
  if (apiKey && apiKey.trim().length > 0) {
    console.log('[Stitch Factory] API Key detected. Initializing StitchMCPProvider via @google/stitch-sdk.');
    return new StitchMCPProvider(apiKey.trim());
  }

  console.log('[Stitch Factory] API Key not found. Falling back to MockStitchProvider.');
  return new MockStitchProvider();
}
