import { NextRequest, NextResponse } from 'next/server';
import { updateAdSet } from '@/lib/meta-api';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { adset_id, ...updates } = body;

  if (!adset_id) {
    return NextResponse.json(
      { success: false, error: 'adset_id is required' },
      { status: 400 }
    );
  }

  const result = await updateAdSet(adset_id, updates);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, code: result.code },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data: { updated: true } });
}
