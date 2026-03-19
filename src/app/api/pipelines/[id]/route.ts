import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id, userId: userId ?? 'no-user' },
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

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);
  const body = await req.json().catch(() => ({}));

  try {
    const pipeline = await prisma.pipeline.findFirst({ where: { id, userId: userId ?? 'no-user' } });
    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }
    const updated = await prisma.pipeline.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.currentAgentIndex !== undefined && { currentAgentIndex: body.currentAgentIndex }),
      },
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch {
    return NextResponse.json({ error: 'Failed to update pipeline' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  const pipeline = await prisma.pipeline.findFirst({ where: { id, userId: userId ?? 'no-user' } });
  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id });
}
