import { NextResponse } from 'next/server';

const mockPipelines: any[] = [];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pipeline = {
      id: `pipe_${Date.now()}`,
      type: 'leados',
      status: 'idle',
      config: body.config || {},
      currentAgentIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agentRuns: [],
    };
    mockPipelines.push(pipeline);
    return NextResponse.json(pipeline);
  } catch {
    return NextResponse.json({ id: `pipe_${Date.now()}`, type: 'leados', status: 'idle', config: {}, currentAgentIndex: 0, createdAt: new Date().toISOString(), agentRuns: [] });
  }
}

export async function GET() {
  if (mockPipelines.length > 0) return NextResponse.json(mockPipelines);
  return NextResponse.json([
    { id: 'pipe_demo_1', type: 'leados', status: 'completed', config: {}, currentAgentIndex: 13, createdAt: '2026-03-08T10:00:00Z', agentRuns: [] },
  ]);
}
