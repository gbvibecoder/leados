import { NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * POST /api/agents/paid-traffic/generate-image
 *
 * Generates an AI ad image using Pollinations.ai (free, no API key needed).
 * Returns a URL to the generated image.
 *
 * Body: { prompt: string, width?: number, height?: number }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { prompt, width = 1024, height = 1024 } = body;

  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
  }

  // Pollinations.ai generates images via URL — no API key needed
  const encodedPrompt = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 100000);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

  // Verify the image is accessible by making a HEAD request
  try {
    const check = await fetch(imageUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(30_000),
    });
    if (!check.ok) {
      return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
    }
  } catch {
    // Pollinations may not support HEAD — return URL anyway
  }

  return NextResponse.json({ imageUrl, prompt });
}
