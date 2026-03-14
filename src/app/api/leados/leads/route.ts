import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export async function GET(req: Request) {
  const userId = getUserId(req);
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');
  const source = searchParams.get('source');
  const minScore = searchParams.get('minScore');
  const search = searchParams.get('search');
  const projectId = searchParams.get('projectId');

  const where: Record<string, any> = {};
  if (userId) where.userId = userId;
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
  const userId = getUserId(req);
  const body = await req.json();

  const { name, email, company, phone, source, channel, score, stage, segment, notes, projectId: leadProjectId } = body;

  if (!name || !source) {
    return NextResponse.json({ error: 'Name and source are required' }, { status: 400 });
  }

  // Check if company or email domain is blacklisted
  let isBlacklistedCompany = false;
  let blacklistReason = '';
  try {
    const blacklistEntries = await prisma.blacklist.findMany();
    const companyLower = (company || '').toLowerCase();
    const emailDomain = email?.split('@')[1]?.toLowerCase() || '';

    for (const entry of blacklistEntries) {
      const entryCompany = entry.companyName.toLowerCase();
      const entryDomain = entry.domain?.toLowerCase() || '';

      if (companyLower && companyLower.includes(entryCompany)) {
        isBlacklistedCompany = true;
        blacklistReason = `Company "${entry.companyName}" is blacklisted${entry.reason ? `: ${entry.reason}` : ''}`;
        break;
      }
      if (entryDomain && emailDomain && emailDomain.includes(entryDomain)) {
        isBlacklistedCompany = true;
        blacklistReason = `Domain "${entry.domain}" is blacklisted${entry.reason ? `: ${entry.reason}` : ''}`;
        break;
      }
    }
  } catch { /* continue if blacklist check fails */ }

  // If blacklisted, still create but flag with notes
  const lead = await prisma.lead.create({
    data: {
      name,
      email: email || null,
      company: company || null,
      phone: phone || null,
      source,
      channel: channel || source,
      score: isBlacklistedCompany ? 0 : (score || 0),
      stage: isBlacklistedCompany ? 'lost' : (stage || 'new'),
      segment: segment || null,
      notes: isBlacklistedCompany
        ? `[BLACKLISTED] ${blacklistReason}${notes ? ` | ${notes}` : ''}`
        : (notes || null),
      projectId: leadProjectId || null,
      ...(userId && { userId }),
    },
  });

  return NextResponse.json({ ...lead, blacklisted: isBlacklistedCompany }, { status: 201 });
}
