import { NextRequest, NextResponse } from 'next/server';
import { createAd } from '@/lib/meta-api';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { adset_id, creative_id } = body as {
    adset_id: string;
    creative_id: string;
  };

  if (!adset_id || !creative_id) {
    return NextResponse.json(
      { success: false, error: 'adset_id and creative_id are required' },
      { status: 400 }
    );
  }

  const result = await createAd({ adset_id, creative_id });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { ad_id: result.data?.id },
  });
}
