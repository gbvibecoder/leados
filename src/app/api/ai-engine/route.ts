import { NextResponse } from 'next/server';

/** Returns which AI engine is currently active based on environment config */
export async function GET() {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (anthropicKey) {
    return NextResponse.json({
      provider: 'anthropic',
      model: 'Claude Sonnet 4.6',
      status: 'active',
    });
  }

  if (geminiKey) {
    return NextResponse.json({
      provider: 'gemini',
      model: 'Gemini 2.0 Flash',
      status: 'active',
    });
  }

  return NextResponse.json({
    provider: 'none',
    model: 'No AI configured',
    status: 'inactive',
  });
}
