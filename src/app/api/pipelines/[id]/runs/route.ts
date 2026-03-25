import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** DELETE /api/pipelines/[id]/runs — Clear all agent runs for a specific pipeline */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  try {
    // Verify the pipeline belongs to this user
    const pipeline = await prisma.pipeline.findFirst({
      where: { id, userId: userId ?? 'no-user' },
    });
    if (!pipeline) {
      return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
    }

    // Delete all agent runs for this pipeline only
    const result = await prisma.agentRun.deleteMany({
      where: { pipelineId: id },
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
