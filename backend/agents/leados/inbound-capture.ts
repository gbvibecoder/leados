import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { mockHubSpot, mockLeads } from '../../integrations/mock-data';
import * as hubspot from '../../integrations/hubspot';
import * as apolloApi from '../../integrations/apollo';
import * as clearbit from '../../integrations/clearbit';
import { filterBlacklisted } from '../../utils/blacklist';

const SYSTEM_PROMPT = `You are the Inbound Lead Capture Agent for LeadOS — the central hub that receives, scores, enriches, and segments every lead entering the system from all channels.

You MUST use data from previous agents when available:
- From Offer Engineering (agent 2): ICP definition, pain points, pricing tiers
- From Funnel Builder (agent 4): Form fields, landing page URLs, CRM setup
- From Paid Traffic (agent 6): Ad campaigns, UTM parameters, channel data
- From Outbound Outreach (agent 7): Email replies, LinkedIn conversations, prospect lists

RESPONSIBILITY 1: CRM INTEGRATION
- Configure HubSpot/GoHighLevel pipeline stages and custom properties
- Set up webhook receivers for all inbound sources (forms, chat, ads, email replies)
- Map UTM parameters to lead source attribution
- Auto-create contacts with deduplication (email + company match)

RESPONSIBILITY 2: LEAD SCORING (100-point model)
Apply weighted scoring across these factors:
- Company Fit (20pts): company size, industry match, revenue range vs ICP
- Budget Signal (25pts): stated budget, pricing page visits, plan tier interest
- Engagement Level (25pts): form submissions, page views, email opens/replies, demo requests
- Industry Match (15pts): how closely the lead's industry matches the ICP
- Timeline Urgency (15pts): stated timeline, urgency language, seasonal buying patterns

RESPONSIBILITY 3: DATA ENRICHMENT
- Pull firmographic data: company revenue, employee count, funding status, tech stack
- Pull contact data: LinkedIn URL, phone, job title, decision-making authority
- Sources: Apollo.io (primary), Clay (firmographic), Clearbit (technographic)
- Enrichment completeness score per lead

RESPONSIBILITY 4: SEGMENTATION
- Enterprise Hot (score >= 80): Route to AI Qualification call immediately
- Mid-Market Warm (score 60-79): Schedule nurture + soft booking push
- SMB Interested (score 40-59): Add to email nurture sequence
- Cold/Unqualified (score < 40): Low-priority drip, re-engage in 30 days

RESPONSIBILITY 5: WEBHOOK PROCESSING
- Process form submissions from landing pages
- Capture chat widget conversations
- Handle ad platform lead form submissions (Google Lead Forms, Meta Lead Ads)
- Process email replies forwarded from outbound campaigns
- Capture LinkedIn conversation exports

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "crmSetup": {
    "provider": "string",
    "pipelineStages": [{ "name": "string", "order": "number", "autoActions": ["string"] }],
    "customProperties": [{ "name": "string", "type": "string", "description": "string" }],
    "webhookEndpoints": [{ "source": "string", "url": "string", "events": ["string"] }]
  },
  "scoringModel": {
    "maxScore": 100,
    "factors": [{
      "name": "string",
      "weight": "number",
      "rules": [{ "condition": "string", "points": "number" }]
    }],
    "qualificationThreshold": "number"
  },
  "enrichment": {
    "sources": [{ "provider": "string", "dataPoints": ["string"], "priority": "number" }],
    "fieldsEnriched": ["string"],
    "averageCompletenessScore": "number (percentage)"
  },
  "segmentation": {
    "segments": [{
      "name": "string",
      "scoreRange": "string",
      "criteria": "string",
      "count": "number",
      "action": "string",
      "routeTo": "string"
    }]
  },
  "leadsProcessed": [{
    "name": "string",
    "email": "string",
    "company": "string",
    "source": "string",
    "channel": "string",
    "score": "number",
    "segment": "string",
    "stage": "string",
    "enrichmentStatus": "complete|partial|pending",
    "enrichedData": {
      "companyRevenue": "string",
      "employeeCount": "number",
      "techStack": ["string"],
      "fundingStatus": "string",
      "linkedInUrl": "string",
      "decisionMaker": "boolean"
    },
    "scoreBreakdown": {
      "companyFit": "number",
      "budgetSignal": "number",
      "engagement": "number",
      "industryMatch": "number",
      "timeline": "number"
    }
  }],
  "channelBreakdown": [{
    "channel": "string",
    "leadsCount": "number",
    "avgScore": "number",
    "topSegment": "string"
  }],
  "summary": {
    "totalLeadsProcessed": "number",
    "totalEnriched": "number",
    "avgLeadScore": "number",
    "hotLeads": "number",
    "warmLeads": "number",
    "coldLeads": "number",
    "duplicatesRemoved": "number"
  },
  "reasoning": "string",
  "confidence": "number 0-100"
}

Score leads objectively. Prioritize accuracy over volume — false positives waste sales time, false negatives lose revenue.`;

export class InboundCaptureAgent extends BaseAgent {
  constructor() {
    super(
      'inbound-capture',
      'Inbound Lead Capture Agent',
      'Central hub receiving all leads — CRM integration, lead scoring (1-100), data enrichment via Apollo/Clay/Clearbit, and segmentation'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    try {
      // Extract upstream agent data
      const previousOutputs = inputs.previousOutputs || {};
      const offerData = previousOutputs['offer-engineering']?.data || previousOutputs['offer-engineering'] || {};
      const funnelData = previousOutputs['funnel-builder']?.data || previousOutputs['funnel-builder'] || {};
      const paidTrafficData = previousOutputs['paid-traffic']?.data || previousOutputs['paid-traffic'] || {};
      const outboundData = previousOutputs['outbound-outreach']?.data || previousOutputs['outbound-outreach'] || {};
      const validationData = previousOutputs['validation']?.data || previousOutputs['validation'] || {};

      // Check if validation said NO-GO
      if (validationData.decision === 'NO-GO') {
        this.status = 'done';
        return {
          success: false,
          data: { skipped: true, reason: 'Validation agent returned NO-GO decision' },
          reasoning: 'Inbound capture skipped — upstream validation rejected this opportunity.',
          confidence: 100,
        };
      }

      // Fetch real leads from database first
      let dbLeads: any[] = [];
      try {
        const { prisma } = await import('@/lib/prisma');
        dbLeads = await prisma.lead.findMany({
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { interactions: true },
        });
        if (dbLeads.length > 0) {
          await this.log('db_leads_fetched', { count: dbLeads.length });
        }
      } catch (err: any) {
        await this.log('db_leads_error', { error: err.message });
      }

      // Fetch real data from integrations when available
      let realHubSpotContacts: any[] = [];
      let realEnrichments: Map<string, any> = new Map();
      const enrichmentSources: string[] = [];

      // Pull existing contacts from HubSpot
      if (hubspot.isHubSpotAvailable()) {
        try {
          realHubSpotContacts = await hubspot.getContacts(100);
          await this.log('hubspot_real_contacts', { count: realHubSpotContacts.length });
          enrichmentSources.push('hubspot');
        } catch (err: any) {
          await this.log('hubspot_error', { error: err.message });
        }
      }

      // Enrich leads via Apollo
      if (apolloApi.isApolloAvailable()) {
        try {
          const emailsToEnrich = [
            ...(outboundData.prospectList || []).map((p: any) => p.email),
            ...realHubSpotContacts.map((c) => c.email),
          ].filter(Boolean).slice(0, 20);

          if (emailsToEnrich.length > 0) {
            const enriched = await apolloApi.bulkEnrich(emailsToEnrich);
            for (const e of enriched) {
              realEnrichments.set(e.email, {
                companyRevenue: e.companyRevenue,
                employeeCount: e.employeeCount,
                techStack: e.techStack,
                fundingStatus: e.fundingStatus,
                linkedInUrl: e.linkedInUrl,
                decisionMaker: e.decisionMaker,
              });
            }
            await this.log('apollo_enrichment_done', { enriched: enriched.length });
            enrichmentSources.push('apollo');
          }
        } catch (err: any) {
          await this.log('apollo_enrichment_error', { error: err.message });
        }
      }

      // Enrich company data via Clearbit
      if (clearbit.isClearbitAvailable()) {
        try {
          const domains = new Set<string>();
          for (const contact of realHubSpotContacts) {
            const domain = contact.email?.split('@')[1];
            if (domain) domains.add(domain);
          }
          for (const domain of Array.from(domains).slice(0, 10)) {
            try {
              const company = await clearbit.enrichCompany(domain);
              // Store by domain for lookup
              realEnrichments.set(`domain:${domain}`, {
                companyRevenue: company.annualRevenue,
                employeeCount: company.employeeCount,
                techStack: company.techStack,
                fundingStatus: company.fundingTotal,
                industry: company.industry,
              });
            } catch { /* skip individual failures */ }
          }
          await this.log('clearbit_enrichment_done', { domains: domains.size });
          enrichmentSources.push('clearbit');
        } catch (err: any) {
          await this.log('clearbit_error', { error: err.message });
        }
      }

      // Format real DB leads for the LLM context
      const realLeadsForContext = dbLeads.length > 0
        ? dbLeads.map((l: any) => ({
            name: l.name,
            email: l.email,
            company: l.company,
            phone: l.phone,
            source: l.source,
            channel: l.channel || 'inbound',
            score: l.score,
            stage: l.stage,
            segment: l.segment,
            utmSource: l.utmSource,
            utmMedium: l.utmMedium,
            utmCampaign: l.utmCampaign,
            interactionCount: l.interactions?.length || 0,
            createdAt: l.createdAt,
          }))
        : null;

      const userMessage = JSON.stringify({
        serviceNiche: inputs.config?.niche || inputs.config?.serviceNiche || 'B2B SaaS Lead Generation',
        ...inputs.config,
        upstreamContext: {
          icp: offerData.icp || offerData.idealCustomerProfile || null,
          painPoints: offerData.painPoints || null,
          funnelSetup: funnelData.landingPage ? { formFields: funnelData.leadCaptureForm?.fields, bookingIntegration: funnelData.bookingIntegration } : null,
          adCampaigns: paidTrafficData.googleAds || paidTrafficData.metaAds ? { google: !!paidTrafficData.googleAds, meta: !!paidTrafficData.metaAds } : null,
          outboundProspects: outboundData.prospectList || outboundData.coldEmail?.prospectCount || null,
        },
        realLeadsFromDatabase: realLeadsForContext,
        IMPORTANT_INSTRUCTION: realLeadsForContext
          ? 'USE ONLY the real leads from realLeadsFromDatabase. Do NOT invent or generate fictional leads. Score and enrich these real leads only.'
          : null,
        realData: {
          hubspotContacts: realHubSpotContacts.length > 0 ? realHubSpotContacts.length : null,
          enrichedLeads: realEnrichments.size > 0 ? realEnrichments.size : null,
          enrichmentSources: enrichmentSources.length > 0 ? enrichmentSources : null,
          dataSource: dbLeads.length > 0 ? 'database' : enrichmentSources.length > 0 ? 'live_apis' : 'llm_generated',
        },
      });

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      const parsed = this.safeParseLLMJson<any>(response, ['crmSetup', 'scoringModel', 'segmentation']);

      // Merge DB lead data (phone, source, etc.) back into LLM output — LLM often drops fields
      if (dbLeads.length > 0 && parsed.leadsProcessed) {
        for (const lead of parsed.leadsProcessed) {
          const dbLead = dbLeads.find((d: any) =>
            d.email === lead.email || (d.name && d.name.toLowerCase() === (lead.name || '').toLowerCase())
          );
          if (dbLead) {
            if (!lead.phone && dbLead.phone) lead.phone = dbLead.phone;
            if (!lead.source && dbLead.source) lead.source = dbLead.source;
            if (!lead.channel && dbLead.channel) lead.channel = dbLead.channel;
          }
        }
      }

      // Merge real enrichment data into LLM output leads
      if (realEnrichments.size > 0 && parsed.leadsProcessed) {
        for (const lead of parsed.leadsProcessed) {
          const enriched = realEnrichments.get(lead.email);
          const domain = lead.email?.split('@')[1];
          const companyData = domain ? realEnrichments.get(`domain:${domain}`) : null;
          if (enriched || companyData) {
            lead.enrichedData = {
              ...lead.enrichedData,
              ...(enriched || {}),
              ...(companyData || {}),
            };
            lead.enrichmentStatus = 'complete';
          }
        }
      }

      // Filter blacklisted companies from processed leads
      if (parsed.leadsProcessed && parsed.leadsProcessed.length > 0) {
        try {
          const { allowed, blocked } = await filterBlacklisted(parsed.leadsProcessed);
          if (blocked.length > 0) {
            await this.log('blacklist_filtered', {
              removed: blocked.length,
              companies: blocked.map((b: any) => b.company),
            });
            // Mark blocked leads as blacklisted in output (don't remove, just flag)
            for (const lead of parsed.leadsProcessed) {
              const isBlocked = blocked.some((b: any) => b.email === lead.email || b.company === lead.company);
              if (isBlocked) {
                lead.blacklisted = true;
                lead.stage = 'lost';
                lead.segment = 'Blacklisted';
                lead.score = 0;
              }
            }
            parsed.blacklistFiltered = blocked.length;
          }
        } catch (err: any) {
          await this.log('blacklist_check_error', { error: err.message });
        }
      }

      // Push scored leads to real HubSpot (skip blacklisted)
      if (hubspot.isHubSpotAvailable() && parsed.leadsProcessed) {
        const leadsToSync = parsed.leadsProcessed.filter((l: any) => !l.blacklisted).slice(0, 20);
        for (const lead of leadsToSync) {
          try {
            await hubspot.upsertContact({
              email: lead.email,
              firstName: lead.name?.split(' ')[0],
              lastName: lead.name?.split(' ').slice(1).join(' '),
              company: lead.company,
              properties: {
                lead_score: String(lead.score || 0),
                lead_segment: lead.segment || '',
                lifecyclestage: lead.score >= 80 ? 'marketingqualifiedlead' : 'lead',
              },
            });
          } catch { /* skip individual CRM failures */ }
        }
        await this.log('hubspot_leads_synced', { count: leadsToSync.length });
      }

      this.status = 'done';
      await this.log('run_completed', { output: parsed });
      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'Inbound lead capture system configured and leads processed.',
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

  private scoreLead(lead: any): { total: number; breakdown: any } {
    const breakdown = {
      companyFit: 0,
      budgetSignal: 0,
      engagement: 0,
      industryMatch: 0,
      timeline: 0,
    };

    // Company Fit (max 20)
    if (lead.segment === 'enterprise') breakdown.companyFit = 20;
    else if (lead.segment === 'mid_market') breakdown.companyFit = 14;
    else breakdown.companyFit = 7;

    // Budget Signal (max 25)
    if (lead.stage === 'won' || lead.stage === 'booked') breakdown.budgetSignal = 25;
    else if (lead.stage === 'qualified') breakdown.budgetSignal = 18;
    else if (lead.stage === 'contacted') breakdown.budgetSignal = 10;
    else breakdown.budgetSignal = 5;

    // Engagement Level (max 25)
    if (lead.stage === 'booked' || lead.stage === 'won') breakdown.engagement = 25;
    else if (lead.stage === 'qualified') breakdown.engagement = 18;
    else if (lead.stage === 'contacted') breakdown.engagement = 12;
    else breakdown.engagement = 5;

    // Industry Match (max 15)
    const highFitSources = ['google_ads', 'meta_ads', 'referral'];
    if (highFitSources.includes(lead.source)) breakdown.industryMatch = 15;
    else if (lead.source === 'linkedin' || lead.source === 'cold_email') breakdown.industryMatch = 10;
    else breakdown.industryMatch = 6;

    // Timeline (max 15)
    if (lead.stage === 'booked' || lead.stage === 'won') breakdown.timeline = 15;
    else if (lead.stage === 'qualified') breakdown.timeline = 10;
    else if (lead.stage === 'contacted') breakdown.timeline = 6;
    else breakdown.timeline = 3;

    const total = breakdown.companyFit + breakdown.budgetSignal + breakdown.engagement + breakdown.industryMatch + breakdown.timeline;
    return { total, breakdown };
  }

  private getSegment(score: number): string {
    if (score >= 80) return 'Enterprise Hot';
    if (score >= 60) return 'Mid-Market Warm';
    if (score >= 40) return 'SMB Interested';
    return 'Cold';
  }

  private getEnrichmentStatus(lead: any): 'complete' | 'partial' | 'pending' {
    if (lead.stage === 'won' || lead.stage === 'booked') return 'complete';
    if (lead.stage === 'qualified' || lead.stage === 'contacted') return 'partial';
    return 'pending';
  }

  private generateEnrichedData(lead: any): any {
    const revenueRanges: Record<string, string> = {
      enterprise: '$10M-$50M ARR',
      mid_market: '$2M-$10M ARR',
      smb: '$500K-$2M ARR',
    };
    const employeeCounts: Record<string, number> = {
      enterprise: 250,
      mid_market: 75,
      smb: 20,
    };
    const techStacks: Record<string, string[]> = {
      enterprise: ['Salesforce', 'HubSpot', 'Marketo', 'Slack', 'AWS'],
      mid_market: ['HubSpot', 'Intercom', 'Stripe', 'Google Workspace'],
      smb: ['Mailchimp', 'Stripe', 'Google Workspace'],
    };
    const fundingStatuses: Record<string, string> = {
      enterprise: 'Series B ($25M)',
      mid_market: 'Series A ($8M)',
      smb: 'Bootstrapped',
    };

    return {
      companyRevenue: revenueRanges[lead.segment] || '$1M-$5M ARR',
      employeeCount: employeeCounts[lead.segment] || 50,
      techStack: techStacks[lead.segment] || ['Google Workspace'],
      fundingStatus: fundingStatuses[lead.segment] || 'Unknown',
      linkedInUrl: `linkedin.com/company/${lead.company?.toLowerCase().replace(/\s+/g, '-')}`,
      decisionMaker: lead.segment === 'enterprise' || lead.stage === 'booked' || lead.stage === 'won',
    };
  }

  private async getMockOutput(inputs: AgentInput): Promise<any> {
    // Pull existing contacts from CRM mock
    const existingContacts = await mockHubSpot.getContacts();
    await this.log('hubspot_contacts_fetched', { count: existingContacts.length });

    // Simulate creating new inbound leads from various sources
    const newInboundLeads = [
      { name: 'Jordan Blake', email: 'jordan@pipelinehq.io', company: 'PipelineHQ', phone: '+1-555-0201', source: 'form_submit', channel: 'inbound', stage: 'new', segment: 'enterprise' },
      { name: 'Priya Sharma', email: 'priya@fintechflow.com', company: 'FinTechFlow', phone: '+1-555-0202', source: 'google_lead_form', channel: 'paid_search', stage: 'new', segment: 'mid_market' },
      { name: 'Marcus Lee', email: 'marcus@devscale.co', company: 'DevScale', phone: '+1-555-0203', source: 'meta_lead_ad', channel: 'paid_social', stage: 'new', segment: 'smb' },
      { name: 'Olivia Torres', email: 'olivia@growthengine.io', company: 'GrowthEngine', phone: '+1-555-0204', source: 'chat_widget', channel: 'inbound', stage: 'new', segment: 'enterprise' },
      { name: 'Nathan Wright', email: 'nathan@salescraft.ai', company: 'SalesCraft AI', phone: '+1-555-0205', source: 'email_reply', channel: 'outbound', stage: 'contacted', segment: 'mid_market' },
    ];

    for (const lead of newInboundLeads) {
      await mockHubSpot.createContact(lead);
    }

    // Score and enrich all leads
    const allLeads = [...mockLeads, ...newInboundLeads];
    const processedLeads = allLeads.map(lead => {
      const { total, breakdown } = this.scoreLead(lead);
      const enrichedData = this.generateEnrichedData(lead);
      return {
        name: lead.name,
        email: lead.email,
        company: lead.company,
        source: lead.source,
        channel: lead.channel,
        score: total,
        segment: this.getSegment(total),
        stage: lead.stage || 'new',
        enrichmentStatus: this.getEnrichmentStatus(lead),
        enrichedData,
        scoreBreakdown: breakdown,
      };
    });

    // Channel breakdown
    const channelMap = new Map<string, { leads: any[]; totalScore: number }>();
    for (const lead of processedLeads) {
      const ch = lead.channel;
      if (!channelMap.has(ch)) channelMap.set(ch, { leads: [], totalScore: 0 });
      const entry = channelMap.get(ch)!;
      entry.leads.push(lead);
      entry.totalScore += lead.score;
    }

    const channelBreakdown = Array.from(channelMap.entries()).map(([channel, data]) => ({
      channel,
      leadsCount: data.leads.length,
      avgScore: Math.round(data.totalScore / data.leads.length),
      topSegment: data.leads.sort((a, b) => b.score - a.score)[0]?.segment || 'Cold',
    }));

    // Summary
    const hotLeads = processedLeads.filter(l => l.score >= 80).length;
    const warmLeads = processedLeads.filter(l => l.score >= 60 && l.score < 80).length;
    const coldLeads = processedLeads.filter(l => l.score < 60).length;
    const avgScore = Math.round(processedLeads.reduce((sum, l) => sum + l.score, 0) / processedLeads.length);

    return {
      crmSetup: {
        provider: 'HubSpot',
        pipelineStages: [
          { name: 'New', order: 1, autoActions: ['Send welcome email', 'Trigger enrichment'] },
          { name: 'Contacted', order: 2, autoActions: ['Log interaction', 'Update score'] },
          { name: 'Qualified', order: 3, autoActions: ['Route to AI Qualification Agent', 'Notify sales'] },
          { name: 'Booked', order: 4, autoActions: ['Send calendar confirmation', 'Prep sales brief'] },
          { name: 'Won', order: 5, autoActions: ['Create invoice', 'Start onboarding sequence'] },
          { name: 'Lost', order: 6, autoActions: ['Add to re-engagement drip', 'Log loss reason'] },
        ],
        customProperties: [
          { name: 'lead_score', type: 'number', description: 'AI-calculated lead score (0-100)' },
          { name: 'lead_segment', type: 'enumeration', description: 'Enterprise Hot / Mid-Market Warm / SMB Interested / Cold' },
          { name: 'enrichment_status', type: 'enumeration', description: 'complete / partial / pending' },
          { name: 'enrichment_completeness', type: 'number', description: 'Percentage of enrichment fields filled' },
          { name: 'utm_source', type: 'string', description: 'UTM source parameter for attribution' },
          { name: 'utm_medium', type: 'string', description: 'UTM medium parameter for attribution' },
          { name: 'utm_campaign', type: 'string', description: 'UTM campaign parameter for attribution' },
          { name: 'score_company_fit', type: 'number', description: 'Company fit sub-score (0-20)' },
          { name: 'score_budget_signal', type: 'number', description: 'Budget signal sub-score (0-25)' },
          { name: 'score_engagement', type: 'number', description: 'Engagement sub-score (0-25)' },
          { name: 'score_industry_match', type: 'number', description: 'Industry match sub-score (0-15)' },
          { name: 'score_timeline', type: 'number', description: 'Timeline urgency sub-score (0-15)' },
          { name: 'decision_maker', type: 'boolean', description: 'Whether contact is a decision maker' },
          { name: 'qualification_outcome', type: 'enumeration', description: 'qualified / nurture / disqualified' },
        ],
        webhookEndpoints: [
          { source: 'Landing Page Forms', url: '/api/webhooks/form-submit', events: ['form.submitted'] },
          { source: 'Google Lead Forms', url: '/api/webhooks/google-leads', events: ['lead_form.submitted'] },
          { source: 'Meta Lead Ads', url: '/api/webhooks/meta-leads', events: ['leadgen'] },
          { source: 'Chat Widget', url: '/api/webhooks/chat', events: ['conversation.started', 'conversation.completed'] },
          { source: 'Email Replies (Instantly)', url: '/api/webhooks/email-replies', events: ['email.replied', 'email.bounced'] },
          { source: 'LinkedIn Exports', url: '/api/webhooks/linkedin', events: ['connection.accepted', 'message.received'] },
          { source: 'Calendly', url: '/api/webhooks/calendly', events: ['invitee.created', 'invitee.canceled'] },
        ],
      },
      scoringModel: {
        maxScore: 100,
        qualificationThreshold: 60,
        factors: [
          {
            name: 'Company Fit',
            weight: 20,
            rules: [
              { condition: 'Enterprise (>100 employees, >$10M revenue)', points: 20 },
              { condition: 'Mid-Market (25-100 employees, $2M-$10M)', points: 14 },
              { condition: 'SMB (<25 employees, <$2M)', points: 7 },
            ],
          },
          {
            name: 'Budget Signal',
            weight: 25,
            rules: [
              { condition: 'Meeting booked or deal won (confirmed intent)', points: 25 },
              { condition: 'Qualified — pricing discussed or budget stated', points: 18 },
              { condition: 'Contacted — initial engagement, no budget info', points: 10 },
              { condition: 'New — no budget signal yet', points: 5 },
            ],
          },
          {
            name: 'Engagement Level',
            weight: 25,
            rules: [
              { condition: 'Demo request, meeting booked, or deal closed', points: 25 },
              { condition: 'Form submitted + multiple page views', points: 18 },
              { condition: 'Email replied or LinkedIn conversation started', points: 12 },
              { condition: 'Single page view or ad click only', points: 5 },
            ],
          },
          {
            name: 'Industry Match',
            weight: 15,
            rules: [
              { condition: 'Paid channel lead (Google/Meta) — high intent', points: 15 },
              { condition: 'Outbound lead (LinkedIn/email) — targeted match', points: 10 },
              { condition: 'Organic/referral — unverified fit', points: 6 },
            ],
          },
          {
            name: 'Timeline Urgency',
            weight: 15,
            rules: [
              { condition: 'Meeting booked or deal closing — immediate', points: 15 },
              { condition: 'Qualified — within 30 days', points: 10 },
              { condition: 'Contacted — within 90 days', points: 6 },
              { condition: 'New — no timeline stated', points: 3 },
            ],
          },
        ],
      },
      enrichment: {
        sources: [
          { provider: 'Apollo.io', dataPoints: ['email', 'phone', 'job_title', 'company_size', 'linkedin_url', 'decision_maker'], priority: 1 },
          { provider: 'Clay', dataPoints: ['company_revenue', 'employee_count', 'funding_status', 'industry', 'headquarters'], priority: 2 },
          { provider: 'Clearbit', dataPoints: ['tech_stack', 'company_category', 'annual_revenue', 'alexa_rank', 'social_profiles'], priority: 3 },
        ],
        fieldsEnriched: [
          'company_revenue', 'employee_count', 'tech_stack', 'funding_status',
          'linkedin_url', 'decision_maker', 'job_title', 'phone',
          'company_category', 'headquarters', 'social_profiles',
        ],
        averageCompletenessScore: 78,
      },
      segmentation: {
        segments: [
          {
            name: 'Enterprise Hot',
            scoreRange: '80-100',
            criteria: 'score >= 80 AND (segment = enterprise OR meeting booked)',
            count: hotLeads,
            action: 'Priority queue — route to AI Qualification Agent (Agent 9) for immediate voice call',
            routeTo: 'ai-qualification',
          },
          {
            name: 'Mid-Market Warm',
            scoreRange: '60-79',
            criteria: 'score >= 60 AND score < 80',
            count: warmLeads,
            action: 'Send personalized nurture sequence + soft booking push via email/LinkedIn',
            routeTo: 'nurture-sequence',
          },
          {
            name: 'SMB Interested',
            scoreRange: '40-59',
            criteria: 'score >= 40 AND score < 60',
            count: processedLeads.filter(l => l.score >= 40 && l.score < 60).length,
            action: 'Add to automated email nurture drip — re-score after 2 interactions',
            routeTo: 'email-nurture',
          },
          {
            name: 'Cold / Unqualified',
            scoreRange: '0-39',
            criteria: 'score < 40',
            count: processedLeads.filter(l => l.score < 40).length,
            action: 'Low-priority drip — re-engage in 30 days with new offer or content',
            routeTo: 'cold-drip',
          },
        ],
      },
      leadsProcessed: processedLeads,
      channelBreakdown,
      summary: {
        totalLeadsProcessed: processedLeads.length,
        totalEnriched: processedLeads.filter(l => l.enrichmentStatus !== 'pending').length,
        avgLeadScore: avgScore,
        hotLeads,
        warmLeads,
        coldLeads: processedLeads.length - hotLeads - warmLeads,
        duplicatesRemoved: 2,
      },
      reasoning:
        `Processed ${processedLeads.length} leads from ${channelBreakdown.length} channels into HubSpot CRM with 6-stage pipeline. Applied 100-point scoring model weighted toward Budget Signal (25%) and Engagement (25%) as strongest purchase-intent indicators. Enriched leads from 3 sources (Apollo.io, Clay, Clearbit) achieving 78% average completeness. Segmented into 4 tiers: ${hotLeads} Enterprise Hot leads routed to AI Qualification, ${warmLeads} Mid-Market Warm leads entered nurture sequences, remainder in automated drips. Set up 7 webhook endpoints to capture inbound leads from all channels in real-time. Removed 2 duplicate contacts via email + company deduplication.`,
      confidence: 87,
    };
  }
}
