/**
 * Shared utility for scraping product/service information from a URL.
 * Used by multiple agents (Content Creative, Paid Traffic, etc.) to generate
 * accurate, product-specific output instead of generic niche content.
 */

export interface ProductContext {
  title: string;
  description: string;
  keywords: string[];
  headings: string[];
  bodySnippet: string;
  url: string;
}

/**
 * Scrapes a URL and extracts structured product/service information:
 * - Page title
 * - Meta description
 * - Meta keywords
 * - H1/H2 headings (up to 8)
 * - Body text snippet (first 2000 chars, cleaned)
 */
/** Decode HTML entities like &#8211; &amp; &ndash; etc. */
function decodeHtmlEntities(text: string): string {
  return text
    // Numeric entities: &#8211; &#x2013;
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    // Named entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&hellip;/g, '…')
    .replace(/&trade;/g, '™')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®')
    // Catch remaining named entities — replace with space
    .replace(/&[a-zA-Z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function scrapeProductContext(url: string): Promise<ProductContext | null> {
  if (!url || !url.startsWith('http')) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadOS/1.0)' },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? decodeHtmlEntities(titleMatch[1]) : '';

    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i)
      || html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i);
    const description = descMatch ? decodeHtmlEntities(descMatch[1]) : '';

    // Extract OG description as fallback
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i);
    const ogDescription = ogDescMatch ? decodeHtmlEntities(ogDescMatch[1]) : '';

    // Extract meta keywords
    const kwMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([\s\S]*?)["']/i);
    const keywords = kwMatch ? decodeHtmlEntities(kwMatch[1]).split(',').map((k: string) => k.trim()).filter(Boolean) : [];

    // Extract headings (h1, h2, h3)
    const headings: string[] = [];
    const headingRegex = /<h[123][^>]*>([\s\S]*?)<\/h[123]>/gi;
    let hMatch;
    while ((hMatch = headingRegex.exec(html)) !== null && headings.length < 10) {
      const text = decodeHtmlEntities(hMatch[1].replace(/<[^>]+>/g, ''));
      if (text && text.length > 3 && text.length < 200) headings.push(text);
    }

    // Extract visible body text (strip scripts, styles, nav, footer, tags)
    const bodyText = decodeHtmlEntities(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<header[\s\S]*?<\/header>/gi, '')
        .replace(/<[^>]+>/g, ' ')
    );
    const bodySnippet = bodyText.substring(0, 2000);

    return {
      title,
      description: description || ogDescription,
      keywords,
      headings,
      bodySnippet,
      url,
    };
  } catch (err: any) {
    console.error(`[scrape-url] Failed to scrape ${url}:`, err.message);
    return null;
  }
}

/**
 * Builds a concise product summary string from scraped context,
 * suitable for injecting into LLM prompts.
 */
export function buildProductSummary(ctx: ProductContext): string {
  const parts: string[] = [];
  if (ctx.title) parts.push(`Product/Service: ${ctx.title}`);
  if (ctx.description) parts.push(`Description: ${ctx.description}`);
  if (ctx.headings.length > 0) parts.push(`Key Features/Sections: ${ctx.headings.join(' | ')}`);
  if (ctx.keywords.length > 0) parts.push(`Keywords: ${ctx.keywords.join(', ')}`);
  if (ctx.bodySnippet) parts.push(`Website Content: ${ctx.bodySnippet}`);
  return parts.join('\n');
}
