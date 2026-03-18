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
      // Step 1: Generate landing page copy and funnel structure via AI FIRST
      await this.log('llm_generating', { phase: 'Generating landing page copy and funnel structure' });

      const enrichedInput = {
        offer: offerData,
        validation: {
          decision: validationData.decision,
          scores: validationData.scores,
          riskFactors: validationData.riskFactors,
          trendAnalysis: validationData.trendAnalysis,
        },
        config: inputs.config,
      };

      const response = await this.callClaude(SYSTEM_PROMPT, JSON.stringify(enrichedInput), 3, 8000);
      let parsed: any = {};
      try {
        parsed = this.safeParseLLMJson<any>(response, ['landingPage', 'leadForm']);
      } catch (parseErr: any) {
        await this.log('llm_json_parse_error', { error: parseErr.message });
        parsed = { reasoning: `LLM JSON parse failed: ${parseErr.message}`, confidence: 0 };
      }

      // Force-zero any LLM-fabricated performance metrics
      // Landing page copy and form fields are creative outputs (OK)
      // But any conversion rates, traffic numbers, visitor counts are fabricated
      if (parsed.landingPage) {
        if (parsed.landingPage.estimatedConversionRate !== undefined) parsed.landingPage.estimatedConversionRate = 0;
        if (parsed.landingPage.estimatedTraffic !== undefined) parsed.landingPage.estimatedTraffic = 0;
        if (parsed.landingPage.visitors !== undefined) parsed.landingPage.visitors = 0;
        if (parsed.landingPage.leads !== undefined) parsed.landingPage.leads = 0;
      }
      if (parsed.projectedMetrics !== undefined) {
        Object.keys(parsed.projectedMetrics).forEach(k => { if (typeof parsed.projectedMetrics[k] === 'number') parsed.projectedMetrics[k] = 0; });
      }
      if (parsed.estimatedConversionRate !== undefined) parsed.estimatedConversionRate = 0;
      if (parsed.estimatedTraffic !== undefined) parsed.estimatedTraffic = 0;
      if (parsed.totalLeads !== undefined) parsed.totalLeads = 0;

      // Step 2: AI succeeded — NOW set up integrations
      await this.log('integrations_starting', { phase: 'Setting up Calendly + HubSpot' });

      const [calendlyResult, hubspotResult] = await Promise.all([
        createCalendlyEventType({ name: meetingName, duration: 30 }),
        setupHubSpotPipeline({ pipelineName, stages: crmStages, contactProperties }),
      ]);

      // Create contact properties (non-blocking)
      createHubSpotContactProperties(contactProperties).catch(() => {});

      await this.log('integrations_complete', { calendly: calendlyResult, hubspot: hubspotResult });

      // Merge real integration URLs into the LLM output
      if (parsed.bookingCalendar) {
        parsed.bookingCalendar.url = calendlyResult.url;
      }
      if (parsed.crmIntegration) {
        parsed.crmIntegration._pipelineId = hubspotResult.pipelineId;
      }

      // Step 3: Deploy to Webflow if available
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

          // Publish the site to make changes live
          await webflow.publishSite();
          await this.log('webflow_deployed', { url: pageResult.url, pageId: pageResult.pageId });
        } catch (webflowError: any) {
          await this.log('webflow_failed', { error: webflowError.message });
          // Continue without Webflow — page URL stays as LLM-generated placeholder
        }
      }

      this.status = 'done';
      await this.log('run_completed', { output: parsed });

      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'Funnel infrastructure built successfully',
        confidence: parsed.confidence || 85,
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
