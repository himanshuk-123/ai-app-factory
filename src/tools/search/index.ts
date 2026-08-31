import type { IWebSearchProvider } from './types.js';
import { DuckDuckGoSearchProvider } from './duckduckgo-provider.js';

export * from './types.js';
export * from './duckduckgo-provider.js';

export function getWebSearchProvider(): IWebSearchProvider {
  return new DuckDuckGoSearchProvider();
}
