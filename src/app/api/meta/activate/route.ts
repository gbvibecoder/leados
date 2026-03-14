import { NextRequest, NextResponse } from 'next/server';
import { activateCampaign, saveCampaignIds } from '@/lib/meta-api';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { campaign_id, adset_id, ad_id, creative_id } = body as {
    campaign_id: string;
    adset_id: string;
    ad_id: string;
    creative_id?: string;
  };

  if (!campaign_id || !adset_id || !ad_id) {
    return NextResponse.json(
      { success: false, error: 'campaign_id, adset_id, and ad_id are required' },
      { status: 400 }
    );
  }

  const result = await activateCampaign({ campaign_id, adset_id, ad_id });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: 400 }
    );
  }

  // Save IDs to disk
  try {
    await saveCampaignIds({
      campaign_id,
      adset_id,
      creative_id: creative_id || '',
      ad_id,
    });
  } catch (err) {
    console.error('Failed to save campaign IDs:', err);
  }

  return NextResponse.json({
    success: true,
    data: { activated: result.data },
  });
}
