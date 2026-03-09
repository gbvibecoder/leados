import { AgentDefinition } from './types';

export const LEADOS_AGENTS: AgentDefinition[] = [
  { id: 'service-research', name: 'Service Research Agent', description: 'Discover high-demand service opportunities via Google Trends, Reddit, LinkedIn, Upwork', inputs: 'Trend platforms, job boards', outputs: 'Ranked list of service opportunities', order: 1, pipeline: 'leados' },
  { id: 'offer-engineering', name: 'Offer Engineering Agent', description: 'Package service into compelling offer with ICP, pain point, promise, pricing', inputs: 'Service opportunity data', outputs: 'Clear offer with positioning', order: 2, pipeline: 'leados' },
  { id: 'validation', name: 'Validation Agent', description: 'Evaluate service viability — market demand, competition, pricing, CAC vs LTV', inputs: 'Offer data, market data', outputs: 'Go / No-Go decision + risk score', order: 3, pipeline: 'leados' },
  { id: 'funnel-builder', name: 'Funnel Builder Agent', description: 'Build acquisition infrastructure — landing page, lead forms, booking, CRM', inputs: 'Offer + copy', outputs: 'Live landing page URL', order: 4, pipeline: 'leados' },
  { id: 'content-creative', name: 'Content & Creative Agent', description: 'Produce ad copies, hooks, email sequences, LinkedIn scripts, video scripts', inputs: 'ICP, offer details', outputs: 'Full creative asset package', order: 5, pipeline: 'leados' },
  { id: 'paid-traffic', name: 'Paid Traffic Agent', description: 'Google Ads + Meta Ads — keyword research, campaigns, tracking, scaling', inputs: 'Landing page, creatives', outputs: 'Live ad campaigns', order: 6, pipeline: 'leados' },
  { id: 'outbound-outreach', name: 'Outbound Outreach Agent', description: 'Cold email scraping, personalization, sequences + LinkedIn DM automation', inputs: 'ICP, offer', outputs: 'Active outreach sequences', order: 7, pipeline: 'leados' },
  { id: 'inbound-capture', name: 'Inbound Lead Capture Agent', description: 'CRM integration, lead scoring, data enrichment, segmentation', inputs: 'Form submissions, ad leads', outputs: 'Enriched CRM records', order: 8, pipeline: 'leados' },
  { id: 'ai-qualification', name: 'AI Qualification Agent', description: 'AI voice calls to qualify leads, score responses, handle objections, route', inputs: 'Lead list from CRM', outputs: 'Qualified/routed leads', order: 9, pipeline: 'leados' },
  { id: 'sales-routing', name: 'Sales Routing Agent', description: 'Decision engine — route to checkout, sales call, nurture, or disqualify', inputs: 'Qualification scores', outputs: 'Routed leads to correct path', order: 10, pipeline: 'leados' },
  { id: 'tracking-attribution', name: 'Tracking & Attribution Agent', description: 'GTM, Meta Pixel, Google Ads conversion, CRM attribution, multi-touch', inputs: 'All campaign IDs', outputs: 'Full analytics infrastructure', order: 11, pipeline: 'leados' },
  { id: 'performance-optimization', name: 'Performance Optimization Agent', description: 'Monitor CPL/CAC/ROAS/LTV, kill losers, scale winners, adjust budgets', inputs: 'Live campaign data', outputs: 'Optimization actions + reports', order: 12, pipeline: 'leados' },
  { id: 'crm-hygiene', name: 'CRM & Data Hygiene Agent', description: 'Deduplicate, normalize, enrich leads; manage pipeline stages; log all touches', inputs: 'All agent outputs', outputs: 'Clean CRM records, single source of truth', order: 13, pipeline: 'leados' },
];

export const ALL_AGENTS = [...LEADOS_AGENTS];

export const AGENT_STATUSES = ['idle', 'running', 'done', 'error'] as const;
export const PIPELINE_TYPES = ['leados'] as const;
export const PIPELINE_STATUSES = ['idle', 'running', 'completed', 'error', 'paused'] as const;
export const LEAD_STAGES = ['new', 'contacted', 'qualified', 'booked', 'won', 'lost'] as const;
