import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    id,
    name: 'Sarah Chen',
    email: 'sarah.chen@techventures.io',
    company: 'TechVentures Inc',
    score: 87,
    stage: 'qualified',
    interactions: [
      { id: '1', type: 'email_sent', content: 'Initial outreach — "Quick question about your growth"', timestamp: '2026-03-01T10:00:00Z' },
      { id: '2', type: 'email_opened', content: 'Email opened 3 times', timestamp: '2026-03-01T14:30:00Z' },
      { id: '3', type: 'form_submitted', content: 'Submitted contact form', timestamp: '2026-03-02T09:15:00Z' },
      { id: '4', type: 'ai_call', content: 'AI qualification call — 4m 32s — Score: 82/100', timestamp: '2026-03-02T11:00:00Z' },
      { id: '5', type: 'routed', content: 'Routed to sales calendar', timestamp: '2026-03-02T11:05:00Z' },
    ],
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  return NextResponse.json({ id, ...body, updatedAt: new Date().toISOString() });
}
