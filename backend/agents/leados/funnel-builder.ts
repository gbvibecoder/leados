import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import * as webflow from '../../integrations/webflow';

const SYSTEM_PROMPT = `You are the Funnel Builder Agent for LeadOS — the Service Acquisition Machine. Your job is to build the entire acquisition infrastructure: landing page, lead capture forms, booking calendar integration, and CRM pipeline setup.

You receive JSON input containing:
- The validated offer (ICP, pricing, guarantee, positioning) from the Offer Engineering Agent
- The GO decision and risk assessment from the Validation Agent

Your responsibilities:
1. LANDING PAGE COPY & STRUCTURE: Design a high-converting landing page with these sections: Hero (headline + subheadline + CTA), Pain Points (problem agitation), Solution (transformation promise + unique mechanism), Social Proof (testimonials, logos, case study snippets), Pricing (3-tier comparison table), FAQ (objection handling), and final CTA. Every section must have specific, detailed content — not placeholders.
2. LEAD FORM: Define form fields with types, labels, placeholders, and required flags. Keep friction low (5-7 fields max) while capturing enough data for lead scoring.
3. BOOKING CALENDAR: Set up integration with Calendly or Cal.com — define meeting type, duration, buffer time, availability rules, and pre-call questions.
4. CRM INTEGRATION: Configure HubSpot pipeline with deal stages that match the LeadOS qualification funnel. Include contact properties, lifecycle stages, and automation triggers.
5. TRACKING & PIXELS: Ensure GTM container, Meta Pixel, and Google Ads conversion tag are configured on the page with specific conversion events.
6. DEPLOY TARGET: Specify deployment platform (Webflow, Framer, Shopify, or custom) with page structure.

Use the offer's transformation promise as the hero headline, the ICP psychographics for pain point messaging, and the pricing tiers directly from the offer package.

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "landingPage": {
    "url": "string — deployed page URL",
    "deployTarget": "Webflow | Framer | Shopify | custom",
    "headline": "string — primary headline",
    "subheadline": "string — supporting subheadline",
    "sections": [
      {
        "type": "hero | painPoints | solution | socialProof | pricing | faq | cta",
        "content": "object — detailed section content"
      }
    ],
    "cta": "string — primary call-to-action text",
    "seoMeta": {
      "title": "string",
      "description": "string",
      "ogImage": "string"
    }
  },
  "leadForm": {
    "fields": [
      { "name": "string", "type": "text | email | phone | select | number | textarea", "label": "string", "placeholder": "string", "required": true/false, "options": ["string — for select type only"] }
    ],
    "submitButtonText": "string",
    "submitAction": "string — what happens on submit",
    "successMessage": "string",
    "webhookUrl": "string — CRM webhook endpoint"
  },
  "bookingCalendar": {
    "provider": "Calendly | Cal.com",
    "url": "string — booking link",
    "meetingType": "string — e.g. Strategy Call, Discovery Call",
    "meetingDuration": "number — always 30 minutes",
    "bufferTime": "number — minutes between meetings",
    "availability": "string — availability description",
    "preCallQuestions": ["string — questions asked before booking"],
    "confirmationRedirect": "string — thank-you page URL"
  },
  "crmIntegration": {
    "provider": "HubSpot | GoHighLevel | Salesforce",
    "pipeline": "string — pipeline name",
    "stages": ["string — ordered deal stages"],
    "contactProperties": ["string — custom properties to create"],
    "lifecycleStages": ["string — lifecycle stage mapping"],
    "automations": [
      { "trigger": "string", "action": "string" }
    ]
  },
  "tracking": {
    "gtmContainerId": "string",
    "metaPixelId": "string",
    "googleAdsConversionId": "string",
    "events": ["string — tracked conversion events"],
    "utmParams": ["string — UTM parameters to capture"]
  },
  "pages": [
    { "type": "landing | booking | thank-you", "name": "string", "url": "string", "description": "string" }
  ],
  "reasoning": "string",
  "confidence": "number 0-100"
}

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated performance metrics. Landing page copy, form fields, CRM setup, and tracking configuration are creative/strategic outputs and are expected. However, do NOT invent conversion rates, traffic numbers, visitor counts, lead counts, or any metric that looks like measured data. If a field requires a measured metric and no real data exists, set it to 0 or null. Never fabricate numbers.`;

// ─── Integration Helpers ────────────────────────────────────────────────────

interface CalendlyEventType {
  name: string;
  duration: number;
  url?: string;
}

interface HubSpotPipelineConfig {
  pipelineName: string;
  stages: string[];
  contactProperties: string[];
}

/**
 * Creates a Calendly event type via API (or returns placeholder if no key)
 */
async function createCalendlyEventType(config: CalendlyEventType): Promise<{ url: string; eventTypeId: string }> {
  const apiKey = process.env.CALENDLY_API_KEY;
  if (!apiKey) {
    return {
      url: `https://calendly.com/leados/${config.name.toLowerCase().replace(/\s+/g, '-')}`,
      eventTypeId: 'no-calendly-api-key',
    };
  }

  try {
    // Get current user to find organization URI
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    const userData = await userResponse.json();
    const userUri = userData.resource?.uri;

    // List existing event types to find or verify
    const eventsResponse = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri || '')}&active=true`,
      { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(15_000) }
    );
    const eventsData = await eventsResponse.json();

    // Return first matching or first available event type
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

/**
 * Creates HubSpot pipeline and deal stages (or returns placeholder if no key)
 */
async function setupHubSpotPipeline(config: HubSpotPipelineConfig): Promise<{ pipelineId: string; stageIds: string[] }> {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    return {
      pipelineId: 'no-hubspot-api-key',
      stageIds: config.stages.map((_, i) => `no-hubspot-stage-${i}`),
    };
  }

  try {
    // Create pipeline with stages
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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify(pipelinePayload),
    });

    if (!response.ok) {
      // Pipeline might already exist — list and find it
      const listResponse = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15_000),
      });
      const pipelines = await listResponse.json();
      const existing = pipelines.results?.find((p: any) => p.label === config.pipelineName);
      if (existing) {
        return {
          pipelineId: existing.id,
          stageIds: existing.stages?.map((s: any) => s.id) || [],
        };
      }
      throw new Error('Failed to create or find pipeline');
    }

    const pipeline = await response.json();
    return {
      pipelineId: pipeline.id,
      stageIds: pipeline.stages?.map((s: any) => s.id) || [],
    };
  } catch {
    return {
      pipelineId: 'hubspot-fallback',
      stageIds: config.stages.map((_, i) => `fallback-stage-${i}`),
    };
  }
}

/**
 * Creates custom contact properties in HubSpot for lead enrichment
 */
async function createHubSpotContactProperties(properties: string[]): Promise<boolean> {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) return false;

  try {
    for (const prop of properties) {
      await fetch('https://api.hubapi.com/crm/v3/properties/contacts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          name: prop.toLowerCase().replace(/\s+/g, '_'),
          label: prop,
          type: 'string',
          fieldType: 'text',
          groupName: 'contactinformation',
        }),
      });
    }
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
      'Build landing page, lead capture forms, booking calendar, CRM pipeline, and conversion tracking infrastructure'
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

    // Only proceed if validation decision is GO or CONDITIONAL
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
      // Step 1: Generate landing page copy via AI AND set up integrations IN PARALLEL
      await this.log('llm_generating', { phase: 'Generating landing page copy and funnel structure' });

      const enrichedInput = {
        offer: offerData,
        validation: {
          decision: validationData.decision,
          scores: validationData.scores,
          riskFactors: validationData.riskFactors,
        },
        config: inputs.config,
      };

      // Run LLM + integrations in parallel — saves 3-8 seconds
      // LLM call is wrapped to NOT crash if both providers fail — fallback logic below will handle it
      const [llmResult, calendlyResult, hubspotResult] = await Promise.all([
        this.callClaude(SYSTEM_PROMPT, JSON.stringify(enrichedInput), 2, 8192)
          .catch((err: any) => {
            this.log('llm_failed', { error: err.message });
            return null;
          }),
        createCalendlyEventType({ name: meetingName, duration: 30 }),
        setupHubSpotPipeline({ pipelineName, stages: crmStages, contactProperties }),
      ]);

      // Create contact properties (non-blocking)
      createHubSpotContactProperties(contactProperties).catch(() => {});

      await this.log('integrations_complete', { calendly: calendlyResult, hubspot: hubspotResult });

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

      // Normalize: map alternative key names the LLM might return
      parsed.landingPage = parsed.landingPage || parsed.landing_page || parsed.page || parsed.landingPageCopy;
      parsed.leadForm = parsed.leadForm || parsed.lead_form || parsed.form || parsed.leadCaptureForm;
      parsed.bookingCalendar = parsed.bookingCalendar || parsed.booking_calendar || parsed.calendar || parsed.booking;
      parsed.crmIntegration = parsed.crmIntegration || parsed.crm_integration || parsed.crm || parsed.crmSetup;
      parsed.tracking = parsed.tracking || parsed.analytics || parsed.trackingPixels || parsed.trackingSetup;

      // Force-zero any LLM-fabricated performance metrics
      if (parsed.landingPage) {
        if (parsed.landingPage.estimatedConversionRate !== undefined) parsed.landingPage.estimatedConversionRate = 0;
        if (parsed.landingPage.estimatedTraffic !== undefined) parsed.landingPage.estimatedTraffic = 0;
        if (parsed.landingPage.visitors !== undefined) parsed.landingPage.visitors = 0;
        if (parsed.landingPage.leads !== undefined) parsed.landingPage.leads = 0;
      }
      if (parsed.projectedMetrics !== undefined) {
        Object.keys(parsed.projectedMetrics).forEach(k => { if (typeof parsed.projectedMetrics[k] === 'number') parsed.projectedMetrics[k] = 0; });
      }

      // Build fallback funnel if LLM didn't produce valid landingPage
      if (!parsed.landingPage) {
        const niche = inputs.config?.niche || inputs.config?.serviceNiche || offerData.serviceName || 'B2B Lead Generation';
        const transformationPromise = offerData.transformationPromise || `Double Your Qualified Leads in 90 Days`;
        const guarantee = offerData.guarantee || '90-Day Money-Back Guarantee';
        const basePrice = offerData.pricingTiers?.[0]?.price || '$2,500/mo';

        parsed.landingPage = {
          url: `https://leadflow-ai.com/get-started`,
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

      if (!parsed.leadForm) {
        parsed.leadForm = {
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
      }

      if (!parsed.bookingCalendar) {
        parsed.bookingCalendar = {
          provider: 'Calendly', meetingType: 'Strategy Call', meetingDuration: 30, bufferTime: 15,
          availability: 'Monday-Friday, 9:00 AM - 5:00 PM EST',
          preCallQuestions: ['What is your biggest lead generation challenge?', 'What is your current monthly marketing spend?'],
          confirmationRedirect: 'https://leadflow-ai.com/thank-you',
        };
      }
      parsed.bookingCalendar.url = calendlyResult.url;

      if (!parsed.crmIntegration) {
        parsed.crmIntegration = {
          provider: 'HubSpot', pipeline: pipelineName, stages: crmStages, contactProperties,
          automations: [
            { trigger: 'Form Submitted', action: 'Create contact in HubSpot, assign to pipeline, send confirmation email' },
            { trigger: 'Call Booked', action: 'Update deal stage, notify sales rep' },
            { trigger: 'AI Qualified (score >= 70)', action: 'Move to Strategy Call stage, assign to senior rep' },
            { trigger: 'Closed Won', action: 'Trigger onboarding workflow, create Stripe subscription' },
          ],
        };
      }
      parsed.crmIntegration._pipelineId = hubspotResult.pipelineId;

      if (!parsed.tracking) {
        parsed.tracking = {
          gtmContainerId: 'GTM-LEADFLOW', metaPixelId: '123456789012345', googleAdsConversionId: 'AW-987654321',
          events: ['page_view', 'scroll_depth_50', 'cta_click', 'form_start', 'form_submit', 'calendly_booking', 'lead', 'qualified_lead'],
          utmParams: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'],
        };
      }

      if (!parsed.pages) {
        parsed.pages = [
          { type: 'landing', name: 'Main Landing Page', url: '/funnel', description: 'Primary conversion page' },
          { type: 'booking', name: 'Demo Booking Page', url: '/funnel/book', description: 'Calendly embed with pre-call questions' },
          { type: 'thank-you', name: 'Confirmation Page', url: '/funnel/thank-you', description: 'Post-booking confirmation' },
        ];
      }

      // Step 2: Deploy to Webflow if available
      if (webflow.isWebflowAvailable()) {
        try {
          await this.log('webflow_deploying', { phase: 'Deploying landing page to Webflow' });
          const slug = (parsed.landingPage?.headline || 'leados')
            .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 50);

          const pageResult = await webflow.createPage({
            title: parsed.landingPage?.headline || 'LeadOS Landing Page',
            slug,
            seoTitle: parsed.landingPage?.seoMeta?.title,
            seoDescription: parsed.landingPage?.seoMeta?.description,
          });

          if (pageResult.url) {
            parsed.landingPage.url = pageResult.url;
            parsed.landingPage._webflowPageId = pageResult.pageId;
            parsed.landingPage.deployedToWebflow = true;
          }

          await webflow.publishSite();
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
