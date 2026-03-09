import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    cpl: 24.50,
    cac: 127.80,
    conversionRate: 3.4,
    totalLeads: 1247,
    qualifiedLeads: 312,
    revenue: 48750,
    channelBreakdown: [
      { channel: 'Google Ads', leads: 423, spend: 8460, cpl: 20.0, conversion: 4.2 },
      { channel: 'Meta Ads', leads: 312, spend: 7800, cpl: 25.0, conversion: 3.1 },
      { channel: 'LinkedIn', leads: 187, spend: 5610, cpl: 30.0, conversion: 2.8 },
      { channel: 'Cold Email', leads: 215, spend: 2150, cpl: 10.0, conversion: 3.8 },
      { channel: 'Organic', leads: 110, spend: 0, cpl: 0, conversion: 5.5 },
    ],
    funnelData: [
      { stage: 'Visitors', count: 34500 },
      { stage: 'Leads', count: 1247 },
      { stage: 'Qualified', count: 312 },
      { stage: 'Booked', count: 156 },
      { stage: 'Won', count: 78 },
    ],
    trends: [
      { date: '2026-02-01', leads: 145, qualified: 32, revenue: 4200 },
      { date: '2026-02-08', leads: 168, qualified: 38, revenue: 5100 },
      { date: '2026-02-15', leads: 192, qualified: 45, revenue: 6300 },
      { date: '2026-02-22', leads: 178, qualified: 41, revenue: 5800 },
      { date: '2026-03-01', leads: 210, qualified: 52, revenue: 7400 },
      { date: '2026-03-08', leads: 234, qualified: 58, revenue: 8900 },
    ],
  });
}
