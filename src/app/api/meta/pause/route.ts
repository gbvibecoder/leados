import { NextRequest, NextResponse } from 'next/server';
import { pauseCampaignResources } from '@/lib/meta-api';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { campaign_id, adset_id, ad_id } = body;

  if (!campaign_id) {
    return NextResponse.json(
      { success: false, error: 'campaign_id is required' },
      { status: 400 }
    );
  }

  const result = await pauseCampaignResources({ campaign_id, adset_id, ad_id });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data: result.data });
}
