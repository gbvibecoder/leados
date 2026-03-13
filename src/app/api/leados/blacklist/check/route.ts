import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Check if a company or domain is blacklisted.
 * POST body: { company?: string, domain?: string }
 * Returns: { blacklisted: boolean, match?: { companyName, domain, reason } }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const company = (body.company || '').toLowerCase().trim();
  const domain = (body.domain || '').toLowerCase().trim();

  if (!company && !domain) {
    return NextResponse.json({ blacklisted: false });
  }

  const entries = await prisma.blacklist.findMany();

  for (const entry of entries) {
    const entryCompany = entry.companyName.toLowerCase();
    const entryDomain = entry.domain?.toLowerCase() || '';

    if (company && company.includes(entryCompany)) {
      return NextResponse.json({ blacklisted: true, match: entry });
    }
    if (entryDomain && domain && domain.includes(entryDomain)) {
      return NextResponse.json({ blacklisted: true, match: entry });
    }
  }

  return NextResponse.json({ blacklisted: false });
}
