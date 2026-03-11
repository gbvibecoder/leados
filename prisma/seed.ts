import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const leads = [
  { name: 'Sarah Chen', email: 'sarah.chen@techventures.io', company: 'TechVentures Inc', phone: '+1-555-0101', source: 'google_ads', channel: 'paid_search', score: 87, stage: 'qualified', segment: 'enterprise' },
  { name: 'Mike Rodriguez', email: 'mike.r@growthlab.co', company: 'GrowthLab Agency', phone: '+1-555-0102', source: 'linkedin', channel: 'outbound', score: 72, stage: 'contacted', segment: 'smb' },
  { name: 'Emily Watson', email: 'emily@startupforge.com', company: 'StartupForge', phone: '+1-555-0103', source: 'meta_ads', channel: 'paid_social', score: 93, stage: 'booked', segment: 'enterprise' },
  { name: 'David Kim', email: 'dkim@cloudscale.io', company: 'CloudScale Solutions', phone: '+1-555-0104', source: 'organic', channel: 'inbound', score: 65, stage: 'new', segment: 'mid_market' },
  { name: 'Jessica Taylor', email: 'jtaylor@revops.co', company: 'RevOps Consulting', phone: '+1-555-0105', source: 'referral', channel: 'referral', score: 91, stage: 'won', segment: 'enterprise' },
  { name: 'Alex Morgan', email: 'amorgan@datadrive.io', company: 'DataDrive Analytics', phone: '+1-555-0106', source: 'google_ads', channel: 'paid_search', score: 78, stage: 'qualified', segment: 'mid_market' },
  { name: 'Rachel Green', email: 'rgreen@saasify.com', company: 'SaaSify', phone: '+1-555-0107', source: 'cold_email', channel: 'outbound', score: 45, stage: 'contacted', segment: 'smb' },
  { name: 'James Wilson', email: 'jwilson@nexgen.tech', company: 'NexGen Technologies', phone: '+1-555-0108', source: 'meta_ads', channel: 'paid_social', score: 82, stage: 'qualified', segment: 'enterprise' },
  { name: 'Lisa Park', email: 'lpark@ecomboost.co', company: 'EcomBoost', phone: '+1-555-0109', source: 'linkedin', channel: 'outbound', score: 38, stage: 'lost', segment: 'smb' },
  { name: 'Tom Harris', email: 'tharris@scaleit.io', company: 'ScaleIt Partners', phone: '+1-555-0110', source: 'webinar', channel: 'inbound', score: 88, stage: 'booked', segment: 'mid_market' },
  { name: 'Anna Liu', email: 'aliu@growthhq.com', company: 'GrowthHQ', phone: '+1-555-0111', source: 'google_ads', channel: 'paid_search', score: 71, stage: 'new', segment: 'smb' },
  { name: 'Chris Baker', email: 'cbaker@devspace.io', company: 'DevSpace Labs', phone: '+1-555-0112', source: 'organic', channel: 'inbound', score: 56, stage: 'contacted', segment: 'mid_market' },
  { name: 'Mia Thompson', email: 'mia@clickfunnel.co', company: 'ClickFunnel Pro', phone: '+1-555-0113', source: 'meta_ads', channel: 'paid_social', score: 94, stage: 'won', segment: 'enterprise' },
  { name: 'Ryan Patel', email: 'rpatel@automate.ai', company: 'Automate AI', phone: '+1-555-0114', source: 'cold_email', channel: 'outbound', score: 62, stage: 'qualified', segment: 'mid_market' },
  { name: 'Sophie Martinez', email: 'sophie@brandlift.co', company: 'BrandLift Media', phone: '+1-555-0115', source: 'linkedin', channel: 'outbound', score: 83, stage: 'booked', segment: 'enterprise' },
];

const interactionTemplates = [
  { type: 'email_sent', content: 'Initial outreach — "Quick question about your growth strategy"' },
  { type: 'email_opened', content: 'Email opened 3 times' },
  { type: 'link_clicked', content: 'Clicked landing page link' },
  { type: 'form_submitted', content: 'Submitted contact form with phone number' },
  { type: 'ai_call', content: 'AI qualification call — Duration: 4m 32s — Score: 82/100 — Outcome: High Intent' },
  { type: 'routed', content: 'Routed to sales calendar — Booking link sent' },
];

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.interaction.deleteMany();
  await prisma.lead.deleteMany();

  for (const leadData of leads) {
    const lead = await prisma.lead.create({ data: leadData });

    // Add interactions based on lead stage progression
    const stageOrder = ['new', 'contacted', 'qualified', 'booked', 'won', 'lost'];
    const stageIndex = stageOrder.indexOf(lead.stage);
    const interactionCount = Math.min(stageIndex + 1, interactionTemplates.length);

    for (let i = 0; i < interactionCount; i++) {
      const daysAgo = interactionCount - i;
      await prisma.interaction.create({
        data: {
          leadId: lead.id,
          type: interactionTemplates[i].type,
          content: interactionTemplates[i].content,
          timestamp: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  const count = await prisma.lead.count();
  console.log(`Seeded ${count} leads with interactions.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
