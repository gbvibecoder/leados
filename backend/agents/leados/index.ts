import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { ServiceResearchAgent } from './service-research';

// Generic agent that wraps a system prompt and mock data
class GenericLeadOSAgent extends BaseAgent {
  private systemPrompt: string;
  private mockData: any;

  constructor(id: string, name: string, description: string, systemPrompt: string, mockData: any) {
    super(id, name, description);
    this.systemPrompt = systemPrompt;
    this.mockData = mockData;
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    try {
      const response = await this.callClaude(this.systemPrompt, JSON.stringify(inputs.config || {}));
      const parsed = this.parseLLMJson<any>(response);
      this.status = 'done';
      return { success: true, data: parsed, reasoning: parsed.reasoning || 'Complete', confidence: parsed.confidence || 85 };
    } catch {
      this.status = 'done';
      return { success: true, data: this.mockData, reasoning: 'Completed with mock data (no API key)', confidence: 80 };
    }
  }
}

export function createLeadOSAgents(): Map<string, BaseAgent> {
  const agents = new Map<string, BaseAgent>();

  agents.set('service-research', new ServiceResearchAgent());

  agents.set('offer-engineering', new GenericLeadOSAgent(
    'offer-engineering', 'Offer Engineering Agent',
    'Package service into compelling offer with ICP, pain point, promise, pricing',
    'You are the Offer Engineering Agent. Package services into offers. Return JSON with: offer { icp, painPoints[], transformationPromise, pricingTiers[], guarantee, positioning }, reasoning, confidence.',
    { offer: { icp: 'B2B SaaS companies, 10-200 employees, $1M-$50M ARR', painPoints: ['Low conversion rates', 'High CAC', 'Inconsistent lead flow'], transformationPromise: 'Double qualified leads in 90 days or money back', pricingTiers: [{ name: 'Starter', price: 2997, features: ['5 campaigns', 'Basic reporting'] }, { name: 'Growth', price: 5997, features: ['Unlimited campaigns', 'AI optimization', 'Dedicated manager'] }, { name: 'Enterprise', price: 9997, features: ['Everything + custom integrations + priority support'] }], guarantee: '2x ROI in 90 days or full refund', positioning: 'The only AI-powered lead gen system that guarantees results' } }
  ));

  agents.set('validation', new GenericLeadOSAgent(
    'validation', 'Validation Agent',
    'Evaluate service viability — market demand, competition, pricing, CAC vs LTV',
    'You are the Validation Agent. Evaluate service viability. Return JSON with: decision (GO/NO-GO), riskScore 0-100, demandScore, competitionScore, cacEstimate, ltvEstimate, reasoning, confidence.',
    { decision: 'GO', riskScore: 28, demandScore: 88, competitionScore: 52, cacEstimate: 127.80, ltvEstimate: 4500, reasoning: 'Strong market demand with manageable competition. LTV/CAC ratio of 35x indicates high viability.' }
  ));

  agents.set('funnel-builder', new GenericLeadOSAgent(
    'funnel-builder', 'Funnel Builder Agent',
    'Build acquisition infrastructure — landing page, lead forms, booking, CRM',
    'You are the Funnel Builder Agent. Generate landing page structure. Return JSON with: landingPage { headline, subheadline, sections[], cta, formFields[] }, reasoning, confidence.',
    { landingPage: { headline: 'Double Your Qualified Leads in 90 Days', subheadline: 'AI-powered lead generation for B2B SaaS companies', sections: ['Hero', 'Pain Points', 'Solution', 'Social Proof', 'Pricing', 'FAQ', 'CTA'], cta: 'Book Your Free Strategy Call', formFields: ['name', 'email', 'company', 'phone', 'monthlyBudget'] }, url: 'https://landing.example.com/offer-1' }
  ));

  agents.set('content-creative', new GenericLeadOSAgent(
    'content-creative', 'Content & Creative Agent',
    'Produce ad copies, hooks, email sequences, LinkedIn scripts, video scripts',
    'You are the Content & Creative Agent. Produce creative assets. Return JSON with: adHooks[], emailSequence[], linkedInScripts[], videoScripts[], reasoning, confidence.',
    { adHooks: ['Tired of leads that ghost you?', 'What if AI could qualify your leads before you call?', 'Stop wasting ad spend on unqualified traffic', '3x your pipeline in 30 days — here\'s how', 'The B2B lead gen secret your competitors don\'t want you to know'], emailSequence: [{ subject: 'Quick question about {company}', body: 'Hi {name}, I noticed...' }, { subject: 'Case study: How {similar_company} 3x\'d their pipeline', body: 'Hey {name}, I wanted to share...' }, { subject: 'Last chance: Free strategy session this week', body: 'Hi {name}, just wanted to follow up...' }] }
  ));

  agents.set('paid-traffic', new GenericLeadOSAgent(
    'paid-traffic', 'Paid Traffic Agent',
    'Google Ads + Meta Ads — keyword research, campaigns, tracking, scaling',
    'You are the Paid Traffic Agent. Define campaigns. Return JSON with: campaigns[], keywords[], audiences[], budget, bidding, reasoning, confidence.',
    { campaigns: [{ platform: 'Google Ads', type: 'Search', budget: 3000, keywords: ['B2B lead generation', 'AI lead gen service', 'qualified leads B2B'] }, { platform: 'Meta Ads', type: 'Lead Generation', budget: 2000, audiences: ['Lookalike - Past Clients', 'Interest - B2B Marketing', 'Job Title - VP Sales'] }], totalBudget: 5000, estimatedCPL: 24.50 }
  ));

  agents.set('outbound-outreach', new GenericLeadOSAgent(
    'outbound-outreach', 'Outbound Outreach Agent',
    'Cold email + LinkedIn DM automation',
    'You are the Outbound Outreach Agent. Craft outreach sequences. Return JSON with: emailSequence[], linkedInSequence[], personalizationRules, reasoning, confidence.',
    { emailSequence: [{ step: 1, delay: 0, subject: 'Quick question about {company}\'s growth', template: 'Hi {firstName}...' }, { step: 2, delay: 3, subject: 'Re: Quick question', template: 'Following up...' }, { step: 3, delay: 5, subject: '{firstName}, one more thing', template: 'I know you\'re busy...' }], linkedInSequence: [{ step: 1, type: 'connection_request', message: 'Hi {firstName}, I love what {company} is doing...' }, { step: 2, type: 'message', delay: 2, message: 'Thanks for connecting! Quick question...' }] }
  ));

  agents.set('inbound-capture', new GenericLeadOSAgent(
    'inbound-capture', 'Inbound Lead Capture Agent',
    'CRM integration, lead scoring, data enrichment, segmentation',
    'You are the Inbound Lead Capture Agent. Define capture rules. Return JSON with: scoringRules[], enrichmentFields[], segmentationCriteria[], crmMapping, reasoning, confidence.',
    { scoringRules: [{ field: 'companySize', weight: 20, rules: ['>100 employees: +20', '50-100: +15', '<50: +5'] }, { field: 'industry', weight: 15, rules: ['SaaS: +15', 'Tech: +12', 'Other: +5'] }, { field: 'engagement', weight: 25, rules: ['Demo request: +25', 'Pricing page: +15', 'Blog: +5'] }], enrichmentFields: ['company_revenue', 'employee_count', 'tech_stack', 'recent_funding'] }
  ));

  agents.set('ai-qualification', new GenericLeadOSAgent(
    'ai-qualification', 'AI Qualification Agent',
    'AI voice calls to qualify leads using BANT criteria',
    'You are the AI Qualification Agent. Generate call script. Return JSON with: callScript, scoringRubric, objectionHandling, qualificationThresholds, reasoning, confidence.',
    { callScript: { intro: 'Hi, this is Alex from LeadOS. I\'m following up on your interest in our growth services.', bant: { budget: 'What\'s your current monthly marketing budget?', authority: 'Are you the decision maker for marketing investments?', need: 'What\'s your biggest challenge with lead generation right now?', timeline: 'When are you looking to implement a new solution?' }, close: 'Based on what you\'ve shared, I think we could be a great fit. Would you like to schedule a detailed strategy session?' }, scoringRubric: { budget_confirmed: 30, decision_maker: 25, clear_need: 25, urgent_timeline: 20 }, qualificationThresholds: { high_intent: 80, medium_intent: 50, low_intent: 0 } }
  ));

  agents.set('sales-routing', new GenericLeadOSAgent(
    'sales-routing', 'Sales Routing Agent',
    'Route leads: high intent+budget→checkout, high intent+complex→sales call, medium→nurture, low→disqualify',
    'You are the Sales Routing Agent. Apply routing decision tree. Return JSON with: routingDecisions[], rules, reasoning, confidence.',
    { routingDecisions: [{ condition: 'High intent + budget confirmed', action: 'checkout', description: 'Direct to payment/checkout page' }, { condition: 'High intent + complex case', action: 'sales_call', description: 'Book into human sales calendar' }, { condition: 'Medium intent', action: 'nurture', description: 'Enter nurture email/LinkedIn sequence' }, { condition: 'Low intent', action: 'disqualify', description: 'Disqualify and archive' }] }
  ));

  agents.set('tracking-attribution', new GenericLeadOSAgent(
    'tracking-attribution', 'Tracking & Attribution Agent',
    'GTM, Meta Pixel, Google Ads conversion, CRM attribution, multi-touch',
    'You are the Tracking & Attribution Agent. Set up tracking infrastructure. Return JSON with: trackingSetup, attributionModel, pixels[], events[], reasoning, confidence.',
    { trackingSetup: { gtm: { containerId: 'GTM-XXXXX', triggers: ['page_view', 'form_submit', 'scroll_depth'] }, metaPixel: { pixelId: 'XXXXX', events: ['Lead', 'ViewContent', 'InitiateCheckout'] }, googleAds: { conversionId: 'AW-XXXXX', actions: ['lead_form', 'phone_call', 'booking'] } }, attributionModel: 'position-based', windows: { click: '30d', view: '7d' } }
  ));

  agents.set('performance-optimization', new GenericLeadOSAgent(
    'performance-optimization', 'Performance Optimization Agent',
    'Monitor CPL/CAC/ROAS/LTV, kill losers, scale winners',
    'You are the Performance Optimization Agent. Analyze metrics and recommend actions. Return JSON with: metrics, actions[], recommendations[], reasoning, confidence.',
    { metrics: { cpl: 24.50, cac: 127.80, roas: 4.2, ltv: 4500 }, actions: [{ type: 'scale', campaign: 'Google Search - B2B Lead Gen', reason: 'ROAS 5.2x, above threshold', action: 'Increase budget 20%' }, { type: 'kill', campaign: 'Meta - Broad Interest', reason: '0 conversions after $50 spend', action: 'Pause immediately' }, { type: 'optimize', campaign: 'LinkedIn - VP Sales', reason: 'CTR 0.6%, below 0.8% threshold', action: 'Refresh creative' }] }
  ));

  agents.set('crm-hygiene', new GenericLeadOSAgent(
    'crm-hygiene', 'CRM & Data Hygiene Agent',
    'Deduplicate, normalize, enrich leads; manage pipeline stages',
    'You are the CRM & Data Hygiene Agent. Clean and normalize data. Return JSON with: cleanedRecords, duplicatesRemoved, enrichedFields, stageUpdates, reasoning, confidence.',
    { cleanedRecords: 1247, duplicatesRemoved: 23, duplicateRate: 0.018, enrichedFields: ['company_revenue', 'employee_count', 'industry', 'tech_stack'], stageUpdates: [{ leadId: 'lead_1', from: 'new', to: 'contacted', reason: 'Email opened 3x in 24h' }, { leadId: 'lead_5', from: 'qualified', to: 'won', reason: 'Payment confirmed' }], dataQualityScore: 94.2 }
  ));

  return agents;
}
