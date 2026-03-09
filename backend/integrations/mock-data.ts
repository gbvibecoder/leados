// Mock data generators for all third-party integrations
// These provide realistic fake data so the pipeline runs end-to-end without real API keys

export const mockLeads = [
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

export const mockProducts = [
  { name: 'LED Sunset Projection Lamp', category: 'Home Decor', viabilityScore: 87, decision: 'GO', margin: 68.5, targetMarket: 'US', budget: 50, status: 'active', shopifyUrl: 'https://store.example.com/sunset-lamp', supplierData: { suppliers: [{ name: 'Shenzhen LED Co.', price: 4.20, moq: 50, shipping: '7-12 days', rating: 4.7 }, { name: 'Guangzhou Light', price: 3.80, moq: 100, shipping: '10-15 days', rating: 4.5 }] } },
  { name: 'Posture Corrector Pro', category: 'Health & Fitness', viabilityScore: 92, decision: 'GO', margin: 72.3, targetMarket: 'US, UK', budget: 75, status: 'active', shopifyUrl: 'https://store.example.com/posture-pro', supplierData: { suppliers: [{ name: 'Yiwu Health Products', price: 3.50, moq: 100, shipping: '8-14 days', rating: 4.8 }] } },
  { name: 'Magnetic Phone Mount', category: 'Electronics', viabilityScore: 63, decision: 'GO', margin: 55.0, targetMarket: 'Global', budget: 30, status: 'evaluation', supplierData: { suppliers: [] } },
  { name: 'Aromatherapy Diffuser Necklace', category: 'Jewelry & Accessories', viabilityScore: 41, decision: 'NO-GO', margin: 45.2, targetMarket: 'US', budget: 25, status: 'rejected', supplierData: { suppliers: [] } },
  { name: 'Smart Fitness Water Bottle', category: 'Health & Fitness', viabilityScore: 78, decision: 'GO', margin: 61.8, targetMarket: 'US, EU', budget: 60, status: 'sourcing', supplierData: { suppliers: [{ name: 'Dongguan Smart', price: 5.60, moq: 200, shipping: '12-18 days', rating: 4.3 }] } },
  { name: 'Portable Blender Cup', category: 'Kitchen', viabilityScore: 85, decision: 'GO', margin: 64.0, targetMarket: 'US', budget: 45, status: 'active', shopifyUrl: 'https://store.example.com/blender-cup', supplierData: { suppliers: [{ name: 'Ningbo Kitchen', price: 6.90, moq: 50, shipping: '7-10 days', rating: 4.6 }] } },
  { name: 'Self-Cleaning Hair Brush', category: 'Beauty', viabilityScore: 55, decision: 'GO', margin: 70.5, targetMarket: 'US, UK', budget: 35, status: 'content', supplierData: { suppliers: [] } },
  { name: 'Desk Cable Organizer', category: 'Office', viabilityScore: 34, decision: 'NO-GO', margin: 38.0, targetMarket: 'US', budget: 20, status: 'rejected', supplierData: { suppliers: [] } },
];

export const mockServiceOpportunities = [
  { niche: 'AI-Powered Content Marketing', demandScore: 92, competitionScore: 45, monetizationScore: 88, reasoning: 'Explosive demand for AI content services with relatively low competition from established agencies.' },
  { niche: 'Shopify Store CRO Consulting', demandScore: 85, competitionScore: 62, monetizationScore: 79, reasoning: 'Growing e-commerce market with high willingness to pay for conversion optimization.' },
  { niche: 'B2B LinkedIn Lead Generation', demandScore: 88, competitionScore: 55, monetizationScore: 84, reasoning: 'Strong demand from B2B companies seeking qualified leads through LinkedIn.' },
  { niche: 'SaaS Onboarding Optimization', demandScore: 78, competitionScore: 38, monetizationScore: 91, reasoning: 'Niche market with very high LTV potential and low competition.' },
  { niche: 'Paid Media Management for DTC', demandScore: 90, competitionScore: 72, monetizationScore: 82, reasoning: 'High volume demand but competitive. Specialization in DTC provides differentiation.' },
];

export const mockAnalyticsLeadOS = {
  cpl: 24.50,
  cac: 127.80,
  conversionRate: 3.4,
  totalLeads: 1247,
  qualifiedLeads: 312,
  revenue: 48750,
  channelBreakdown: [
    { channel: 'Google Ads', leads: 423, spend: 8460, cpl: 20.0, conversion: 4.2 },
    { channel: 'Meta Ads', leads: 312, spend: 7800, cpl: 25.0, conversion: 3.1 },
    { channel: 'LinkedIn', leads: 187, spend: 5610, cpl: 30.0, conversion: 2.8 },
    { channel: 'Cold Email', leads: 215, spend: 2150, cpl: 10.0, conversion: 3.8 },
    { channel: 'Organic', leads: 110, spend: 0, cpl: 0, conversion: 5.5 },
  ],
  funnelData: [
    { stage: 'Visitors', count: 34500 },
    { stage: 'Leads', count: 1247 },
    { stage: 'Qualified', count: 312 },
    { stage: 'Booked', count: 156 },
    { stage: 'Won', count: 78 },
  ],
  trends: [
    { date: '2026-02-01', leads: 145, qualified: 32, revenue: 4200 },
    { date: '2026-02-08', leads: 168, qualified: 38, revenue: 5100 },
    { date: '2026-02-15', leads: 192, qualified: 45, revenue: 6300 },
    { date: '2026-02-22', leads: 178, qualified: 41, revenue: 5800 },
    { date: '2026-03-01', leads: 210, qualified: 52, revenue: 7400 },
    { date: '2026-03-08', leads: 234, qualified: 58, revenue: 8900 },
  ],
};

export const mockAnalyticsECOS = {
  roas: 3.2,
  cpa: 12.40,
  ctr: 2.1,
  cvr: 3.8,
  aov: 47.90,
  totalRevenue: 12450,
  productPerformance: [
    { product: 'Sunset Lamp', roas: 4.1, spend: 320, revenue: 1312, orders: 28, cpa: 11.4 },
    { product: 'Posture Corrector', roas: 3.8, spend: 450, revenue: 1710, orders: 38, cpa: 11.8 },
    { product: 'Blender Cup', roas: 2.9, spend: 280, revenue: 812, orders: 17, cpa: 16.5 },
    { product: 'Water Bottle', roas: 2.4, spend: 360, revenue: 864, orders: 18, cpa: 20.0 },
  ],
  trends: [
    { date: '2026-02-01', revenue: 890, spend: 320, roas: 2.8 },
    { date: '2026-02-08', revenue: 1240, spend: 380, roas: 3.3 },
    { date: '2026-02-15', revenue: 1580, spend: 420, roas: 3.8 },
    { date: '2026-02-22', revenue: 1890, spend: 480, roas: 3.9 },
    { date: '2026-03-01', revenue: 2340, spend: 520, roas: 4.5 },
    { date: '2026-03-08', revenue: 2680, spend: 560, roas: 4.8 },
  ],
};

export const mockInteractions = [
  { type: 'email_sent', content: 'Initial outreach email sent — "Quick question about your growth strategy"', timestamp: '2026-03-01T10:00:00Z' },
  { type: 'email_opened', content: 'Email opened 3 times', timestamp: '2026-03-01T14:30:00Z' },
  { type: 'link_clicked', content: 'Clicked landing page link', timestamp: '2026-03-01T14:32:00Z' },
  { type: 'form_submitted', content: 'Submitted contact form with phone number', timestamp: '2026-03-02T09:15:00Z' },
  { type: 'ai_call', content: 'AI qualification call — Duration: 4m 32s — Score: 82/100 — Outcome: High Intent', timestamp: '2026-03-02T11:00:00Z' },
  { type: 'routed', content: 'Routed to sales calendar — Booking link sent', timestamp: '2026-03-02T11:05:00Z' },
  { type: 'meeting_booked', content: 'Sales call booked for March 5, 2026 at 2:00 PM EST', timestamp: '2026-03-02T15:20:00Z' },
];

// Mock integration wrappers
export const mockHubSpot = {
  createContact: async (data: any) => ({ id: `hs_${Date.now()}`, ...data, createdAt: new Date().toISOString() }),
  updateContact: async (id: string, data: any) => ({ id, ...data, updatedAt: new Date().toISOString() }),
  getContacts: async () => mockLeads.map((l, i) => ({ id: `hs_${i}`, ...l })),
};

export const mockInstantly = {
  createCampaign: async (data: any) => ({ id: `inst_${Date.now()}`, status: 'active', ...data }),
  addLeads: async (campaignId: string, leads: any[]) => ({ added: leads.length, campaignId }),
  getCampaignStats: async (id: string) => ({ sent: 245, opened: 89, replied: 23, bounced: 5 }),
};

export const mockMetaAds = {
  createCampaign: async (data: any) => ({ id: `meta_${Date.now()}`, status: 'ACTIVE', ...data }),
  getCampaignInsights: async (id: string) => ({ impressions: 45000, clicks: 945, spend: 320.50, ctr: 2.1, cpc: 0.34 }),
  pauseCampaign: async (id: string) => ({ id, status: 'PAUSED' }),
};

export const mockGoogleAds = {
  createCampaign: async (data: any) => ({ id: `gads_${Date.now()}`, status: 'ENABLED', ...data }),
  getCampaignMetrics: async (id: string) => ({ impressions: 62000, clicks: 1860, spend: 558.00, ctr: 3.0, cpc: 0.30 }),
};

export const mockShopify = {
  createProduct: async (data: any) => ({ id: `prod_${Date.now()}`, handle: data.title?.toLowerCase().replace(/\s+/g, '-'), url: `https://store.example.com/${data.title?.toLowerCase().replace(/\s+/g, '-')}`, ...data }),
  getProduct: async (id: string) => ({ id, title: 'Sample Product', status: 'active' }),
  getOrderStats: async () => ({ totalOrders: 156, totalRevenue: 7488.60, aov: 48.00 }),
};

export const mockBlandAI = {
  makeCall: async (data: any) => ({
    callId: `call_${Date.now()}`,
    status: 'completed',
    duration: 272,
    transcript: 'Agent: Hi, this is Alex from LeadOS. I wanted to follow up on your interest in our growth services...\nProspect: Yes, I filled out the form yesterday. We\'re looking for help with our lead generation.\nAgent: Great! Can you tell me about your current monthly budget for marketing?\nProspect: We typically spend around $5,000 per month.\nAgent: And what\'s your timeline for implementing a new solution?\nProspect: We\'d like to get started within the next 2-3 weeks.',
    score: 82,
    outcome: 'qualified',
  }),
};
