import { NextResponse } from 'next/server';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const mockOutput = {
    success: true,
    data: { message: `Agent ${id} executed successfully`, results: [] },
    reasoning: 'Agent completed analysis based on provided inputs.',
    confidence: 85,
  };

  const run = {
    id: `run_${Date.now()}`,
    agentId: id,
    agentName: id.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    status: 'done',
    inputsJson: {},
    outputsJson: mockOutput,
    startedAt: new Date(Date.now() - 5000).toISOString(),
    completedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(run);
}
