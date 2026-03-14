import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

export async function GET(req?: NextRequest) {
  const userId = getUserId(req || null);
  const period = req?.nextUrl?.searchParams?.get('period') || '30d';
  const projectId = req?.nextUrl?.searchParams?.get('projectId') || null;

  // Calculate date range based on period
  const now = new Date();
  const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
  const days = daysMap[period] || 30;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Build where clause
  const leadWhere: Record<string, any> = { createdAt: { gte: startDate } };
  if (userId) leadWhere.userId = userId;
  if (projectId) leadWhere.projectId = projectId;

  // Fetch leads within the period
  const leads = await prisma.lead.findMany({
    where: leadWhere,
    select: {
      id: true,
      source: true,
      stage: true,
      score: true,
      createdAt: true,
    },
  });

  // Fetch campaigns for spend data
  const campaigns = await prisma.campaign.findMany({
    where: { createdAt: { gte: startDate }, ...(userId && { userId }) },
    select: {
      channel: true,
      spend: true,
      metrics: true,
    },
  });

  // --- KPI calculations ---
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(l =>
    ['qualified', 'booked', 'won'].includes(l.stage)
  ).length;
  const bookedLeads = leads.filter(l => ['booked', 'won'].includes(l.stage)).length;
  const wonLeads = leads.filter(l => l.stage === 'won').length;

  // Total spend from campaigns
  const totalSpend = campaigns.reduce((sum, c) => sum + c.spend, 0);

  // Revenue from campaign metrics (if stored) or estimate from won leads
  let revenue = 0;
  for (const c of campaigns) {
    if (c.metrics) {
      try {
        const m = JSON.parse(c.metrics);
        revenue += m.revenue || 0;
      } catch { /* ignore */ }
    }
  }
  // If no campaign revenue, estimate from won leads (avg deal value from score)
  if (revenue === 0 && wonLeads > 0) {
    revenue = wonLeads * 500; // default estimate per won lead
  }

  const cpl = totalLeads > 0 ? Math.round((totalSpend / totalLeads) * 100) / 100 : 0;
  const cac = wonLeads > 0 ? Math.round((totalSpend / wonLeads) * 100) / 100 : 0;
  const conversionRate = totalLeads > 0
    ? Math.round((wonLeads / totalLeads) * 1000) / 10
    : 0;

  // --- Channel breakdown ---
  const sourceDisplayNames: Record<string, string> = {
    google_ads: 'Google Ads',
    meta_ads: 'Meta Ads',
    linkedin: 'LinkedIn',
    cold_email: 'Cold Email',
    organic: 'Organic',
    referral: 'Referral',
    webinar: 'Webinar',
    content: 'Content',
  };

  // Group leads by source
  const leadsBySource: Record<string, number> = {};
  for (const lead of leads) {
    const src = lead.source || 'unknown';
    leadsBySource[src] = (leadsBySource[src] || 0) + 1;
  }

  // Group campaign spend by channel
  const spendByChannel: Record<string, number> = {};
  for (const c of campaigns) {
    const ch = c.channel || 'unknown';
    spendByChannel[ch] = (spendByChannel[ch] || 0) + c.spend;
  }

  // Won leads by source for conversion rate
  const wonBySource: Record<string, number> = {};
  for (const lead of leads.filter(l => l.stage === 'won')) {
    const src = lead.source || 'unknown';
    wonBySource[src] = (wonBySource[src] || 0) + 1;
  }

  // Merge into channel breakdown
  const allSources = new Set([...Object.keys(leadsBySource), ...Object.keys(spendByChannel)]);
  const channelBreakdown = Array.from(allSources)
    .map(source => {
      const leadsCount = leadsBySource[source] || 0;
      const spend = spendByChannel[source] || 0;
      const won = wonBySource[source] || 0;
      return {
        channel: sourceDisplayNames[source] || source,
        leads: leadsCount,
        spend: Math.round(spend * 100) / 100,
        cpl: leadsCount > 0 ? Math.round((spend / leadsCount) * 100) / 100 : 0,
        conversion: leadsCount > 0 ? Math.round((won / leadsCount) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.leads - a.leads);

  // --- Funnel data ---
  const funnelData = [
    { stage: 'Leads', count: totalLeads },
    { stage: 'Contacted', count: leads.filter(l => l.stage !== 'new').length },
    { stage: 'Qualified', count: qualifiedLeads },
    { stage: 'Booked', count: bookedLeads },
    { stage: 'Won', count: wonLeads },
  ];

  // --- Trends (group by week) ---
  const weekBuckets: Record<string, { leads: number; qualified: number; revenue: number }> = {};

  for (const lead of leads) {
    const d = new Date(lead.createdAt);
    // Get Monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    const weekKey = monday.toISOString().slice(0, 10);

    if (!weekBuckets[weekKey]) {
      weekBuckets[weekKey] = { leads: 0, qualified: 0, revenue: 0 };
    }
    weekBuckets[weekKey].leads += 1;
    if (['qualified', 'booked', 'won'].includes(lead.stage)) {
      weekBuckets[weekKey].qualified += 1;
    }
    if (lead.stage === 'won') {
      weekBuckets[weekKey].revenue += 500; // estimate per won lead
    }
  }

  const trends = Object.entries(weekBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ date, ...data }));

  return NextResponse.json({
    cpl,
    cac,
    conversionRate,
    totalLeads,
    qualifiedLeads,
    revenue,
    channelBreakdown,
    funnelData,
    trends,
  });
}
