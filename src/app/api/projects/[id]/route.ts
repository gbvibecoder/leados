import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  try {
    const project = await prisma.project.findFirst({
      where: { id, ...(userId && { userId }) },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      status: project.status,
      config: project.config ? JSON.parse(project.config) : null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  } catch (error: any) {
    console.error('GET /api/projects/[id] error:', error.message);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  try {
    const body = await req.json().catch(() => ({}));
    const data: Record<string, any> = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.type !== undefined) data.type = body.type;
    if (body.status !== undefined) data.status = body.status;
    if (body.config !== undefined) data.config = JSON.stringify(body.config);

    // Verify ownership before updating
    if (userId) {
      const existing = await prisma.project.findFirst({ where: { id, userId } });
      if (!existing) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    const project = await prisma.project.update({ where: { id }, data });

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type,
      status: project.status,
      config: project.config ? JSON.parse(project.config) : null,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  } catch (error: any) {
    console.error('PATCH /api/projects/[id] error:', error.message);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  try {
    // Verify ownership before deleting
    if (userId) {
      const existing = await prisma.project.findFirst({ where: { id, userId } });
      if (!existing) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    // Delete related pipelines and their agent runs first
    const pipelines = await prisma.pipeline.findMany({ where: { projectId: id }, select: { id: true } });
    if (pipelines.length > 0) {
      const pipelineIds = pipelines.map(p => p.id);
      await prisma.agentRun.deleteMany({ where: { pipelineId: { in: pipelineIds } } });
      await prisma.pipeline.deleteMany({ where: { projectId: id } });
    }

    // Delete related leads
    await prisma.lead.deleteMany({ where: { projectId: id } });

    // Delete the project
    await prisma.project.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /api/projects/[id] error:', error.message);
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
