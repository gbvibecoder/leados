import { NextRequest, NextResponse } from 'next/server';
import { createCampaign } from '@/lib/meta-api';
import type { CampaignObjective } from '@/types/meta';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, objective } = body as { name: string; objective: CampaignObjective };

  if (!name || !objective) {
    return NextResponse.json(
      { success: false, error: 'name and objective are required' },
      { status: 400 }
    );
  }

  const result = await createCampaign({ name, objective });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { campaign_id: result.data?.id },
  });
}
