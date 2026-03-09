import { NextResponse } from 'next/server';
import { fetchRealTrends } from '@/lib/real-trends';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const focus = searchParams.get('focus') || 'B2B services';
    const region = searchParams.get('region') || 'US';
    const refresh = searchParams.get('refresh') === 'true';

    const data = await fetchRealTrends(focus, region, refresh);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error('Trend API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch trends',
      },
      { status: 500 }
    );
  }
}
