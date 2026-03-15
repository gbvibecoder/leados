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
- Sequence Design: 5-step email sequence with escalating urgency and value delivery
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
      "estimatedListSize": "number"
    },
    "prospectCount": "number",
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
    "targetProfiles": "number",
    "connectionStrategy": "string",
    "sequences": [{
      "step": "number",
      "type": "connection_request|value_message|case_study|direct_ask|follow_up",
      "delay": "string",
      "message": "string",
      "triggerCondition": "string (e.g., after connection accepted)"
    }],
    "dailyLimits": {
      "connectionRequests": "number",
      "messages": "number",
      "profileViews": "number"
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
  "prospectList": [{
    "firstName": "string",
    "lastName": "string",
    "email": "string",
    "company": "string",
    "jobTitle": "string",
    "industry": "string",
    "companySize": "string",
    "linkedInUrl": "string",
    "personalizationNote": "string"
  }],
  "projectedMetrics": {
    "emailsSent": "number",
    "expectedOpenRate": "number (percentage)",
    "expectedReplyRate": "number (percentage)",
    "expectedReplies": "number",
    "expectedMeetings": "number",
    "meetingBookingRate": "number (percentage)",
    "linkedInConnectionsSent": "number",
    "linkedInConnectionRate": "number (percentage)",
    "linkedInConnections": "number",
    "linkedInReplyRate": "number (percentage)",
    "linkedInReplies": "number",
    "linkedInMeetings": "number",
    "totalMeetingsFromOutbound": "number",
    "estimatedCostPerMeeting": "number"
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

      // Fetch real prospect data from Apollo if available
      let realProspects: any[] = [];
      let realCampaign: any = null;

      if (apollo.isApolloAvailable()) {
        try {
          // Extract job titles from ICP — handle both array and comma/slash-separated string formats
          let icpTitles: string[] = [];
          const rawTitles = offerData.icp?.titles || offerData.idealCustomerProfile?.titles
            || offerData.icp?.decisionMaker || offerData.idealCustomerProfile?.decisionMaker;
          if (Array.isArray(rawTitles)) {
            icpTitles = rawTitles;
          } else if (typeof rawTitles === 'string') {
            icpTitles = rawTitles.split(/[\/,]/).map((t: string) => t.trim()).filter(Boolean);
          }
          if (icpTitles.length === 0) {
            icpTitles = ['VP of Marketing', 'Head of Growth', 'CMO', 'CEO'];
          }

          // Don't pass industries as tag IDs — Apollo expects numeric IDs, not strings
          // Just search by job titles and locations for reliable results
          realProspects = await apollo.searchProspects({
            jobTitles: icpTitles,
            limit: 25,
          });
          await this.log('apollo_prospects_fetched', { count: realProspects.length, titles: icpTitles });
        } catch (err: any) {
          await this.log('apollo_error', { error: err.message });
        }
      }

      if (instantly.isInstantlyAvailable()) {
        try {
          const niche = inputs.config?.niche || 'B2B SaaS';
          realCampaign = await instantly.createCampaign({ name: `LeadOS — ${niche} ICP` });
          await this.log('instantly_campaign_created', { campaignId: realCampaign.id });
        } catch (err: any) {
          await this.log('instantly_error', { error: err.message });
        }
      }

      const userMessage = JSON.stringify({
        serviceNiche: inputs.config?.niche || inputs.config?.serviceNiche || 'B2B SaaS Lead Generation',
        ...inputs.config,
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
CRITICAL: For projectedMetrics, set emailsSent to 0, expectedReplies to 0, expectedMeetings to 0, linkedInConnectionsSent to 0, linkedInReplies to 0, linkedInMeetings to 0, totalMeetingsFromOutbound to 0, estimatedCostPerMeeting to 0. Set expectedOpenRate, expectedReplyRate, linkedInConnectionRate, linkedInReplyRate, meetingBookingRate to 0. These are REAL campaigns — metrics will be measured after execution, not projected. Set prospectCount to exactly ${realProspects.length} (the real count from Apollo). Do NOT fabricate numbers.`
          : `No real prospect data available from Apollo. Generate realistic prospect criteria and campaign strategy, but clearly mark all prospect names as examples.
CRITICAL: For projectedMetrics, set ALL numeric values to 0 — no emails have been sent, no connections made, no meetings booked. Do NOT fabricate metrics.`,
      });

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      let parsed: any = {};
      try {
        parsed = this.safeParseLLMJson<any>(response, ['coldEmail', 'linkedIn', 'projectedMetrics']);
      } catch (parseErr: any) {
        await this.log('llm_json_parse_error', { error: parseErr.message });
        // Use empty defaults — cleanOutput will build from real data anyway
        parsed = { coldEmail: {}, linkedIn: {}, projectedMetrics: {}, reasoning: `LLM JSON parse failed: ${parseErr.message}`, confidence: 0 };
      }

      // ── BUILD CLEAN OUTPUT — DO NOT trust ANY metric from LLM ──────────
      // Keep ONLY strategy/creative from LLM, replace ALL metrics with a new object
      const cleanOutput: any = {
        coldEmail: {
          platform: parsed.coldEmail?.platform || 'none',
          campaignName: parsed.coldEmail?.campaignName || '',
          prospectCriteria: parsed.coldEmail?.prospectCriteria || {},
          prospectCount: realProspects.length,
          domains: parsed.coldEmail?.domains || {},
          sequences: parsed.coldEmail?.sequences || [],
          personalizationFields: parsed.coldEmail?.personalizationFields || [],
          sendingSchedule: parsed.coldEmail?.sendingSchedule || {},
          complianceChecks: parsed.coldEmail?.complianceChecks || [],
          abTests: parsed.coldEmail?.abTests || [],
        },
        linkedIn: {
          targetProfiles: 0,
          connectionStrategy: parsed.linkedIn?.connectionStrategy || '',
          sequences: parsed.linkedIn?.sequences || [],
          dailyLimits: parsed.linkedIn?.dailyLimits || {},
          targetingCriteria: parsed.linkedIn?.targetingCriteria || {},
          profileOptimization: parsed.linkedIn?.profileOptimization || {},
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
        reasoning: parsed.reasoning || '',
        confidence: parsed.confidence || 0,
      };

      // Zero estimatedListSize in prospectCriteria
      if (cleanOutput.coldEmail.prospectCriteria) {
        cleanOutput.coldEmail.prospectCriteria.estimatedListSize = 0;
      }

      // Filter blacklisted companies from LLM prospect list (if any)
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
      }

      // If we have real prospects from Apollo, use them instead of LLM output
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

      // Update prospect-related counts from real data
      const prospectCount = cleanOutput.prospectList.length;
      cleanOutput.coldEmail.prospectCount = prospectCount;
      cleanOutput.contactedProspects.prospectListSize = prospectCount;

      // Add real campaign ID if available
      if (realCampaign?.id) {
        cleanOutput.coldEmail.campaignId = realCampaign.id;
        cleanOutput.coldEmail.dataSource = 'live_instantly';
        cleanOutput.instantlyCampaignId = realCampaign.id;
      }

      // Set data source info
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

}
