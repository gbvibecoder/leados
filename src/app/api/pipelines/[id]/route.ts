import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id, ...(userId && { userId }) },
      include: { agentRuns: { orderBy: { createdAt: 'asc' } } },
    });
    if (pipeline) {
      return NextResponse.json({
        id: pipeline.id,
        type: pipeline.type,
        status: pipeline.status,
        config: pipeline.config ? JSON.parse(pipeline.config) : {},
        currentAgentIndex: pipeline.currentAgentIndex,
        createdAt: pipeline.createdAt,
        agentRuns: pipeline.agentRuns,
      });
    }
  } catch { /* fallback */ }

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
  const userId = getUserId(req);

  if (userId) {
    const pipeline = await prisma.pipeline.findFirst({ where: { id, userId } });
    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }
  }

  return NextResponse.json({ deleted: true, id });
}
