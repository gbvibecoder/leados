import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
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

RESPONSIBILITY 1: CRM INTEGRATION & LEAD SOURCE CAPTURE
- Configure HubSpot/GoHighLevel pipeline stages and custom properties
- Set up webhook receivers for ALL inbound sources — every one of these must be captured:
  1. Form submissions (landing pages, website forms)
  2. Ad clicks (Google Lead Forms, Meta Lead Ads)
  3. Email replies (forwarded from outbound campaigns)
  4. LinkedIn responses (connection accepts, DM replies, InMail responses)
  5. Chat widget conversations (live chat, chatbot interactions)
- Map UTM parameters to lead source attribution
- DEDUPLICATION AT CAPTURE: Before creating any new contact, deduplicate by email AND phone number. If a match is found, merge the new touchpoint into the existing single profile — do NOT create duplicate records. This is the first line of defense before CRM Hygiene runs.

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
- Enrichment Priority Order (MUST follow this hierarchy):
  1. Apollo.io — PRIMARY enrichment source. Always query Apollo first for contact and company data.
  2. HubSpot's built-in Clearbit enrichment — SECONDARY source. Use only to fill gaps Apollo did not cover.
- Enrichment completeness score per lead

RESPONSIBILITY 4: SEGMENTATION (use these EXACT thresholds and response times)
- Hot (score 70+): Route to AI Qualification call within 5 minutes — speed to lead is critical
- Warm (score 40-69): Enter nurture sequence with soft booking push
- Nurture (score 20-39): Add to long-term drip campaign
- Not Qualified (score < 20): Archive — do not waste sales resources

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

Score leads objectively. Prioritize accuracy over volume — false positives waste sales time, false negatives lose revenue.

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated metrics. CRM setup, scoring model, enrichment config, and segmentation rules are strategic outputs and are expected. However, for leadsProcessed: ONLY include real leads from the database or real API data provided in the input. If no real leads exist, return an empty leadsProcessed array. For summary fields (totalLeadsProcessed, totalEnriched, avgLeadScore, hotLeads, warmLeads, coldLeads, duplicatesRemoved): only count real leads — set to 0 if no real data. For channelBreakdown: only include channels with real lead data — set counts to 0 if unmeasured. For enrichedData: only include data from real Apollo/Clearbit API responses. Never invent fictional leads, companies, enrichment results, or metrics.`;

export class InboundCaptureAgent extends BaseAgent {
  constructor() {
    super(
      'inbound-capture',
      'Inbound Lead Capture Agent',
      'Central hub receiving all leads — CRM integration, lead scoring (1-100), data enrichment via Apollo/Clay/Clearbit, and segmentation'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this._runConfig = inputs.config;
    this.status = 'running';
    await this.log('run_started', { inputs });

    try {
      // Extract upstream agent data
      const previousOutputs = inputs.previousOutputs || {};
      const offerData = previousOutputs['offer-engineering'] || {};
      const funnelData = previousOutputs['funnel-builder'] || {};
      const paidTrafficData = previousOutputs['paid-traffic'] || {};
      const outboundData = previousOutputs['outbound-outreach'] || {};
      const validationData = previousOutputs['validation'] || {};

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

      // Fetch real leads from database first — scoped to this user
      let dbLeads: any[] = [];
      try {
        const { prisma } = await import('@/lib/prisma');

        // Build ownership filter: leads owned by this user OR linked to user's pipelines
        let ownershipCondition: any = { userId: 'no-user' };
        if (inputs.userId) {
          const userPipelines = await prisma.pipeline.findMany({
            where: { userId: inputs.userId },
            select: { id: true },
          });
          const pipelineIds = userPipelines.map((p: any) => p.id);
          ownershipCondition = {
            OR: [
              { userId: inputs.userId },
              ...(pipelineIds.length > 0 ? [{ pipelineId: { in: pipelineIds } }] : []),
            ],
          };
        }

        // Filter by projectId when running within a project pipeline
        const projectId = inputs.config?.projectId;
        const projectCondition = projectId ? { projectId } : {};

        dbLeads = await prisma.lead.findMany({
          where: {
            AND: [
              ownershipCondition,
              projectCondition,
              { stage: 'new' }, // only process leads that haven't been handled yet
            ],
          },
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

      // Enrich leads via Apollo + Clearbit in parallel
      const apolloPromise = (async () => {
        if (!apolloApi.isApolloAvailable()) return;
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
      })();

      const clearbitPromise = (async () => {
        if (!clearbit.isClearbitAvailable()) return;
        try {
          const domains = new Set<string>();
          for (const contact of realHubSpotContacts) {
            const domain = contact.email?.split('@')[1];
            if (domain) domains.add(domain);
          }
          const domainList = Array.from(domains).slice(0, 10);
          // Enrich domains in parallel
          await Promise.all(domainList.map(async (domain) => {
            try {
              const company = await clearbit.enrichCompany(domain);
              realEnrichments.set(`domain:${domain}`, {
                companyRevenue: company.annualRevenue,
                employeeCount: company.employeeCount,
                techStack: company.techStack,
                fundingStatus: company.fundingTotal,
                industry: company.industry,
              });
            } catch { /* skip individual failures */ }
          }));
          await this.log('clearbit_enrichment_done', { domains: domains.size });
          enrichmentSources.push('clearbit');
        } catch (err: any) {
          await this.log('clearbit_error', { error: err.message });
        }
      })();

      await Promise.all([apolloPromise, clearbitPromise]);

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

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage, 1, 8192);
      let parsed: any = {};
      try {
        parsed = this.safeParseLLMJson<any>(response, ['crmSetup', 'scoringModel', 'segmentation']);
      } catch (parseErr: any) {
        await this.log('llm_json_parse_error', { error: parseErr.message });
        parsed = { reasoning: `LLM JSON parse failed: ${parseErr.message}`, confidence: 0 };
      }

      // ── BUILD CLEAN OUTPUT — DO NOT trust ANY metric from LLM ──────────
      const realLeadCount = dbLeads.length;

      // Only keep leadsProcessed if they match real DB leads; otherwise empty
      let leadsProcessed: any[] = [];
      if (realLeadCount > 0 && parsed.leadsProcessed?.length > 0) {
        // Keep only leads that have a matching DB record
        leadsProcessed = parsed.leadsProcessed.filter((lead: any) => {
          return dbLeads.some((d: any) =>
            d.email === lead.email || (d.name && d.name.toLowerCase() === (lead.name || '').toLowerCase())
          );
        });

        // Merge DB lead data back in — LLM often drops fields
        for (const lead of leadsProcessed) {
          const dbLead = dbLeads.find((d: any) =>
            d.email === lead.email || (d.name && d.name.toLowerCase() === (lead.name || '').toLowerCase())
          );
          if (dbLead) {
            if (!lead.phone && dbLead.phone) lead.phone = dbLead.phone;
            if (!lead.source && dbLead.source) lead.source = dbLead.source;
            if (!lead.channel && dbLead.channel) lead.channel = dbLead.channel;
          }
        }

        // Merge real enrichment data
        if (realEnrichments.size > 0) {
          for (const lead of leadsProcessed) {
            const enriched = realEnrichments.get(lead.email);
            const domain = lead.email?.split('@')[1];
            const companyData = domain ? realEnrichments.get(`domain:${domain}`) : null;
            if (enriched || companyData) {
              lead.enrichedData = { ...(enriched || {}), ...(companyData || {}) };
              lead.enrichmentStatus = 'complete';
            }
          }
        }
      }

      // Filter blacklisted companies
      let blacklistFiltered = 0;
      if (leadsProcessed.length > 0) {
        try {
          const { blocked } = await filterBlacklisted(leadsProcessed);
          if (blocked.length > 0) {
            await this.log('blacklist_filtered', {
              removed: blocked.length,
              companies: blocked.map((b: any) => b.company),
            });
            for (const lead of leadsProcessed) {
              const isBlocked = blocked.some((b: any) => b.email === lead.email || b.company === lead.company);
              if (isBlocked) {
                lead.blacklisted = true;
                lead.stage = 'lost';
                lead.segment = 'Blacklisted';
                lead.score = 0;
              }
            }
            blacklistFiltered = blocked.length;
          }
        } catch (err: any) {
          await this.log('blacklist_check_error', { error: err.message });
        }
      }

      // Compute summary from real processed leads
      let hot = 0, warm = 0, cold = 0, totalScore = 0;
      for (const lead of leadsProcessed) {
        const score = lead.score || 0;
        totalScore += score;
        if (score >= 70) hot++;
        else if (score >= 40) warm++;
        else cold++;
      }

      // Compute real segmentation counts from actual processed leads
      const segments = (parsed.segmentation?.segments || []).map((seg: any) => {
        // Match leads to segments based on score ranges in criteria
        let count = 0;
        if (seg.name?.toLowerCase().includes('hot') || seg.name?.toLowerCase().includes('enterprise')) {
          count = hot;
        } else if (seg.name?.toLowerCase().includes('warm') || seg.name?.toLowerCase().includes('mid')) {
          count = warm;
        } else if (seg.name?.toLowerCase().includes('cold') || seg.name?.toLowerCase().includes('unqualified')) {
          count = cold;
        }
        return { ...seg, count };
      });

      // Zero channelBreakdown counts
      const channelBreakdown = (parsed.channelBreakdown || []).map((ch: any) => ({
        ...ch,
        leadsCount: 0,
        avgScore: 0,
      }));

      const cleanOutput: any = {
        crmSetup: parsed.crmSetup || {},
        scoringModel: parsed.scoringModel || {},
        enrichment: {
          sources: parsed.enrichment?.sources || [],
          fieldsEnriched: parsed.enrichment?.fieldsEnriched || [],
          averageCompletenessScore: 0,
        },
        segmentation: { segments },
        leadsProcessed,
        channelBreakdown,
        summary: {
          totalLeadsCaptured: realLeadCount,
          totalLeadsProcessed: realLeadCount,
          totalEnriched: realEnrichments.size > 0 ? Math.min(realEnrichments.size, realLeadCount) : 0,
          avgLeadScore: leadsProcessed.length > 0 ? Math.round(totalScore / leadsProcessed.length) : 0,
          hotLeads: hot,
          warmLeads: warm,
          coldLeads: cold,
          duplicatesRemoved: 0,
        },
        blacklistFiltered,
        reasoning: parsed.reasoning || '',
        confidence: parsed.confidence || 0,
      };

      // Push scored leads to real HubSpot (skip blacklisted)
      if (hubspot.isHubSpotAvailable() && cleanOutput.leadsProcessed.length > 0) {
        const leadsToSync = cleanOutput.leadsProcessed.filter((l: any) => !l.blacklisted).slice(0, 20);
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
                lifecyclestage: lead.score >= 70 ? 'marketingqualifiedlead' : 'lead',
              },
            });
          } catch { /* skip individual CRM failures */ }
        }
        await this.log('hubspot_leads_synced', { count: leadsToSync.length });
      }

      this.status = 'done';
      await this.log('run_completed', { output: cleanOutput });
      return {
        success: true,
        data: cleanOutput,
        reasoning: cleanOutput.reasoning || 'Inbound lead capture system configured and leads processed.',
        confidence: cleanOutput.confidence || 85,
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
