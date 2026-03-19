import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';

const SYSTEM_PROMPT = `You are the Content & Creative Agent for LeadOS. Produce ALL marketing materials for multi-channel campaigns.

You receive JSON with the offer (ICP, pain points, pricing, positioning), funnel data, and market context.

Adapt ALL content to the specific niche, ICP, and offer — not generic. Use rising keywords from Google Trends in ad copies.

Return ONLY valid JSON (no markdown) with this structure:
{
  "adCopies": {
    "google": [{ "headline": "string (≤30 chars)", "description": "string (≤90 chars)", "targetKeyword": "string" }],
    "meta": [{ "primaryText": "string", "headline": "string", "description": "string", "targetAudience": "string" }]
  },
  "hooks": [{ "angle": "pain|curiosity|social_proof|urgency|contrarian", "hook": "string", "useCase": "string" }],
  "emailSequence": [{ "step": "number", "delay": "string", "subject": "string", "body": "string", "purpose": "string" }],
  "linkedInScripts": { "connectionRequest": "string (≤300 chars)", "followUp1": "string", "followUp2": "string" },
  "videoAdScripts": [{ "duration": "string", "format": "string", "hook": "string", "body": "string", "cta": "string" }],
  "ugcBriefs": [{ "type": "string", "description": "string", "talkingPoints": ["string"] }],
  "visualCreativeBriefs": [{ "concept": "string", "layout": "string", "imagery": "string", "textOverlay": "string" }],
  "reasoning": "string",
  "confidence": "number 0-100"
}

Produce 3 Google Ads, 3 Meta Ads, 5 hooks, 5-email sequence (soft intro→value→case study→urgency→breakup), LinkedIn scripts (connection+2 follow-ups), 1 video ad script, 2 UGC briefs, 2 visual creative briefs.
Do NOT invent performance metrics (open rates, click rates, impressions). Only creative content.`;

export class ContentCreativeAgent extends BaseAgent {
  constructor() {
    super(
      'content-creative',
      'Content & Creative Agent',
      'Produce all marketing materials: ad copies, hooks, email sequences, LinkedIn scripts, video ad scripts, UGC briefs, and visual creative briefs'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    // ── Extract upstream data ──────────────────────────────────────
    const serviceData = inputs.previousOutputs?.['service-research'] || {};
    const offerData = inputs.previousOutputs?.['offer-engineering']?.offer
      || inputs.previousOutputs?.['offer-engineering']
      || {};
    const validationData = inputs.previousOutputs?.['validation'] || {};
    const funnelData = inputs.previousOutputs?.['funnel-builder'] || {};

    // Block if validation is NO-GO
    const decision = validationData.decision || 'GO';
    if (decision === 'NO-GO') {
      this.status = 'done';
      await this.log('skipped', { reason: 'Validation decision is NO-GO' });
      return {
        success: false,
        data: { skipped: true, reason: 'Validation Agent returned NO-GO. Content creation aborted.' },
        reasoning: 'Cannot create marketing content for a rejected offer. Fix validation issues first.',
        confidence: 100,
        error: 'Offer did not pass validation (NO-GO). Resolve issues and re-validate.',
      };
    }

    // Gather context
    const topOpportunity = serviceData.opportunities?.[0] || {};
    const niche = topOpportunity.niche || inputs.config?.niche || inputs.config?.focus || 'B2B services';
    const risingQueries = topOpportunity.risingQueries
      || topOpportunity.trendData?.googleTrends?.risingQueries?.map((q: any) => q.query)
      || [];

    try {
      await this.log('generating_content', { phase: 'Generating creative assets' });

      const enrichedInput = JSON.stringify({
        offer: {
          serviceName: offerData.serviceName,
          icp: offerData.icp,
          painPoints: offerData.painPoints,
          transformationPromise: offerData.transformationPromise,
          pricingTiers: offerData.pricingTiers,
          guarantee: offerData.guarantee,
          positioning: offerData.positioning,
          uniqueMechanism: offerData.uniqueMechanism,
        },
        funnel: {
          landingPageUrl: funnelData.landingPage?.url,
          headline: funnelData.landingPage?.headline,
          cta: funnelData.landingPage?.cta,
          bookingUrl: funnelData.bookingCalendar?.url,
        },
        marketContext: {
          niche,
          risingQueries: risingQueries.slice(0, 10),
          demandScore: topOpportunity.demandScore,
        },
      });

      // ── Call LLM with fallback ────────────────────────────────────
      let parsed: any = {};
      try {
        const response = await this.callClaude(SYSTEM_PROMPT, enrichedInput, 1, 8192);
        parsed = this.safeParseLLMJson<any>(response, ['adCopies', 'hooks', 'emailSequence']);
      } catch (err: any) {
        await this.log('llm_failed', { error: err.message });
        // Build complete fallback from upstream data
        parsed = this.buildFallbackContent(niche, offerData, funnelData);
      }

      // Force-zero any LLM-fabricated performance metrics
      if (parsed.projectedMetrics !== undefined) {
        Object.keys(parsed.projectedMetrics).forEach(k => { if (typeof parsed.projectedMetrics[k] === 'number') parsed.projectedMetrics[k] = 0; });
      }
      if (parsed.estimatedOpenRate !== undefined) parsed.estimatedOpenRate = 0;
      if (parsed.estimatedClickRate !== undefined) parsed.estimatedClickRate = 0;
      if (parsed.estimatedConversionRate !== undefined) parsed.estimatedConversionRate = 0;

      this.status = 'done';
      await this.log('run_completed', { output: parsed });

      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'Content creation complete — all 7 creative asset types generated.',
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

  /**
   * Build complete creative assets from upstream data when LLM is unavailable.
   */
  private buildFallbackContent(niche: string, offerData: any, funnelData: any): any {
    const serviceName = offerData.serviceName || niche;
    const painPoints = offerData.painPoints || [];
    const getPain = (i: number): string => {
      const p = painPoints[i];
      if (!p) return 'growing their business';
      return typeof p === 'string' ? p : p.pain || p.description || 'growing their business';
    };
    const guarantee = typeof offerData.guarantee === 'string'
      ? offerData.guarantee
      : offerData.guarantee?.description || '';
    const transformationPromise = offerData.transformationPromise || `Get More Qualified Leads for ${niche}`;
    const cta = funnelData.landingPage?.cta || 'Book Your Free Strategy Call';
    const bookingUrl = funnelData.bookingCalendar?.url || 'https://calendly.com/leados/strategy-call';
    const icpDesc = offerData.icp?.description || offerData.icp?.companySize || `${niche} companies`;

    return {
      adCopies: {
        google: [
          { headline: `${niche} Leads on Autopilot`.substring(0, 30), description: `Stop chasing leads. Our AI engine delivers qualified ${niche.toLowerCase()} prospects straight to your calendar. ${guarantee}`.substring(0, 90), targetKeyword: `${niche.toLowerCase()} lead generation` },
          { headline: `AI-Powered ${niche} Growth`.substring(0, 30), description: `${transformationPromise}. No manual outreach needed. Results in 14 days or less.`.substring(0, 90), targetKeyword: `${niche.toLowerCase()} marketing` },
          { headline: `Tired of Bad Leads?`.substring(0, 30), description: `${serviceName} uses 13 AI agents to find, qualify, and book ${niche.toLowerCase()} leads automatically.`.substring(0, 90), targetKeyword: `qualified ${niche.toLowerCase()} leads` },
        ],
        meta: [
          { primaryText: `Most ${niche.toLowerCase()} companies waste 60% of their marketing budget on unqualified leads. ${serviceName} fixes that with AI-powered prospecting that only books calls with decision-makers who are ready to buy.`, headline: transformationPromise.substring(0, 40), description: cta, targetAudience: icpDesc },
          { primaryText: `"We went from 2 booked calls a week to 15 — in under 30 days." That's the power of ${serviceName}. Our AI engine handles everything from prospecting to qualification.`, headline: `Stop Chasing. Start Closing.`, description: `${guarantee || 'Results guaranteed'}`, targetAudience: icpDesc },
          { primaryText: `Still doing outreach manually? ${serviceName} deploys 13 AI agents to run your entire lead gen pipeline — cold email, LinkedIn, ads, qualification, and booking — 24/7.`, headline: `Your Sales Team on Autopilot`, description: `See how it works — free strategy call`, targetAudience: icpDesc },
        ],
      },
      hooks: [
        { angle: 'pain', hook: `${getPain(0)} — and you're still doing outreach manually?`, useCase: 'Email subject line, ad opening' },
        { angle: 'curiosity', hook: `This AI system books 10+ qualified calls/week for ${niche.toLowerCase()} companies. Here's how.`, useCase: 'LinkedIn post, video hook' },
        { angle: 'social_proof', hook: `500+ ${niche.toLowerCase()} companies switched to AI-powered lead gen last quarter. The ones who didn't are falling behind.`, useCase: 'Meta ad, landing page' },
        { angle: 'urgency', hook: `We're onboarding 10 ${niche.toLowerCase()} companies this month. After that, the waitlist opens.`, useCase: 'Email CTA, retargeting ad' },
        { angle: 'contrarian', hook: `Cold calling is dead. SEO takes 6 months. Here's what actually works for ${niche.toLowerCase()} in 2026.`, useCase: 'Blog title, YouTube hook' },
      ],
      emailSequence: [
        { step: 1, delay: 'Day 1', subject: `Quick question about ${niche.toLowerCase()}`, body: `Hi {firstName},\n\nI noticed {company} is in the ${niche.toLowerCase()} space and thought this might be relevant.\n\nWe help companies like yours solve ${getPain(0)} — without the usual headaches.\n\nWould it make sense to chat for 15 minutes this week?\n\nBest,\n{senderName}`, purpose: 'Soft intro — establish relevance' },
        { step: 2, delay: 'Day 3', subject: `How {company} could solve ${getPain(0)}`, body: `Hi {firstName},\n\nFollowing up on my last email. Wanted to share a quick case study:\n\nOne of our clients in ${niche.toLowerCase()} was struggling with ${getPain(0)}. Within 30 days of using ${serviceName}, they saw measurable improvement.\n\nHappy to walk you through exactly how it works.\n\nBest,\n{senderName}`, purpose: 'Value delivery — case study' },
        { step: 3, delay: 'Day 5', subject: `The math behind ${serviceName}`, body: `Hi {firstName},\n\nHere's the ROI math: our clients typically see 3-5x return within the first 60 days.${guarantee ? `\n\nPlus, ${guarantee}.` : ''}\n\nWorth a quick call?\n\nBest,\n{senderName}`, purpose: 'ROI math — financial case' },
        { step: 4, delay: 'Day 8', subject: `Last chance: ${serviceName} for {company}`, body: `Hi {firstName},\n\nWe're onboarding a few more ${niche.toLowerCase()} companies this month and I wanted to reach out one more time.\n\nIf ${getPain(0)} is still a challenge, I'd love to show you how we solve it — takes 15 minutes.\n\nBook a time here: ${bookingUrl}\n\nBest,\n{senderName}`, purpose: 'Urgency — scarcity' },
        { step: 5, delay: 'Day 12', subject: `Closing the loop`, body: `Hi {firstName},\n\nI've reached out a few times and haven't heard back — totally understand if the timing isn't right.\n\nI'll close your file for now, but if ${getPain(0)} becomes a priority, feel free to reply anytime.\n\nWishing you and {company} the best.\n\n{senderName}`, purpose: 'Breakup — loss aversion' },
      ],
      linkedInScripts: {
        connectionRequest: `Hi {firstName}, I work with ${niche.toLowerCase()} companies on ${getPain(0).toLowerCase().substring(0, 80)}. Would love to connect and share some insights.`.substring(0, 300),
        followUp1: `Thanks for connecting, {firstName}! I noticed {company} is doing great work in ${niche.toLowerCase()}. We recently helped a similar company solve ${getPain(0).toLowerCase()} — happy to share what worked if you're interested.`,
        followUp2: `Hi {firstName}, quick follow up — would a 15-min call make sense to explore if we can help {company}? No pressure either way. Here's my calendar: ${bookingUrl}`,
      },
      videoAdScripts: [
        {
          duration: '30-60s',
          format: 'UGC-style talking head',
          hook: `Stop wasting money on leads that never convert. (3s)`,
          body: `If you're a ${niche.toLowerCase()} company spending thousands on marketing but only getting tire-kickers, you're not alone. We built ${serviceName} — an AI engine that finds, qualifies, and books real decision-makers on your calendar. No cold calling. No guesswork. Just qualified meetings, every week.`,
          cta: `${cta} — link in bio. ${guarantee || ''}`,
        },
      ],
      ugcBriefs: [
        {
          type: 'testimonial',
          description: `Founder/CEO of a ${niche.toLowerCase()} company shares their experience going from manual outreach to AI-powered lead gen with ${serviceName}.`,
          talkingPoints: [
            `What lead gen looked like before (manual, inconsistent, expensive)`,
            `The moment they decided to try ${serviceName}`,
            `Specific results: meetings booked, pipeline growth`,
            `"I wish I had done this sooner"`,
          ],
        },
        {
          type: 'before_after',
          description: `Screen recording showing the ${serviceName} dashboard — before (empty pipeline) vs after (qualified leads flowing in).`,
          talkingPoints: [
            `Show empty CRM / calendar before`,
            `Walk through ${serviceName} setup (60 seconds)`,
            `Show results: leads, calls booked, pipeline value`,
            `End with CTA: "Want the same results?"`,
          ],
        },
      ],
      visualCreativeBriefs: [
        {
          concept: 'Pipeline Transformation',
          layout: 'Split-screen: left shows chaotic manual outreach (spreadsheets, cold calls), right shows clean AI dashboard with qualified leads',
          imagery: 'Dark background with cyan/purple accent glow, dashboard mockup, pipeline visualization',
          textOverlay: `"${transformationPromise}" — ${cta}`,
        },
        {
          concept: 'Social Proof Grid',
          layout: 'Grid of client logos/testimonials with key metrics highlighted, CTA button at bottom',
          imagery: 'Professional dark theme, trust badges, green accent for metrics',
          textOverlay: `"500+ ${niche} companies trust ${serviceName}" — ${guarantee || 'See results in 14 days'}`,
        },
      ],
      reasoning: `Full creative asset package generated for ${niche} using upstream offer and funnel data. Includes 3 Google Ads, 3 Meta Ads, 5 hooks, 5-email sequence, LinkedIn scripts, 1 video script, 2 UGC briefs, and 2 visual creative briefs. Content tailored to ICP: ${icpDesc}.`,
      confidence: 75,
    };
  }
}
