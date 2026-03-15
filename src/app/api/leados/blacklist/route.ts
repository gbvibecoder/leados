import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export async function GET(req: Request) {
  const userId = getUserId(req);

  const entries = await prisma.blacklist.findMany({
    where: { userId: userId ?? 'no-user' },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const userId = getUserId(req);
  const body = await req.json().catch(() => ({}));

  if (!body.companyName?.trim()) {
    return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
  }

  const entry = await prisma.blacklist.create({
    data: {
      companyName: body.companyName.trim(),
      domain: body.domain?.trim() || null,
      reason: body.reason?.trim() || null,
      userId: userId ?? 'no-user',
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: Request) {
  const userId = getUserId(req);
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    const existing = await prisma.blacklist.findFirst({ where: { id, userId: userId ?? 'no-user' } });
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }
    await prisma.blacklist.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  }
}
