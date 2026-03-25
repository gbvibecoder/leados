import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  // Optional project filter via query param
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');

  // First, check database for real agent runs
  try {
    const pipelineWhere: any = { userId: userId ?? 'no-user' };
    if (projectId) {
      pipelineWhere.projectId = projectId;
    }

    const dbRuns = await prisma.agentRun.findMany({
      where: { agentId: id, pipeline: pipelineWhere },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (dbRuns.length > 0) {
      const runs = dbRuns.map((run: any) => ({
        id: run.id,
        agentId: run.agentId,
        agentName: run.agentName,
        status: run.status,
        outputsJson: run.outputsJson ? JSON.parse(run.outputsJson) : null,
        error: run.error,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
        createdAt: run.createdAt,
      }));
      return NextResponse.json(runs);
    }
  } catch {
    // Database not available
  }

  // No runs found — return empty array (no fake/demo data)
  return NextResponse.json([]);
}

/** DELETE /api/agents/[id]/runs — Clear all run history for this agent */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  try {
    await prisma.agentRun.deleteMany({
      where: { agentId: id, pipeline: { userId: userId ?? 'no-user' } },
    });
    return NextResponse.json({ success: true, message: `Cleared runs for ${id}` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
