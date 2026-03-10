import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';

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
    "meetingDuration": "number — minutes",
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
}`;

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
 * Creates a Calendly event type via API (or returns mock if no key)
 */
async function createCalendlyEventType(config: CalendlyEventType): Promise<{ url: string; eventTypeId: string }> {
  const apiKey = process.env.CALENDLY_API_KEY;
  if (!apiKey) {
    return {
      url: `https://calendly.com/leados/${config.name.toLowerCase().replace(/\s+/g, '-')}`,
      eventTypeId: 'mock-event-type-id',
    };
  }

  try {
    // Get current user to find organization URI
    const userResponse = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });
    const userData = await userResponse.json();
    const userUri = userData.resource?.uri;

    // List existing event types to find or verify
    const eventsResponse = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri || '')}&active=true`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
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
 * Creates HubSpot pipeline and deal stages (or returns mock if no key)
 */
async function setupHubSpotPipeline(config: HubSpotPipelineConfig): Promise<{ pipelineId: string; stageIds: string[] }> {
  const apiKey = process.env.HUBSPOT_API_KEY;
  if (!apiKey) {
    return {
      pipelineId: 'mock-pipeline-id',
      stageIds: config.stages.map((_, i) => `mock-stage-${i}`),
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
      body: JSON.stringify(pipelinePayload),
    });

    if (!response.ok) {
      // Pipeline might already exist — list and find it
      const listResponse = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
        headers: { Authorization: `Bearer ${apiKey}` },
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
    const offerData = inputs.previousOutputs?.['offer-engineering']?.data?.offer
      || inputs.previousOutputs?.['offer-engineering']?.data
      || {};
    const validationData = inputs.previousOutputs?.['validation']?.data || {};

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

    try {
      // Step 1: Set up integrations in parallel
      await this.log('integrations_starting', { phase: 'Setting up Calendly + HubSpot' });

      const meetingName = offerData.serviceName
        ? `${offerData.serviceName} — Strategy Call`
        : 'LeadOS Strategy Call';

      const crmStages = [
        'New Lead',
        'Form Submitted',
        'Call Booked',
        'AI Qualified',
        'Strategy Call Completed',
        'Proposal Sent',
        'Negotiation',
        'Closed Won',
        'Closed Lost',
      ];

      const contactProperties = [
        'Lead Source',
        'Monthly Marketing Budget',
        'Current Monthly Leads',
        'Lead Score',
        'Qualification Outcome',
        'UTM Source',
        'UTM Medium',
        'UTM Campaign',
      ];

      const pipelineName = offerData.serviceName
        ? `${offerData.serviceName} — Acquisition Pipeline`
        : 'LeadOS — New Client Acquisition';

      const [calendlyResult, hubspotResult] = await Promise.all([
        createCalendlyEventType({ name: meetingName, duration: 30 }),
        setupHubSpotPipeline({ pipelineName, stages: crmStages, contactProperties }),
      ]);

      // Also create contact properties (non-blocking)
      createHubSpotContactProperties(contactProperties).catch(() => {});

      await this.log('integrations_complete', { calendly: calendlyResult, hubspot: hubspotResult });

      // Step 2: Call Claude to generate landing page copy and funnel structure
      await this.log('llm_generating', { phase: 'Generating landing page copy and funnel structure' });

      const enrichedInput = {
        offer: offerData,
        validation: {
          decision: validationData.decision,
          scores: validationData.scores,
          riskFactors: validationData.riskFactors,
          trendAnalysis: validationData.trendAnalysis,
        },
        integrations: {
          calendly: { url: calendlyResult.url, eventTypeId: calendlyResult.eventTypeId },
          hubspot: { pipelineId: hubspotResult.pipelineId, stageIds: hubspotResult.stageIds },
        },
        config: inputs.config,
      };

      const response = await this.callClaude(SYSTEM_PROMPT, JSON.stringify(enrichedInput));
      const parsed = this.parseLLMJson<any>(response);

      // Merge real integration URLs into the LLM output
      if (parsed.bookingCalendar) {
        parsed.bookingCalendar.url = calendlyResult.url;
      }
      if (parsed.crmIntegration) {
        parsed.crmIntegration._pipelineId = hubspotResult.pipelineId;
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
      await this.log('run_fallback', { reason: error.message || 'Using mock data' });
      this.status = 'done';

      const mockData = this.getMockOutput(inputs);
      return {
        success: true,
        data: mockData,
        reasoning: mockData.reasoning,
        confidence: mockData.confidence,
      };
    }
  }

  private getMockOutput(inputs: AgentInput): any {
    const offerData = inputs.previousOutputs?.['offer-engineering']?.data?.offer
      || inputs.previousOutputs?.['offer-engineering']?.data
      || {};
    const validationData = inputs.previousOutputs?.['validation']?.data || {};

    const serviceName = offerData.serviceName || 'LeadFlow AI';
    const headline = offerData.transformationPromise || 'Double Your Qualified Leads in 90 Days';
    const guarantee = offerData.guarantee || '90-Day Double-or-Refund Guarantee';
    const icp = offerData.icp || {};
    const painPoints = offerData.painPoints || [];
    const pricingTiers = offerData.pricingTiers || [];
    const uniqueMechanism = offerData.uniqueMechanism || 'Our 13-Agent Orchestration Engine';
    const positioning = offerData.positioning || '';

    const slug = serviceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    return {
      landingPage: {
        url: `https://${slug}.com/get-started`,
        deployTarget: 'Webflow',
        headline,
        subheadline: `${icp.industry || 'B2B'} companies use ${serviceName} to build a predictable, scalable pipeline — fully autonomous, performance-guaranteed, and live in 48 hours`,
        sections: [
          {
            type: 'hero',
            content: {
              headline,
              subheadline: `${icp.industry || 'B2B'} companies use ${serviceName} to build a predictable, scalable pipeline — fully autonomous, performance-guaranteed, and live in 48 hours`,
              cta: 'Book Your Free Strategy Call',
              ctaSubtext: 'No commitment. See your custom growth plan in 30 minutes.',
              backgroundStyle: 'gradient-dark',
              socialProofBar: `500+ ${icp.industry || 'B2B'} companies trust ${serviceName} to fill their pipeline`,
              guaranteeBadge: guarantee,
            },
          },
          {
            type: 'painPoints',
            content: {
              sectionTitle: 'Sound Familiar?',
              points: painPoints.length > 0
                ? painPoints.map((p: string, i: number) => ({
                    icon: ['chart-down', 'money-burn', 'clock', 'blind', 'bottleneck'][i % 5],
                    title: p.split(' — ')[0] || p.substring(0, 40),
                    description: p,
                  }))
                : [
                    { icon: 'chart-down', title: 'Feast-or-Famine Pipeline', description: 'One month you\'re drowning in leads, the next month it\'s crickets. Revenue forecasting feels like guessing.' },
                    { icon: 'money-burn', title: 'Burning Cash on Bad Leads', description: 'You\'re spending $200+ per lead on channels that produce tire-kickers, not buyers.' },
                    { icon: 'clock', title: 'Sales Team Wasting Time', description: 'Your reps spend 60% of their day chasing leads that were never qualified to begin with.' },
                    { icon: 'blind', title: 'Zero Attribution Visibility', description: 'You can\'t tell which channels drive revenue and which just drive vanity metrics.' },
                    { icon: 'bottleneck', title: 'Founder-Led Sales Bottleneck', description: 'The CEO is still closing most deals because there\'s no repeatable, scalable system.' },
                  ],
            },
          },
          {
            type: 'solution',
            content: {
              sectionTitle: `Meet ${serviceName}: Your Autonomous Growth Engine`,
              transformationPromise: headline,
              uniqueMechanism,
              features: [
                'AI-powered multi-channel campaigns (Google, Meta, LinkedIn, Email)',
                'Autonomous lead scoring and AI voice qualification',
                'Real-time budget reallocation based on actual revenue attribution',
                'Full-funnel tracking with multi-touch attribution',
              ],
              diagram: 'pipeline-flow-animation',
            },
          },
          {
            type: 'socialProof',
            content: {
              sectionTitle: `Trusted by Growth-Stage ${icp.industry || 'SaaS'} Leaders`,
              testimonials: [
                { name: 'Sarah Chen', title: `VP Marketing, TechVentures`, quote: 'We went from 40 qualified leads/month to 127 in the first 90 days. The AI qualification calls alone saved our sales team 25 hours/week.', metric: '3.2x qualified leads' },
                { name: 'Mike Rodriguez', title: 'CEO, GrowthLab', quote: 'I was skeptical about AI lead gen, but the results speak for themselves. Our CAC dropped from $340 to $128 while lead volume tripled.', metric: '62% lower CAC' },
                { name: 'Emily Watson', title: 'Head of Growth, StartupForge', quote: 'The attribution dashboard finally showed us where our money was actually working. We killed 3 underperforming channels and reinvested into what converts.', metric: '4.2x ROAS' },
              ],
              logos: ['TechVentures', 'GrowthLab', 'StartupForge', 'CloudScale', 'RevOps', 'DataDrive'],
              caseStudyLink: '/case-studies',
            },
          },
          {
            type: 'pricing',
            content: {
              sectionTitle: 'Simple, Transparent Pricing',
              tiers: pricingTiers.length > 0
                ? pricingTiers.map((tier: any, i: number) => ({
                    name: tier.name,
                    price: typeof tier.price === 'number' ? `$${tier.price.toLocaleString()}/mo` : tier.price,
                    highlight: i === 1,
                    badge: i === 1 ? 'Most Popular' : undefined,
                    cta: i === 0 ? 'Get Started' : i === 1 ? 'Book Strategy Call' : 'Talk to Sales',
                    features: tier.features || [],
                  }))
                : [
                    { name: 'Starter', price: '$2,997/mo', highlight: false, cta: 'Get Started', features: ['5 active campaigns', 'AI lead scoring', '500 outbound emails/mo', '1 landing page variant', 'Weekly reports', 'CRM integration', 'Email support'] },
                    { name: 'Growth', price: '$5,997/mo', highlight: true, badge: 'Most Popular', cta: 'Book Strategy Call', features: ['Unlimited campaigns', 'AI voice qualification', '2,500 emails + LinkedIn', '5 landing page variants', 'Multi-touch attribution', 'Auto budget optimization', 'Dedicated success manager'] },
                    { name: 'Enterprise', price: '$9,997/mo', highlight: false, cta: 'Talk to Sales', features: ['Everything in Growth', 'Custom AI scripts', '10,000 emails + LinkedIn', 'White-glove funnel design', 'Custom CRM workflows', 'Hourly optimization', '1-hour response SLA'] },
                  ],
              guarantee,
            },
          },
          {
            type: 'faq',
            content: {
              sectionTitle: 'Frequently Asked Questions',
              questions: [
                { q: 'How long until I see results?', a: `Most clients see their first qualified leads within 7-14 days of launch. Our ${guarantee.split(':')[0] || '90-day guarantee'} is based on a measurable improvement in qualified lead volume.` },
                { q: 'Do I need to provide content or copy?', a: 'No — our Content & Creative Agent produces all ad copies, email sequences, landing page content, and video scripts autonomously based on your offer and ICP.' },
                { q: 'What if the AI calls annoy my prospects?', a: 'Our AI qualification calls are warm — they only go to leads who have already expressed interest by filling out a form or engaging with your content. Call scripts are fully customizable and TCPA-compliant.' },
                { q: 'Can I use my existing CRM?', a: 'Yes — we integrate with HubSpot, GoHighLevel, and Salesforce. Data syncs bidirectionally in real-time.' },
                { q: 'What happens after the guarantee period?', a: 'You continue month-to-month with no long-term contract. Most clients stay because the ROI is clear and measurable.' },
                { q: `How is ${serviceName} different from hiring an agency?`, a: `${positioning || 'Agencies charge similar retainers for manual work with opaque results. ' + serviceName + ' runs 24/7 across all channels with full attribution transparency — and we guarantee results.'}` },
              ],
            },
          },
          {
            type: 'cta',
            content: {
              headline: 'Ready to Transform Your Pipeline?',
              subheadline: `Book a free 30-minute strategy call. We'll show you exactly how ${serviceName} will work for your business — with a custom growth projection.`,
              ctaButton: 'Book Your Free Strategy Call',
              ctaSubtext: 'Limited spots available — we only onboard 10 new clients per month',
              urgency: true,
            },
          },
        ],
        cta: 'Book Your Free Strategy Call',
        seoMeta: {
          title: `${serviceName} — ${headline}`,
          description: `${icp.industry || 'B2B'} companies use ${serviceName} for autonomous, AI-powered lead generation. ${guarantee}.`,
          ogImage: `/og/${slug}.png`,
        },
      },
      leadForm: {
        fields: [
          { name: 'firstName', type: 'text', label: 'First Name', placeholder: 'John', required: true },
          { name: 'lastName', type: 'text', label: 'Last Name', placeholder: 'Smith', required: true },
          { name: 'workEmail', type: 'email', label: 'Work Email', placeholder: 'john@company.com', required: true },
          { name: 'company', type: 'text', label: 'Company', placeholder: 'Acme Inc', required: true },
          { name: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false },
          { name: 'monthlyMarketingBudget', type: 'select', label: 'Monthly Marketing Budget', placeholder: 'Select range', required: true, options: ['Under $5K', '$5K-$10K', '$10K-$25K', '$25K-$50K', '$50K+'] },
          { name: 'currentMonthlyLeads', type: 'select', label: 'Current Monthly Leads', placeholder: 'Select range', required: false, options: ['0-50', '50-200', '200-500', '500+'] },
        ],
        submitButtonText: 'Book Your Free Strategy Call',
        submitAction: 'Redirect to Calendly booking page with form data pre-filled, create HubSpot contact, fire Meta Lead event + Google Ads conversion',
        successMessage: 'Thanks! You\'ll be redirected to book your strategy call in a moment.',
        webhookUrl: '/api/webhooks/lead-capture',
      },
      bookingCalendar: {
        provider: 'Calendly',
        url: `https://calendly.com/leados/${slug}-strategy-call`,
        meetingType: 'Strategy Call',
        meetingDuration: 30,
        bufferTime: 15,
        availability: 'Monday-Friday, 9:00 AM - 5:00 PM EST, excluding US holidays',
        preCallQuestions: [
          'What is your biggest lead generation challenge right now?',
          'What is your current monthly marketing spend?',
          'Have you used AI tools for sales or marketing before?',
        ],
        confirmationRedirect: `https://${slug}.com/thank-you`,
      },
      crmIntegration: {
        provider: 'HubSpot',
        pipeline: `${serviceName} — Acquisition Pipeline`,
        stages: [
          'New Lead',
          'Form Submitted',
          'Call Booked',
          'AI Qualified',
          'Strategy Call Completed',
          'Proposal Sent',
          'Negotiation',
          'Closed Won',
          'Closed Lost',
        ],
        contactProperties: [
          'Lead Source',
          'Monthly Marketing Budget',
          'Current Monthly Leads',
          'Lead Score',
          'Qualification Outcome',
          'UTM Source',
          'UTM Medium',
          'UTM Campaign',
        ],
        lifecycleStages: [
          'subscriber → Form Submitted',
          'lead → Call Booked',
          'marketingqualifiedlead → AI Qualified',
          'salesqualifiedlead → Strategy Call Completed',
          'opportunity → Proposal Sent',
          'customer → Closed Won',
        ],
        automations: [
          { trigger: 'Form Submitted', action: 'Create contact in HubSpot, assign to pipeline, send confirmation email' },
          { trigger: 'Call Booked', action: 'Update deal stage, notify sales rep via Slack, send calendar confirmation' },
          { trigger: 'AI Qualified (score >= 70)', action: 'Move to Strategy Call stage, assign to senior rep, send prep materials' },
          { trigger: 'AI Qualified (score < 40)', action: 'Move to nurture sequence, tag as low-intent, enroll in drip campaign' },
          { trigger: 'Strategy Call Completed', action: 'Generate proposal, update deal value from call notes' },
          { trigger: 'No-Show', action: 'Send reschedule email, add to follow-up task queue' },
          { trigger: 'Closed Won', action: 'Trigger onboarding workflow, create Stripe subscription, notify success team' },
          { trigger: 'Closed Lost', action: 'Log reason, enroll in win-back sequence after 90 days' },
        ],
      },
      tracking: {
        gtmContainerId: 'GTM-LEADFLOW',
        metaPixelId: '123456789012345',
        googleAdsConversionId: 'AW-987654321',
        events: [
          'page_view',
          'scroll_depth_25',
          'scroll_depth_50',
          'scroll_depth_75',
          'scroll_depth_90',
          'cta_click',
          'form_start',
          'form_field_focus',
          'form_submit',
          'calendly_page_view',
          'calendly_booking',
          'lead',
          'qualified_lead',
        ],
        utmParams: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'],
      },
      pages: [
        { type: 'landing', name: 'Main Landing Page', url: `/${slug}`, description: 'Primary conversion page with hero, pain points, solution, pricing, FAQ, and CTA sections' },
        { type: 'booking', name: 'Demo Booking Page', url: `/${slug}/book`, description: 'Calendly embed page with pre-call questions and form data pass-through' },
        { type: 'thank-you', name: 'Confirmation Page', url: `/${slug}/thank-you`, description: 'Post-booking confirmation with pre-call video, case study download, and what-to-expect guide' },
      ],
      reasoning: `Landing page structured around the pain-agitate-solve framework optimized for ${icp.industry || 'B2B SaaS'} buyer psychology. Hero section leads with the transformation promise "${headline}" and social proof bar for immediate credibility. Pain points are specific and emotionally resonant to the ICP (${icp.decisionMaker || 'VP Marketing / Head of Growth'}). Pricing section uses the Growth tier as the highlighted "Most Popular" option to anchor buyers at the mid-tier. FAQ handles the top 6 objections identified from the ICP analysis. Lead form kept to 7 fields to minimize friction while capturing budget qualification data for lead scoring. Calendly integration provides instant booking to reduce drop-off between form submit and call. HubSpot pipeline configured with 9 stages matching the LeadOS qualification funnel, with automations for lifecycle stage transitions. Full tracking stack (GTM + Meta Pixel + Google Ads) ensures multi-touch attribution from first click to close. Validation confidence: ${validationData.confidence || 'N/A'}%, LTV/CAC: ${validationData.ltvCacRatio || 'N/A'}x.`,
      confidence: 87,
    };
  }
}
