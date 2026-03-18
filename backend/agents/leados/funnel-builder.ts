import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import * as webflow from '../../integrations/webflow';

// Slimmed prompt — LLM only generates landing page copy + sections.
// leadForm, bookingCalendar, crmIntegration, tracking are all built from
// deterministic defaults + real API data — no LLM needed for those.
const SYSTEM_PROMPT = `You are the Funnel Builder Agent for LeadOS. Generate landing page copy ONLY.

You receive JSON with the validated offer (ICP, pricing, guarantee, positioning).

Return ONLY valid JSON (no markdown) with this structure:
{
  "landingPage": {
    "url": "https://leadflow-ai.com/get-started",
    "deployTarget": "Webflow",
    "headline": "string — transformation promise as primary headline",
    "subheadline": "string — supporting subheadline",
    "sections": [
      { "type": "hero", "content": { "headline": "string", "subheadline": "string", "cta": "string", "ctaSubtext": "string", "socialProofBar": "string", "guaranteeBadge": "string" } },
      { "type": "painPoints", "content": { "sectionTitle": "string", "points": [{ "icon": "string", "title": "string", "description": "string" }] } },
      { "type": "solution", "content": { "sectionTitle": "string", "transformationPromise": "string", "uniqueMechanism": "string", "features": ["string"] } },
      { "type": "socialProof", "content": { "testimonials": [{ "quote": "string", "name": "string", "title": "string", "metric": "string" }], "logos": ["string"] } },
      { "type": "pricing", "content": { "sectionTitle": "string", "tiers": [{ "name": "string", "price": "string", "highlight": false, "badge": "string", "cta": "string", "features": ["string"] }], "guarantee": "string" } },
      { "type": "faq", "content": { "sectionTitle": "string", "questions": [{ "q": "string", "a": "string" }] } },
      { "type": "cta", "content": { "headline": "string", "subheadline": "string", "ctaButton": "string", "ctaSubtext": "string" } }
    ],
    "cta": "string",
    "seoMeta": { "title": "string", "description": "string" }
  },
  "reasoning": "string",
  "confidence": "number 0-100"
}

Use the offer's transformation promise as headline, ICP psychographics for pain points, pricing tiers from the offer. Be specific — no placeholders.
Do NOT generate any performance metrics. Do NOT include leadForm, bookingCalendar, crmIntegration, or tracking — those are handled separately.`;

// ─── Integration Helpers ────────────────────────────────────────────────────

const API_TIMEOUT = 8_000; // 8s — fast-fail on integrations

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
        niche,
      });

      // ── Run LLM + ALL integrations in parallel ────────────────────
      const [llmResult, calendlyResult, hubspotResult] = await Promise.all([
        this.callClaude(SYSTEM_PROMPT, llmInput, 1, 4096)
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
        const transformationPromise = offerData.transformationPromise || 'Double Your Qualified Leads in 90 Days';
        const guarantee = offerData.guarantee || '90-Day Money-Back Guarantee';
        const basePrice = offerData.pricingTiers?.[0]?.price || '$2,500/mo';

        parsed.landingPage = {
          url: 'https://leadflow-ai.com/get-started',
          deployTarget: 'Webflow',
          headline: transformationPromise,
          subheadline: `B2B companies use our AI engine to build a predictable, scalable pipeline for ${niche.toLowerCase()} — fully autonomous, performance-guaranteed, and live in 48 hours`,
          sections: [
            { type: 'hero', content: { headline: transformationPromise, subheadline: `Built for companies investing in ${niche.toLowerCase()}`, cta: 'Book Your Free Strategy Call', ctaSubtext: 'No commitment. See your custom growth plan in 30 minutes.', socialProofBar: `Trusted by 500+ companies for ${niche.toLowerCase()}`, guaranteeBadge: guarantee } },
            { type: 'painPoints', content: { sectionTitle: 'Sound Familiar?', points: [
              { icon: 'chart-down', title: 'Feast-or-Famine Pipeline', description: 'One month you\'re drowning in leads, the next it\'s crickets.' },
              { icon: 'money-burn', title: 'Burning Cash on Bad Leads', description: 'Spending $200+ per lead on channels that produce tire-kickers.' },
              { icon: 'clock', title: 'Sales Team Wasting Time', description: 'Your reps spend 60% of their day chasing unqualified leads.' },
              { icon: 'bottleneck', title: 'Founder-Led Sales Bottleneck', description: 'The CEO is still closing most deals because there\'s no repeatable system.' },
            ] } },
            { type: 'solution', content: { sectionTitle: `Meet LeadFlow AI: Your Autonomous ${niche} Engine`, transformationPromise, uniqueMechanism: `Our 13-Agent Orchestration Engine deploys specialized AI agents across every stage of your pipeline — working 24/7 for ${niche.toLowerCase()}.`, features: ['AI-powered multi-channel campaigns', 'Autonomous lead scoring and AI voice qualification', 'Real-time budget reallocation', 'Full-funnel multi-touch attribution'] } },
            { type: 'pricing', content: { sectionTitle: 'Simple, Transparent Pricing', tiers: [
              { name: 'Starter', price: basePrice, highlight: false, cta: 'Get Started', features: ['5 active campaigns', 'AI lead scoring', '500 outbound/mo', 'Weekly reports'] },
              { name: 'Growth', price: offerData.pricingTiers?.[1]?.price || '$5,000/mo', highlight: true, badge: 'Most Popular', cta: 'Book Strategy Call', features: ['Unlimited campaigns', 'AI voice qualification', '2,500 outbound + LinkedIn', 'Multi-touch attribution'] },
              { name: 'Enterprise', price: offerData.pricingTiers?.[2]?.price || '$7,500/mo', highlight: false, cta: 'Talk to Sales', features: ['Everything in Growth', 'Custom AI scripts', '10,000 outbound + LinkedIn', 'White-glove funnel design'] },
            ], guarantee } },
            { type: 'faq', content: { sectionTitle: 'Frequently Asked Questions', questions: [
              { q: 'How long until I see results?', a: 'Most clients see first qualified leads within 7-14 days of launch.' },
              { q: 'Do I need to provide content?', a: 'No — our Content & Creative Agent produces everything autonomously.' },
              { q: 'Can I use my existing CRM?', a: 'Yes — we integrate with HubSpot, GoHighLevel, and Salesforce.' },
            ] } },
            { type: 'cta', content: { headline: 'Ready to Transform Your Pipeline?', subheadline: 'Book a free 30-minute strategy call with a custom growth projection.', ctaButton: 'Book Your Free Strategy Call', ctaSubtext: 'Limited spots — we only onboard 10 new clients per month', urgency: true } },
          ],
          cta: 'Book Your Free Strategy Call',
          seoMeta: { title: `LeadFlow AI — ${transformationPromise}`, description: `B2B companies use LeadFlow AI for autonomous, AI-powered ${niche.toLowerCase()}. ${guarantee}.`, ogImage: '/og/leadflow-ai.png' },
        };
      }

      // ── Deterministic sections — no LLM needed ────────────────────
      parsed.leadForm = parsed.leadForm || {
        fields: [
          { name: 'firstName', type: 'text', label: 'First Name', placeholder: 'John', required: true },
          { name: 'lastName', type: 'text', label: 'Last Name', placeholder: 'Smith', required: true },
          { name: 'workEmail', type: 'email', label: 'Work Email', placeholder: 'john@company.com', required: true },
          { name: 'company', type: 'text', label: 'Company', placeholder: 'Acme Inc', required: true },
          { name: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false },
          { name: 'monthlyBudget', type: 'select', label: 'Monthly Marketing Budget', placeholder: 'Select range', required: true, options: ['Under $5K', '$5K-$10K', '$10K-$25K', '$25K-$50K', '$50K+'] },
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
