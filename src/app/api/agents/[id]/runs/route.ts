import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json([
    {
      id: 'run_demo_1',
      agentId: id,
      status: 'done',
      outputsJson: { success: true, data: { message: 'Completed with high confidence' }, reasoning: 'Analysis complete', confidence: 92 },
      startedAt: '2026-03-08T14:00:00Z',
      completedAt: '2026-03-08T14:02:30Z',
    },
    {
      id: 'run_demo_2',
      agentId: id,
      status: 'done',
      outputsJson: { success: true, data: { message: 'Completed successfully' }, reasoning: 'All inputs validated', confidence: 88 },
      startedAt: '2026-03-07T10:00:00Z',
      completedAt: '2026-03-07T10:01:45Z',
    },
  ]);
}
