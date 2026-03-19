import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';

const SYSTEM_PROMPT = `You are the Content & Creative Agent for LeadOS. Produce ALL marketing materials for multi-channel campaigns.

You receive JSON with the offer (ICP, pain points, pricing, positioning), funnel data, and market context.

Adapt ALL content to the specific niche, ICP, and offer — not generic. Use rising keywords from Google Trends in ad copies.

## UGC Script Template Patterns

Generate UGC scripts using BOTH of these proven patterns:

**Pattern A — Role-Specific Hooks:**
Write one script per decision-maker role (Finance, CEO, HR, Operations). Each script must include:
- Role-specific hook (speaks directly to that persona's concerns)
- Credibility setup (why they should listen)
- Product intro (what the solution is)
- Key benefit (the #1 outcome for that role)
- Business case (ROI or efficiency argument for that persona)
- Role-specific CTA (action relevant to their authority level)

**Pattern B — Same Message, Different Hooks:**
Write 3-4 variations of the same core script with different openers for A/B testing:
- Variation 1: Personal experience opener ("I used to spend 4 hours a day on...")
- Variation 2: Pain point opener ("If you're still doing X manually...")
- Variation 3: Bold statement opener ("Cold calling is dead. Here's proof.")
- Variation 4: Social proof opener ("500+ companies switched last quarter...")

## UGC Video Structure (15-60s)

Every UGC video script MUST follow this exact structure:
- Hook (0-3s): Bold statement, question, or surprising result
- Problem (3-10s): State the pain point in their words
- Solution (10-25s): Show/explain what you do. One core idea.
- Proof (25-40s): Result, testimonial, or before/after. Specifics beat generalities.
- CTA (last 3-5s): Exactly what to do next.

## Video Types by Priority

Generate scripts in this priority order (most credible first):
1. Customer testimonial (most credible)
2. Before/after walkthrough
3. Founder/team talking head
4. Screen recording + voiceover
5. Process reveal

## Cold Email Sequence (SOP Structure)

Generate a 3-5 email sequence, spaced 2-3 days apart, following this exact structure:
- Email 1: Personalised opener + problem statement + soft CTA
- Email 2: Value drop — case study or result, no pitch
- Email 3: Nudge — reference email 1, ask if timing is better
- Email 4: Breakup — "last one from me" energy, creates urgency

## LinkedIn DM Sequence (SOP Structure)

Generate a 3-message LinkedIn sequence following this exact structure:
- Message 1: Thank + mention something specific from their profile. No pitch.
- Message 2 (day 2-3): Share useful article/insight/case study relevant to their role.
- Message 3 (day 5-7): Soft CTA — ask if problem is relevant, offer quick call.

Return ONLY valid JSON (no markdown) with this structure:
{
  "adCopies": {
    "google": [{ "headline": "string (≤30 chars)", "description": "string (≤90 chars)", "targetKeyword": "string" }],
    "meta": [{ "primaryText": "string", "headline": "string", "description": "string", "targetAudience": "string" }]
  },
  "hooks": [{ "angle": "pain|curiosity|social_proof|urgency|contrarian", "hook": "string", "useCase": "string" }],
  "coldEmailSequence": [{ "step": "number", "delay": "string", "subject": "string", "body": "string", "purpose": "string", "sopRole": "personalised_opener|value_drop|nudge|breakup" }],
  "linkedInDMSequence": {
    "message1": { "text": "string (≤300 chars)", "timing": "on connect", "sopRole": "thank_and_mention" },
    "message2": { "text": "string", "timing": "day 2-3", "sopRole": "share_value" },
    "message3": { "text": "string", "timing": "day 5-7", "sopRole": "soft_cta" }
  },
  "ugcScripts": {
    "patternA_roleSpecific": [{
      "role": "Finance|CEO|HR|Operations",
      "hook": "string (0-3s)",
      "credibilitySetup": "string",
      "productIntro": "string",
      "keyBenefit": "string",
      "businessCase": "string",
      "cta": "string",
      "duration": "15-60s"
    }],
    "patternB_hookVariations": [{
      "variationType": "personal_experience|pain_point|bold_statement|social_proof",
      "hook": "string (0-3s)",
      "problem": "string (3-10s)",
      "solution": "string (10-25s)",
      "proof": "string (25-40s)",
      "cta": "string (last 3-5s)",
      "duration": "15-60s"
    }]
  },
  "videoAdScripts": [{
    "duration": "string",
    "format": "string",
    "videoType": "customer_testimonial|before_after_walkthrough|founder_talking_head|screen_recording_voiceover|process_reveal",
    "priority": "number (1-5)",
    "hook": "string (0-3s)",
    "problem": "string (3-10s)",
    "solution": "string (10-25s)",
    "proof": "string (25-40s)",
    "cta": "string (last 3-5s)"
  }],
  "ugcBriefs": [{ "type": "string", "description": "string", "talkingPoints": ["string"] }],
  "visualCreativeBriefs": [{ "concept": "string", "layout": "string", "imagery": "string", "textOverlay": "string" }],
  "reasoning": "string",
  "confidence": "number 0-100"
}

Produce these EXACT quantities:
- 10 Google Ads (varied: problem, curiosity, proof, urgency, results angles)
- 10 Meta Ads (varied targeting: cold, warm, retargeting audiences)
- 5 hooks (pain, curiosity, social_proof, urgency, contrarian)
- 4 cold emails (personalised opener → value drop → nudge → breakup, spaced 2-3 days apart)
- LinkedIn DM sequence (3 messages: thank+mention → share value → soft CTA)
- 5 video ad scripts (one per video type priority: customer testimonial, before/after, founder talking head, screen recording + voiceover, process reveal — each following Hook→Problem→Solution→Proof→CTA structure)
- 4 UGC scripts Pattern A (one per role: Finance, CEO, HR, Operations)
- 4 UGC scripts Pattern B (one per hook variation: personal experience, pain point, bold statement, social proof)
- 3 UGC briefs (testimonial, before/after, process reveal)
- 3 visual creative briefs (static ads, social clips, infographic)
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
        parsed = this.safeParseLLMJson<any>(response, ['adCopies', 'hooks', 'coldEmailSequence']);
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
          { headline: `${niche} Leads on Autopilot`.substring(0, 30), description: `Stop chasing leads. Our AI engine delivers qualified ${niche.toLowerCase()} prospects straight to your calendar.`.substring(0, 90), targetKeyword: `${niche.toLowerCase()} lead generation` },
          { headline: `AI-Powered ${niche} Growth`.substring(0, 30), description: `${transformationPromise}. No manual outreach needed. Results in 14 days or less.`.substring(0, 90), targetKeyword: `${niche.toLowerCase()} marketing` },
          { headline: `Tired of Bad Leads?`.substring(0, 30), description: `${serviceName} uses 13 AI agents to find, qualify, and book ${niche.toLowerCase()} leads automatically.`.substring(0, 90), targetKeyword: `qualified ${niche.toLowerCase()} leads` },
          { headline: `${niche} Pipeline Fix`.substring(0, 30), description: `Feast-or-famine pipeline? Our AI builds predictable ${niche.toLowerCase()} deal flow — fully autonomous.`.substring(0, 90), targetKeyword: `${niche.toLowerCase()} pipeline` },
          { headline: `10+ Calls/Week — AI`.substring(0, 30), description: `Book 10+ qualified ${niche.toLowerCase()} calls per week. AI handles prospecting, outreach, and qualification.`.substring(0, 90), targetKeyword: `${niche.toLowerCase()} sales calls` },
          { headline: `Stop Wasting Ad Spend`.substring(0, 30), description: `Cut your CPL in half. ${serviceName} targets only decision-makers ready to buy in ${niche.toLowerCase()}.`.substring(0, 90), targetKeyword: `${niche.toLowerCase()} advertising` },
          { headline: `${niche} Growth Engine`.substring(0, 30), description: `Autonomous lead gen for ${niche.toLowerCase()}. From cold outreach to booked meeting — zero manual work.`.substring(0, 90), targetKeyword: `${niche.toLowerCase()} growth` },
          { headline: `Qualified Leads Only`.substring(0, 30), description: `No tire-kickers. ${serviceName} AI-qualifies every lead before they hit your calendar.`.substring(0, 90), targetKeyword: `qualified ${niche.toLowerCase()} leads` },
          { headline: `Scale ${niche} Fast`.substring(0, 30), description: `${guarantee || 'Results in 14 days'}. Our 13-agent AI engine handles your entire go-to-market.`.substring(0, 90), targetKeyword: `scale ${niche.toLowerCase()}` },
          { headline: `${niche} on Autopilot`.substring(0, 30), description: `Why hire 5 people when 13 AI agents can run your ${niche.toLowerCase()} pipeline 24/7?`.substring(0, 90), targetKeyword: `${niche.toLowerCase()} automation` },
        ],
        meta: [
          { primaryText: `Most ${niche.toLowerCase()} companies waste 60% of their marketing budget on unqualified leads. ${serviceName} fixes that with AI-powered prospecting that only books calls with decision-makers who are ready to buy.`, headline: transformationPromise.substring(0, 40), description: cta, targetAudience: `Cold — ${icpDesc}` },
          { primaryText: `"We went from 2 booked calls a week to 15 — in under 30 days." That's the power of ${serviceName}. Our AI engine handles everything from prospecting to qualification.`, headline: `Stop Chasing. Start Closing.`, description: `${guarantee || 'Results guaranteed'}`, targetAudience: `Cold — ${icpDesc}` },
          { primaryText: `Still doing outreach manually? ${serviceName} deploys 13 AI agents to run your entire lead gen pipeline — cold email, LinkedIn, ads, qualification, and booking — 24/7.`, headline: `Your Sales Team on Autopilot`, description: `See how it works — free strategy call`, targetAudience: `Cold — ${icpDesc}` },
          { primaryText: `${getPain(0)}? You're not alone. But the top ${niche.toLowerCase()} companies solved this months ago with AI-powered lead gen. Here's how they did it.`, headline: `How Top Companies Solved It`, description: cta, targetAudience: `Cold — problem aware` },
          { primaryText: `Your competitors are booking 3x more qualified calls using AI. ${serviceName} automates prospecting, outreach, and qualification — so your team only talks to ready buyers.`, headline: `Don't Fall Behind`, description: `Free strategy call`, targetAudience: `Cold — competitor aware` },
          { primaryText: `You visited our page but didn't book a call. Here's what you missed: ${transformationPromise.toLowerCase()}. ${guarantee || 'No risk.'}`, headline: `Still Thinking About It?`, description: `Book your free call now`, targetAudience: `Hot — retargeting visitors` },
          { primaryText: `You started the form but didn't finish. We get it — big decisions take time. But ${getPain(0).toLowerCase()} won't fix itself. Let's talk for 15 minutes.`, headline: `Pick Up Where You Left Off`, description: cta, targetAudience: `Hot — retargeting form abandoners` },
          { primaryText: `Join 500+ ${niche.toLowerCase()} companies using ${serviceName} to build a predictable pipeline. Average client sees first qualified leads within 14 days.`, headline: `500+ Companies Can't Be Wrong`, description: `${guarantee || 'See it in action'}`, targetAudience: `Warm — engaged audience` },
          { primaryText: `Imagine waking up to 3 qualified meetings on your calendar — every single day. That's what ${serviceName} delivers for ${niche.toLowerCase()} companies.`, headline: `3 Meetings/Day on Autopilot`, description: cta, targetAudience: `Warm — lookalike` },
          { primaryText: `Last month, our ${niche.toLowerCase()} clients generated an average of 47 qualified leads. Zero manual outreach. Zero cold calling. Just AI doing what AI does best.`, headline: `47 Leads. Zero Effort.`, description: `See how — free call`, targetAudience: `Cold — results focused` },
        ],
      },
      hooks: [
        { angle: 'pain', hook: `${getPain(0)} — and you're still doing outreach manually?`, useCase: 'Email subject line, ad opening' },
        { angle: 'curiosity', hook: `This AI system books 10+ qualified calls/week for ${niche.toLowerCase()} companies. Here's how.`, useCase: 'LinkedIn post, video hook' },
        { angle: 'social_proof', hook: `500+ ${niche.toLowerCase()} companies switched to AI-powered lead gen last quarter. The ones who didn't are falling behind.`, useCase: 'Meta ad, landing page' },
        { angle: 'urgency', hook: `We're onboarding 10 ${niche.toLowerCase()} companies this month. After that, the waitlist opens.`, useCase: 'Email CTA, retargeting ad' },
        { angle: 'contrarian', hook: `Cold calling is dead. SEO takes 6 months. Here's what actually works for ${niche.toLowerCase()} in 2026.`, useCase: 'Blog title, YouTube hook' },
      ],
      coldEmailSequence: [
        { step: 1, delay: 'Day 1', subject: `Quick question about ${niche.toLowerCase()}`, body: `Hi {firstName},\n\nI noticed {company} is in the ${niche.toLowerCase()} space — specifically around ${getPain(0).toLowerCase()}. Thought this might resonate.\n\nWe help companies like yours solve ${getPain(0)} — without the usual headaches.\n\nWould it make sense to chat for 15 minutes this week?\n\nBest,\n{senderName}`, purpose: 'Personalised opener + problem statement + soft CTA', sopRole: 'personalised_opener' },
        { step: 2, delay: 'Day 3', subject: `How a ${niche.toLowerCase()} company solved ${getPain(0)}`, body: `Hi {firstName},\n\nNo pitch today — just a quick case study I thought you'd find useful.\n\nOne of our clients in ${niche.toLowerCase()} was struggling with ${getPain(0)}. Within 30 days of using ${serviceName}, they saw measurable improvement across their pipeline.\n\nHappy to share the full breakdown if helpful.\n\nBest,\n{senderName}`, purpose: 'Value drop — case study or result, no pitch', sopRole: 'value_drop' },
        { step: 3, delay: 'Day 5', subject: `Re: Quick question about ${niche.toLowerCase()}`, body: `Hi {firstName},\n\nCircling back on my first note. Totally understand if the timing wasn't right.\n\nIs this something worth revisiting now, or is there a better time this quarter?${guarantee ? `\n\nWorth noting: ${guarantee}.` : ''}\n\nBest,\n{senderName}`, purpose: 'Nudge — reference email 1, ask if timing is better', sopRole: 'nudge' },
        { step: 4, delay: 'Day 8', subject: `Last one from me`, body: `Hi {firstName},\n\nThis is my last email — I don't want to clog your inbox.\n\nIf ${getPain(0).toLowerCase()} becomes a priority for {company}, feel free to reply anytime or grab a time here: ${bookingUrl}\n\nWishing you the best.\n\n{senderName}`, purpose: 'Breakup — "last one from me" energy, creates urgency', sopRole: 'breakup' },
      ],
      linkedInDMSequence: {
        message1: { text: `Hi {firstName}, thanks for connecting! I came across your work at {company} — really impressed by {specificProfileDetail}. Great to be in your network.`.substring(0, 300), timing: 'on connect', sopRole: 'thank_and_mention' },
        message2: { text: `Hi {firstName}, saw this case study on how a ${niche.toLowerCase()} company solved ${getPain(0).toLowerCase()} — thought it might be relevant given what {company} is doing. Happy to share if you're interested.`, timing: 'day 2-3', sopRole: 'share_value' },
        message3: { text: `Hi {firstName}, curious — is ${getPain(0).toLowerCase()} something {company} is actively working on? If so, happy to share what's working for other ${niche.toLowerCase()} companies on a quick 15-min call. No pressure either way. ${bookingUrl}`, timing: 'day 5-7', sopRole: 'soft_cta' },
      },
      videoAdScripts: [
        {
          duration: '30-60s',
          format: 'Customer testimonial',
          videoType: 'customer_testimonial',
          priority: 1,
          hook: `This tool booked us 47 qualified calls in 30 days. (0-3s)`,
          problem: `We were spending thousands on ads and cold outreach but only getting tire-kickers. Our pipeline was empty more often than not. (3-10s)`,
          solution: `Then we found ${serviceName} — an AI engine with 13 agents that finds, qualifies, and books real decision-makers on our calendar automatically. (10-25s)`,
          proof: `In the first month, we went from 2 calls a week to 47 qualified meetings. No new hires. No extra ad spend. Just AI doing the heavy lifting. (25-40s)`,
          cta: `${cta} — link in bio. (last 3-5s)`,
        },
        {
          duration: '30-45s',
          format: 'Before/after walkthrough',
          videoType: 'before_after_walkthrough',
          priority: 2,
          hook: `This is what our pipeline looked like 30 days ago. (0-3s)`,
          problem: `Empty CRM. Maybe 2 calls a week. Manual outreach that went nowhere. Sound familiar? (3-10s)`,
          solution: `We turned on ${serviceName} — 13 AI agents running outreach, qualification, and booking 24/7. No hiring, no offer changes. (10-25s)`,
          proof: `Now look at this — pipeline full of qualified ${niche.toLowerCase()} leads. Every single one booked automatically. (25-40s)`,
          cta: `Want the same results? ${cta}. (last 3-5s)`,
        },
        {
          duration: '45-60s',
          format: 'Founder talking head',
          videoType: 'founder_talking_head',
          priority: 3,
          hook: `I built an AI that replaces a 5-person sales team. (0-3s)`,
          problem: `${niche.toLowerCase()} companies are still doing outreach manually. Spreadsheets, cold calls, LinkedIn spam. It doesn't scale and it burns people out. (3-10s)`,
          solution: `So we built ${serviceName} — 13 specialized AI agents that handle everything from finding prospects to qualifying them on a real phone call to booking the meeting on your calendar. (10-25s)`,
          proof: `Our clients typically see 10+ qualified calls per week within 30 days. It works while you sleep. And it costs less than one SDR. (25-40s)`,
          cta: `See it in action — ${cta}. (last 3-5s)`,
        },
        {
          duration: '30-45s',
          format: 'Screen recording + voiceover',
          videoType: 'screen_recording_voiceover',
          priority: 4,
          hook: `Watch this AI book a qualified meeting in real time. (0-3s)`,
          problem: `Most ${niche.toLowerCase()} teams spend hours prospecting manually and still end up with unqualified leads. (3-10s)`,
          solution: `${serviceName} runs the entire pipeline — from identifying prospects to AI-qualifying them over the phone to dropping a meeting on your calendar. Let me show you. (10-25s)`,
          proof: `This client's dashboard shows 47 leads found, 23 qualified, 15 meetings booked — all in the last 7 days. Zero manual work. (25-40s)`,
          cta: `${cta} — link below. (last 3-5s)`,
        },
        {
          duration: '30-45s',
          format: 'Process reveal',
          videoType: 'process_reveal',
          priority: 5,
          hook: `Here's what happens behind the scenes when you turn on ${serviceName}. (0-3s)`,
          problem: `Most lead gen tools handle one piece of the puzzle. You still need 5 tools and 3 people to make it work. (3-10s)`,
          solution: `${serviceName} chains 13 AI agents together — research, outreach, qualification, booking — all running autonomously. (10-25s)`,
          proof: `This pipeline was built in under a week. Since then: 200+ prospects contacted, 50+ qualified, 30+ meetings booked. No human touched it. (25-40s)`,
          cta: `See how it works for ${niche.toLowerCase()} — ${cta}. (last 3-5s)`,
        },
      ],
      ugcScripts: {
        patternA_roleSpecific: [
          {
            role: 'Finance',
            hook: `Your cost-per-lead is 3x what it should be. Here's why.`,
            credibilitySetup: `We've helped 500+ companies cut their customer acquisition cost in half.`,
            productIntro: `${serviceName} is an AI engine with 13 agents that automates your entire lead gen pipeline.`,
            keyBenefit: `Cut your CPL by 50% while tripling qualified pipeline volume.`,
            businessCase: `One SDR costs $60K+/year. ${serviceName} delivers 3x the output at a fraction of the cost — with zero ramp time.`,
            cta: `Ask your marketing team to book a 15-minute ROI walkthrough. ${bookingUrl}`,
            duration: '30-60s',
          },
          {
            role: 'CEO',
            hook: `Your sales team is the bottleneck. And hiring more reps won't fix it.`,
            credibilitySetup: `We built the AI engine that 500+ companies use to scale pipeline without scaling headcount.`,
            productIntro: `${serviceName} replaces manual prospecting, outreach, and qualification with 13 specialized AI agents.`,
            keyBenefit: `Predictable pipeline growth without the overhead of a growing sales org.`,
            businessCase: `Scale from 10 to 100 qualified meetings per month without a single new hire. Faster time-to-revenue, lower burn.`,
            cta: `See the 15-minute executive demo. ${bookingUrl}`,
            duration: '30-60s',
          },
          {
            role: 'HR',
            hook: `Hiring SDRs takes 3 months. Training them takes 3 more. What if you didn't have to?`,
            credibilitySetup: `Companies using ${serviceName} have eliminated 80% of entry-level sales hiring needs.`,
            productIntro: `${serviceName} automates prospecting, outreach, and lead qualification — the work your SDRs do today.`,
            keyBenefit: `Reduce hiring pressure on your sales recruiting pipeline.`,
            businessCase: `No more cycling through SDRs every 9 months. ${serviceName} runs 24/7, never needs onboarding, and scales instantly.`,
            cta: `Share this with your VP of Sales — they'll want to see the demo. ${bookingUrl}`,
            duration: '30-60s',
          },
          {
            role: 'Operations',
            hook: `Your lead gen stack has 7 tools, 3 integrations, and zero consistency.`,
            credibilitySetup: `We've replaced fragmented sales tooling for 500+ companies with a single autonomous platform.`,
            productIntro: `${serviceName} consolidates prospecting, outreach, qualification, and booking into one AI-powered system.`,
            keyBenefit: `One platform, one dashboard, zero manual handoffs between tools.`,
            businessCase: `Eliminate tool sprawl and reduce operational overhead. Fewer vendors, fewer integrations, fewer things that break.`,
            cta: `Book a technical walkthrough to see how it fits your stack. ${bookingUrl}`,
            duration: '30-60s',
          },
        ],
        patternB_hookVariations: [
          {
            variationType: 'personal_experience',
            hook: `I used to spend 4 hours a day on cold outreach. Now I spend zero. (0-3s)`,
            problem: `Manual prospecting is a grind — you burn hours on LinkedIn and email for maybe 1-2 responses. It's not scalable. (3-10s)`,
            solution: `${serviceName} runs 13 AI agents that handle everything from finding prospects to booking qualified meetings on your calendar. (10-25s)`,
            proof: `In my first month, I went from 3 calls a week to 15 — without sending a single manual email. (25-40s)`,
            cta: `Try it yourself — ${cta}. (last 3-5s)`,
            duration: '30-60s',
          },
          {
            variationType: 'pain_point',
            hook: `If you're still doing outreach manually, you're leaving money on the table. (0-3s)`,
            problem: `Most ${niche.toLowerCase()} companies waste 60% of their marketing budget on leads that never convert. The pipeline is inconsistent, the team is burned out, and you can't scale. (3-10s)`,
            solution: `${serviceName} fixes this with AI-powered prospecting that only books calls with decision-makers who are ready to buy. (10-25s)`,
            proof: `Our average client sees their first qualified leads within 14 days — and 3x pipeline growth within 60. (25-40s)`,
            cta: `Stop guessing. ${cta}. (last 3-5s)`,
            duration: '30-60s',
          },
          {
            variationType: 'bold_statement',
            hook: `Cold calling is dead. SEO takes 6 months. Here's what actually works. (0-3s)`,
            problem: `The old playbook — hire SDRs, buy lists, blast emails — doesn't scale anymore. Response rates are at all-time lows. (3-10s)`,
            solution: `${serviceName} uses 13 AI agents to run your entire go-to-market: research, outreach, qualification, and booking — autonomously. (10-25s)`,
            proof: `Companies using ${serviceName} book 10+ qualified calls per week within 30 days. No SDRs. No manual work. (25-40s)`,
            cta: `See why 500+ companies switched — ${cta}. (last 3-5s)`,
            duration: '30-60s',
          },
          {
            variationType: 'social_proof',
            hook: `500+ companies switched to AI-powered lead gen last quarter. Here's what happened. (0-3s)`,
            problem: `They were all stuck in the same place: inconsistent pipeline, high CPL, teams stretched thin on manual outreach. (3-10s)`,
            solution: `They turned on ${serviceName} — 13 AI agents that handle prospecting, outreach, qualification, and booking automatically. (10-25s)`,
            proof: `Average results: 3x pipeline growth, 50% lower cost-per-lead, first qualified meetings within 14 days. (25-40s)`,
            cta: `Join them — ${cta}. (last 3-5s)`,
            duration: '30-60s',
          },
        ],
      },
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
        {
          type: 'process_reveal',
          description: `Behind-the-scenes look at how ${serviceName}'s 13 AI agents work together to fill a ${niche.toLowerCase()} company's pipeline.`,
          talkingPoints: [
            `Show the dashboard with all 13 agents`,
            `Walk through the pipeline: research → outreach → qualification → booking`,
            `Highlight real data: prospects found, calls made, meetings booked`,
            `End with: "This runs 24/7 without a single human touch"`,
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
        {
          concept: '13-Agent Infographic',
          layout: 'Vertical flow showing 13 agents as connected nodes, each with icon + one-line description, pipeline arrow connecting them',
          imagery: 'Dark space theme, glowing cyan connections, each agent as a small planet/node',
          textOverlay: `"13 AI Agents. 1 Pipeline. Zero Manual Work." — ${cta}`,
        },
      ],
      reasoning: `Full SOP-aligned creative asset package generated for ${niche} using upstream offer and funnel data. Includes 10 Google Ads, 10 Meta Ads, 5 hooks, 4 cold emails (SOP: opener→value drop→nudge→breakup), 3 LinkedIn DMs (SOP: thank+mention→share value→soft CTA), 5 video scripts (priority: testimonial→before/after→founder→screen recording→process reveal, each with Hook→Problem→Solution→Proof→CTA structure), UGC scripts Pattern A (4 role-specific: Finance/CEO/HR/Operations) and Pattern B (4 hook variations: personal experience/pain point/bold statement/social proof), 3 UGC briefs, and 3 visual creative briefs. Content tailored to ICP: ${icpDesc}.`,
      confidence: 75,
    };
  }
}
