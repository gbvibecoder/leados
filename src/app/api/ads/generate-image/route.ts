import { NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * POST /api/ads/generate-image
 *
 * Generates a complete ad creative image with text, CTA, and product mockup.
 * Uses FAL recraft-v3 (best text rendering) → DALL-E 3 fallback → FLUX fallback.
 *
 * Body: { prompt, width?, height?, style?,
 *         headline?, description?, cta?, brand?, domain? }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const {
    prompt,
    width = 1080, height = 1080,
    style = 'digital_illustration',
    // Ad creative text fields — baked into the image
    headline, description, cta, brand, domain,
  } = body;

  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
  }

  // If ad text fields are provided, build a complete ad creative prompt
  // that includes text baked into the image
  const fullPrompt = headline
    ? buildAdCreativePrompt({ prompt, headline, description, cta, brand, domain })
    : prompt;

  // Try recraft-v3 first (best text rendering for ad creatives)
  const falKey = process.env.FAL_API_KEY;
  if (falKey) {
    try {
      const url = await generateWithRecraft(fullPrompt, falKey, style);
      if (url) {
        return NextResponse.json({ imageUrl: url, provider: 'recraft-v3', prompt: fullPrompt });
      }
    } catch (err) {
      console.error('[recraft-v3] Failed, trying DALL-E:', err instanceof Error ? err.message : err);
    }
  }

  // Try DALL-E 3 fallback
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const url = await generateWithDallE(fullPrompt, openaiKey);
      if (url) {
        return NextResponse.json({ imageUrl: url, provider: 'dall-e-3', prompt: fullPrompt });
      }
    } catch (err) {
      console.error('[DALL-E 3] Failed, trying FLUX:', err instanceof Error ? err.message : err);
    }
  }

  // FLUX fallback (worst text rendering but always available)
  if (falKey) {
    try {
      const url = await generateWithFlux(fullPrompt, falKey, width, height);
      if (url) {
        return NextResponse.json({ imageUrl: url, provider: 'flux', prompt: fullPrompt });
      }
    } catch (err) {
      console.error('[FLUX] Failed:', err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ error: 'No image generation API available' }, { status: 500 });
}

// ── Build ad creative prompt with text baked in ─────────────────────────────

function buildAdCreativePrompt(params: {
  prompt: string;
  headline?: string;
  description?: string;
  cta?: string;
  brand?: string;
  domain?: string;
}): string {
  const { prompt, headline, description, cta, brand, domain } = params;

  // recraft-v3 has a 1000 char limit — keep prompt concise
  const parts = [
    `Professional ad creative, square format. Dark navy gradient background.`,
    `Clean sans-serif typography (Helvetica/Montserrat), all text sharp and readable.`,
  ];

  if (headline) {
    // Trim headline to keep prompt under limit
    const shortHeadline = headline.length > 60 ? headline.slice(0, 60).replace(/\s+\S*$/, '') + '.' : headline;
    parts.push(`TOP: Bold white headline: "${shortHeadline}". Key words in orange.`);
  }

  parts.push(prompt);

  if (description) {
    const shortDesc = description.length > 60 ? description.slice(0, 60).replace(/\s+\S*$/, '') + '.' : description;
    parts.push(`Below visual, white text: "${shortDesc}".`);
  }

  if (cta) {
    parts.push(`Bottom: Orange pill button, white bold text: "${cta}".`);
  }

  if (brand) {
    parts.push(`Footer: Small white text "${brand}${domain ? ' ' + domain : ''}".`);
  }

  parts.push(`Style: Premium SaaS ad, dark tech aesthetic, orange accents, clean layout, photorealistic mockup.`);

  // Enforce 1000 char limit
  let result = parts.join(' ');
  if (result.length > 990) {
    result = result.slice(0, 990);
  }
  return result;
}

// ── Recraft v3 — best for ad creatives with text ────────────────────────────

async function generateWithRecraft(
  prompt: string, apiKey: string, style: string,
): Promise<string | null> {
  const res = await fetch('https://fal.run/fal-ai/recraft-v3', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: { width: 1024, height: 1024 },
      style: style || 'digital_illustration',
    }),
    signal: AbortSignal.timeout(55_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => 'Unknown');
    console.error('[recraft-v3] API error:', res.status, errText);
    return null;
  }

  const data = await res.json();
  return data?.images?.[0]?.url || null;
}

// ── DALL-E 3 ────────────────────────────────────────────────────────────────

async function generateWithDallE(prompt: string, apiKey: string): Promise<string | null> {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
      style: 'vivid',
    }),
    signal: AbortSignal.timeout(55_000),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.data?.[0]?.url || null;
}

// ── FLUX fallback ───────────────────────────────────────────────────────────

async function generateWithFlux(
  prompt: string, apiKey: string, width: number, height: number,
): Promise<string | null> {
  const res = await fetch('https://fal.run/fal-ai/flux/dev', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: { width, height },
      num_images: 1,
      enable_safety_checker: true,
      num_inference_steps: 28,
      guidance_scale: 3.5,
    }),
    signal: AbortSignal.timeout(55_000),
  });

  if (!res.ok) return null;
  const result = await res.json();
  return result?.images?.[0]?.url || null;
}
