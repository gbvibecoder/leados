import { NextResponse } from 'next/server';

export const maxDuration = 60;

/**
 * POST /api/ads/generate-image
 *
 * Generates an AI ad image using Fal.ai API (FLUX model).
 * Body: { prompt: string, width?: number, height?: number, style?: string }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { prompt, width = 1080, height = 1080, style = 'photorealistic' } = body;

  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
  }

  const apiKey = process.env.FAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'FAL_API_KEY not configured' }, { status: 500 });
  }

  // Enhance prompt for ad-quality output — append style suffix only if not already detailed
  const isDetailedPrompt = prompt.length > 200;
  const enhancedPrompt = isDetailedPrompt
    ? `${prompt}. ${style} style, 4K resolution, studio lighting.`
    : `${prompt}, ${style} style, high quality, professional marketing material, sharp details, vibrant colors, 4K resolution`;

  try {
    // Use fal-ai/flux/dev for high-quality image generation
    const submitRes = await fetch('https://queue.fal.run/fal-ai/flux/dev', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        image_size: { width, height },
        num_images: 1,
        enable_safety_checker: true,
        num_inference_steps: 30,
        guidance_scale: 3.5,
      }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => 'Unknown error');
      console.error('[Fal] Submit error:', submitRes.status, errText);
      return NextResponse.json({ error: `Fal API error: ${submitRes.status}` }, { status: 502 });
    }

    const result = await submitRes.json();

    // Fal returns images array
    const imageUrl = result?.images?.[0]?.url;
    if (!imageUrl) {
      console.error('[Fal] No image in response:', JSON.stringify(result).slice(0, 500));
      return NextResponse.json({ error: 'No image generated' }, { status: 500 });
    }

    return NextResponse.json({ imageUrl, prompt: enhancedPrompt });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[Fal] Generation failed:', message);
    return NextResponse.json({ error: `Image generation failed: ${message}` }, { status: 500 });
  }
}
