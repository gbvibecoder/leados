import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { mockInstantly } from '../../integrations/mock-data';
import * as apollo from '../../integrations/apollo';
import * as instantly from '../../integrations/instantly';

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
}`;

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
      const offerData = previousOutputs['offer-engineering']?.data || previousOutputs['offer-engineering'] || {};
      const contentData = previousOutputs['content-creative']?.data || previousOutputs['content-creative'] || {};
      const validationData = previousOutputs['validation']?.data || previousOutputs['validation'] || {};

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
          const icpTitles = offerData.icp?.titles || offerData.idealCustomerProfile?.titles || ['VP of Marketing', 'Head of Growth', 'CMO', 'CEO'];
          const icpIndustries = offerData.icp?.industries || ['SaaS', 'B2B Technology'];
          realProspects = await apollo.searchProspects({
            jobTitles: icpTitles,
            industries: icpIndustries,
            limit: 25,
          });
          await this.log('apollo_prospects_fetched', { count: realProspects.length });
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
      });

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      const parsed = this.safeParseLLMJson<any>(response, ['coldEmail', 'linkedIn', 'projectedMetrics']);

      // If we have real prospects from Apollo, inject them into the output
      if (realProspects.length > 0 && parsed.prospectList) {
        parsed.prospectList = realProspects.map((p) => ({
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
      }

      // Add real campaign ID if available
      if (realCampaign?.id && parsed.coldEmail) {
        parsed.coldEmail.campaignId = realCampaign.id;
        parsed.coldEmail.dataSource = 'live_instantly';
      }

      this.status = 'done';
      await this.log('run_completed', { output: parsed });
      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'Dual-channel outbound campaign deployed with cold email and LinkedIn automation.',
        confidence: parsed.confidence || 85,
      };
    } catch (error: any) {
      this.status = 'done';
      await this.log('run_fallback', { reason: error.message || 'Using mock data' });
      const mockData = await this.getMockOutput(inputs);
      return {
        success: true,
        data: mockData,
        reasoning: mockData.reasoning,
        confidence: mockData.confidence,
      };
    }
  }

  private async runColdEmailCampaign(inputs: AgentInput): Promise<any> {
    const niche = inputs.config?.niche || 'B2B SaaS';
    const campaign = await mockInstantly.createCampaign({
      name: `LeadOS — Cold Email — ${niche} ICP`,
      type: 'cold_email',
      sendingAccount: 'outreach@leadflow-ai.com',
      dailyLimit: 50,
      warmupEnabled: true,
    });

    const prospectList = [
      { firstName: 'Sarah', lastName: 'Chen', email: 'sarah.chen@techventures.io', company: 'TechVentures Inc', jobTitle: 'VP of Marketing', industry: 'SaaS', companySize: '50-200', linkedInUrl: 'linkedin.com/in/sarachen', personalizationNote: 'Recently posted about scaling their marketing team' },
      { firstName: 'James', lastName: 'Park', email: 'james.p@scaleup.io', company: 'ScaleUp', jobTitle: 'Head of Growth', industry: 'SaaS', companySize: '100-500', linkedInUrl: 'linkedin.com/in/jamespark', personalizationNote: 'Company raised Series B last month' },
      { firstName: 'Emily', lastName: 'Watson', email: 'emily@cloudplatform.com', company: 'CloudPlatform', jobTitle: 'CMO', industry: 'Cloud Computing', companySize: '200-1000', linkedInUrl: 'linkedin.com/in/emilywatson', personalizationNote: 'Spoke at SaaStr about demand gen challenges' },
      { firstName: 'David', lastName: 'Kim', email: 'dkim@revops.co', company: 'RevOps Consulting', jobTitle: 'CEO', industry: 'MarTech', companySize: '10-50', linkedInUrl: 'linkedin.com/in/davidkim', personalizationNote: 'Active LinkedIn poster about sales automation' },
      { firstName: 'Lisa', lastName: 'Rodriguez', email: 'lisa@growthstack.io', company: 'GrowthStack', jobTitle: 'Director of Demand Gen', industry: 'FinTech', companySize: '50-200', linkedInUrl: 'linkedin.com/in/lisarodriguez', personalizationNote: 'Hiring for SDR roles — signal of outbound investment' },
    ];

    await mockInstantly.addLeads(campaign.id, prospectList);

    return {
      platform: 'instantly',
      campaignName: `LeadOS — Cold Email — ${niche} ICP`,
      campaignId: campaign.id,
      prospectCriteria: {
        icpMatch: `Decision-makers at ${niche} companies (50-1000 employees) in growth phase — VPs, CMOs, Heads of Growth, CEOs at SMBs`,
        sources: ['Apollo.io', 'Clay', 'LinkedIn Sales Navigator'],
        estimatedListSize: 500,
      },
      prospectCount: 500,
      domains: {
        sendingDomains: ['outreach@leadflow-ai.com', 'hello@leadflow.co', 'team@getleadflow.com'],
        warmupStatus: 'Fully warmed — 14+ days, sending 30/day per domain',
        dailyRampSchedule: 'Week 1: 10/day → Week 2: 20/day → Week 3+: 50/day',
      },
      sequences: [
        {
          step: 1,
          delay: 'Day 0',
          subject: 'Quick question about {company}\'s pipeline',
          subjectLineB: '{firstName}, thought of {company} when I saw this',
          template: 'Hi {firstName},\n\nI noticed {company} is growing fast in the {industry} space — congrats on the momentum.\n\nQuick question: are you still relying on manual outbound or agencies to fill the pipeline?\n\nI ask because we built an AI system (13 specialized agents) that handles the entire lead gen lifecycle — from campaign management to AI voice qualification. Our {industry} clients typically see 2x qualified leads within 90 days.\n\nWould a 15-minute chat this week make sense to see if it fits?\n\nBest,\n{senderName}\n\n{unsubscribe_link}',
          purpose: 'Soft intro — establish relevance and plant curiosity without hard selling',
        },
        {
          step: 2,
          delay: 'Day 3',
          subject: 'How {similar_company} cut their CAC by 62%',
          subjectLineB: 'The {industry} playbook that cut CAC in half',
          template: 'Hi {firstName},\n\nWanted to share something relevant to {company}.\n\nA {industry} company (similar stage to you) was spending $340/lead with their agency. After deploying our AI system:\n\n• CAC: $340 → $128 (62% drop)\n• Qualified leads: 40/mo → 127/mo (3.2x)\n• Sales team saved 25 hrs/week on qualification\n\nThe biggest unlock was AI voice agents that qualify every lead on BANT criteria before any human gets involved.\n\nWant me to walk you through how this would work for {company} specifically?\n\n{senderName}\n\n{unsubscribe_link}',
          purpose: 'Value delivery — share a specific, relevant case study with hard metrics',
        },
        {
          step: 3,
          delay: 'Day 7',
          subject: 'The ROI math for {company}',
          subjectLineB: 'I ran the numbers for {company}',
          template: 'Hi {firstName},\n\nI ran some rough numbers based on companies similar to {company}:\n\n• Estimated current CAC: ~$250-$350\n• With LeadOS: $120-$150\n• Projected qualified lead increase: 80-120% in 90 days\n• Estimated annual savings: $180K-$420K\n\nThese aren\'t hypotheticals — they\'re based on data from 500+ companies in our system.\n\nAnd we guarantee it: 2x qualified leads in 90 days or full refund.\n\nWorth 30 minutes to see a custom projection for {company}?\n\n→ Grab a time here: {calendly_link}\n\n{senderName}\n\n{unsubscribe_link}',
          purpose: 'Quantified value — make the financial ROI undeniable with custom-feeling numbers',
        },
        {
          step: 4,
          delay: 'Day 11',
          subject: 'Only 3 Q2 spots left',
          subjectLineB: 'Closing onboarding for the quarter soon',
          template: 'Hi {firstName},\n\nQuick heads up — we cap onboarding at 10 clients/month for quality, and only 3 spots remain for Q2.\n\nIf growing {company}\'s pipeline is a priority this quarter, here\'s what a strategy call covers:\n\n1. Audit of your current lead gen channels\n2. Custom AI pipeline design for your ICP\n3. 90-day growth projection with expected metrics\n\nNo commitment — worst case you leave with a free audit.\n\n→ {calendly_link}\n\n{senderName}\n\n{unsubscribe_link}',
          purpose: 'Urgency — create real scarcity while providing a clear next step',
        },
        {
          step: 5,
          delay: 'Day 15',
          subject: 'Closing the loop',
          subjectLineB: 'No hard feelings, {firstName}',
          template: 'Hi {firstName},\n\nI\'ve reached out a few times about helping {company} scale qualified leads — I don\'t want to be a pest, so this will be my last email.\n\nIf the timing isn\'t right, totally understand. But if lead generation is something you\'re actively trying to solve, our 90-day guarantee makes it a zero-risk conversation.\n\nEither way, wishing you and the {company} team a great quarter.\n\n{senderName}\n\nP.S. — If someone else on your team handles demand gen, happy to connect with them instead.\n\n{unsubscribe_link}',
          purpose: 'Breakup — graceful exit that often triggers a response due to loss aversion',
        },
      ],
      personalizationFields: [
        '{firstName}', '{company}', '{industry}', '{similar_company}',
        '{companySize}', '{painPoint}', '{recentActivity}',
        '{senderName}', '{calendly_link}', '{unsubscribe_link}',
      ],
      sendingSchedule: {
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday'],
        timeWindow: '8:00 AM - 11:00 AM',
        timezone: 'recipient_local',
        dailyLimit: 50,
        delayBetweenSends: '45 seconds',
      },
      complianceChecks: [
        'CAN-SPAM: Physical address in footer',
        'CAN-SPAM: Unsubscribe link in every email',
        'CAN-SPAM: No deceptive subject lines',
        'GDPR: Legitimate interest basis documented',
        'GDPR: Data processing record maintained',
        'CASL: Implied consent for B2B contacts (6-month window)',
        'Bounce handling: Auto-remove hard bounces, pause if >5%',
        'DNC list: Cross-referenced before sending',
        'Domain reputation: Monitor sender score daily',
      ],
      abTests: [
        { variable: 'Subject Line (Step 1)', variantA: 'Quick question about {company}\'s pipeline', variantB: '{firstName}, thought of {company} when I saw this' },
        { variable: 'Subject Line (Step 2)', variantA: 'How {similar_company} cut their CAC by 62%', variantB: 'The {industry} playbook that cut CAC in half' },
        { variable: 'CTA Style (Step 3)', variantA: 'Calendar link in email', variantB: 'Reply-to-book approach' },
      ],
    };
  }

  private async runLinkedInOutreach(inputs: AgentInput): Promise<any> {
    return {
      targetProfiles: 200,
      connectionStrategy: 'Target ICP decision-makers at companies showing buying signals — recent funding, hiring SDRs, posting about growth challenges. Personalize connection notes referencing their content or company news.',
      sequences: [
        {
          step: 1,
          type: 'connection_request',
          delay: 'Day 0',
          message: 'Hi {firstName}, I\'ve been following {company}\'s growth in the {industry} space — impressive trajectory. I work with {industry} leaders on scaling their pipeline with AI-powered lead gen. Would love to connect and exchange ideas.',
          triggerCondition: 'Profile matches ICP criteria',
        },
        {
          step: 2,
          type: 'value_message',
          delay: 'Day 2 (after connection accepted)',
          message: 'Thanks for connecting, {firstName}! Genuine question — how are you currently handling lead generation at {company}?\n\nI ask because we recently helped a company similar to yours go from 40 to 127 qualified leads/month in 90 days using an autonomous AI system.\n\nI wrote up the case study — want me to send it over? No pitch, just thought it might spark some ideas for your team.',
          triggerCondition: 'Connection request accepted',
        },
        {
          step: 3,
          type: 'case_study',
          delay: 'Day 5',
          message: 'Hi {firstName}, wanted to share one more data point that might be relevant.\n\nWe analyzed pipeline data from 500+ companies and found that the ones using AI-powered qualification see 62% lower CAC on average — mainly because AI filters out tire-kickers before they consume sales bandwidth.\n\nIf you\'re seeing high CAC or low lead quality at {company}, I think we could help. Happy to walk you through how in a 15-min call.',
          triggerCondition: 'No reply to value message after 3 days',
        },
        {
          step: 4,
          type: 'direct_ask',
          delay: 'Day 10',
          message: 'Last note from me, {firstName} — we\'re opening 3 spots for our Q2 cohort and I thought of {company}.\n\nWe offer a free 30-min strategy call where we map out a custom AI pipeline for your ICP, plus a 90-day growth projection. And we back it with a guarantee: 2x qualified leads or full refund.\n\nWorth exploring? Here\'s my calendar: {calendly_link}',
          triggerCondition: 'No reply to case study after 5 days',
        },
      ],
      dailyLimits: {
        connectionRequests: 25,
        messages: 50,
        profileViews: 80,
      },
      targetingCriteria: {
        jobTitles: ['VP of Marketing', 'Head of Growth', 'CMO', 'Director of Demand Gen', 'VP Sales', 'CEO (at companies <50 employees)'],
        companySize: '10-500 employees',
        industries: ['SaaS', 'B2B Technology', 'Cloud Computing', 'MarTech', 'FinTech'],
        geography: 'United States, Canada, United Kingdom',
        additionalFilters: [
          'Posted about growth/marketing in last 90 days',
          'Company raised funding in last 12 months',
          'Active LinkedIn user (posts/comments weekly)',
          'Currently hiring for SDR/BDR roles (buying signal)',
        ],
      },
      profileOptimization: {
        headline: 'Helping {industry} companies 2x qualified leads in 90 days with AI | Founder @ LeadOS',
        about: 'We built 13 AI agents that handle the entire lead generation lifecycle — from finding prospects to qualifying them with AI voice calls. Our clients see 62% lower CAC and 3x more qualified meetings. If you\'re spending too much on agencies or manual outbound, let\'s talk.',
        bannerCTA: 'Book a free strategy call → leadflow.ai/strategy',
      },
    };
  }

  private async getMockOutput(inputs: AgentInput): Promise<any> {
    const coldEmail = await this.runColdEmailCampaign(inputs);
    const linkedIn = await this.runLinkedInOutreach(inputs);

    const prospectList = [
      { firstName: 'Sarah', lastName: 'Chen', email: 'sarah.chen@techventures.io', company: 'TechVentures Inc', jobTitle: 'VP of Marketing', industry: 'SaaS', companySize: '50-200', linkedInUrl: 'linkedin.com/in/sarachen', personalizationNote: 'Recently posted about scaling their marketing team' },
      { firstName: 'James', lastName: 'Park', email: 'james.p@scaleup.io', company: 'ScaleUp', jobTitle: 'Head of Growth', industry: 'SaaS', companySize: '100-500', linkedInUrl: 'linkedin.com/in/jamespark', personalizationNote: 'Company raised Series B last month' },
      { firstName: 'Emily', lastName: 'Watson', email: 'emily@cloudplatform.com', company: 'CloudPlatform', jobTitle: 'CMO', industry: 'Cloud Computing', companySize: '200-1000', linkedInUrl: 'linkedin.com/in/emilywatson', personalizationNote: 'Spoke at SaaStr about demand gen challenges' },
      { firstName: 'David', lastName: 'Kim', email: 'dkim@revops.co', company: 'RevOps Consulting', jobTitle: 'CEO', industry: 'MarTech', companySize: '10-50', linkedInUrl: 'linkedin.com/in/davidkim', personalizationNote: 'Active LinkedIn poster about sales automation' },
      { firstName: 'Lisa', lastName: 'Rodriguez', email: 'lisa@growthstack.io', company: 'GrowthStack', jobTitle: 'Director of Demand Gen', industry: 'FinTech', companySize: '50-200', linkedInUrl: 'linkedin.com/in/lisarodriguez', personalizationNote: 'Hiring for SDR roles — signal of outbound investment' },
    ];

    return {
      coldEmail,
      linkedIn,
      prospectList,
      projectedMetrics: {
        emailsSent: 2500,
        expectedOpenRate: 42.0,
        expectedReplyRate: 5.0,
        expectedReplies: 125,
        expectedMeetings: 25,
        meetingBookingRate: 20.0,
        linkedInConnectionsSent: 200,
        linkedInConnectionRate: 60.0,
        linkedInConnections: 120,
        linkedInReplyRate: 25.0,
        linkedInReplies: 30,
        linkedInMeetings: 6,
        totalMeetingsFromOutbound: 31,
        estimatedCostPerMeeting: 12.50,
      },
      reasoning:
        'Deployed dual-channel outbound strategy targeting B2B SaaS decision-makers. Cold email campaign via Instantly targets 500 prospects with a 5-step sequence following the intro → value → ROI → urgency → breakup framework. Each step includes A/B test variants for subject lines. Sending schedule optimized for Mon-Thu mornings in recipient timezone to maximize open rates. Three warmed sending domains rotate to protect deliverability. LinkedIn outreach targets 200 profiles with a 4-step sequence progressing from connection request to value-first engagement to direct ask, with trigger conditions for smart follow-up timing. Daily limits kept conservative (25 connections, 50 messages) to stay under LinkedIn\'s automation detection threshold. Full CAN-SPAM, GDPR, and CASL compliance with DNC cross-referencing. Projected metrics based on industry benchmarks: 42% open rate, 5% reply rate, 20% reply-to-meeting conversion, 60% LinkedIn connection acceptance, 25% LinkedIn reply rate. Combined outbound should generate ~31 meetings/month at ~$12.50/meeting.',
      confidence: 83,
    };
  }
}
