import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** POST /api/pipelines/[id]/pause-agents — Pause pipeline + mark all 'running' agent runs as 'idle' atomically */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id, userId: userId ?? 'no-user' },
    });
    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    // Atomically pause pipeline AND mark running agents as idle
    const [pipelineUpdate, agentUpdate] = await prisma.$transaction([
      prisma.pipeline.update({
        where: { id },
        data: { status: 'paused' },
      }),
      prisma.agentRun.updateMany({
        where: { pipelineId: id, status: 'running' },
        data: { status: 'idle' },
      }),
    ]);

    return NextResponse.json({ success: true, updated: agentUpdate.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
