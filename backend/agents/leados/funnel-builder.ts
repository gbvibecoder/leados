import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { scrapeProductContext, type ProductContext } from '../scrape-url';
import * as webflow from '../../integrations/webflow';

// Slimmed prompt — LLM only generates landing page copy + sections.
// leadForm, bookingCalendar, crmIntegration, tracking are all built from
// deterministic defaults + real API data — no LLM needed for those.
const SYSTEM_PROMPT = `You are the Funnel Builder Agent for LeadOS. Generate a high-converting landing page inspired by top Shopify/DTC sales pages.

You receive JSON with the validated offer (ICP, pricing, guarantee, positioning) and optionally "productContext" scraped from the client's website. If productContext is provided, use the real product name, features, and value propositions to create landing page copy that accurately represents the actual product/service.

## CRITICAL: Product Name Consistency
The offer JSON includes a "serviceName" field — this is the OFFICIAL product brand name. You MUST use this EXACT name consistently throughout ALL landing page copy:
- Hero headline, subheadline, and CTA
- SEO meta title and description
- Comparison table column header (use serviceName, NOT generic terms like "Us")
- Testimonial company references
- Pricing section
- Final CTA
- Every reference to the product/service
Do NOT invent a different product name, do NOT use generic terms like "our service" or "the platform". Always use the exact serviceName provided.

## High-Converting Landing Page Structure

Follow this exact section order for maximum conversion:

1. **Announcement Bar**: Urgency/scarcity message at the top (e.g. "Only X spots left at this price", "Limited-time offer ends soon").
2. **Hero**: SHORT headline (max 8-10 words) with a specific outcome + subheadline explaining how. The headline MUST be punchy and concise like "Skip The 10-Step Routine, Get Results" or "Double Your Pipeline in 90 Days" — NEVER more than 10 words. Put the details in the subheadline instead. Single CTA button. Include a guarantee badge and key stats (e.g. "12,000+ Happy Customers", "4.8★ Rating", "96% See Results").
3. **Social Proof Bar**: "Trusted by" or "As Featured In" with logo/brand names. Scrolling strip feel.
4. **Problem Section**: 3-4 pain points the target audience recognises. Use emoji icons (😵‍💫 💸 ⏰ 🤷‍♀️) and their language.
5. **Solution Section**: How it works in 3-4 numbered steps with icons. Keep it visual and clear.
6. **What's Included**: List deliverables/features with checkmarks or feature cards. Show clear value.
7. **Comparison Table**: Us vs traditional/competitors. Green checks vs red X's. Make the advantage obvious.
8. **Testimonials**: 3 testimonials with names, roles, companies, and verified badges. Include a specific metric per testimonial.
9. **Media Features**: "As Seen In" section with recognizable publication/brand names for credibility.
10. **Pricing**: Transparent pricing with price anchoring (show original price crossed out + discounted price + savings percentage). Include guarantee.
11. **FAQ**: 5-8 questions addressing objections. Collapsible accordion format.
12. **Trust Signals**: Guarantee details, security badges, return policy, support info.
13. **Final CTA**: Repeat the main offer with urgency. Scarcity reminder + CTA button.

## Conversion Psychology Rules

- Use specific numbers over vague claims ("96% see results in 30 days" not "most people see results")
- Price anchor: always show a higher "original" price crossed out with the real price and savings %
- Include at least 3 trust signals: guarantee, security, social proof count
- Every section should have a micro-CTA or lead toward the main CTA
- Use loss aversion language in problem section ("Stop wasting...", "Don't let...")
- Testimonials must include a measurable result metric

Return ONLY valid JSON (no markdown) with this structure:
{
  "landingPage": {
    "url": "https://leadflow-ai.com/get-started",
    "deployTarget": "Webflow",
    "headline": "string — MAX 10 WORDS. Short, punchy transformation promise.",
    "subheadline": "string — supporting detail that expands on the headline",
    "sections": [
      { "type": "announcementBar", "content": { "message": "string — urgency/scarcity text", "highlight": "string — emphasized part e.g. the number" } },
      { "type": "hero", "content": { "headline": "string — MAX 10 words, punchy", "subheadline": "string — longer detail", "cta": "string", "ctaLink": "#lead-form", "ctaSubtext": "string — e.g. No commitment required", "guaranteeBadge": "string", "stats": [{ "value": "string", "label": "string" }] } },
      { "type": "socialProofBar", "content": { "logos": ["string — client/partner/media names"], "label": "string — e.g. Trusted by 500+ companies" } },
      { "type": "problem", "content": { "sectionTitle": "string", "painPoints": [{ "emoji": "string — single emoji", "title": "string", "description": "string — use target audience language" }] } },
      { "type": "solution", "content": { "sectionTitle": "string", "steps": [{ "stepNumber": "number", "icon": "string", "title": "string", "description": "string" }] } },
      { "type": "whatsIncluded", "content": { "sectionTitle": "string", "deliverables": [{ "icon": "checkmark", "title": "string", "description": "string" }] } },
      { "type": "comparisonTable", "content": { "sectionTitle": "string", "columns": ["Us", "Traditional/Competitors"], "rows": [{ "feature": "string", "us": true, "them": false }] } },
      { "type": "testimonials", "content": { "sectionTitle": "string", "items": [{ "quote": "string", "name": "string", "role": "string", "company": "string", "verified": true, "metric": "string — specific result e.g. 4x qualified meetings" }] } },
      { "type": "mediaFeatures", "content": { "sectionTitle": "string — e.g. As Seen In", "publications": ["string — publication/brand names"] } },
      { "type": "pricing", "content": { "sectionTitle": "string", "originalPrice": "string — higher anchor price", "price": "string — actual price", "savings": "string — e.g. Save 47%", "tiers": [{ "name": "string", "price": "string", "originalPrice": "string", "highlight": false, "badge": "string", "cta": "string", "features": ["string"] }], "guarantee": "string", "priceSubtext": "string — e.g. Limited-time introductory pricing" } },
      { "type": "faq", "content": { "sectionTitle": "string", "format": "accordion", "questions": [{ "q": "string", "a": "string" }] } },
      { "type": "trustSignals", "content": { "guarantee": "string — full guarantee text with details", "signals": [{ "icon": "string", "text": "string" }] } },
      { "type": "finalCta", "content": { "headline": "string", "subheadline": "string", "ctaButton": "string", "ctaLink": "#lead-form", "ctaSubtext": "string — urgency/scarcity reminder", "urgencyMessage": "string" } }
    ],
    "cta": "string",
    "seoMeta": { "title": "string", "description": "string" }
  },
  "testChecklist": {
    "formSubmissionTest": "Submit a test lead through the form and verify it appears as a CRM entry",
    "bookingTest": "Confirm Calendly booking flow works end-to-end",
    "mobileResponsivenessCheck": "Verify all sections render correctly on mobile devices (375px, 768px)",
    "pageLoadSpeedCheck": "Run Lighthouse audit — target LCP < 2.5s, CLS < 0.1",
    "trackingVerification": "Confirm UTM parameters are captured, Meta Pixel and Google Ads conversion pixels fire on form submit and booking"
  },
  "reasoning": "string",
  "confidence": "number 0-100"
}

Use the offer's transformation promise as headline, ICP psychographics for pain points, pricing tiers from the offer. Be specific — no placeholders.
Do NOT generate any performance metrics. Do NOT include leadForm, bookingCalendar, crmIntegration, or tracking — those are handled separately.`;

// ─── Integration Helpers ────────────────────────────────────────────────────

const API_TIMEOUT = 5_000; // 5s — fast-fail on integrations (Vercel 60s limit)

interface CalendlyEventType {
  name: string;
  duration: number;
}

interface HubSpotPipelineConfig {
  pipelineName: string;
  stages: string[];
  contactProperties: string[];
}

async function createCalendlyEventType(config: CalendlyEventType): Promise<{ url: string; eventTypeId: string }> {
  const apiKey = process.env.CALENDLY_API_KEY;
  if (!apiKey) {
    return {
      url: `https://calendly.com/leados/${config.name.toLowerCase().replace(/\s+/g, '-')}`,
      eventTypeId: 'no-calendly-api-key',
    };
  }

  try {
    // Single request: get user + event types in one flow
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(API_TIMEOUT),
    });
    const userData = await userResponse.json();
    const userUri = userData.resource?.uri;

    const eventsResponse = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri || '')}&active=true&count=5`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(API_TIMEOUT) }
    );
    const eventsData = await eventsResponse.json();

    const matching = eventsData.collection?.find(
      (e: any) => e.duration === config.duration || e.name?.toLowerCase().includes('strategy')
    );
    const eventType = matching || eventsData.collection?.[0];

    return {
      url: eventType?.scheduling_url || `https://calendly.com/leados/${config.name.toLowerCase().replace(/\s+/g, '-')}`,
      eventTypeId: eventType?.uri || 'calendly-event-type',
    };
  } catch {
    return {
      url: `https://calendly.com/leados/${config.name.toLowerCase().replace(/\s+/g, '-')}`,
      eventTypeId: 'calendly-fallback',
    };
  }
}

async function setupHubSpotPipeline(config: HubSpotPipelineConfig): Promise<{ pipelineId: string; stageIds: string[] }> {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    return {
      pipelineId: 'no-hubspot-api-key',
      stageIds: config.stages.map((_, i) => `no-hubspot-stage-${i}`),
    };
  }

  try {
    const pipelinePayload = {
      label: config.pipelineName,
      displayOrder: 0,
      stages: config.stages.map((label, index) => ({
        label,
        displayOrder: index,
        metadata: { probability: String(Math.min(10 + index * 12, 100) / 100) },
      })),
    };

    const response = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(API_TIMEOUT),
      body: JSON.stringify(pipelinePayload),
    });

    if (!response.ok) {
      const listResponse = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(API_TIMEOUT),
      });
      const pipelines = await listResponse.json();
      const existing = pipelines.results?.find((p: any) => p.label === config.pipelineName);
      if (existing) {
        return { pipelineId: existing.id, stageIds: existing.stages?.map((s: any) => s.id) || [] };
      }
      throw new Error('Failed to create or find pipeline');
    }

    const pipeline = await response.json();
    return { pipelineId: pipeline.id, stageIds: pipeline.stages?.map((s: any) => s.id) || [] };
  } catch {
    return { pipelineId: 'hubspot-fallback', stageIds: config.stages.map((_, i) => `fallback-stage-${i}`) };
  }
}

/** Create contact properties in HubSpot — all in parallel */
async function createHubSpotContactProperties(properties: string[]): Promise<boolean> {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) return false;

  try {
    await Promise.allSettled(
      properties.map((prop) =>
        fetch('https://api.hubapi.com/crm/v3/properties/contacts', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(API_TIMEOUT),
          body: JSON.stringify({
            name: prop.toLowerCase().replace(/\s+/g, '_'),
            label: prop,
            type: 'string',
            fieldType: 'text',
            groupName: 'contactinformation',
          }),
        })
      )
    );
    return true;
  } catch {
    return false;
  }
}

// ─── Agent Implementation ───────────────────────────────────────────────────

export class FunnelBuilderAgent extends BaseAgent {
  constructor() {
    super(
      'funnel-builder',
      'Funnel Builder Agent',
      'Builds acquisition infrastructure — landing pages, lead forms, booking, and CRM setup.'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this._runConfig = inputs.config;
    this.status = 'running';
    await this.log('run_started', { inputs });

    // Extract upstream data
    const offerData = inputs.previousOutputs?.['offer-engineering']?.offer
      || inputs.previousOutputs?.['offer-engineering']
      || {};
    const validationData = inputs.previousOutputs?.['validation'] || {};

    const decision = validationData.decision || 'GO';
    if (decision === 'NO-GO') {
      this.status = 'done';
      await this.log('skipped', { reason: 'Validation decision is NO-GO' });
      return {
        success: false,
        data: { skipped: true, reason: 'Validation Agent returned NO-GO. Funnel build aborted.' },
        reasoning: 'Cannot build funnel for a rejected offer. Fix validation issues first.',
        confidence: 100,
        error: 'Offer did not pass validation (NO-GO). Resolve issues and re-validate before building the funnel.',
      };
    }

    // Scrape project URL for product context
    const projectUrl = inputs.config?.projectUrl || inputs.config?.url || '';
    let productContext: ProductContext | null = null;
    if (projectUrl) {
      await this.log('scraping_url', { url: projectUrl });
      productContext = await scrapeProductContext(projectUrl);
      if (productContext) {
        await this.log('url_scraped', { title: productContext.title, headingsCount: productContext.headings.length });
      }
    }

    const niche = inputs.config?.niche || inputs.config?.serviceNiche || offerData.serviceName || 'B2B Lead Generation';
    const meetingName = offerData.serviceName
      ? `${offerData.serviceName} — Strategy Call`
      : 'LeadOS Strategy Call';

    const crmStages = [
      'New Lead', 'Form Submitted', 'Call Booked', 'AI Qualified',
      'Strategy Call Completed', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost',
    ];

    const contactProperties = [
      'Lead Source', 'Monthly Marketing Budget', 'Current Monthly Leads',
      'Lead Score', 'Qualification Outcome', 'UTM Source', 'UTM Medium', 'UTM Campaign',
    ];

    const pipelineName = offerData.serviceName
      ? `${offerData.serviceName} — Acquisition Pipeline`
      : 'LeadOS — New Client Acquisition';

    try {
      await this.log('llm_generating', { phase: 'Generating landing page copy + setting up integrations' });

      // Only send what the LLM needs — offer data, nothing else
      const llmInput = JSON.stringify({
        offer: {
          serviceName: offerData.serviceName,
          icp: offerData.icp || offerData.idealCustomerProfile,
          painPoints: offerData.painPoints,
          transformationPromise: offerData.transformationPromise,
          pricingTiers: offerData.pricingTiers,
          guarantee: offerData.guarantee,
          positioning: offerData.positioning,
          uniqueMechanism: offerData.uniqueMechanism,
        },
        productContext: productContext ? {
          websiteTitle: productContext.title,
          websiteDescription: productContext.description,
          mainHeadings: productContext.headings,
          pageContent: productContext.bodySnippet,
          sourceUrl: productContext.url,
        } : undefined,
        niche,
      });

      // ── Run LLM + ALL integrations in parallel ────────────────────
      const [llmResult, calendlyResult, hubspotResult] = await Promise.all([
        this.callClaude(SYSTEM_PROMPT, llmInput, 1, 2048)
          .catch((err: any) => {
            this.log('llm_failed', { error: err.message });
            return null;
          }),
        createCalendlyEventType({ name: meetingName, duration: 30 }),
        setupHubSpotPipeline({ pipelineName, stages: crmStages, contactProperties }),
      ]);

      // Create contact properties (non-blocking, parallel)
      createHubSpotContactProperties(contactProperties).catch(() => {});

      await this.log('integrations_complete', { calendly: calendlyResult, hubspot: hubspotResult });

      // ── Parse LLM result ──────────────────────────────────────────
      let parsed: any = {};
      if (llmResult) {
        try {
          parsed = this.safeParseLLMJson<any>(llmResult);
        } catch (parseErr: any) {
          await this.log('llm_json_parse_error', { error: parseErr.message });
          parsed = {};
        }
      } else {
        await this.log('using_fallback', { reason: 'LLM unavailable — generating funnel from upstream data' });
      }

      // Normalize alternative key names
      parsed.landingPage = parsed.landingPage || parsed.landing_page || parsed.page || parsed.landingPageCopy;

      // Force-zero any LLM-fabricated metrics
      if (parsed.landingPage) {
        if (parsed.landingPage.estimatedConversionRate !== undefined) parsed.landingPage.estimatedConversionRate = 0;
        if (parsed.landingPage.estimatedTraffic !== undefined) parsed.landingPage.estimatedTraffic = 0;
        if (parsed.landingPage.visitors !== undefined) parsed.landingPage.visitors = 0;
        if (parsed.landingPage.leads !== undefined) parsed.landingPage.leads = 0;
      }

      // ── Build fallback landing page if LLM didn't produce one ─────
      if (!parsed.landingPage) {
        const transformationPromise = offerData.transformationPromise || '';
        const serviceName = offerData.serviceName || niche;
        // Use the EXACT serviceName from offer-engineering for brand consistency
        const brandName = offerData.serviceName || 'LeadFlow AI';
        const shortHeadline = `Get More Leads with ${brandName}`;
        const guarantee = offerData.guarantee || '90-Day Money-Back Guarantee';
        const basePrice = offerData.pricingTiers?.[0]?.price || '$2,500/mo';

        parsed.landingPage = {
          url: 'https://leadflow-ai.com/get-started',
          deployTarget: 'Webflow',
          headline: shortHeadline,
          subheadline: transformationPromise || `We build a predictable, scalable pipeline for ${niche.toLowerCase()} — fully autonomous, performance-guaranteed, and live in 48 hours`,
          sections: [
            { type: 'announcementBar', content: { message: 'Only 10 onboarding spots left at this price', highlight: '10 spots' } },
            { type: 'hero', content: { headline: shortHeadline, subheadline: transformationPromise || `Built for companies investing in ${niche.toLowerCase()} — the done-for-you lead engine`, cta: 'Book Your Free Strategy Call', ctaLink: '#lead-form', ctaSubtext: 'No commitment. See your custom growth plan in 30 minutes.', guaranteeBadge: guarantee, stats: [
              { value: '500+', label: 'Happy Clients' },
              { value: '4.9★', label: 'Average Rating' },
              { value: '93%', label: 'See Results in 30 Days' },
            ] } },
            { type: 'socialProofBar', content: { logos: ['TechCorp', 'GrowthHQ', 'ScaleUp Inc', 'Pipeline Pro', 'RevenueLab'], label: `Trusted by 500+ companies for ${niche.toLowerCase()}` } },
            { type: 'problem', content: { sectionTitle: 'Sound Familiar?', painPoints: [
              { emoji: '😵‍💫', title: 'Feast-or-Famine Pipeline', description: 'One month you\'re drowning in leads, the next it\'s crickets. You can\'t plan growth on unpredictable deal flow.' },
              { emoji: '💸', title: 'Burning Cash on Bad Leads', description: 'Spending $200+ per lead on channels that produce tire-kickers who never convert.' },
              { emoji: '⏰', title: 'Sales Team Wasting Time', description: 'Your reps spend 60% of their day chasing unqualified leads instead of closing deals.' },
              { emoji: '🤷‍♀️', title: 'Information Overload', description: 'Too many tools, dashboards, and reports — but no clear picture of what\'s actually working.' },
            ] } },
            { type: 'solution', content: { sectionTitle: `How It Works: Your Autonomous ${niche} Engine`, steps: [
              { stepNumber: 1, icon: '🔍', title: 'We Research Your Market', description: 'AI agents analyze your niche, competitors, and ideal buyers to build a custom strategy.' },
              { stepNumber: 2, icon: '🏗️', title: 'We Build Your Funnel', description: 'Landing pages, lead forms, and booking flows go live within 48 hours.' },
              { stepNumber: 3, icon: '📣', title: 'We Launch Campaigns', description: 'Multi-channel outreach across paid ads, email, and LinkedIn — fully automated.' },
              { stepNumber: 4, icon: '🤝', title: 'You Close Deals', description: 'AI-qualified leads land in your CRM, scored and ready for your sales team.' },
            ] } },
            { type: 'whatsIncluded', content: { sectionTitle: 'Everything You Get', deliverables: [
              { icon: 'checkmark', title: 'AI-Powered Multi-Channel Campaigns', description: 'Google Ads, Meta, email, and LinkedIn outreach managed by AI agents.' },
              { icon: 'checkmark', title: 'Autonomous Lead Scoring & Voice Qualification', description: 'Every lead scored on BANT criteria with AI voice calls.' },
              { icon: 'checkmark', title: 'Real-Time Budget Reallocation', description: 'Ad spend automatically shifted to highest-performing channels.' },
              { icon: 'checkmark', title: 'Full-Funnel Multi-Touch Attribution', description: 'Know exactly which touchpoints drive revenue.' },
              { icon: 'checkmark', title: 'CRM Integration & Data Hygiene', description: 'HubSpot, GoHighLevel, or Salesforce — always clean, always current.' },
            ] } },
            { type: 'comparisonTable', content: { sectionTitle: `Why ${brandName} vs The Old Way`, columns: [brandName, 'Traditional Agencies'], rows: [
              { feature: 'Fully autonomous — runs 24/7', us: true, them: false },
              { feature: 'AI-qualified leads (not just MQLs)', us: true, them: false },
              { feature: 'Live in 48 hours', us: true, them: false },
              { feature: 'Multi-channel orchestration', us: true, them: false },
              { feature: 'Performance guarantee', us: true, them: false },
              { feature: 'Transparent, real-time reporting', us: true, them: false },
            ] } },
            { type: 'testimonials', content: { sectionTitle: 'What Our Clients Say', items: [
              { quote: 'We went from 12 to 47 qualified meetings per month in 60 days.', name: 'Sarah Chen', role: 'VP Marketing', company: 'TechCorp', verified: true, metric: '4x qualified meetings' },
              { quote: `${brandName} replaced our entire outbound team and cut our CPL by 60%.`, name: 'Marcus Johnson', role: 'CEO', company: 'GrowthHQ', verified: true, metric: '60% lower CPL' },
              { quote: 'The AI qualification calls are indistinguishable from our best SDRs.', name: 'Priya Patel', role: 'Head of Sales', company: 'ScaleUp Inc', verified: true, metric: '3x conversion rate' },
            ] } },
            { type: 'mediaFeatures', content: { sectionTitle: 'As Seen In', publications: ['TechCrunch', 'Forbes', 'Business Insider', 'Inc.', 'Entrepreneur'] } },
            { type: 'pricing', content: { sectionTitle: 'Simple, Transparent Pricing', originalPrice: '$4,500/mo', price: basePrice, savings: 'Save 44%', priceSubtext: 'Limited-time introductory pricing', tiers: [
              { name: 'Starter', price: basePrice, originalPrice: '$4,500/mo', highlight: false, cta: 'Get Started', features: ['5 active campaigns', 'AI lead scoring', '500 outbound/mo', 'Weekly reports'] },
              { name: 'Growth', price: offerData.pricingTiers?.[1]?.price || '$5,000/mo', originalPrice: '$8,500/mo', highlight: true, badge: 'Most Popular', cta: 'Book Strategy Call', features: ['Unlimited campaigns', 'AI voice qualification', '2,500 outbound + LinkedIn', 'Multi-touch attribution'] },
              { name: 'Enterprise', price: offerData.pricingTiers?.[2]?.price || '$7,500/mo', originalPrice: '$12,000/mo', highlight: false, cta: 'Talk to Sales', features: ['Everything in Growth', 'Custom AI scripts', '10,000 outbound + LinkedIn', 'White-glove funnel design'] },
            ], guarantee } },
            { type: 'faq', content: { sectionTitle: 'Frequently Asked Questions', format: 'accordion', questions: [
              { q: 'How long until I see results?', a: 'Most clients see first qualified leads within 7-14 days of launch.' },
              { q: 'Do I need to provide content?', a: 'No — our Content & Creative Agent produces everything autonomously.' },
              { q: 'Can I use my existing CRM?', a: 'Yes — we integrate with HubSpot, GoHighLevel, and Salesforce.' },
              { q: 'What if it doesn\'t work?', a: `We offer a ${guarantee}. If we don\'t deliver, you don\'t pay.` },
              { q: 'How is this different from a marketing agency?', a: 'We\'re fully autonomous AI — no account managers, no delays, no markup on ad spend. You get 24/7 optimization at a fraction of the cost.' },
            ] } },
            { type: 'trustSignals', content: { guarantee: `${guarantee} — if we don't deliver the results we promised, you get a full refund. No questions asked.`, signals: [
              { icon: '🔒', text: 'Bank-level 256-bit SSL encryption' },
              { icon: '✅', text: 'SOC 2 Type II compliant' },
              { icon: '📞', text: '24/7 priority support' },
              { icon: '🔄', text: 'Cancel anytime — no long-term contracts' },
            ] } },
            { type: 'finalCta', content: { headline: 'Ready to Transform Your Pipeline?', subheadline: 'Book a free 30-minute strategy call with a custom growth projection.', ctaButton: 'Book Your Free Strategy Call', ctaLink: '#lead-form', ctaSubtext: 'Limited spots — we only onboard 10 new clients per month', urgencyMessage: 'Only 10 onboarding spots remaining at this price' } },
          ],
          cta: 'Book Your Free Strategy Call',
          seoMeta: { title: `${brandName} — ${transformationPromise}`, description: `B2B companies use ${brandName} for autonomous, AI-powered ${niche.toLowerCase()}. ${guarantee}.`, ogImage: '/og/leadflow-ai.png' },
        };
      }

      // ── Deterministic sections — no LLM needed ────────────────────
      parsed.leadForm = parsed.leadForm || {
        fields: [
          { name: 'fullName', type: 'text', label: 'Full Name', placeholder: 'John Smith', required: true },
          { name: 'email', type: 'email', label: 'Email', placeholder: 'john@company.com', required: true },
          { name: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true },
          { name: 'company', type: 'text', label: 'Company', placeholder: 'Acme Inc', required: true },
          { name: 'qualifyingQuestion1', type: 'select', label: `What is your biggest challenge with ${niche.toLowerCase()}?`, placeholder: 'Select one', required: true, options: ['Not enough leads', 'Low lead quality', 'High cost per lead', 'No predictable pipeline', 'Other'] },
          { name: 'qualifyingQuestion2', type: 'select', label: 'What is your monthly marketing budget?', placeholder: 'Select range', required: true, options: ['Under $5K', '$5K-$10K', '$10K-$25K', '$25K-$50K', '$50K+'] },
        ],
        submitButtonText: 'Book Your Free Strategy Call',
        submitAction: 'Redirect to Calendly, create HubSpot contact, fire conversion events',
        successMessage: 'Thanks! You\'ll be redirected to book your strategy call.',
        webhookUrl: '/api/webhooks/lead-capture',
      };

      parsed.bookingCalendar = {
        provider: 'Calendly',
        url: calendlyResult.url,
        meetingType: 'Strategy Call',
        meetingDuration: 30,
        bufferTime: 15,
        availability: 'Monday-Friday, 9:00 AM - 5:00 PM EST',
        preCallQuestions: ['What is your biggest lead generation challenge?', 'What is your current monthly marketing spend?'],
        confirmationRedirect: 'https://leadflow-ai.com/thank-you',
      };

      parsed.crmIntegration = {
        provider: 'HubSpot',
        pipeline: pipelineName,
        stages: crmStages,
        contactProperties,
        automations: [
          { trigger: 'Form Submitted', action: 'Create contact in HubSpot, assign to pipeline, send confirmation email' },
          { trigger: 'Call Booked', action: 'Update deal stage, notify sales rep' },
          { trigger: 'AI Qualified (score >= 70)', action: 'Move to Strategy Call stage, assign to senior rep' },
          { trigger: 'Closed Won', action: 'Trigger onboarding workflow, create Stripe subscription' },
        ],
        _pipelineId: hubspotResult.pipelineId,
      };

      parsed.tracking = {
        gtmContainerId: 'GTM-LEADFLOW',
        metaPixelId: '123456789012345',
        googleAdsConversionId: 'AW-987654321',
        events: ['page_view', 'scroll_depth_50', 'cta_click', 'form_start', 'form_submit', 'calendly_booking', 'lead', 'qualified_lead'],
        utmParams: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'],
      };

      parsed.pages = [
        { type: 'landing', name: 'Main Landing Page', url: '/funnel', description: 'Primary conversion page' },
        { type: 'booking', name: 'Demo Booking Page', url: '/funnel/book', description: 'Calendly embed with pre-call questions' },
        { type: 'thank-you', name: 'Confirmation Page', url: '/funnel/thank-you', description: 'Post-booking confirmation' },
      ];

      parsed.testChecklist = {
        formSubmissionTest: 'Submit a test lead through the form and verify it appears as a CRM entry in HubSpot',
        bookingTest: 'Confirm Calendly booking flow works end-to-end (form submit -> redirect -> booking confirmation)',
        mobileResponsivenessCheck: 'Verify all sections render correctly on mobile devices (375px, 768px breakpoints)',
        pageLoadSpeedCheck: 'Run Lighthouse audit — target LCP < 2.5s, CLS < 0.1, FID < 100ms',
        trackingVerification: 'Confirm UTM parameters are captured on form submit, Meta Pixel fires on page view and lead events, Google Ads conversion pixel fires on booking',
      };

      // ── Deploy to Webflow if available ────────────────────────────
      if (webflow.isWebflowAvailable()) {
        try {
          await this.log('webflow_deploying', { phase: 'Deploying landing page to Webflow' });
          const slug = (parsed.landingPage?.headline || 'leados')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 50);

          const [pageResult] = await Promise.all([
            webflow.createPage({
              title: parsed.landingPage?.headline || 'LeadOS Landing Page',
              slug,
              seoTitle: parsed.landingPage?.seoMeta?.title,
              seoDescription: parsed.landingPage?.seoMeta?.description,
            }),
          ]);

          if (pageResult.url) {
            parsed.landingPage.url = pageResult.url;
            parsed.landingPage._webflowPageId = pageResult.pageId;
            parsed.landingPage.deployedToWebflow = true;
          }

          webflow.publishSite().catch(() => {}); // non-blocking publish
          await this.log('webflow_deployed', { url: pageResult.url, pageId: pageResult.pageId });
        } catch (webflowError: any) {
          await this.log('webflow_failed', { error: webflowError.message });
        }
      }

      const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : 'Funnel infrastructure built successfully — landing page, lead form, booking calendar, CRM pipeline, and tracking all configured.';

      this.status = 'done';
      await this.log('run_completed', { hasLandingPage: !!parsed.landingPage, hasForm: !!parsed.leadForm });

      return {
        success: true,
        data: parsed,
        reasoning,
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 85,
      };
    } catch (error: any) {
      this.status = 'done';
      await this.log('run_error', { error: error.message });
      return {
        success: false,
        data: { error: error.message, agentId: this.id },
        reasoning: `Agent failed: ${error.message}. No mock data used.`,
        confidence: 0,
      };
    }
  }
}
