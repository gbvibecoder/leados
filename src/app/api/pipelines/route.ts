import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  // Verify project exists if provided
  if (body.projectId) {
    const project = await prisma.project.findUnique({ where: { id: body.projectId } });
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found. Please select a valid project.' },
        { status: 404 }
      );
    }
  }

  const pipeline = await prisma.pipeline.create({
    data: {
      type: body.type || 'leados',
      status: 'idle',
      config: JSON.stringify(body.config || {}),
      projectId: body.projectId || null,
    },
  });

  return NextResponse.json({
    id: pipeline.id,
    type: pipeline.type,
    status: pipeline.status,
    config: body.config || {},
    currentAgentIndex: pipeline.currentAgentIndex,
    createdAt: pipeline.createdAt,
    updatedAt: pipeline.updatedAt,
    agentRuns: [],
  });
}

export async function GET() {
  const pipelines = await prisma.pipeline.findMany({
    include: { agentRuns: { orderBy: { createdAt: 'asc' } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  if (pipelines.length === 0) {
    // Return a demo pipeline if none exist
    return NextResponse.json([
      { id: 'pipe_demo_1', type: 'leados', status: 'idle', config: {}, currentAgentIndex: 0, createdAt: new Date().toISOString(), agentRuns: [] },
    ]);
  }

  return NextResponse.json(pipelines.map(p => ({
    id: p.id,
    type: p.type,
    status: p.status,
    config: p.config ? JSON.parse(p.config) : {},
    currentAgentIndex: p.currentAgentIndex,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    agentRuns: p.agentRuns.map(r => ({
      id: r.id,
      agentId: r.agentId,
      agentName: r.agentName,
      status: r.status,
      outputsJson: r.outputsJson ? JSON.parse(r.outputsJson) : null,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
    })),
  })));
}
