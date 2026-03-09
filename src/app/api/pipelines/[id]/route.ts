import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    id,
    type: 'leados',
    status: 'idle',
    config: {},
    currentAgentIndex: 0,
    createdAt: new Date().toISOString(),
    agentRuns: [],
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ deleted: true, id });
}
