import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  // Find lead by id — check ownership via userId or pipeline association
  let pipelineIds: string[] = [];
  if (userId) {
    const pipelines = await prisma.pipeline.findMany({ where: { userId }, select: { id: true } });
    pipelineIds = pipelines.map(p => p.id);
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id,
      OR: userId
        ? [{ userId }, ...(pipelineIds.length > 0 ? [{ pipelineId: { in: pipelineIds } }] : [])]
        : [{ userId: 'no-user' }],
    },
    include: { interactions: { orderBy: { timestamp: 'desc' } } },
  });

  if (!lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  }

  return NextResponse.json(lead);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);
  const body = await req.json();

  if (userId) {
    const existing = await prisma.lead.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
  }

  const lead = await prisma.lead.update({
    where: { id },
    data: body,
    include: { interactions: true },
  });

  return NextResponse.json(lead);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  if (userId) {
    const existing = await prisma.lead.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }
  }

  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
