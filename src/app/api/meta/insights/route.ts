import { NextRequest, NextResponse } from 'next/server';
import { getInsights } from '@/lib/meta-api';

export async function GET(req: NextRequest) {
  const campaignId = req.nextUrl.searchParams.get('campaign_id');

  if (!campaignId) {
    return NextResponse.json(
      { success: false, error: 'campaign_id query parameter is required' },
      { status: 400 }
    );
  }

  const result = await getInsights(campaignId);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { insights: result.data },
  });
}
