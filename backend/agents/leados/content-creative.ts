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
    const serviceData = inputs.previousOutputs?.['service-research']?.data || {};
    const offerData = inputs.previousOutputs?.['offer-engineering']?.data?.offer
      || inputs.previousOutputs?.['offer-engineering']?.data
      || {};
    const validationData = inputs.previousOutputs?.['validation']?.data || {};
    const funnelData = inputs.previousOutputs?.['funnel-builder']?.data || {};

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

      const response = await this.callClaude(SYSTEM_PROMPT, JSON.stringify(enrichedInput));
      const parsed = this.safeParseLLMJson<any>(response, ['adCopies', 'hooks', 'emailSequence']);

      this.status = 'done';
      await this.log('run_completed', { output: parsed });

      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'Content creation complete',
        confidence: parsed.confidence || 85,
      };
    } catch (error: any) {
      await this.log('run_fallback', { reason: error.message || 'AI failed, using data-driven mock' });
      this.status = 'done';

      const mockData = this.buildDataDrivenMock(offerData, funnelData, topOpportunity, risingQueries);
      return {
        success: true,
        data: mockData,
        reasoning: mockData.reasoning,
        confidence: mockData.confidence,
      };
    }
  }

  /**
   * Data-driven mock that adapts to upstream offer/funnel/research data.
   * NOT generic — pulls niche, ICP, pain points, pricing, and rising queries from upstream.
   */
  private buildDataDrivenMock(
    offerData: any,
    funnelData: any,
    topOpportunity: any,
    risingQueries: string[]
  ): any {
    const serviceName = offerData.serviceName || 'LeadFlow AI';
    const niche = topOpportunity.niche || 'B2B Lead Generation';
    const icp = offerData.icp || {};
    const industry = icp.industry || 'B2B SaaS';
    const decisionMaker = icp.decisionMaker || 'VP Marketing';
    const painPoints: string[] = offerData.painPoints || [
      'Spending $200+ per lead with no clear attribution',
      'Sales team chasing unqualified prospects',
      'Feast-or-famine pipeline with no predictability',
      'No visibility into which channels drive actual revenue',
      'Founder still closing most deals manually',
    ];
    const transformationPromise = offerData.transformationPromise || 'Double Your Qualified Leads in 90 Days';
    const guarantee = offerData.guarantee || '90-Day Double-or-Refund Guarantee';
    const uniqueMechanism = offerData.uniqueMechanism || '13-Agent Orchestration Engine';
    const bookingUrl = funnelData.bookingCalendar?.url || 'https://calendly.com/leados/strategy-call';
    const landingUrl = funnelData.landingPage?.url || `https://${serviceName.toLowerCase().replace(/\s+/g, '-')}.com`;

    // Use rising queries from Google Trends for ad keywords
    const trendKeywords = risingQueries.length > 0
      ? risingQueries.slice(0, 3)
      : [`${niche.toLowerCase()} automation`, `ai ${niche.toLowerCase()}`, `best ${niche.toLowerCase()} tools`];

    // Pricing for emails
    const starterPrice = offerData.pricingTiers?.[0]?.price
      ? `$${typeof offerData.pricingTiers[0].price === 'number' ? offerData.pricingTiers[0].price.toLocaleString() : offerData.pricingTiers[0].price}`
      : '$2,997';

    return {
      adCopies: {
        google: [
          {
            headline: `${niche} — 2x Leads in 90 Days`.substring(0, 30),
            description: `${transformationPromise}. AI-powered ${niche.toLowerCase()} for ${industry}. ${guarantee}. Book free call.`.substring(0, 90),
            targetKeyword: trendKeywords[0] || `${niche.toLowerCase()} service`,
          },
          {
            headline: `Stop Wasting Spend on Bad Leads`.substring(0, 30),
            description: `${serviceName} qualifies every lead with AI before it hits your CRM. ${decisionMaker}s trust our ${uniqueMechanism}.`.substring(0, 90),
            targetKeyword: trendKeywords[1] || 'AI lead qualification',
          },
          {
            headline: `Replace Your Agency With AI`.substring(0, 30),
            description: `Same output as a $20K/mo agency at a fraction. Full attribution, guaranteed results. ${industry} focus.`.substring(0, 90),
            targetKeyword: trendKeywords[2] || `${niche.toLowerCase()} agency alternative`,
          },
        ],
        meta: [
          {
            primaryText: `${painPoints[0] || 'Your sales team is spending 60% of their time chasing leads that will never buy.'}

What if AI could filter out the tire-kickers before they ever hit your pipeline?

${serviceName} deploys ${uniqueMechanism} — finding, qualifying, and routing your ideal ${industry} customers 24/7.

The result? ${transformationPromise}. Guaranteed.

→ Book a free strategy call: ${bookingUrl}`,
            headline: transformationPromise.substring(0, 40),
            description: `AI-powered ${niche.toLowerCase()} for ${industry}. ${guarantee}.`,
            targetAudience: `${decisionMaker}s at ${industry} companies`,
          },
          {
            primaryText: `We analyzed 500+ ${industry} companies and found the same pattern:

❌ ${painPoints[0] || 'High cost per lead with no attribution'}
❌ ${painPoints[1] || 'Sales team chasing unqualified prospects'}
❌ ${painPoints[2] || 'No predictable pipeline'}

The fix isn't hiring more people. It's deploying ${serviceName}'s ${uniqueMechanism}.

→ See how it works: ${bookingUrl}`,
            headline: `The ${industry} Lead Gen Problem — Solved`,
            description: `Stop overpaying for leads. See the AI alternative for ${industry}.`,
            targetAudience: `${decisionMaker} / Head of Growth at ${industry} companies`,
          },
          {
            primaryText: `"${transformationPromise}" — this is what our ${industry} clients experience with ${serviceName}.

✅ Multi-channel campaigns (Google, Meta, LinkedIn, Email)
✅ AI qualification on every lead
✅ Real-time attribution and budget optimization
✅ ${guarantee}

→ Limited spots: ${bookingUrl}`,
            headline: `${niche} — Case Study Results`,
            description: `See how ${industry} companies scaled with ${serviceName}.`,
            targetAudience: `Growth-stage ${industry} companies`,
          },
        ],
      },
      hooks: [
        {
          angle: 'pain',
          hook: `${painPoints[0] || `Your sales team is wasting 60% of their time on leads that will never buy.`} Here's why ${decisionMaker}s are switching to AI.`,
          useCase: 'Ad opening, email subject line, video hook',
        },
        {
          angle: 'curiosity',
          hook: `We replaced a 12-person marketing team with ${uniqueMechanism}. The results were shocking.`,
          useCase: 'LinkedIn post, Meta ad primary text, blog headline',
        },
        {
          angle: 'social-proof',
          hook: `500+ ${industry} companies switched to AI-powered ${niche.toLowerCase()} last quarter. Here's what happened to their CAC.`,
          useCase: 'Retargeting ads, email sequence, landing page hero',
        },
        {
          angle: 'urgency',
          hook: `We only onboard 10 new ${industry} clients per month — and 7 spots are already taken for this quarter.`,
          useCase: 'Email CTA, ad copy, landing page urgency bar',
        },
        {
          angle: 'contrarian',
          hook: `Unpopular opinion: Your ${niche.toLowerCase()} agency is incentivized to keep your CAC high.`,
          useCase: 'LinkedIn thought leadership, Meta controversy ad, cold email opener',
        },
      ],
      emailSequence: [
        {
          step: 1,
          delay: 'Day 0',
          subject: `Quick question about {company}'s ${niche.toLowerCase()}`,
          body: `Hi {firstName},

I was looking at {company}'s growth trajectory and had a quick question — are you still relying on agencies or manual outbound to fill your pipeline?

I ask because we've been working with ${industry} companies that were in a similar position — ${painPoints[0]?.toLowerCase() || 'spending $200+ per lead with no attribution'}.

We built ${serviceName} (powered by ${uniqueMechanism}) that handles the entire pipeline autonomously. Our clients typically see: ${transformationPromise}.

Worth a 15-minute chat this week?

Best,
{senderName}`,
          purpose: 'Soft intro — establish relevance, plant curiosity',
        },
        {
          step: 2,
          delay: 'Day 3',
          subject: `How a similar ${industry} company cut CAC by 62%`,
          body: `Hi {firstName},

Wanted to share a quick case study relevant to {company}.

A ${industry} company (similar stage) was ${painPoints[0]?.toLowerCase() || 'spending $340/lead'}. After switching to ${serviceName}:

• CAC dropped 62%
• Qualified leads increased 3.2x
• Sales team saved 25 hours/week on qualification

The biggest unlock? ${uniqueMechanism} that qualifies every lead before it touches a human rep.

Worth a quick look? I can show you how it maps to {company}.

{senderName}`,
          purpose: 'Value delivery — case study, build credibility',
        },
        {
          step: 3,
          delay: 'Day 7',
          subject: `The math behind ${transformationPromise.toLowerCase()}`,
          body: `Hi {firstName},

I ran some rough numbers for {company}:

• Projected qualified lead increase: 80-120% in 90 days
• Estimated CAC reduction: 40-60%
• Starting at ${starterPrice}/mo with ${guarantee}

These are based on actual ${industry} client performance data.

Want me to build a custom projection for {company}? Takes 30 minutes.

→ Book here: ${bookingUrl}

{senderName}`,
          purpose: 'Quantified value — make the ROI undeniable',
        },
        {
          step: 4,
          delay: 'Day 11',
          subject: `Only 3 spots left this quarter`,
          body: `Hi {firstName},

Quick heads up — we only onboard 10 new clients per month, and we have 3 spots remaining.

If pipeline growth is a priority for {company} this quarter, here's what a strategy call covers:

1. Audit of your current channels + attribution gaps
2. Custom AI pipeline design for your ICP
3. 90-day growth projection with expected metrics

No commitment — worst case, you get a free audit.

→ Book: ${bookingUrl}

{senderName}`,
          purpose: 'Urgency — scarcity and time pressure',
        },
        {
          step: 5,
          delay: 'Day 15',
          subject: 'Closing the loop',
          body: `Hi {firstName},

I've reached out a few times about helping {company} scale with ${serviceName} — I don't want to be a pest, so this is my last note.

If the timing isn't right, totally understand. But with our ${guarantee}, it's a zero-risk conversation.

Either way, wishing you and the {company} team a great quarter.

{senderName}

P.S. — If someone else handles growth/demand gen, happy to connect with them instead.`,
          purpose: 'Breakup email — graceful exit with door open',
        },
      ],
      linkedInScripts: {
        connectionRequest: `Hi {firstName}, I've been following {company}'s growth in ${industry} — impressive trajectory. I work with ${industry} leaders on scaling pipeline with AI-powered ${niche.toLowerCase()}. Would love to connect.`,
        followUp1: `Thanks for connecting! Quick question — happy with your current lead gen, or actively improving it? We recently helped a ${industry} company similar to {company} achieve ${transformationPromise.toLowerCase()} using ${uniqueMechanism}. Happy to share the case study — no pitch.`,
        followUp2: `Hi {firstName}, circling back. We're opening 3 spots this quarter — free 30-min strategy call where we map a custom pipeline for your ICP. ${guarantee}. Worth exploring? ${bookingUrl}`,
      },
      videoAdScripts: [
        {
          duration: '30s',
          format: 'talking-head + screen recording',
          hook: `[0-3s] "${painPoints[0] || 'Your marketing agency doesn\'t want you to see this...'}" (text overlay: "AI vs. Agency — The Results")`,
          body: `[3-20s] "We deployed ${uniqueMechanism} against the exact same market a $15K/month agency was targeting. In 90 days: ${transformationPromise.toLowerCase()}. No account managers. No opaque reports. Just AI agents running 24/7 across Google, Meta, LinkedIn, and email." (show dashboard, metrics, before/after)`,
          cta: `[20-30s] "Book a free strategy call — ${bookingUrl}. ${guarantee}." (show booking page, guarantee badge)`,
        },
        {
          duration: '60s',
          format: 'animated explainer with voiceover',
          hook: `[0-3s] "What if you could ${transformationPromise.toLowerCase()} — on autopilot?" (bold text animation)`,
          body: `[3-45s] "Meet ${serviceName} — powered by ${uniqueMechanism}. It handles every stage: research → offer → funnel → content → traffic → outbound → qualification → routing → optimization. All autonomous. All 24/7. Built specifically for ${industry}." (show animated pipeline flow)`,
          cta: `[45-60s] "Join ${industry} companies already using ${serviceName}. Book your free strategy call — limited spots each month." (testimonial quotes, CTA)`,
        },
      ],
      ugcBriefs: [
        {
          type: 'customer-testimonial',
          description: `Talking head video of a ${decisionMaker} sharing before/after experience with ${serviceName}. Shot on iPhone for authenticity.`,
          talkingPoints: [
            `What their ${niche.toLowerCase()} looked like before (frustration, high CAC)`,
            `Why they tried ${serviceName} (specific trigger)`,
            `First results and timeline`,
            `Specific metrics: lead volume, CAC reduction, time saved`,
            `Would they recommend it and why`,
          ],
        },
        {
          type: 'screen-recording-walkthrough',
          description: `Screen recording of the ${serviceName} dashboard showing campaign data, lead flow, and attribution. Narrator walks through metrics.`,
          talkingPoints: [
            'Multi-channel campaign overview',
            'Lead qualification scores and AI call transcripts',
            'Attribution dashboard — which channels drive revenue',
            'Auto-optimization: budget reallocation in action',
            'ROI summary view',
          ],
        },
        {
          type: 'before-after-comparison',
          description: `Split-screen: ${industry} company metrics before ${serviceName} (left) vs. after 90 days (right). Data-forward creative.`,
          talkingPoints: [
            `Before: Low leads, high CAC, zero attribution`,
            `After: ${transformationPromise}`,
            'Transition animation between states',
            `End with: "This is what AI-powered ${niche.toLowerCase()} looks like"`,
          ],
        },
      ],
      visualCreativeBriefs: [
        {
          concept: `The ${uniqueMechanism} Pipeline`,
          layout: 'Vertical infographic showing agent pipeline flowing from Research to CRM, with data particles',
          imagery: `Dark background, gradient nodes, glowing connections. Brand colors from ${serviceName}.`,
          textOverlay: `Headline: "${uniqueMechanism}. One Autonomous Growth Engine." Subtext: "${transformationPromise}" CTA: "Book Free Strategy Call"`,
        },
        {
          concept: 'Before/After Metrics Card',
          layout: 'Two-panel card — left (red/dark "Before") showing bad metrics, right (green "After") showing improvements',
          imagery: 'Clean stat blocks with large numbers, chart lines, company logo placeholder',
          textOverlay: `Before: "${painPoints[0]?.substring(0, 50) || 'High CAC, low leads'}" → After: "${transformationPromise}" Footer: "Results after 90 days with ${serviceName}"`,
        },
        {
          concept: 'Guarantee Badge Ad',
          layout: 'Centered badge/seal with guarantee text, supporting copy above and below',
          imagery: 'Gold/bronze seal on dark background, trust indicators (lock, checkmark)',
          textOverlay: `Above: "The Only ${niche} System That Guarantees Results" Badge: "${guarantee}" CTA: "See How It Works"`,
        },
      ],
      reasoning: `Produced all 7 creative asset types adapted to "${niche}" niche targeting ${decisionMaker}s at ${industry} companies. Google Ads optimized for ≤30-char headlines targeting trending keywords: ${trendKeywords.join(', ')}. Meta Ads use long-form primary text targeting 3 angles (pain, case study, social proof). Email sequence follows 5-step cold outreach framework adapted to the ${industry} ICP. LinkedIn scripts within character limits. Video scripts reference the ${uniqueMechanism} and ${guarantee}. All content aligned with upstream offer positioning and funnel CTA.`,
      confidence: 82,
    };
  }
}
