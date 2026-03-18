import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';

const SYSTEM_PROMPT = `You are the Content & Creative Agent for LeadOS — the Service Acquisition Machine. Your job is to produce ALL marketing materials needed to run multi-channel campaigns.

You receive JSON input containing:
- The full offer (ICP, pain points, pricing, positioning, unique mechanism) from the Offer Engineering Agent
- The funnel structure (landing page, CTA, form) from the Funnel Builder Agent
- Google Trends data (rising queries, search interest) from the Service Research Agent

Use the upstream data to make EVERY piece of content specific to the niche, ICP, and offer — not generic.

Your responsibilities — produce ALL 7 creative asset types:

1. AD COPIES: Write 3 Google Ads (headline ≤30 chars + description ≤90 chars) and 3 Meta Ads (primary text + headline + description). Each must target a different pain point or angle from the offer data.
2. HOOKS & ANGLES: Generate 5 distinct hooks using different persuasion angles (pain, curiosity, social proof, urgency, contrarian). Reference specific data points from upstream.
3. EMAIL SEQUENCE: Write a 5-email cold outreach sequence with subject lines, body copy, and send delays. Progression: soft intro → value → case study → urgency → breakup.
4. LINKEDIN SCRIPTS: Connection request + 2 follow-ups. Each under LinkedIn's 300-char limit for connection requests and DMs.
5. VIDEO AD SCRIPTS: At least 1 video ad script (30-60s) with hook (first 3 seconds), body (problem + solution), and CTA.
6. UGC BRIEFS: Creative briefs for UGC-style content — testimonials, screen recordings, before/after comparisons.
7. VISUAL CREATIVE BRIEFS: Describe static ad concepts — layout, imagery, color palette, text overlay.

CRITICAL: Adapt ALL content to the specific niche, ICP, and offer. Do NOT produce generic B2B content. Use the rising keywords from Google Trends in ad copies.

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated performance metrics. Ad copies, email sequences, hooks, scripts, and creative briefs are creative outputs and are expected. However, do NOT invent performance numbers like open rates, click rates, conversion rates, impressions, or any metric that looks like measured data. If a field requires a measured metric and no real data exists, set it to 0 or null. Never fabricate numbers.

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "adCopies": {
    "google": [{ "headline": "string (≤30 chars)", "description": "string (≤90 chars)", "targetKeyword": "string" }],
    "meta": [{ "primaryText": "string", "headline": "string", "description": "string", "targetAudience": "string" }]
  },
  "hooks": [{ "angle": "string", "hook": "string", "useCase": "string" }],
  "emailSequence": [{ "step": "number", "delay": "string", "subject": "string", "body": "string", "purpose": "string" }],
  "linkedInScripts": { "connectionRequest": "string", "followUp1": "string", "followUp2": "string" },
  "videoAdScripts": [{ "duration": "string", "format": "string", "hook": "string", "body": "string", "cta": "string" }],
  "ugcBriefs": [{ "type": "string", "description": "string", "talkingPoints": ["string"] }],
  "visualCreativeBriefs": [{ "concept": "string", "layout": "string", "imagery": "string", "textOverlay": "string" }],
  "reasoning": "string",
  "confidence": "number 0-100"
}`;

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

    // Gather context for the AI
    const topOpportunity = serviceData.opportunities?.[0] || {};
    const risingQueries = topOpportunity.risingQueries
      || topOpportunity.trendData?.googleTrends?.risingQueries?.map((q: any) => q.query)
      || [];
    const googleTrendsScore = topOpportunity.googleTrendsScore
      || topOpportunity.trendData?.googleTrendsScore
      || 0;

    try {
      await this.log('generating_content', { phase: 'Sending offer + funnel data to AI for content generation' });

      const enrichedInput = {
        offer: {
          serviceName: offerData.serviceName,
          icp: offerData.icp,
          painPoints: offerData.painPoints,
          transformationPromise: offerData.transformationPromise,
          pricingTiers: offerData.pricingTiers,
          guarantee: offerData.guarantee,
          positioning: offerData.positioning,
          uniqueMechanism: offerData.uniqueMechanism,
          trendInsights: offerData.trendInsights,
        },
        funnel: {
          landingPageUrl: funnelData.landingPage?.url,
          headline: funnelData.landingPage?.headline,
          cta: funnelData.landingPage?.cta,
          bookingUrl: funnelData.bookingCalendar?.url,
        },
        marketContext: {
          niche: topOpportunity.niche || inputs.config?.focus || 'B2B services',
          googleTrendsScore,
          risingQueries,
          demandScore: topOpportunity.demandScore,
          competitionScore: topOpportunity.competitionScore,
          estimatedMarketSize: topOpportunity.estimatedMarketSize,
        },
        config: inputs.config,
      };

      const response = await this.callClaude(SYSTEM_PROMPT, JSON.stringify(enrichedInput), 3, 10000);
      let parsed: any = {};
      try {
        parsed = this.safeParseLLMJson<any>(response, ['adCopies', 'hooks', 'emailSequence']);
      } catch (parseErr: any) {
        await this.log('llm_json_parse_error', { error: parseErr.message });
        parsed = { reasoning: `LLM JSON parse failed: ${parseErr.message}`, confidence: 0 };
      }

      // Force-zero any LLM-fabricated performance metrics
      // Creative content (ad copies, hooks, emails, scripts) is OK
      // But any performance numbers (open rates, click rates, impressions) are fabricated
      if (parsed.projectedMetrics !== undefined) {
        Object.keys(parsed.projectedMetrics).forEach(k => { if (typeof parsed.projectedMetrics[k] === 'number') parsed.projectedMetrics[k] = 0; });
      }
      if (parsed.estimatedOpenRate !== undefined) parsed.estimatedOpenRate = 0;
      if (parsed.estimatedClickRate !== undefined) parsed.estimatedClickRate = 0;
      if (parsed.estimatedConversionRate !== undefined) parsed.estimatedConversionRate = 0;
      if (parsed.impressions !== undefined) parsed.impressions = 0;
      if (parsed.clicks !== undefined) parsed.clicks = 0;
      if (parsed.conversions !== undefined) parsed.conversions = 0;

      this.status = 'done';
      await this.log('run_completed', { output: parsed });

      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'Content creation complete',
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
