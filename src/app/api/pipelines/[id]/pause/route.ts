import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  try {
    if (userId) {
      const pipeline = await prisma.pipeline.findFirst({ where: { id, userId } });
      if (!pipeline) {
        return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
      }
    }
    await prisma.pipeline.update({
      where: { id },
      data: { status: 'paused' },
    });
  } catch {
    // Pipeline may not exist in DB yet — still acknowledge
  }

  return NextResponse.json({ id, status: 'paused', message: 'Pipeline paused' });
}
