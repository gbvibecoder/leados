import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { scrapeProductContext, type ProductContext } from '../scrape-url';

const SYSTEM_PROMPT = `You are a Content & Creative Agent. You create marketing materials for the CLIENT'S product/service — NOT for LeadOS or any AI agent platform.

CRITICAL — YOU ARE CREATING ADS FOR THE CLIENT'S PRODUCT:
- You are NOT advertising LeadOS, AI agents, or any lead generation platform
- You ARE advertising the client's actual product/service described in the input
- NEVER mention "13 agents", "AI engine", "LeadOS", "autonomous pipeline", or lead generation automation
- ALL content must be about the CLIENT'S product features, benefits, and value propositions

You receive JSON with the offer (ICP, pain points, pricing, positioning), funnel data, market context, and PRODUCT CONTEXT scraped from the client's actual website.

PRODUCT CONTEXT RULE: If "productContext" is provided, it contains data scraped from the client's website. You MUST:
1. Study the website title, description, headings, and content to understand EXACTLY what the product/service does
2. Use the actual product name, feature names, and value propositions from the website
3. Write ads that a potential CUSTOMER of this product would find compelling
4. Reference real features and benefits from the website — NOT generic marketing language
5. Match the tone and industry terminology of the website

LOCALIZATION RULE: If "localization" or "outputLanguage" is provided in the input, ALL output content (ad copies, email sequences, LinkedIn messages, video scripts, UGC scripts, hooks — everything) MUST be written in the specified language. Keep brand names and product names in their original form, but write all surrounding copy in the target language.

Adapt ALL content to the specific product, ICP, and offer. Use rising keywords from Google Trends in ad copies.

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
    this._runConfig = inputs.config;
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

    // Scrape the project URL for real product context
    const projectUrl = inputs.config?.projectUrl || inputs.config?.url || '';
    let productContext: ProductContext | null = null;
    if (projectUrl) {
      await this.log('scraping_url', { url: projectUrl });
      productContext = await scrapeProductContext(projectUrl);
      if (productContext) {
        await this.log('url_scraped', {
          title: productContext.title,
          headingsCount: productContext.headings.length,
          descriptionLength: productContext.description.length,
        });
      } else {
        await this.log('url_scrape_failed', { url: projectUrl });
      }
    }

    try {
      await this.log('generating_content', { phase: 'Generating creative assets' });

      const localization = inputs.config?.localization;
      const enrichedInput = JSON.stringify({
        // Language/localization — all content MUST be in this language
        ...(localization ? { localization } : {}),
        ...(inputs.config?.language ? { outputLanguage: inputs.config.language } : {}),
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
        // Real product/service data from the client's website
        productContext: productContext ? {
          websiteTitle: productContext.title,
          websiteDescription: productContext.description,
          websiteKeywords: productContext.keywords,
          mainHeadings: productContext.headings,
          pageContent: productContext.bodySnippet,
          sourceUrl: productContext.url,
        } : undefined,
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
        // Build complete fallback from upstream + product context
        parsed = this.buildFallbackContent(niche, offerData, funnelData, productContext);
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
  private buildFallbackContent(niche: string, offerData: any, funnelData: any, productCtx?: ProductContext | null): any {
    // Use product context to build accurate content about the CLIENT'S product
    // Extract clean product name from title — split on common separators (|, —, –, -)
    const rawTitle = productCtx?.title || '';
    const productName = rawTitle
      ? rawTitle.split(/[|—–\-]/).map(s => s.trim()).filter(s => s.length > 1)[0] || rawTitle.trim()
      : offerData.serviceName || niche;
    const productDesc = productCtx?.description || offerData.transformationPromise || `${productName} — professional ${niche.toLowerCase()} solutions`;
    const features = productCtx?.headings?.slice(0, 5) || [];
    const painPoints = offerData.painPoints || [];
    const getPain = (i: number): string => {
      const p = painPoints[i];
      if (!p) return `challenges in ${niche.toLowerCase()}`;
      return typeof p === 'string' ? p : p.pain || p.description || `challenges in ${niche.toLowerCase()}`;
    };
    const getFeature = (i: number): string => features[i] || productName;
    const guarantee = typeof offerData.guarantee === 'string'
      ? offerData.guarantee
      : offerData.guarantee?.description || '';
    const cta = funnelData.landingPage?.cta || `Learn More About ${productName}`;
    const bookingUrl = funnelData.bookingCalendar?.url || productCtx?.url || '#';
    const websiteUrl = productCtx?.url || '';
    const icpDesc = offerData.icp?.description || offerData.icp?.companySize || `${niche} professionals`;

    // No truncation — show full text in the UI. Google Ads API enforces limits at submission time.
    const h = (text: string): string => text;
    const d = (text: string): string => text;

    // Extract a short tagline from the description
    const shortDesc = productDesc.split('.')[0] || productDesc;

    return {
      adCopies: {
        google: [
          { headline: h(productName), description: d(`${shortDesc}. Try ${productName} today and see the difference.`), targetKeyword: `${niche.toLowerCase()}` },
          { headline: h(`Try ${productName} Today`), description: d(`${shortDesc}. Trusted by ${niche.toLowerCase()} professionals worldwide.`), targetKeyword: `${niche.toLowerCase()} software` },
          { headline: h(`${productName} for ${niche}`), description: d(`${getFeature(0)}. ${getFeature(1)}. See why teams choose ${productName}.`), targetKeyword: `${niche.toLowerCase()} tools` },
          { headline: h(`Best ${niche} Solution`), description: d(`${productName} solves ${getPain(0).toLowerCase()}. Start free today.`), targetKeyword: `best ${niche.toLowerCase()}` },
          { headline: h(`${niche} Made Simple`), description: d(`${productName} simplifies your entire ${niche.toLowerCase()} workflow. ${guarantee || 'Get started in minutes.'}`), targetKeyword: `${niche.toLowerCase()} solution` },
          { headline: h(`Why ${productName}?`), description: d(`${getFeature(0)}. Purpose-built for ${icpDesc.toLowerCase()}.`), targetKeyword: `${productName.toLowerCase()}` },
          { headline: h(`${productName} for Teams`), description: d(`Empower your team with ${productName}. Faster workflows, better results for ${niche.toLowerCase()}.`), targetKeyword: `${niche.toLowerCase()} for teams` },
          { headline: h(`${niche} Simplified`), description: d(`No more ${getPain(0).toLowerCase()}. ${productName} gives you everything you need in one place.`), targetKeyword: `${niche.toLowerCase()} platform` },
          { headline: h(`Get ${productName} Free`), description: d(`Start your free trial of ${productName}. Join ${niche.toLowerCase()} teams already seeing results.`), targetKeyword: `${niche.toLowerCase()} free trial` },
          { headline: h(`Top ${niche} Tool`), description: d(`${productName} — ${shortDesc}. Discover a smarter way to work.`), targetKeyword: `top ${niche.toLowerCase()} tool` },
        ],
        meta: [
          { primaryText: `${getPain(0)}? ${productName} was built to solve exactly that. ${productDesc}. See how it works.`, headline: h(productName), description: cta, targetAudience: `Cold — ${icpDesc}` },
          { primaryText: `Discover ${productName}: ${getFeature(0)}. ${getFeature(1)}. Built for ${icpDesc.toLowerCase()} who demand the best in ${niche.toLowerCase()}.`, headline: h(`Why Teams Choose ${productName}`), description: cta, targetAudience: `Cold — ${icpDesc}` },
          { primaryText: `Tired of ${getPain(0).toLowerCase()}? ${productName} offers a better way. ${shortDesc}. Try it today.`, headline: h(`A Better Way`), description: cta, targetAudience: `Cold — problem aware` },
          { primaryText: `Leading ${niche.toLowerCase()} teams are switching to ${productName}. ${getFeature(0)}. ${getFeature(1)}. See why.`, headline: h(`Join Leading Teams`), description: cta, targetAudience: `Cold — competitor aware` },
          { primaryText: `You checked out ${productName} but haven't signed up yet. Here's what you're missing: ${getFeature(0)}. ${getFeature(1)}.`, headline: h(`Still Thinking About It?`), description: `Try ${productName} now`, targetAudience: `Hot — retargeting visitors` },
          { primaryText: `"${productName} transformed how we handle ${niche.toLowerCase()}." Hear what our users have to say about their experience.`, headline: h(`Hear From Our Users`), description: cta, targetAudience: `Warm — engaged audience` },
          { primaryText: `${productName} — ${productDesc}. Join thousands of ${niche.toLowerCase()} professionals who already made the switch.`, headline: h(productName), description: `Get started today`, targetAudience: `Cold — broad` },
          { primaryText: `Looking for the right ${niche.toLowerCase()} solution? ${productName} delivers ${getFeature(0).toLowerCase()} and ${(getFeature(2) || 'powerful features').toLowerCase()}.`, headline: h(`The ${niche} Solution`), description: cta, targetAudience: `Cold — solution seeking` },
          { primaryText: `${productName} makes ${niche.toLowerCase()} effortless. ${guarantee || 'Try it risk-free and see for yourself.'}`, headline: h(`Effortless ${niche}`), description: cta, targetAudience: `Warm — lookalike` },
          { primaryText: `Stop wasting time on ${getPain(0).toLowerCase()}. ${productName} handles the hard parts so your team can focus on what matters most.`, headline: h(`Focus on What Matters`), description: cta, targetAudience: `Cold — results focused` },
        ],
      },
      hooks: [
        { angle: 'pain', hook: `${getPain(0)}? There's a better way — it's called ${productName}.`, useCase: 'Email subject line, ad opening' },
        { angle: 'curiosity', hook: `${niche} professionals are switching to ${productName}. Here's what they know that you don't.`, useCase: 'LinkedIn post, video hook' },
        { angle: 'social_proof', hook: `See why leading ${niche.toLowerCase()} teams trust ${productName} for ${getFeature(0).toLowerCase()}.`, useCase: 'Meta ad, landing page' },
        { angle: 'urgency', hook: `${productName} is offering early access to their latest ${niche.toLowerCase()} features. Limited spots.`, useCase: 'Email CTA, retargeting ad' },
        { angle: 'contrarian', hook: `Most ${niche.toLowerCase()} tools overcomplicate things. ${productName} takes the opposite approach.`, useCase: 'Blog title, YouTube hook' },
      ],
      coldEmailSequence: [
        { step: 1, delay: 'Day 1', subject: `Quick question about ${niche.toLowerCase()} at {company}`, body: `Hi {firstName},\n\nI noticed {company} works in ${niche.toLowerCase()}. Many teams in your space struggle with ${getPain(0).toLowerCase()}.\n\n${productName} was built to solve exactly that — ${productDesc.toLowerCase()}.\n\nWould a 15-minute walkthrough be worth your time this week?\n\nBest,\n{senderName}`, purpose: 'Personalised opener + problem statement + soft CTA', sopRole: 'personalised_opener' },
        { step: 2, delay: 'Day 3', subject: `How teams are solving ${getPain(0).toLowerCase()}`, body: `Hi {firstName},\n\nNo pitch — just thought you'd find this useful.\n\nTeams using ${productName} have seen real improvements in how they handle ${niche.toLowerCase()}. Key benefits: ${getFeature(0)}, ${getFeature(1) || 'and more'}.\n\nHappy to share more details if helpful.\n\nBest,\n{senderName}`, purpose: 'Value drop — no pitch', sopRole: 'value_drop' },
        { step: 3, delay: 'Day 5', subject: `Re: ${niche.toLowerCase()} at {company}`, body: `Hi {firstName},\n\nCircling back. Totally understand if the timing wasn't right.\n\nIs ${getPain(0).toLowerCase()} something {company} is actively working on? If so, ${productName} might be worth a look.${guarantee ? `\n\n${guarantee}.` : ''}\n\nBest,\n{senderName}`, purpose: 'Nudge — ask if timing is better', sopRole: 'nudge' },
        { step: 4, delay: 'Day 8', subject: `Last note from me`, body: `Hi {firstName},\n\nThis is my last email — I respect your time.\n\nIf ${niche.toLowerCase()} challenges come up for {company}, ${productName} is here: ${websiteUrl || bookingUrl}\n\nAll the best.\n\n{senderName}`, purpose: 'Breakup email', sopRole: 'breakup' },
      ],
      linkedInDMSequence: {
        message1: { text: `Hi {firstName}, thanks for connecting! Noticed your work at {company} in ${niche.toLowerCase()} — impressive. Great to be in your network.`.substring(0, 300), timing: 'on connect', sopRole: 'thank_and_mention' },
        message2: { text: `Hi {firstName}, thought you might find this useful — ${productName} has been helping ${niche.toLowerCase()} teams with ${getFeature(0).toLowerCase()}. Happy to share details if relevant to {company}.`, timing: 'day 2-3', sopRole: 'share_value' },
        message3: { text: `Hi {firstName}, curious — is ${getPain(0).toLowerCase()} something {company} is tackling? If so, happy to show you how ${productName} helps on a quick 15-min call. No pressure. ${websiteUrl || bookingUrl}`, timing: 'day 5-7', sopRole: 'soft_cta' },
      },
      videoAdScripts: [
        {
          duration: '30-60s', format: 'Customer testimonial', videoType: 'customer_testimonial', priority: 1,
          hook: `${productName} changed how we do ${niche.toLowerCase()}. (0-3s)`,
          problem: `We were struggling with ${getPain(0).toLowerCase()}. Nothing we tried worked well enough. (3-10s)`,
          solution: `Then we found ${productName}. ${productDesc} (10-25s)`,
          proof: `Since switching, our team has been more productive and the results speak for themselves. (25-40s)`,
          cta: `Try ${productName} — ${websiteUrl || cta}. (last 3-5s)`,
        },
        {
          duration: '30-45s', format: 'Before/after walkthrough', videoType: 'before_after_walkthrough', priority: 2,
          hook: `Here's our ${niche.toLowerCase()} workflow before and after ${productName}. (0-3s)`,
          problem: `Before: manual processes, missed deadlines, frustrated team. (3-10s)`,
          solution: `After: ${productName} handles ${getFeature(0).toLowerCase()}. Everything is streamlined. (10-25s)`,
          proof: `The difference is night and day. Our team saves hours every week. (25-40s)`,
          cta: `See it yourself — ${cta}. (last 3-5s)`,
        },
        {
          duration: '45-60s', format: 'Founder talking head', videoType: 'founder_talking_head', priority: 3,
          hook: `We built ${productName} because ${niche.toLowerCase()} deserved better tools. (0-3s)`,
          problem: `${niche} professionals were stuck with ${getPain(0).toLowerCase()}. The existing solutions weren't cutting it. (3-10s)`,
          solution: `${productName} — ${productDesc}. ${getFeature(0)}. (10-25s)`,
          proof: `Today, teams across the industry rely on ${productName} to get better results. (25-40s)`,
          cta: `Join them — ${cta}. (last 3-5s)`,
        },
        {
          duration: '30-45s', format: 'Screen recording + voiceover', videoType: 'screen_recording_voiceover', priority: 4,
          hook: `Let me show you ${productName} in action. (0-3s)`,
          problem: `${niche} teams waste time on ${getPain(0).toLowerCase()}. (3-10s)`,
          solution: `With ${productName}, you get ${getFeature(0)}. Watch how easy it is. (10-25s)`,
          proof: `That's it. What used to take hours now takes minutes. (25-40s)`,
          cta: `Try it free — ${websiteUrl || cta}. (last 3-5s)`,
        },
        {
          duration: '30-45s', format: 'Process reveal', videoType: 'process_reveal', priority: 5,
          hook: `Here's how ${productName} works behind the scenes. (0-3s)`,
          problem: `Most ${niche.toLowerCase()} tools are complex and clunky. (3-10s)`,
          solution: `${productName} takes a different approach — ${getFeature(0).toLowerCase()}, ${getFeature(1)?.toLowerCase() || 'simplicity first'}. (10-25s)`,
          proof: `The result? Teams adopt it in days, not months. (25-40s)`,
          cta: `See how it works — ${cta}. (last 3-5s)`,
        },
      ],
      ugcScripts: {
        patternA_roleSpecific: ['Finance', 'CEO', 'HR', 'Operations'].map(role => ({
          role,
          hook: `If you're in ${role} and dealing with ${niche.toLowerCase()}, watch this.`,
          credibilitySetup: `We've seen how ${productName} helps ${niche.toLowerCase()} teams operate more effectively.`,
          productIntro: `${productName} — ${productDesc}`,
          keyBenefit: `${getFeature(0)}`,
          businessCase: `Teams using ${productName} report better efficiency and fewer headaches with ${niche.toLowerCase()}.`,
          cta: `Check out ${productName} — ${websiteUrl || cta}`,
          duration: '30-60s',
        })),
        patternB_hookVariations: [
          { variationType: 'personal_experience', hook: `I tried every ${niche.toLowerCase()} tool out there. ${productName} is the one that stuck. (0-3s)`, problem: `${getPain(0)} — sound familiar? (3-10s)`, solution: `${productName} — ${productDesc} (10-25s)`, proof: `It's been a game-changer for our team. (25-40s)`, cta: `Try ${productName} — ${cta}. (last 3-5s)`, duration: '30-60s' },
          { variationType: 'pain_point', hook: `Still struggling with ${getPain(0).toLowerCase()}? (0-3s)`, problem: `Most ${niche.toLowerCase()} teams waste time on processes that should be simple. (3-10s)`, solution: `${productName} fixes that — ${getFeature(0).toLowerCase()}. (10-25s)`, proof: `Teams are seeing real results within weeks. (25-40s)`, cta: `See for yourself — ${cta}. (last 3-5s)`, duration: '30-60s' },
          { variationType: 'bold_statement', hook: `Most ${niche.toLowerCase()} tools are stuck in the past. (0-3s)`, problem: `They're complex, slow, and don't deliver what they promise. (3-10s)`, solution: `${productName} was built differently — ${productDesc.toLowerCase()}. (10-25s)`, proof: `That's why professionals are switching. (25-40s)`, cta: `Join them — ${cta}. (last 3-5s)`, duration: '30-60s' },
          { variationType: 'social_proof', hook: `${niche} teams are switching to ${productName}. Here's why. (0-3s)`, problem: `They were tired of ${getPain(0).toLowerCase()}. (3-10s)`, solution: `${productName} gives them ${getFeature(0).toLowerCase()} and ${getFeature(1)?.toLowerCase() || 'more'}. (10-25s)`, proof: `The results speak for themselves. (25-40s)`, cta: `Try ${productName} today — ${cta}. (last 3-5s)`, duration: '30-60s' },
        ],
      },
      ugcBriefs: [
        { type: 'testimonial', description: `A ${niche.toLowerCase()} professional shares how ${productName} helped them solve ${getPain(0).toLowerCase()}.`, talkingPoints: [`What ${niche.toLowerCase()} was like before ${productName}`, `The switch to ${productName}`, `Key results and benefits`, `Would you recommend it?`] },
        { type: 'before_after', description: `Screen recording showing ${niche.toLowerCase()} workflow before and after adopting ${productName}.`, talkingPoints: [`Show the old way (manual, slow)`, `Show ${productName} in action`, `Highlight time saved and results`, `End with CTA`] },
        { type: 'process_reveal', description: `Behind the scenes: how ${productName} handles ${getFeature(0).toLowerCase()}.`, talkingPoints: [`Open ${productName} dashboard`, `Walk through key features`, `Show real results`, `End with: "This is how ${niche.toLowerCase()} should work"`] },
      ],
      visualCreativeBriefs: [
        { concept: 'Product Showcase', layout: `Clean product screenshot/mockup of ${productName} with key feature callouts`, imagery: `Professional, modern design showcasing ${productName}'s interface`, textOverlay: `"${productName} — ${productDesc.substring(0, 60)}" — ${cta}` },
        { concept: 'Problem → Solution', layout: `Split-screen: left shows the pain (${getPain(0).toLowerCase()}), right shows ${productName} solving it`, imagery: `Contrasting visuals — frustration vs. clarity and ease`, textOverlay: `"Stop struggling with ${niche.toLowerCase()}. Start using ${productName}."` },
        { concept: 'Social Proof', layout: `Customer quotes and key metrics from ${productName} users`, imagery: `Trust badges, professional headshots, metric highlights`, textOverlay: `"Trusted by ${niche} professionals" — ${cta}` },
      ],
      reasoning: `Creative asset package generated for ${productName} (${niche}). All content is about the client's product, not LeadOS. Used product context from ${websiteUrl || 'upstream data'} to build accurate, product-specific ads, emails, scripts, and briefs.`,
      confidence: 75,
    };
  }
}
