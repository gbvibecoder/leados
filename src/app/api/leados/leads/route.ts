import { NextResponse } from 'next/server';

const mockLeads = [
  { id: 'lead_1', name: 'Sarah Chen', email: 'sarah.chen@techventures.io', company: 'TechVentures Inc', phone: '+1-555-0101', source: 'google_ads', channel: 'paid_search', score: 87, stage: 'qualified', segment: 'enterprise', createdAt: '2026-03-08T10:00:00Z', updatedAt: '2026-03-08T14:00:00Z' },
  { id: 'lead_2', name: 'Mike Rodriguez', email: 'mike.r@growthlab.co', company: 'GrowthLab Agency', phone: '+1-555-0102', source: 'linkedin', channel: 'outbound', score: 72, stage: 'contacted', segment: 'smb', createdAt: '2026-03-07T09:00:00Z', updatedAt: '2026-03-08T11:00:00Z' },
  { id: 'lead_3', name: 'Emily Watson', email: 'emily@startupforge.com', company: 'StartupForge', phone: '+1-555-0103', source: 'meta_ads', channel: 'paid_social', score: 93, stage: 'booked', segment: 'enterprise', createdAt: '2026-03-06T15:00:00Z', updatedAt: '2026-03-08T16:00:00Z' },
  { id: 'lead_4', name: 'David Kim', email: 'dkim@cloudscale.io', company: 'CloudScale Solutions', phone: '+1-555-0104', source: 'organic', channel: 'inbound', score: 65, stage: 'new', segment: 'mid_market', createdAt: '2026-03-09T08:00:00Z', updatedAt: '2026-03-09T08:00:00Z' },
  { id: 'lead_5', name: 'Jessica Taylor', email: 'jtaylor@revops.co', company: 'RevOps Consulting', phone: '+1-555-0105', source: 'referral', channel: 'referral', score: 91, stage: 'won', segment: 'enterprise', createdAt: '2026-02-28T12:00:00Z', updatedAt: '2026-03-05T14:00:00Z' },
  { id: 'lead_6', name: 'Alex Morgan', email: 'amorgan@datadrive.io', company: 'DataDrive Analytics', phone: '+1-555-0106', source: 'google_ads', channel: 'paid_search', score: 78, stage: 'qualified', segment: 'mid_market', createdAt: '2026-03-05T10:00:00Z', updatedAt: '2026-03-07T11:00:00Z' },
  { id: 'lead_7', name: 'Rachel Green', email: 'rgreen@saasify.com', company: 'SaaSify', phone: '+1-555-0107', source: 'cold_email', channel: 'outbound', score: 45, stage: 'contacted', segment: 'smb', createdAt: '2026-03-04T14:00:00Z', updatedAt: '2026-03-06T09:00:00Z' },
  { id: 'lead_8', name: 'James Wilson', email: 'jwilson@nexgen.tech', company: 'NexGen Technologies', phone: '+1-555-0108', source: 'meta_ads', channel: 'paid_social', score: 82, stage: 'qualified', segment: 'enterprise', createdAt: '2026-03-03T11:00:00Z', updatedAt: '2026-03-07T15:00:00Z' },
  { id: 'lead_9', name: 'Lisa Park', email: 'lpark@ecomboost.co', company: 'EcomBoost', phone: '+1-555-0109', source: 'linkedin', channel: 'outbound', score: 38, stage: 'lost', segment: 'smb', createdAt: '2026-03-01T09:00:00Z', updatedAt: '2026-03-04T16:00:00Z' },
  { id: 'lead_10', name: 'Tom Harris', email: 'tharris@scaleit.io', company: 'ScaleIt Partners', phone: '+1-555-0110', source: 'webinar', channel: 'inbound', score: 88, stage: 'booked', segment: 'mid_market', createdAt: '2026-03-02T14:00:00Z', updatedAt: '2026-03-08T10:00:00Z' },
  { id: 'lead_11', name: 'Anna Liu', email: 'aliu@growthhq.com', company: 'GrowthHQ', phone: '+1-555-0111', source: 'google_ads', channel: 'paid_search', score: 71, stage: 'new', segment: 'smb', createdAt: '2026-03-09T07:00:00Z', updatedAt: '2026-03-09T07:00:00Z' },
  { id: 'lead_12', name: 'Chris Baker', email: 'cbaker@devspace.io', company: 'DevSpace Labs', phone: '+1-555-0112', source: 'organic', channel: 'inbound', score: 56, stage: 'contacted', segment: 'mid_market', createdAt: '2026-03-06T08:00:00Z', updatedAt: '2026-03-08T09:00:00Z' },
  { id: 'lead_13', name: 'Mia Thompson', email: 'mia@clickfunnel.co', company: 'ClickFunnel Pro', phone: '+1-555-0113', source: 'meta_ads', channel: 'paid_social', score: 94, stage: 'won', segment: 'enterprise', createdAt: '2026-02-25T10:00:00Z', updatedAt: '2026-03-03T14:00:00Z' },
  { id: 'lead_14', name: 'Ryan Patel', email: 'rpatel@automate.ai', company: 'Automate AI', phone: '+1-555-0114', source: 'cold_email', channel: 'outbound', score: 62, stage: 'qualified', segment: 'mid_market', createdAt: '2026-03-04T11:00:00Z', updatedAt: '2026-03-07T13:00:00Z' },
  { id: 'lead_15', name: 'Sophie Martinez', email: 'sophie@brandlift.co', company: 'BrandLift Media', phone: '+1-555-0115', source: 'linkedin', channel: 'outbound', score: 83, stage: 'booked', segment: 'enterprise', createdAt: '2026-03-03T14:00:00Z', updatedAt: '2026-03-08T12:00:00Z' },
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');
  const source = searchParams.get('source');
  const minScore = searchParams.get('minScore');

  let leads = [...mockLeads];
  if (stage) leads = leads.filter(l => l.stage === stage);
  if (source) leads = leads.filter(l => l.source === source);
  if (minScore) leads = leads.filter(l => l.score >= parseInt(minScore));

  return NextResponse.json(leads);
}
