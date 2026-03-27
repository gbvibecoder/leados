import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { scrapeProductContext, type ProductContext } from '../scrape-url';

// ── Shared preamble — sent to ALL groups (kept minimal to reduce input tokens) ──
const PROMPT_BASE = `You are a Content & Creative Agent creating marketing materials for the CLIENT'S product/service — NOT for LeadOS or any AI agent platform.
CRITICAL: You are NOT advertising LeadOS, AI agents, or lead generation platforms. ALL content is about the CLIENT'S actual product.
NEVER mention "13 agents", "AI engine", "LeadOS", "autonomous pipeline", or lead generation automation.

PRODUCT CONTEXT RULE: If "productContext" is provided, use the actual product name, features, and value propositions from the website. Match the tone and industry terminology.
LOCALIZATION RULE: If "localization" or "outputLanguage" is provided, ALL output MUST be in the specified language. Keep brand names in original form.
Adapt ALL content to the specific product, ICP, and offer. Use rising keywords from Google Trends.
Do NOT invent performance metrics (open rates, click rates, impressions). Only creative content.
Return ONLY valid JSON (no markdown).`;

// ── Storytelling framework — shared by ads, hooks, video, and UGC groups ──
const STORYTELLING_FRAMEWORK = `
## STORYTELLING AD FRAMEWORK — MANDATORY
You are telling a friend what you found. The best ads don't feel like ads.

Four Rules: 1) Never sound like an ad. 2) Never list features — tell a STORY. 3) Never lecture — tell it like gossip. 4) Never pitch the product too early.

30-Second Structure: Beat 1 HOOK (0-3s): Make them FEEL something. Beat 2 STORY (3-10s): A real result told like gossip. Beat 3 REFRAME+PRODUCT (10-22s): Connect to THEIR life, introduce product casually — "It's called..." Beat 4 CLOSE (22-30s): Identity-level CTA looping back to hook.

Three Hook Types: 1) Gut Punch — specific loss + unexpected outcome. 2) Open Loop — promise aimed at a specific person. 3) Body Memory — visceral, physical, you feel it reading it.

Triple Hook Layers: Visual (stops the scroll), Audio (first sentence, works standalone), Text on Screen (bold text for muted viewing — must pass MUTE TEST).

Product Introduction: Product appears INSIDE the story, reluctantly. "It's called [Product]. I found it through a Reddit thread."
Identity Close: NOT "Shop now" but "If you've been [doing X] and wondering why nothing's changing, this is probably why."
Creative Diversity: Each ad signals a DIFFERENT buyer — guilt, exposé, active user, comparison, rescue, money, unexpected benefit, friend recommendation, skeptic-turned-believer, before/after.`;

// ── Single LLM prompt — only Meta Ads need AI-generated storytelling ──
// Everything else (Google Ads, emails, LinkedIn, video scripts, UGC, briefs) uses instant templates.
const PROMPT_CREATIVE = `${PROMPT_BASE}
${STORYTELLING_FRAMEWORK}

Generate Meta/Facebook Ads and hooks. Return ONLY this JSON (no other keys):
{
  "meta": [{ "primaryText": "string", "headline": "string", "description": "string", "targetAudience": "string", "emotionalDoorway": "string", "hookType": "gut_punch|open_loop|body_memory", "tripleHook": { "visual": "string", "audio": "string", "textOnScreen": "string" } }],
  "hooks": [{ "angle": "pain|curiosity|social_proof|urgency|contrarian", "hook": "string", "hookType": "gut_punch|open_loop|body_memory", "useCase": "string", "tripleHook": { "visual": "string", "audio": "string", "textOnScreen": "string" } }]
}
Produce exactly 10 Meta Ads (10 DIFFERENT emotional doorways — guilt, exposé, active user, comparison, rescue story, money, unexpected benefit, friend recommendation, skeptic-turned-believer, before/after — NOT variations of one ad) and 5 hooks with triple hook layers.
Be concise in primaryText — 3-4 sentences max per ad. Keep tripleHook descriptions under 15 words each.`;

// ── In-memory scrape cache — avoids re-fetching the same URL within a process ──
const scrapeCache = new Map<string, { data: ProductContext | null; ts: number }>();
const SCRAPE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function cachedScrape(url: string): Promise<ProductContext | null> {
  const cached = scrapeCache.get(url);
  if (cached && Date.now() - cached.ts < SCRAPE_CACHE_TTL) return cached.data;
  const data = await scrapeProductContext(url);
  scrapeCache.set(url, { data, ts: Date.now() });
  return data;
}

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

    // Scrape the project URL for real product context (cached + non-blocking)
    const projectUrl = inputs.config?.projectUrl || inputs.config?.url || '';
    const scrapePromise = projectUrl ? cachedScrape(projectUrl) : Promise.resolve(null);

    try {
      await this.log('generating_content', { phase: 'Generating creative assets' });

      // Await scrape (already started above, runs in parallel with data extraction)
      const productContext = await scrapePromise;

      const localization = inputs.config?.localization;
      // Trim input payload — less tokens = faster LLM processing
      const enrichedInput = JSON.stringify({
        ...(localization ? { localization } : {}),
        ...(inputs.config?.language ? { outputLanguage: inputs.config.language } : {}),
        offer: {
          serviceName: offerData.serviceName,
          icp: offerData.icp,
          painPoints: (offerData.painPoints || []).slice(0, 5),
          transformationPromise: offerData.transformationPromise,
          guarantee: offerData.guarantee,
          positioning: offerData.positioning,
          uniqueMechanism: offerData.uniqueMechanism,
        },
        productContext: productContext ? {
          websiteTitle: productContext.title,
          websiteDescription: productContext.description,
          mainHeadings: productContext.headings?.slice(0, 5),
          sourceUrl: productContext.url,
        } : undefined,
        funnel: {
          headline: funnelData.landingPage?.headline,
          cta: funnelData.landingPage?.cta,
        },
        marketContext: {
          niche,
          risingQueries: risingQueries.slice(0, 5),
        },
      });

      // ── Generate content: 1 LLM call (Meta Ads + Hooks) + instant templates ──
      // Only Meta Ads need AI storytelling. Everything else uses product-aware templates.
      let parsed: any = {};
      try {
        // Build template content instantly (no LLM needed) — covers Google Ads,
        // cold emails, LinkedIn DMs, video scripts, UGC scripts, briefs
        const templateContent = this.buildFallbackContent(niche, offerData, funnelData, productContext);

        await this.log('generating_creative', { llmCalls: 1 });

        // Single LLM call — Meta Ads + Hooks only (maxRetries: 1 for speed)
        const response = await this.callClaude(PROMPT_CREATIVE, enrichedInput, 1, 4096);
        const llmResult = this.safeParseLLMJson<any>(response, ['meta', 'hooks']);

        // Merge: LLM creative + template structured content
        parsed = {
          adCopies: {
            google: templateContent.adCopies.google,
            meta: llmResult.meta || [],
          },
          hooks: llmResult.hooks || [],
          coldEmailSequence: templateContent.coldEmailSequence,
          linkedInDMSequence: templateContent.linkedInDMSequence,
          videoAdScripts: templateContent.videoAdScripts,
          ugcScripts: templateContent.ugcScripts,
          ugcBriefs: templateContent.ugcBriefs,
          visualCreativeBriefs: templateContent.visualCreativeBriefs,
        };
        parsed.reasoning = 'Content creation complete — all creative asset types generated.';
        parsed.confidence = 85;
      } catch (err: any) {
        await this.log('llm_failed', { error: err.message });
        // Build complete fallback from upstream + product context
        parsed = this.buildFallbackContent(niche, offerData, funnelData, productContext);

        // If a non-English language is set, attempt to translate the fallback content via LLM
        const outputLang = inputs.config?.language;
        if (outputLang && outputLang !== 'en') {
          try {
            const langLabel = localization?.instruction?.match(/in (\w+)/)?.[1] || outputLang;
            const translatePrompt = `Translate ALL text values in the following JSON to ${langLabel}. Keep JSON structure, keys, brand names, and URLs unchanged. Only translate the string values that are user-facing content (headlines, descriptions, hooks, email bodies, LinkedIn messages, video scripts). Return valid JSON only.`;
            const translateResponse = await this.callClaude(translatePrompt, JSON.stringify(parsed), 1, 8192);
            const translated = this.safeParseLLMJson<any>(translateResponse, []);
            if (translated && Object.keys(translated).length > 0) {
              parsed = translated;
              await this.log('fallback_translated', { language: langLabel });
            }
          } catch {
            await this.log('fallback_translation_failed', { language: outputLang });
            // Keep English fallback — better than nothing
          }
        }
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
          { headline: h(`Stop ${getPain(0).split(' ')[0]}ing`), description: d(`We switched to ${productName} after wasting months. ${shortDesc}. Wish we'd found it sooner.`), targetKeyword: `${niche.toLowerCase()}` },
          { headline: h(`We Almost Gave Up`), description: d(`Then a colleague mentioned ${productName}. ${getFeature(0)}. Haven't looked back since.`), targetKeyword: `${niche.toLowerCase()} software` },
          { headline: h(`${niche} Changed For Us`), description: d(`${productName} did what 3 other tools couldn't. ${getFeature(0)}. See why teams are switching.`), targetKeyword: `${niche.toLowerCase()} tools` },
          { headline: h(`Wish I Knew Sooner`), description: d(`${getPain(0)}? We tried everything. ${productName} was the one that actually worked.`), targetKeyword: `best ${niche.toLowerCase()}` },
          { headline: h(`The ${niche} Shortcut`), description: d(`My team found ${productName} through a forum thread. ${guarantee || 'It changed how we work.'}`), targetKeyword: `${niche.toLowerCase()} solution` },
          { headline: h(`Why ${productName}?`), description: d(`Our ${niche.toLowerCase()} team stumbled on it. ${getFeature(0)}. Now we can't imagine going back.`), targetKeyword: `${productName.toLowerCase()}` },
          { headline: h(`One Thing Changed`), description: d(`We replaced our entire ${niche.toLowerCase()} stack with ${productName}. Best decision this quarter.`), targetKeyword: `${niche.toLowerCase()} for teams` },
          { headline: h(`No More ${getPain(0).split(' ').slice(0,2).join(' ')}`), description: d(`${productName} handled what we couldn't. ${getFeature(0)}. Try it and see.`), targetKeyword: `${niche.toLowerCase()} platform` },
          { headline: h(`Found ${productName}`), description: d(`A friend in ${niche.toLowerCase()} told me about it. Week one, our whole workflow changed.`), targetKeyword: `${niche.toLowerCase()} free trial` },
          { headline: h(`This Changed Everything`), description: d(`${productName} — ${shortDesc}. We were skeptical too. Then we tried it.`), targetKeyword: `top ${niche.toLowerCase()} tool` },
        ],
        meta: [
          // 1. Guilt angle
          { primaryText: `We spent months doing ${niche.toLowerCase()} the hard way. Manual everything. Late nights. Missed deadlines.\n\nThen someone on our team found ${productName}. ${getFeature(0)}.\n\nWish we hadn't waited so long. It's called ${productName}. ${guarantee || 'See for yourself.'}`, headline: h(`We Should've Started Sooner`), description: cta, targetAudience: `Cold — ${icpDesc}`, emotionalDoorway: 'guilt', hookType: 'gut_punch' as const, tripleHook: { visual: `Person staring at messy desk, then clean workspace with ${productName} on screen`, audio: `"We spent months doing this the hard way."`, textOnScreen: `WE SHOULD HAVE STARTED SOONER` } },
          // 2. Exposé angle
          { primaryText: `Here's what nobody tells you about ${niche.toLowerCase()} tools: most of them solve the wrong problem.\n\nWe went through 3 platforms before finding ${productName}. ${getFeature(0)}. ${getFeature(1) || ''}\n\nIf you're still ${getPain(0).toLowerCase()}, this is probably why.`, headline: h(`What Nobody Tells You`), description: cta, targetAudience: `Cold — problem aware`, emotionalDoorway: 'expose', hookType: 'open_loop' as const, tripleHook: { visual: `Close-up of someone frustrated, then moment of discovery`, audio: `"Here's what nobody tells you about ${niche.toLowerCase()} tools."`, textOnScreen: `WHAT NOBODY TELLS YOU ABOUT ${niche.toUpperCase()}` } },
          // 3. Active user angle
          { primaryText: `First week with ${productName}, I kept checking if it was actually working. It felt too easy.\n\n${getFeature(0)}. ${getFeature(1) || 'Everything just clicked.'}\n\nThree months in, our team hasn't touched the old tools once.`, headline: h(`Felt Too Easy`), description: cta, targetAudience: `Cold — efficiency seekers`, emotionalDoorway: 'active_user', hookType: 'body_memory' as const, tripleHook: { visual: `Screen recording of smooth workflow, person looking surprised`, audio: `"First week, I kept checking if it was actually working."`, textOnScreen: `3 MONTHS. HAVEN'T TOUCHED THE OLD TOOLS ONCE.` } },
          // 4. Comparison angle
          { primaryText: `Same team. Same workload. One uses ${productName}. One doesn't.\n\nThe difference after 30 days? The ${productName} team finished projects faster and stopped ${getPain(0).toLowerCase()}.\n\nSame people. Just one thing different.`, headline: h(`Same Team. One Difference.`), description: cta, targetAudience: `Cold — competitor aware`, emotionalDoorway: 'comparison', hookType: 'gut_punch' as const, tripleHook: { visual: `Split screen — two teams, same office, different energy`, audio: `"Same team. Same workload. One thing different."`, textOnScreen: `SAME TEAM. ONE DIFFERENCE.` } },
          // 5. Rescue story
          { primaryText: `We were about to scrap our entire ${niche.toLowerCase()} process. Nothing was working. Team was frustrated.\n\nSomeone shared ${productName} in a Slack channel. "Just try it."\n\nThat was 6 months ago. We haven't looked back.`, headline: h(`Almost Gave Up`), description: `Try ${productName}`, targetAudience: `Hot — retargeting visitors`, emotionalDoorway: 'rescue_story', hookType: 'gut_punch' as const, tripleHook: { visual: `Frustrated team meeting, then relieved faces looking at screen`, audio: `"We were about to scrap the entire process."`, textOnScreen: `WE ALMOST GAVE UP. THEN WE FOUND THIS.` } },
          // 6. Money angle
          { primaryText: `We calculated what ${getPain(0).toLowerCase()} was costing us. The number was embarrassing.\n\n${productName} costs a fraction of that. ${getFeature(0)}. ${guarantee || ''}\n\nDo the math on your own situation. You'll see.`, headline: h(`Do The Math`), description: cta, targetAudience: `Warm — engaged audience`, emotionalDoorway: 'money', hookType: 'gut_punch' as const, tripleHook: { visual: `Calculator showing big number, then small number with ${productName}`, audio: `"We calculated what this was costing us. The number was embarrassing."`, textOnScreen: `THE COST OF DOING NOTHING IS HIGHER THAN YOU THINK` } },
          // 7. Unexpected benefit
          { primaryText: `We got ${productName} for ${getFeature(0).toLowerCase()}. Didn't expect it to also fix ${(getFeature(1) || `our ${niche.toLowerCase()} workflow`).toLowerCase()}.\n\nThe side benefit turned out to be the main reason we kept it. Funny how that works.`, headline: h(`Didn't Expect This`), description: `Get started today`, targetAudience: `Cold — broad`, emotionalDoorway: 'unexpected_benefit', hookType: 'body_memory' as const, tripleHook: { visual: `Person discovering extra feature, pleasantly surprised expression`, audio: `"We got it for one thing. Didn't expect it to fix everything else."`, textOnScreen: `THE SIDE BENEFIT BECAME THE MAIN REASON` } },
          // 8. Friend recommendation
          { primaryText: `My friend who runs a ${niche.toLowerCase()} team told me about ${productName}. I was skeptical.\n\n"Just try it for a week," she said.\n\nThat was the best advice I got all year. ${getFeature(0)}. ${shortDesc}.`, headline: h(`Best Advice All Year`), description: cta, targetAudience: `Cold — solution seeking`, emotionalDoorway: 'friend_recommendation', hookType: 'open_loop' as const, tripleHook: { visual: `Two friends talking, one showing phone screen`, audio: `"My friend told me about this. I was skeptical."`, textOnScreen: `"JUST TRY IT FOR A WEEK"` } },
          // 9. Skeptic turned believer
          { primaryText: `I've tried every ${niche.toLowerCase()} tool out there. They all promise the world and deliver a spreadsheet.\n\n${productName} was different. ${getFeature(0)}. It actually did what it said.\n\nI don't write recommendations. But I'm writing this one.`, headline: h(`I Don't Do Reviews. But...`), description: cta, targetAudience: `Warm — lookalike`, emotionalDoorway: 'skeptic_believer', hookType: 'open_loop' as const, tripleHook: { visual: `Skeptical expression transforming to genuine surprise`, audio: `"I've tried every tool out there. They all promise the world."`, textOnScreen: `I DON'T WRITE RECOMMENDATIONS. BUT HERE I AM.` } },
          // 10. Before/after moment
          { primaryText: `Before ${productName}: ${getPain(0).toLowerCase()}. Late nights. Constant firefighting.\n\nAfter ${productName}: ${getFeature(0)}. ${getFeature(1) || 'Everything runs smoother.'}\n\nIf you're still doing ${niche.toLowerCase()} the hard way, you don't have to.`, headline: h(`Before vs After`), description: cta, targetAudience: `Cold — results focused`, emotionalDoorway: 'before_after', hookType: 'body_memory' as const, tripleHook: { visual: `Split: messy chaotic workflow vs clean organized dashboard`, audio: `"Before: constant firefighting. After: everything just runs."`, textOnScreen: `BEFORE: CHAOS. AFTER: ${productName.toUpperCase()}.` } },
        ],
      },
      hooks: [
        { angle: 'pain', hook: `We wasted months on ${getPain(0).toLowerCase()} before someone showed us ${productName}. Wish we'd found it sooner.`, hookType: 'gut_punch', useCase: 'Email subject line, ad opening', tripleHook: { visual: `Frustrated person at desk, head in hands`, audio: `"We wasted months before someone showed us this."`, textOnScreen: `WISH WE'D FOUND IT SOONER` } },
        { angle: 'curiosity', hook: `If you're in ${niche.toLowerCase()} and still doing things the old way, you've got 30 seconds before everything changes.`, hookType: 'open_loop', useCase: 'LinkedIn post, video hook', tripleHook: { visual: `Person leaning in, finger hovering over play button`, audio: `"If you're still doing things the old way..."`, textOnScreen: `30 SECONDS. EVERYTHING CHANGES.` } },
        { angle: 'social_proof', hook: `My colleague in ${niche.toLowerCase()} switched to ${productName} last quarter. Yesterday she told me her team hasn't touched the old tools since.`, hookType: 'body_memory', useCase: 'Meta ad, landing page', tripleHook: { visual: `Two colleagues talking, one showing results on screen`, audio: `"She told me her team hasn't touched the old tools since."`, textOnScreen: `HAVEN'T TOUCHED THE OLD TOOLS SINCE` } },
        { angle: 'urgency', hook: `Every week you wait on ${getPain(0).toLowerCase()} is another week of wasted time and money. We did the math. It's not pretty.`, hookType: 'gut_punch', useCase: 'Email CTA, retargeting ad', tripleHook: { visual: `Calendar pages flipping, money counter ticking up`, audio: `"We did the math. It's not pretty."`, textOnScreen: `EVERY WEEK YOU WAIT COSTS MORE THAN YOU THINK` } },
        { angle: 'contrarian', hook: `Everyone in ${niche.toLowerCase()} is overcomplicating this. ${productName} does the opposite. And it works better. Which makes no sense. Unless you know this.`, hookType: 'open_loop', useCase: 'Blog title, YouTube hook', tripleHook: { visual: `Complex tangled diagram vs single clean line`, audio: `"It works better. Which makes no sense. Unless you know this."`, textOnScreen: `EVERYONE IS OVERCOMPLICATING THIS` } },
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
          duration: '30s', format: 'Customer testimonial', videoType: 'customer_testimonial', priority: 1,
          hook: `First week with ${productName}, I thought something was broken. Everything was running too smoothly. (0-3s)`,
          story: `So here's what happened. We were drowning in ${getPain(0).toLowerCase()}. Tried three different tools. Nothing worked. Then a colleague messaged me: "just try this." (3-10s)`,
          reframe: `Turns out we didn't need a more complicated tool. We needed one that actually understood ${niche.toLowerCase()}. It's called ${productName}. ${getFeature(0)}. My whole team switched in a week. (10-22s)`,
          close: `If you're still ${getPain(0).toLowerCase()} and wondering why nothing's working, this is probably why. ${guarantee || `Try ${productName}.`} (22-30s)`,
          tripleHook: { visual: `Person at desk, genuine surprise expression, showing screen to camera`, audio: `"First week, I thought something was broken."`, textOnScreen: `FIRST WEEK. THOUGHT SOMETHING WAS BROKEN.` },
        },
        {
          duration: '30s', format: 'Before/after walkthrough', videoType: 'before_after_walkthrough', priority: 2,
          hook: `I used to start my mornings dreading ${niche.toLowerCase()} tasks. Now I'm done before my coffee gets cold. (0-3s)`,
          story: `Before: manual everything. Missed deadlines. My team was frustrated and I was the bottleneck. After: ${getFeature(0).toLowerCase()}. Everything just flows. (3-10s)`,
          reframe: `The difference? One tool change. It's called ${productName}. ${productDesc}. Same team, same workload — just one thing different. (10-22s)`,
          close: `If your ${niche.toLowerCase()} mornings still feel like chaos, you don't have to do this anymore. (22-30s)`,
          tripleHook: { visual: `Split screen: left messy/dark, right clean/bright — same desk`, audio: `"I used to dread mornings. Now I'm done before my coffee gets cold."`, textOnScreen: `BEFORE: DREAD. AFTER: DONE BEFORE COFFEE.` },
        },
        {
          duration: '30s', format: 'Founder talking head', videoType: 'founder_talking_head', priority: 3,
          hook: `I spent years watching ${niche.toLowerCase()} teams struggle with tools that were supposed to help them. (0-3s)`,
          story: `So I asked a hundred ${niche.toLowerCase()} professionals what they actually needed. Not features. Not dashboards. Just: "what's the one thing that wastes your time?" Same answer, every time: ${getPain(0).toLowerCase()}. (3-10s)`,
          reframe: `We built ${productName} to fix that one thing. ${getFeature(0)}. No bloat, no learning curve. It just works. (10-22s)`,
          close: `If you've tried other ${niche.toLowerCase()} tools and they felt like more work, not less — we built this for you. (22-30s)`,
          tripleHook: { visual: `Founder at whiteboard, casual setting, direct eye contact`, audio: `"I asked a hundred professionals what wastes their time."`, textOnScreen: `SAME ANSWER. EVERY TIME.` },
        },
        {
          duration: '30s', format: 'Screen recording + voiceover', videoType: 'screen_recording_voiceover', priority: 4,
          hook: `Watch this. What used to take our team an entire afternoon now takes four clicks. (0-3s)`,
          story: `Our ${niche.toLowerCase()} workflow was a mess. Spreadsheets everywhere, things falling through cracks. We'd tried automating it before — didn't work. (3-10s)`,
          reframe: `Then someone showed us ${productName}. ${getFeature(0)}. Watch — click, click, click, done. That's it. The whole process. (10-22s)`,
          close: `If you're spending hours on something that should take minutes, you need to see this. (22-30s)`,
          tripleHook: { visual: `Screen: complex spreadsheet transforms into clean ${productName} interface`, audio: `"What used to take an afternoon now takes four clicks."`, textOnScreen: `AN AFTERNOON → FOUR CLICKS` },
        },
        {
          duration: '30s', format: 'Process reveal', videoType: 'process_reveal', priority: 5,
          hook: `Everyone asks how our ${niche.toLowerCase()} team moves so fast. Here's the secret — it's embarrassingly simple. (0-3s)`,
          story: `We don't have a bigger team. We don't work longer hours. We just stopped using tools that created more work than they saved. (3-10s)`,
          reframe: `${productName} does ${getFeature(0).toLowerCase()} and ${getFeature(1)?.toLowerCase() || 'takes the busywork off your plate'}. Teams adopt it in days because there's nothing to learn. (10-22s)`,
          close: `The secret to moving fast isn't working harder. It's having one tool that actually works. (22-30s)`,
          tripleHook: { visual: `Behind-the-scenes of real team workflow, casual office vibe`, audio: `"Everyone asks how we move so fast. Embarrassingly simple."`, textOnScreen: `THE SECRET? EMBARRASSINGLY SIMPLE.` },
        },
      ],
      ugcScripts: {
        patternA_roleSpecific: [
          {
            role: 'Finance',
            hook: `I calculated what ${getPain(0).toLowerCase()} was costing us per quarter. The number made me sick.`,
            story: `So I went looking for something better. Tried two platforms, neither worked. Then our ops lead mentioned ${productName}.`,
            credibilitySetup: `I've audited every tool our ${niche.toLowerCase()} team has used in the last 3 years.`,
            productIntro: `It's called ${productName}. ${getFeature(0)}.`,
            keyBenefit: `The ROI showed up in the first month.`,
            businessCase: `When I ran the numbers, ${productName} paid for itself before the trial ended.`,
            cta: `If you're in finance and you haven't run the numbers on ${getPain(0).toLowerCase()}, start there. Then look at ${productName}.`,
            tripleHook: { visual: `Finance professional at desk, spreadsheet showing cost analysis`, audio: `"I calculated the cost. The number made me sick."`, textOnScreen: `THE NUMBER MADE ME SICK` },
            duration: '30-60s',
          },
          {
            role: 'CEO',
            hook: `I asked my team why we were still ${getPain(0).toLowerCase()}. Nobody had a good answer.`,
            story: `That conversation led to us trying ${productName}. Best decision I didn't make — my team found it.`,
            credibilitySetup: `I've scaled three ${niche.toLowerCase()} teams. Tools matter more than people want to admit.`,
            productIntro: `It's called ${productName}. ${productDesc}`,
            keyBenefit: `My team stopped complaining about ${niche.toLowerCase()} tools. That's how I know it works.`,
            businessCase: `${productName} removed the bottleneck I didn't even know we had.`,
            cta: `If your team is working around your tools instead of with them, you already know something needs to change.`,
            tripleHook: { visual: `CEO in meeting, asking the hard question, team nodding`, audio: `"I asked my team why. Nobody had a good answer."`, textOnScreen: `NOBODY HAD A GOOD ANSWER` },
            duration: '30-60s',
          },
          {
            role: 'HR',
            hook: `Our best hire last year almost quit in month two. Reason? Our ${niche.toLowerCase()} tools were that bad.`,
            story: `That was the wake-up call. We switched to ${productName} and the onboarding complaints stopped.`,
            credibilitySetup: `I've onboarded over 50 people onto ${niche.toLowerCase()} workflows. Tool friction is retention poison.`,
            productIntro: `It's called ${productName}. ${getFeature(0)}.`,
            keyBenefit: `New hires are productive in days, not weeks.`,
            businessCase: `Retention improved when we removed the tools people hated. ${productName} was the fix.`,
            cta: `If tool frustration is showing up in your exit interviews, it's not a people problem.`,
            tripleHook: { visual: `New employee frustrated at desk, then same person smiling after switch`, audio: `"Our best hire almost quit in month two."`, textOnScreen: `BEST HIRE. ALMOST QUIT. MONTH TWO.` },
            duration: '30-60s',
          },
          {
            role: 'Operations',
            hook: `I mapped our ${niche.toLowerCase()} workflow last month. It had 14 manual steps. Now it has 3.`,
            story: `We'd been patching broken processes for years. Someone said "just try ${productName}" and I finally did.`,
            credibilitySetup: `I've optimised operations for ${niche.toLowerCase()} teams for years. This was the biggest win.`,
            productIntro: `It's called ${productName}. ${getFeature(0)}.`,
            keyBenefit: `14 steps to 3. Same output, fraction of the effort.`,
            businessCase: `The time we save with ${productName} goes straight back into work that actually matters.`,
            cta: `If your workflow has more than 5 manual steps, you're leaving time on the table.`,
            tripleHook: { visual: `Whiteboard with complex workflow diagram being simplified`, audio: `"14 manual steps. Now it has 3."`, textOnScreen: `14 STEPS → 3 STEPS` },
            duration: '30-60s',
          },
        ],
        patternB_hookVariations: [
          { variationType: 'personal_discovery', hook: `I spent 6 months trying every ${niche.toLowerCase()} tool on the market. ${productName} was the last one I tried. Wish it was the first. (0-3s)`, story: `None of them solved the actual problem — ${getPain(0).toLowerCase()}. They just added dashboards on top of the mess. (3-10s)`, reframe: `${productName} took a different approach. ${getFeature(0)}. Within a week my whole team was on it. Not because I told them to — because they wanted to. (10-22s)`, close: `If you've been burned by ${niche.toLowerCase()} tools before, I get it. Try this one last. (22-30s)`, tripleHook: { visual: `Person scrolling through app store, frustrated, then discovering ${productName}`, audio: `"I tried every tool. Wish I'd found this one first."`, textOnScreen: `WISH IT WAS THE FIRST` }, duration: '30s' },
          { variationType: 'gut_punch', hook: `We spent $${Math.floor(Math.random() * 5 + 3)}k on ${niche.toLowerCase()} tools last year that we don't even use anymore. (0-3s)`, story: `Every one promised to fix ${getPain(0).toLowerCase()}. Every one added complexity instead. Our team hated them. (3-10s)`, reframe: `${productName} was the first tool nobody complained about. ${getFeature(0)}. It just works. Which sounds basic — but apparently that's rare. (10-22s)`, close: `If you're paying for tools your team works around instead of with, that's not a team problem. (22-30s)`, tripleHook: { visual: `Receipt/invoice with big number, person sighing`, audio: `"We spent thousands on tools we don't even use anymore."`, textOnScreen: `$${Math.floor(Math.random() * 5 + 3)}K ON TOOLS. DON'T USE ANY OF THEM.` }, duration: '30s' },
          { variationType: 'open_loop', hook: `If you're in ${niche.toLowerCase()} and still doing things manually, you've got 30 seconds before everything changes. (0-3s)`, story: `There's a tool that handles ${getFeature(0).toLowerCase()}. Teams are adopting it in days, not months. And it costs less than what most people spend on the tools it replaces. (3-10s)`, reframe: `It's called ${productName}. ${productDesc}. I didn't believe it either until I saw our own numbers after the first month. (10-22s)`, close: `If you're doing ${niche.toLowerCase()} the hard way, you don't have to anymore. That's not a pitch — it's just true. (22-30s)`, tripleHook: { visual: `Clock ticking, "30 SECONDS" on screen, person looking at camera`, audio: `"If you're still doing things manually, 30 seconds."`, textOnScreen: `30 SECONDS. EVERYTHING CHANGES.` }, duration: '30s' },
          { variationType: 'body_memory', hook: `First morning I opened ${productName} and everything was already done, I thought the system glitched. (0-3s)`, story: `Turned out it actually worked the way they said it would. ${getFeature(0)}. No workarounds, no manual steps. (3-10s)`, reframe: `I'd spent years accepting that ${getPain(0).toLowerCase()} was just "how it is." It's not. ${productName} proved that. (10-22s)`, close: `If you've gotten used to how hard ${niche.toLowerCase()} is, you've gotten used to the wrong thing. (22-30s)`, tripleHook: { visual: `Person opening laptop, surprised expression, everything already done`, audio: `"I opened it and everything was already done. Thought it glitched."`, textOnScreen: `THOUGHT THE SYSTEM GLITCHED. IT JUST WORKED.` }, duration: '30s' },
        ],
      },
      ugcBriefs: [
        { type: 'testimonial', description: `A ${niche.toLowerCase()} professional tells the story of how they discovered ${productName} — the frustration before, the reluctant trial, and the moment they knew it worked.`, talkingPoints: [`Open with a gut punch: the cost/frustration of the old way`, `Tell the discovery like gossip: "someone told me about..."`, `The specific moment it clicked`, `Close with identity: "If you're still [doing X], you don't have to"`], emotionalDoorway: 'friend_recommendation' },
        { type: 'before_after', description: `Side-by-side comparison: same task, same team, before and after ${productName}. The contrast should be visceral, not explained.`, talkingPoints: [`Show the messy "before" without narration — let viewers feel it`, `Clean cut to "after" with ${productName}`, `One specific metric that changed`, `Text on screen for mute viewers: the key number`], emotionalDoorway: 'comparison' },
        { type: 'process_reveal', description: `Behind the scenes: how a team uses ${productName} daily. Shot casually, like showing a friend around your office.`, talkingPoints: [`Open with: "Everyone asks how we [specific result]"`, `Walk through the workflow casually — friend energy, not demo energy`, `Show the "aha" feature that surprises people`, `Close: "That's the whole secret. Embarrassingly simple."`], emotionalDoorway: 'unexpected_benefit' },
      ],
      visualCreativeBriefs: [
        { concept: 'The Moment It Clicked', layout: `Close-up of a person's face showing genuine surprise/relief when seeing ${productName} results for the first time. Product interface subtly visible on screen behind them.`, imagery: `Real, candid expression — not stock photo smile. Warm lighting, shallow depth of field.`, textOverlay: `"THOUGHT SOMETHING WAS BROKEN. IT JUST WORKED."`, muteTestText: `THOUGHT SOMETHING WAS BROKEN. IT JUST WORKED.` },
        { concept: 'Before → After Split', layout: `Split-screen: left is cluttered, stressful, dim (${getPain(0).toLowerCase()}). Right is clean, organized, bright (${productName} in action). Same person in both.`, imagery: `High contrast between sides. Left: warm/red tones, papers, stress. Right: cool/blue tones, clean screen, calm.`, textOverlay: `"SAME TEAM. ONE DIFFERENCE."`, muteTestText: `SAME TEAM. ONE DIFFERENCE.` },
        { concept: 'The Friend Text', layout: `Mock-up of a text message conversation: "You need to try this thing called ${productName}" → "What is it?" → "${shortDesc}" → "Just try it for a week" — with the product subtly shown below.`, imagery: `Phone screen, iMessage/WhatsApp style bubbles, casual tone. Below: small ${productName} screenshot.`, textOverlay: `"THE BEST ADVICE I GOT ALL YEAR"`, muteTestText: `THE BEST ADVICE I GOT ALL YEAR` },
      ],
      reasoning: `Creative asset package generated for ${productName} (${niche}). All content is about the client's product, not LeadOS. Used product context from ${websiteUrl || 'upstream data'} to build accurate, product-specific ads, emails, scripts, and briefs.`,
      confidence: 75,
    };
  }
}
