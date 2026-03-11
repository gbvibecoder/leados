import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');
  const source = searchParams.get('source');
  const minScore = searchParams.get('minScore');
  const search = searchParams.get('search');
  const projectId = searchParams.get('projectId');

  const where: Record<string, any> = {};
  if (stage) where.stage = stage;
  if (source) where.source = source;
  if (projectId) where.projectId = projectId;
  if (minScore) where.score = { gte: parseInt(minScore) };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
      { company: { contains: search } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where,
    include: { interactions: { orderBy: { timestamp: 'desc' } } },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(leads);
}

export async function POST(req: Request) {
  const body = await req.json();

  const { name, email, company, phone, source, channel, score, stage, segment, notes, projectId: leadProjectId } = body;

  if (!name || !source) {
    return NextResponse.json({ error: 'Name and source are required' }, { status: 400 });
  }

  const lead = await prisma.lead.create({
    data: {
      name,
      email: email || null,
      company: company || null,
      phone: phone || null,
      source,
      channel: channel || source,
      score: score || 0,
      stage: stage || 'new',
      segment: segment || null,
      notes: notes || null,
      projectId: leadProjectId || null,
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
