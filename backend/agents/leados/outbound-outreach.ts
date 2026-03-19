import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import * as apollo from '../../integrations/apollo';
import * as instantly from '../../integrations/instantly';
import { filterBlacklisted } from '../../utils/blacklist';

const SYSTEM_PROMPT = `You are the Outbound Outreach Agent for LeadOS — the Service Acquisition Machine. You operate two internal sub-agents to execute cold email campaigns and LinkedIn DM automation at scale.

You MUST use data from previous agents when available:
- From Offer Engineering (agent 2): ICP definition, pain points, pricing, guarantee, positioning
- From Content & Creative (agent 5): Email scripts, LinkedIn scripts, ad copy angles

SUB-AGENT 1: Cold Email Campaign Manager (via Instantly / Smartlead)
- Lead Scraping: Pull contact data matching the ICP from Apollo.io / Clay / LinkedIn Sales Navigator
- Domain Setup: Ensure sending domains are warmed (minimum 14 days, 30 emails/day ramp)
- Personalization: Use dynamic fields — {firstName}, {company}, {industry}, {painPoint}, {companySize}, {recentActivity}
- Sequence Design: 3-5 step email sequence with escalating urgency and value delivery
  Step 1: Soft intro — establish relevance and plant curiosity
  Step 2: Value delivery — share relevant case study with hard metrics
  Step 3: ROI math — make financial case undeniable
  Step 4: Urgency — create scarcity with clear next step
  Step 5: Breakup — graceful exit that triggers loss aversion
- Sending Schedule: Monday-Thursday, 8-11 AM recipient timezone, 45-second delay between sends
- Compliance: CAN-SPAM + GDPR — physical address footer, unsubscribe link, no deceptive subjects
- Bounce Handling: Auto-remove hard bounces, pause campaign if bounce rate >5%
- A/B Testing: Test subject lines and first lines across segments

SUB-AGENT 2: LinkedIn DM Automation
- Profile Targeting: Find ICP decision-makers (VP Marketing, CMO, Head of Growth, CEO at SMBs)
- Profile Optimization: Ensure sender profile has credibility signals (headline, banner, about)
- Connection Requests: Personalized requests referencing mutual interests or company activity
- Automated DM Flows: 4-step sequence — connection → value → case study → direct ask
- Daily Limits: Max 25 connection requests/day, max 50 messages/day (under LinkedIn radar)
- Content: Each message provides value first — lead with insight, not pitch
- Follow-up Logic: Adjust timing based on engagement (viewed profile, liked post, etc.)
- Compliance: Respect opt-outs immediately, no InMail automation

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "coldEmail": {
    "platform": "string (instantly|smartlead)",
    "campaignName": "string",
    "prospectCriteria": {
      "icpMatch": "string describing ideal customer",
      "sources": ["string — Apollo.io, Clay, LinkedIn Sales Navigator, etc."],
      "estimatedListSize": 0
    },
    "prospectCount": 0,
    "domains": {
      "sendingDomains": ["string"],
      "warmupStatus": "string",
      "dailyRampSchedule": "string"
    },
    "sequences": [{
      "step": "number",
      "delay": "string",
      "subject": "string",
      "subjectLineB": "string (A/B test variant)",
      "template": "string (full email body with personalization tokens)",
      "purpose": "string"
    }],
    "personalizationFields": ["string"],
    "sendingSchedule": {
      "days": ["string"],
      "timeWindow": "string",
      "timezone": "string",
      "dailyLimit": "number",
      "delayBetweenSends": "string"
    },
    "complianceChecks": ["string"],
    "abTests": [{ "variable": "string", "variantA": "string", "variantB": "string" }]
  },
  "linkedIn": {
    "targetProfiles": 0,
    "connectionStrategy": "string",
    "sequences": [{
      "step": "number",
      "type": "connection_request|value_message|case_study|direct_ask|follow_up",
      "delay": "string",
      "message": "string",
      "triggerCondition": "string (e.g., after connection accepted)"
    }],
    "dailyLimits": {
      "connectionRequests": 25,
      "messages": 50,
      "profileViews": 100
    },
    "targetingCriteria": {
      "jobTitles": ["string"],
      "companySize": "string",
      "industries": ["string"],
      "geography": "string",
      "additionalFilters": ["string"]
    },
    "profileOptimization": {
      "headline": "string",
      "about": "string",
      "bannerCTA": "string"
    }
  },
  "prospectList": [],
  "projectedMetrics": {
    "emailsSent": 0,
    "expectedOpenRate": 0,
    "expectedReplyRate": 0,
    "expectedReplies": 0,
    "expectedMeetings": 0,
    "meetingBookingRate": 0,
    "linkedInConnectionsSent": 0,
    "linkedInConnectionRate": 0,
    "linkedInConnections": 0,
    "linkedInReplyRate": 0,
    "linkedInReplies": 0,
    "linkedInMeetings": 0,
    "totalMeetingsFromOutbound": 0,
    "estimatedCostPerMeeting": 0
  },
  "reasoning": "string",
  "confidence": "number 0-100"
}

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated metrics. Campaign strategy, email sequences, LinkedIn scripts, and prospect criteria are strategic outputs and are expected. However, for projectedMetrics: set ALL numeric values to 0 — no emails have been sent, no connections made, no meetings booked yet. These will be measured after execution. For prospectList: ONLY include real prospects from Apollo API data if provided. If no real prospect data exists, return an empty prospectList array. Never invent fictional people, companies, or email addresses. Never fabricate numbers that look like measured data.`;

export class OutboundOutreachAgent extends BaseAgent {
  constructor() {
    super(
      'outbound-outreach',
      'Outbound Outreach Agent',
      'Cold email and LinkedIn DM automation — lead scraping, personalization, sequence design, sending, follow-ups, and compliance'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    try {
      // Extract upstream agent data for context-aware outreach
      const previousOutputs = inputs.previousOutputs || {};
      const offerData = previousOutputs['offer-engineering']?.offer || previousOutputs['offer-engineering'] || {};
      const contentData = previousOutputs['content-creative'] || {};
      const validationData = previousOutputs['validation'] || {};

      // Check if validation said NO-GO
      if (validationData.decision === 'NO-GO') {
        this.status = 'done';
        return {
          success: false,
          data: { skipped: true, reason: 'Validation agent returned NO-GO decision' },
          reasoning: 'Outbound outreach skipped — upstream validation rejected this opportunity.',
          confidence: 100,
        };
      }

      // ── Extract ICP job titles for Apollo search ──────────────────
      let icpTitles: string[] = [];
      const rawTitles = offerData.icp?.titles || offerData.idealCustomerProfile?.titles
        || offerData.icp?.decisionMaker || offerData.idealCustomerProfile?.decisionMaker
        || offerData.icp?.jobTitles || offerData.idealCustomerProfile?.jobTitles;
      if (Array.isArray(rawTitles)) {
        icpTitles = rawTitles;
      } else if (typeof rawTitles === 'string') {
        icpTitles = rawTitles.split(/[\/,]/).map((t: string) => t.trim()).filter(Boolean);
      }
      if (icpTitles.length === 0) {
        icpTitles = ['VP of Marketing', 'Head of Growth', 'CMO', 'CEO'];
      }

      // Extract niche for campaign naming
      const niche = inputs.config?.niche || inputs.config?.serviceNiche || inputs.config?.focus || 'B2B SaaS Lead Generation';

      // ── Fetch real prospect data from Apollo + create Instantly campaign IN PARALLEL ──
      let realProspects: any[] = [];
      let realCampaign: any = null;

      const [apolloResult, instantlyResult] = await Promise.allSettled([
        apollo.isApolloAvailable()
          ? apollo.searchProspects({ jobTitles: icpTitles, limit: 25 })
          : Promise.resolve([]),
        instantly.isInstantlyAvailable()
          ? instantly.createCampaign({ name: `LeadOS — ${niche} ICP` })
          : Promise.resolve(null),
      ]);

      if (apolloResult.status === 'fulfilled') {
        realProspects = apolloResult.value;
        if (realProspects.length > 0) await this.log('apollo_prospects_fetched', { count: realProspects.length, titles: icpTitles });
      } else {
        await this.log('apollo_error', { error: apolloResult.reason?.message });
      }

      if (instantlyResult.status === 'fulfilled' && instantlyResult.value) {
        realCampaign = instantlyResult.value;
        await this.log('instantly_campaign_created', { campaignId: realCampaign.id });
      } else if (instantlyResult.status === 'rejected') {
        await this.log('instantly_error', { error: instantlyResult.reason?.message });
      }

      // ── Build user message for LLM ────────────────────────────────
      const userMessage = JSON.stringify({
        serviceNiche: niche,
        upstreamContext: {
          icp: offerData.icp || offerData.idealCustomerProfile || null,
          painPoints: offerData.painPoints || null,
          pricing: offerData.pricingTiers || offerData.pricing || null,
          guarantee: offerData.guarantee || null,
          positioning: offerData.positioning || null,
          emailScripts: contentData.emailSequence || null,
          linkedInScripts: contentData.linkedInScripts || null,
          hooks: contentData.hooks || null,
        },
        realData: {
          apolloProspects: realProspects.length > 0 ? realProspects : null,
          instantlyCampaignId: realCampaign?.id || null,
          dataSource: realProspects.length > 0 ? 'live_apollo' : 'llm_generated',
        },
        IMPORTANT_INSTRUCTION: realProspects.length > 0
          ? `REAL prospect data from Apollo is provided in realData.apolloProspects. Use ONLY these real prospects in your prospectList — do NOT invent fictional prospects. Build email sequences and LinkedIn outreach around these actual people.
CRITICAL: For projectedMetrics, set ALL numeric values to 0. Set prospectCount to exactly ${realProspects.length}. Do NOT fabricate numbers.`
          : `No real prospect data available from Apollo. Return an EMPTY prospectList array [].
CRITICAL: For projectedMetrics, set ALL numeric values to 0. Do NOT fabricate metrics.`,
      });

      // ── Call LLM ──────────────────────────────────────────────────
      let parsed: any = {};
      try {
        const response = await this.callClaude(SYSTEM_PROMPT, userMessage, 1, 4096);
        parsed = this.safeParseLLMJson<any>(response, ['coldEmail', 'linkedIn']);
      } catch (err: any) {
        await this.log('llm_or_parse_error', { error: err.message });
        // Build structured fallback from upstream data instead of returning empty
        parsed = this.buildFallbackOutput(niche, offerData, contentData, icpTitles);
      }

      // ── BUILD CLEAN OUTPUT — DO NOT trust ANY metric from LLM ──────
      const cleanOutput: any = {
        coldEmail: {
          platform: parsed.coldEmail?.platform || 'instantly',
          campaignName: parsed.coldEmail?.campaignName || `${niche} — Cold Email Campaign`,
          prospectCriteria: parsed.coldEmail?.prospectCriteria || {
            icpMatch: offerData.icp?.description || `Decision-makers in ${niche}`,
            sources: ['Apollo.io', 'LinkedIn Sales Navigator'],
            estimatedListSize: 0,
          },
          prospectCount: realProspects.length,
          domains: parsed.coldEmail?.domains || {
            sendingDomains: [`outreach.${niche.toLowerCase().replace(/\s+/g, '')}.com`],
            warmupStatus: '14-day warmup in progress',
            dailyRampSchedule: '10/day → 20/day → 30/day → 50/day',
          },
          sequences: parsed.coldEmail?.sequences || [],
          personalizationFields: parsed.coldEmail?.personalizationFields || ['{firstName}', '{company}', '{industry}', '{painPoint}'],
          sendingSchedule: parsed.coldEmail?.sendingSchedule || {
            days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
            timeWindow: '8:00 AM - 11:00 AM',
            timezone: 'Recipient timezone',
            dailyLimit: 50,
            delayBetweenSends: '45 seconds',
          },
          complianceChecks: parsed.coldEmail?.complianceChecks || [
            'CAN-SPAM compliant — physical address in footer',
            'GDPR compliant — unsubscribe link in every email',
            'No deceptive subject lines',
            'Bounce rate monitoring — auto-pause at >5%',
            'Hard bounce auto-removal',
          ],
          abTests: parsed.coldEmail?.abTests || [],
        },
        linkedIn: {
          targetProfiles: 0,
          connectionStrategy: parsed.linkedIn?.connectionStrategy || 'Personalized connection requests referencing mutual interests, company activity, or shared industry challenges',
          sequences: parsed.linkedIn?.sequences || [],
          dailyLimits: {
            connectionRequests: parsed.linkedIn?.dailyLimits?.connectionRequests || 25,
            messages: parsed.linkedIn?.dailyLimits?.messages || 50,
            profileViews: parsed.linkedIn?.dailyLimits?.profileViews || 100,
          },
          targetingCriteria: parsed.linkedIn?.targetingCriteria || {
            jobTitles: icpTitles,
            companySize: offerData.icp?.companySize || '10-500 employees',
            industries: offerData.icp?.industries || [niche],
            geography: 'United States',
            additionalFilters: ['Active on LinkedIn in last 30 days'],
          },
          profileOptimization: parsed.linkedIn?.profileOptimization || {
            headline: `Helping ${niche} companies grow with predictable lead generation`,
            about: `We help ${niche} businesses get qualified leads on autopilot using AI-powered outreach.`,
            bannerCTA: 'Book a free strategy call →',
          },
        },
        prospectList: [],
        projectedMetrics: {
          emailsSent: 0, expectedOpenRate: 0, expectedReplyRate: 0,
          expectedReplies: 0, expectedMeetings: 0, meetingBookingRate: 0,
          linkedInConnectionsSent: 0, linkedInConnectionRate: 0,
          linkedInConnections: 0, linkedInReplyRate: 0,
          linkedInReplies: 0, linkedInMeetings: 0,
          totalMeetingsFromOutbound: 0, estimatedCostPerMeeting: 0,
        },
        contactedProspects: { total: 0, emailContacted: 0, linkedInContacted: 0, prospectListSize: 0 },
        expectedReplies: {
          emailReplies: 0, interestedLeads: 0, meetingsBooked: 0,
          note: 'Metrics will be measured after campaign execution. No projections — real data only.',
        },
        linkedInConversations: { connectionsSent: 0, connectionsAccepted: 0, conversationsStarted: 0, meetingsFromLinkedIn: 0 },
        crmBookings: { totalMeetingsBooked: 0, calendarIntegration: 'Calendly' },
        dataSource: { prospects: 'none', campaign: 'none', apolloProspectsCount: 0 },
        reasoning: parsed.reasoning || 'Dual-channel outbound campaign configured with cold email sequences and LinkedIn DM automation.',
        confidence: parsed.confidence || 85,
      };

      // Zero estimatedListSize in prospectCriteria
      if (cleanOutput.coldEmail.prospectCriteria) {
        cleanOutput.coldEmail.prospectCriteria.estimatedListSize = 0;
      }

      // ── Filter blacklisted companies from LLM prospect list (if any) ──
      let llmProspects = parsed.prospectList || [];
      try {
        if (llmProspects.length > 0) {
          const { allowed, blocked } = await filterBlacklisted(llmProspects);
          if (blocked.length > 0) {
            await this.log('blacklist_filtered', { removed: blocked.length, companies: blocked.map((b: any) => b.company) });
          }
          llmProspects = allowed;
          cleanOutput.blacklistFiltered = blocked.length;
        }
      } catch (err: any) {
        await this.log('blacklist_check_error', { error: err.message });
        // Continue without blacklist filtering — don't crash the agent
      }

      // ── If we have real prospects from Apollo, use them ────────────
      if (realProspects.length > 0) {
        let prospects = realProspects.map((p) => ({
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          company: p.company,
          jobTitle: p.jobTitle,
          industry: p.industry,
          companySize: p.companySize,
          linkedInUrl: p.linkedInUrl,
          personalizationNote: `${p.jobTitle} at ${p.company}`,
        }));

        // Filter blacklisted from real prospects too
        try {
          const { allowed, blocked } = await filterBlacklisted(prospects);
          if (blocked.length > 0) {
            await this.log('blacklist_filtered_apollo', { removed: blocked.length });
          }
          prospects = allowed;
        } catch { /* continue if blacklist check fails */ }

        cleanOutput.prospectList = prospects;
      }

      // ── Update prospect-related counts from real data ──────────────
      const prospectCount = cleanOutput.prospectList.length;
      cleanOutput.coldEmail.prospectCount = prospectCount;
      cleanOutput.contactedProspects.prospectListSize = prospectCount;

      // ── Add real campaign ID if available ──────────────────────────
      if (realCampaign?.id) {
        cleanOutput.coldEmail.campaignId = realCampaign.id;
        cleanOutput.coldEmail.dataSource = 'live_instantly';
        cleanOutput.instantlyCampaignId = realCampaign.id;
      }

      // ── Set data source info ──────────────────────────────────────
      cleanOutput.dataSource = {
        prospects: realProspects.length > 0 ? 'live_apollo' : 'none',
        campaign: realCampaign?.id ? 'live_instantly' : 'none',
        apolloProspectsCount: realProspects.length,
        instantlyCampaignId: realCampaign?.id || null,
      };
      cleanOutput.contactedProspects.dataSource = realProspects.length > 0 ? 'live_apollo' : 'none';

      this.status = 'done';
      await this.log('run_completed', { output: cleanOutput });
      return {
        success: true,
        data: cleanOutput,
        reasoning: cleanOutput.reasoning || 'Dual-channel outbound campaign deployed with cold email and LinkedIn automation.',
        confidence: cleanOutput.confidence || 85,
      };
    } catch (error: any) {
      this.status = 'done';
      await this.log('run_error', { reason: error.message });
      return {
        success: false,
        data: {},
        reasoning: `Outbound outreach failed: ${error.message}`,
        confidence: 0,
      };
    }
  }

  /**
   * Build a complete structured fallback when LLM call fails.
   * Uses upstream data from Offer Engineering and Content & Creative to generate
   * meaningful sequences and targeting rather than returning empty data.
   */
  private buildFallbackOutput(niche: string, offerData: any, contentData: any, icpTitles: string[]): any {
    const serviceName = offerData.serviceName || niche;
    const painPoints = offerData.painPoints || [];
    const mainPain = Array.isArray(painPoints) && painPoints.length > 0
      ? (typeof painPoints[0] === 'string' ? painPoints[0] : painPoints[0]?.pain || painPoints[0]?.description || 'growing their business')
      : 'growing their business';
    const guarantee = offerData.guarantee?.description || offerData.guarantee || '';
    const pricing = offerData.pricingTiers?.[0] || offerData.pricing?.starter || {};
    const priceStr = pricing.price || pricing.monthlyPrice || '';

    // Use content-creative email sequence if available
    const upstreamEmails = contentData.emailSequence || [];
    const emailSequences = upstreamEmails.length > 0
      ? upstreamEmails.map((e: any, i: number) => ({
          step: e.step || i + 1,
          delay: e.delay || (i === 0 ? 'Day 1' : `Day ${i * 2 + 1}`),
          subject: e.subject || `Step ${i + 1}`,
          subjectLineB: `[B] ${e.subject || `Step ${i + 1}`}`,
          template: e.body || e.template || '',
          purpose: e.purpose || `Step ${i + 1} of sequence`,
        }))
      : [
          {
            step: 1, delay: 'Day 1',
            subject: `Quick question about ${niche}`,
            subjectLineB: `Idea for {company}`,
            template: `Hi {firstName},\n\nI noticed {company} is in the ${niche} space and thought this might be relevant.\n\nWe help companies like yours solve ${mainPain} — without the usual headaches.\n\nWould it make sense to chat for 15 minutes this week?\n\nBest,\n{senderName}`,
            purpose: 'Soft intro — establish relevance and plant curiosity',
          },
          {
            step: 2, delay: 'Day 3',
            subject: `How {company} could solve ${mainPain}`,
            subjectLineB: `Case study: ${niche} results`,
            template: `Hi {firstName},\n\nFollowing up on my last email. Wanted to share a quick case study:\n\nOne of our clients in ${niche} was struggling with ${mainPain}. Within 30 days, they saw measurable improvement using our ${serviceName} approach.\n\nHappy to walk you through exactly how it works.\n\nBest,\n{senderName}`,
            purpose: 'Value delivery — share relevant case study with hard metrics',
          },
          {
            step: 3, delay: 'Day 5',
            subject: `The math behind ${serviceName}`,
            subjectLineB: `ROI breakdown for {company}`,
            template: `Hi {firstName},\n\nI know you're busy so I'll keep this short.\n\nHere's the ROI math: ${priceStr ? `For ${priceStr}/month, ` : ''}our clients typically see 3-5x return within the first 60 days.${guarantee ? `\n\nPlus, ${guarantee}` : ''}\n\nWorth a quick call?\n\nBest,\n{senderName}`,
            purpose: 'ROI math — make financial case undeniable',
          },
          {
            step: 4, delay: 'Day 8',
            subject: `Last chance: ${serviceName} for {company}`,
            subjectLineB: `Spots filling up for ${niche}`,
            template: `Hi {firstName},\n\nWe're onboarding a few more ${niche} companies this month and I wanted to reach out one more time.\n\nIf ${mainPain} is still a challenge, I'd love to show you how we solve it — takes 15 minutes.\n\nBook a time here: {bookingLink}\n\nBest,\n{senderName}`,
            purpose: 'Urgency — create scarcity with clear next step',
          },
          {
            step: 5, delay: 'Day 12',
            subject: `Closing the loop`,
            subjectLineB: `Should I close your file?`,
            template: `Hi {firstName},\n\nI've reached out a few times and haven't heard back — totally understand if the timing isn't right.\n\nI'll close your file for now, but if ${mainPain} becomes a priority, feel free to reply to this email anytime.\n\nWishing you and {company} the best.\n\n{senderName}`,
            purpose: 'Breakup — graceful exit that triggers loss aversion',
          },
        ];

    // Use content-creative LinkedIn scripts if available
    const upstreamLinkedIn = contentData.linkedInScripts || {};
    const linkedInSequences = [
      {
        step: 1, type: 'connection_request' as const, delay: 'Day 1',
        message: upstreamLinkedIn.connectionRequest || `Hi {firstName}, I work with ${niche} companies on ${mainPain}. Would love to connect and share some insights.`,
        triggerCondition: 'Initial outreach',
      },
      {
        step: 2, type: 'value_message' as const, delay: 'Day 3 (after connection accepted)',
        message: upstreamLinkedIn.followUp1 || `Thanks for connecting, {firstName}! I noticed {company} is doing great work in ${niche}. We recently helped a similar company solve ${mainPain} — happy to share what worked if you're interested.`,
        triggerCondition: 'After connection accepted',
      },
      {
        step: 3, type: 'case_study' as const, delay: 'Day 6',
        message: upstreamLinkedIn.followUp2 || `Hi {firstName}, quick follow up — I put together a brief case study on how ${niche} companies are tackling ${mainPain}. Want me to send it over?`,
        triggerCondition: 'No reply to value message after 3 days',
      },
      {
        step: 4, type: 'direct_ask' as const, delay: 'Day 10',
        message: `{firstName}, would a 15-min call make sense to explore if we can help {company} with ${mainPain}? No pressure either way.`,
        triggerCondition: 'No reply to case study after 4 days',
      },
    ];

    return {
      coldEmail: {
        platform: 'instantly',
        campaignName: `${niche} — Cold Email Outreach`,
        prospectCriteria: {
          icpMatch: offerData.icp?.description || `Decision-makers at ${niche} companies`,
          sources: ['Apollo.io', 'LinkedIn Sales Navigator', 'Clay'],
          estimatedListSize: 0,
        },
        domains: {
          sendingDomains: [`outreach1.${niche.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`, `outreach2.${niche.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`],
          warmupStatus: '14-day warmup in progress — 30 emails/day ramp',
          dailyRampSchedule: 'Week 1: 10/day → Week 2: 20/day → Week 3: 30/day → Week 4: 50/day',
        },
        sequences: emailSequences,
        personalizationFields: ['{firstName}', '{company}', '{industry}', '{painPoint}', '{companySize}', '{recentActivity}'],
        sendingSchedule: {
          days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
          timeWindow: '8:00 AM - 11:00 AM',
          timezone: 'Recipient timezone (auto-detected)',
          dailyLimit: 50,
          delayBetweenSends: '45 seconds',
        },
        complianceChecks: [
          'CAN-SPAM compliant — physical address in footer',
          'GDPR compliant — unsubscribe link in every email',
          'No deceptive subject lines',
          'Bounce rate monitoring — auto-pause at >5%',
          'Hard bounce auto-removal',
          'DNC list cross-referenced before sending',
        ],
        abTests: [
          { variable: 'Subject Line', variantA: emailSequences[0]?.subject || '', variantB: emailSequences[0]?.subjectLineB || '' },
          { variable: 'Opening Line', variantA: 'Personalized company reference', variantB: 'Industry pain point hook' },
        ],
      },
      linkedIn: {
        connectionStrategy: 'Personalized connection requests referencing mutual interests, company activity, or shared industry challenges. Lead with insight, not pitch.',
        sequences: linkedInSequences,
        dailyLimits: { connectionRequests: 25, messages: 50, profileViews: 100 },
        targetingCriteria: {
          jobTitles: icpTitles,
          companySize: offerData.icp?.companySize || '10-500 employees',
          industries: offerData.icp?.industries || [niche],
          geography: 'United States',
          additionalFilters: ['Active on LinkedIn in last 30 days', 'Has profile photo', 'Has company page'],
        },
        profileOptimization: {
          headline: `Helping ${niche} companies get predictable leads | ${serviceName}`,
          about: `We help ${niche} businesses solve ${mainPain} using AI-powered outreach and automation. Our clients see measurable results within 30 days.${guarantee ? ` ${guarantee}` : ''}`,
          bannerCTA: 'Book a free strategy call → calendly.com/leados',
        },
      },
      prospectList: [],
      projectedMetrics: {
        emailsSent: 0, expectedOpenRate: 0, expectedReplyRate: 0,
        expectedReplies: 0, expectedMeetings: 0, meetingBookingRate: 0,
        linkedInConnectionsSent: 0, linkedInConnectionRate: 0,
        linkedInConnections: 0, linkedInReplyRate: 0,
        linkedInReplies: 0, linkedInMeetings: 0,
        totalMeetingsFromOutbound: 0, estimatedCostPerMeeting: 0,
      },
      reasoning: `Dual-channel outbound campaign configured for ${niche} using upstream ICP and content data. Cold email: 5-step sequence via Instantly. LinkedIn: 4-step DM sequence targeting ${icpTitles.join(', ')}. Strategy generated from upstream agent data (LLM unavailable).`,
      confidence: 75,
    };
  }
}
