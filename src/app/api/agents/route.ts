import { NextResponse } from 'next/server';

const allAgents = [
  { id: 'service-research', name: 'Service Research Agent', pipeline: 'leados', status: 'idle', description: 'Discover high-demand service opportunities via Google Trends, Reddit, LinkedIn, Upwork', order: 1 },
  { id: 'offer-engineering', name: 'Offer Engineering Agent', pipeline: 'leados', status: 'idle', description: 'Package service into compelling offer with ICP, pain point, promise, pricing', order: 2 },
  { id: 'validation', name: 'Validation Agent', pipeline: 'leados', status: 'idle', description: 'Evaluate service viability — market demand, competition, pricing, CAC vs LTV', order: 3 },
  { id: 'funnel-builder', name: 'Funnel Builder Agent', pipeline: 'leados', status: 'idle', description: 'Build acquisition infrastructure — landing page, lead forms, booking, CRM', order: 4 },
  { id: 'content-creative', name: 'Content & Creative Agent', pipeline: 'leados', status: 'idle', description: 'Produce ad copies, hooks, email sequences, LinkedIn scripts, video scripts', order: 5 },
  { id: 'paid-traffic', name: 'Paid Traffic Agent', pipeline: 'leados', status: 'idle', description: 'Google Ads + Meta Ads campaigns, keyword research, tracking, scaling', order: 6 },
  { id: 'outbound-outreach', name: 'Outbound Outreach Agent', pipeline: 'leados', status: 'idle', description: 'Cold email scraping, personalization, sequences + LinkedIn DM automation', order: 7 },
  { id: 'inbound-capture', name: 'Inbound Lead Capture Agent', pipeline: 'leados', status: 'idle', description: 'CRM integration, lead scoring, data enrichment, segmentation', order: 8 },
  { id: 'ai-qualification', name: 'AI Qualification Agent', pipeline: 'leados', status: 'idle', description: 'AI voice calls to qualify leads, score responses, handle objections, route', order: 9 },
  { id: 'sales-routing', name: 'Sales Routing Agent', pipeline: 'leados', status: 'idle', description: 'Decision engine — route to checkout, sales call, nurture, or disqualify', order: 10 },
  { id: 'tracking-attribution', name: 'Tracking & Attribution Agent', pipeline: 'leados', status: 'idle', description: 'GTM, Meta Pixel, Google Ads conversion, CRM attribution, multi-touch', order: 11 },
  { id: 'performance-optimization', name: 'Performance Optimization Agent', pipeline: 'leados', status: 'idle', description: 'Monitor CPL/CAC/ROAS/LTV, kill losers, scale winners, adjust budgets', order: 12 },
  { id: 'crm-hygiene', name: 'CRM & Data Hygiene Agent', pipeline: 'leados', status: 'idle', description: 'Deduplicate, normalize, enrich leads; manage pipeline stages; log all touches', order: 13 },
];

export async function GET() {
  return NextResponse.json(allAgents);
}
