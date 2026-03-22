import { NextRequest, NextResponse } from 'next/server';
import { createAdSet } from '@/lib/meta-api';
import type { CampaignObjective } from '@/types/meta';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    campaign_id, daily_budget, age_min, age_max, country, objective,
    gender, placements, interests, billing_event, schedule_start, schedule_end, cities,
  } = body;

  if (!campaign_id || !daily_budget || !objective) {
    return NextResponse.json(
      { success: false, error: 'campaign_id, daily_budget, and objective are required' },
      { status: 400 }
    );
  }

  const result = await createAdSet({
    campaign_id,
    daily_budget,
    age_min: age_min || 18,
    age_max: age_max || 65,
    country: country || 'IN',
    objective: objective as CampaignObjective,
    gender: gender ?? 0,
    placements: placements || [],
    interests: interests || '',
    billing_event: billing_event || 'IMPRESSIONS',
    schedule_start: schedule_start || '',
    schedule_end: schedule_end || '',
    cities: cities || [],
  });

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: 400 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { adset_id: result.data?.id },
  });
}
