import { NextRequest, NextResponse } from 'next/server';
import { createAdCreative } from '@/lib/meta-api';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, link, cta_type, image_url } = body as {
    message: string;
    link: string;
    cta_type: string;
    image_url?: string;
  };

  if (!message || !link || !cta_type) {
    return NextResponse.json(
      { success: false, error: 'message, link, and cta_type are required' },
      { status: 400 }
    );
  }

  console.log(`[META /api/meta/creative] Creating creative:`, {
    messageLength: message.length,
    link: link.slice(0, 60),
    cta_type,
    hasImage: !!image_url,
    imageUrl: image_url ? image_url.slice(0, 100) : '(none)',
  });

  const result = await createAdCreative({ message, link, cta_type, image_url });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { creative_id: result.data?.id },
  });
}
