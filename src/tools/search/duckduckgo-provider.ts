import type { IWebSearchProvider, SearchResultItem } from './types.js';

export class DuckDuckGoSearchProvider implements IWebSearchProvider {
  name = 'DuckDuckGoSearchProvider';

  async search(query: string, limit: number = 8): Promise<SearchResultItem[]> {
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;

    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const results: SearchResultItem[] = [];
      const blocks = html.split('<div class="result ');

      for (const block of blocks.slice(1)) {
        const urlMatch =
          block.match(/href="([^"]*uddg=[^"]*)"/) || block.match(/class="result__a"[^>]*href="([^"]+)"/);
        const titleMatch = block.match(/class="result__a"[^>]*>(.*?)<\/a>/s);
        const snippetMatch = block.match(/class="result__snippet"[^>]*>(.*?)<\/a>/s);

        if (urlMatch && titleMatch) {
          let rawUrl = urlMatch[1];
          if (rawUrl.includes('uddg=')) {
            const u = rawUrl.match(/uddg=([^&]+)/);
            if (u) rawUrl = decodeURIComponent(u[1]);
          }

          const title = titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
          const snippet = snippetMatch
            ? snippetMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
            : '';

          if (rawUrl.startsWith('http') && title) {
            results.push({ title, url: rawUrl, snippet });
          }
        }

        if (results.length >= limit) break;
      }

      return results;
    } catch (error) {
      console.warn(`[DuckDuckGoSearchProvider] Search query failed: ${(error as Error).message}`);
      return [];
    }
  }
}
