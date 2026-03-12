import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await prisma.pipeline.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  } catch {
    // Pipeline may not exist in DB — still acknowledge
  }

  return NextResponse.json({ id, status: 'cancelled', message: 'Pipeline cancelled' });
}
