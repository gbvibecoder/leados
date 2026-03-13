import { prisma } from '@/lib/prisma';

export interface BlacklistMatch {
  blacklisted: boolean;
  match?: { companyName: string; domain?: string | null; reason?: string | null };
}

/**
 * Check if a company or domain is blacklisted (server-side, direct DB).
 */
export async function isBlacklisted(company?: string, domain?: string): Promise<BlacklistMatch> {
  const companyLower = (company || '').toLowerCase().trim();
  const domainLower = (domain || '').toLowerCase().trim();

  if (!companyLower && !domainLower) return { blacklisted: false };

  const entries = await prisma.blacklist.findMany();

  for (const entry of entries) {
    const entryCompany = entry.companyName.toLowerCase();
    const entryDomain = entry.domain?.toLowerCase() || '';

    if (companyLower && companyLower.includes(entryCompany)) {
      return { blacklisted: true, match: entry };
    }
    if (entryDomain && domainLower && domainLower.includes(entryDomain)) {
      return { blacklisted: true, match: entry };
    }
  }

  return { blacklisted: false };
}

/**
 * Filter an array of prospects/leads, removing blacklisted ones.
 * Returns { allowed: T[], blocked: T[] }
 */
export async function filterBlacklisted<T extends { company?: string; email?: string }>(
  items: T[]
): Promise<{ allowed: T[]; blocked: T[] }> {
  if (items.length === 0) return { allowed: [], blocked: [] };

  const entries = await prisma.blacklist.findMany();
  if (entries.length === 0) return { allowed: items, blocked: [] };

  const allowed: T[] = [];
  const blocked: T[] = [];

  for (const item of items) {
    const companyLower = (item.company || '').toLowerCase();
    const domain = item.email?.split('@')[1]?.toLowerCase() || '';

    let isBlocked = false;
    for (const entry of entries) {
      const entryCompany = entry.companyName.toLowerCase();
      const entryDomain = entry.domain?.toLowerCase() || '';

      if (companyLower && companyLower.includes(entryCompany)) {
        isBlocked = true;
        break;
      }
      if (entryDomain && domain && domain.includes(entryDomain)) {
        isBlocked = true;
        break;
      }
    }

    if (isBlocked) blocked.push(item);
    else allowed.push(item);
  }

  return { allowed, blocked };
}
