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

  const conditions: Record<string, any>[] = [{ userId: userId ?? 'no-user' }];
  if (stage) conditions.push({ stage });
  if (source) conditions.push({ source });
  if (projectId) {
    // Show leads for this project AND unassigned leads (e.g. from funnel forms)
    conditions.push({ OR: [{ projectId }, { projectId: null }] });
  }
  if (minScore) conditions.push({ score: { gte: parseInt(minScore) } });
  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
      ],
    });
  }
  const where = { AND: conditions };

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
      score: isBlacklistedCompany ? 0 : (score || calculateManualLeadScore({ email, company, phone, source, segment })),
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

export async function PATCH(req: Request) {
  const body = await req.json();
  const { fromStage, toStage } = body;

  if (!fromStage || !toStage) {
    return NextResponse.json({ error: 'fromStage and toStage are required' }, { status: 400 });
  }

  const result = await prisma.lead.updateMany({
    where: { stage: fromStage },
    data: { stage: toStage },
  });

  return NextResponse.json({ updated: result.count });
}

/** Score manually added leads based on data completeness and quality signals */
function calculateManualLeadScore(fields: {
  email?: string; company?: string; phone?: string; source?: string; segment?: string;
}): number {
  let score = 15; // base score for manual entry

  // Data completeness — more info = higher quality lead
  if (fields.email) score += 10;
  if (fields.company) score += 10;
  if (fields.phone) score += 15; // shared phone = high intent

  // Source scoring — higher-intent sources score more
  const sourceScores: Record<string, number> = {
    referral: 25,
    organic: 15,
    webinar: 15,
    linkedin: 12,
    google_ads: 10,
    meta_ads: 8,
    cold_email: 5,
  };
  if (fields.source && sourceScores[fields.source]) score += sourceScores[fields.source];

  // Segment scoring — enterprise leads are more valuable
  const segmentScores: Record<string, number> = {
    enterprise: 15,
    mid_market: 10,
    smb: 5,
  };
  if (fields.segment && segmentScores[fields.segment]) score += segmentScores[fields.segment];

  return Math.min(score, 100);
}
