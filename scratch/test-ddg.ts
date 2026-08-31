async function testDDG() {
  const query = encodeURIComponent('student expense tracking app competitors pricing complaints');
  const url = `https://html.duckduckgo.com/html/?q=${query}`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    const html = await res.text();
    
    const results: Array<{ title: string; url: string; snippet: string }> = [];
    const blocks = html.split('<div class="result ');
    for (const block of blocks.slice(1)) {
      const urlMatch = block.match(/href="([^"]*uddg=[^"]*)"/) || block.match(/class="result__a"[^>]*href="([^"]+)"/);
      const titleMatch = block.match(/class="result__a"[^>]*>(.*?)<\/a>/s);
      const snippetMatch = block.match(/class="result__snippet"[^>]*>(.*?)<\/a>/s);

      if (urlMatch && titleMatch) {
        let rawUrl = urlMatch[1];
        if (rawUrl.includes('uddg=')) {
          const u = rawUrl.match(/uddg=([^&]+)/);
          if (u) rawUrl = decodeURIComponent(u[1]);
        }
        const title = titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
        const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';

        if (rawUrl.startsWith('http') && title) {
          results.push({ title, url: rawUrl, snippet });
        }
      }
      if (results.length >= 6) break;
    }

    console.log('Extracted Results:', results.length);
    console.log(JSON.stringify(results, null, 2));
  } catch (err: any) {
    console.error('DDG test error:', err.message);
  }
}

testDDG();
