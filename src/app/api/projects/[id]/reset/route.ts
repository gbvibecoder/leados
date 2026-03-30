import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** POST /api/projects/[id]/reset — Delete all agent data for a project (pipelines, runs, leads, campaigns, creative assets) */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  try {
    // Verify ownership
    const project = await prisma.project.findFirst({
      where: { id, userId: userId ?? 'no-user' },
    });
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Find all pipelines for this project
    const pipelines = await prisma.pipeline.findMany({
      where: { projectId: id },
      select: { id: true },
    });
    const pipelineIds = pipelines.map(p => p.id);

    // Delete agent runs (child of pipelines)
    if (pipelineIds.length > 0) {
      await prisma.agentRun.deleteMany({ where: { pipelineId: { in: pipelineIds } } });
    }

    // Delete campaigns linked to these pipelines
    if (pipelineIds.length > 0) {
      await prisma.campaign.deleteMany({ where: { pipelineId: { in: pipelineIds } } });
    }

    // Delete creative assets linked to these pipelines
    if (pipelineIds.length > 0) {
      await prisma.creativeAsset.deleteMany({ where: { pipelineId: { in: pipelineIds } } });
    }

    // Delete all pipelines for this project
    if (pipelineIds.length > 0) {
      await prisma.pipeline.deleteMany({ where: { projectId: id } });
    }

    // Reset lead stages back to 'new' instead of deleting them.
    // Leads are user data and should NOT be deleted on pipeline reset.
    await prisma.lead.updateMany({
      where: { projectId: id },
      data: {
        stage: 'new',
        qualificationScore: null,
        qualificationOutcome: null,
        routingDecision: null,
      },
    });

    return NextResponse.json({ success: true, deletedPipelines: pipelineIds.length });
  } catch (error: any) {
    console.error('POST /api/projects/[id]/reset error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
