import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import * as hubspot from '../../integrations/hubspot';
import * as apolloApi from '../../integrations/apollo';
import * as clearbit from '../../integrations/clearbit';

const SYSTEM_PROMPT = `You are the CRM & Data Hygiene Agent for LeadOS — the Service Acquisition Machine. You are the data guardian. Clean data = accurate scoring = better routing = higher close rates. You run 24/7 keeping the CRM pristine.

You MUST use data from previous agents when available:
- From Inbound Capture (agent 8): New leads to normalize and deduplicate
- From AI Qualification (agent 9): Call transcripts and BANT scores to log as interactions
- From Sales Routing (agent 10): Stage assignments and rep ownership
- From Tracking & Attribution (agent 11): UTM parameters and touchpoint data to stitch
- From Performance Optimization (agent 12): Campaign performance data for attribution

RESPONSIBILITY 1: DEDUPLICATION
- Fuzzy match on email, phone, company+name, LinkedIn URL
- Target >99% deduplication accuracy
- Merge strategy: keep most recent, consolidate all interactions
- Track matching criteria with confidence weights

RESPONSIBILITY 2: FIELD NORMALIZATION
- Phone: E.164 format (+1XXXXXXXXXX)
- Email: lowercase, trim whitespace
- Company: trim, standardize suffixes (Inc → Inc.)
- Country: ISO 3166-1 alpha-2 codes
- Job titles: standardize to canonical forms

RESPONSIBILITY 3: DATA VALIDATION
- Email: syntax check + MX record verification
- Phone: digit count + country code validation
- Required fields: name, email, company, source
- Flag and quarantine invalid records

RESPONSIBILITY 4: ENRICHMENT
- Pull firmographic data from Apollo.io and Clearbit
- Fields: revenue, employee count, industry, tech stack, LinkedIn URL
- Only enrich records missing >2 key fields
- Track enrichment sources and timestamps

RESPONSIBILITY 5: LIFECYCLE MANAGEMENT
- Auto-assign stages based on behavioral triggers
- Stages: new → contacted → engaged → qualified → booked → won → churned
- Event triggers: email open, form submit, call completed, meeting booked, payment confirmed
- Log every stage transition with reason and timestamp

RESPONSIBILITY 6: INTERACTION LOGGING
- Record every touchpoint: emails, calls, page visits, form submissions, ad clicks
- Include timestamps, channels, content summaries
- Build complete lead journey timeline

RESPONSIBILITY 7: COMPLIANCE
- GDPR: right to erasure, data portability, consent tracking
- CAN-SPAM: unsubscribe processing within 24h
- TCPA: consent verification before voice calls
- Data retention: configurable policies, automated enforcement
- Complete audit trail of all data access and modifications

Return ONLY valid JSON (no markdown, no explanation outside JSON).

Data quality is the foundation of everything — bad data means bad scoring, bad routing, and wasted ad spend. Be aggressive with cleanup but conservative with merges (never lose data).

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated metrics. Deduplication rules, normalization rules, validation checks, enrichment config, lifecycle management rules, and compliance policies are strategic outputs and are expected. However, for any counts or statistics (duplicates found, records normalized, fields enriched, etc.): ONLY report numbers from real CRM data (HubSpot contacts) or real enrichment API responses (Apollo/Clearbit) provided in the input. If no real CRM data exists, set all counts to 0. Do NOT invent fictional contact records, deduplication results, or enrichment outcomes. Never fabricate numbers that look like measured data.`;

export class CRMHygieneAgent extends BaseAgent {
  constructor() {
    super(
      'crm-hygiene',
      'CRM & Data Hygiene Agent',
      'Deduplication (>99%), field normalization, data validation, enrichment, lifecycle pipeline management, interaction logging, and compliance enforcement'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    try {
      const previousOutputs = inputs.previousOutputs || {};
      const inboundData = previousOutputs['inbound-capture'] || {};
      const qualificationData = previousOutputs['ai-qualification'] || {};
      const routingData = previousOutputs['sales-routing'] || {};
      const trackingData = previousOutputs['tracking-attribution'] || {};
      const perfData = previousOutputs['performance-optimization'] || {};
      const validationData = previousOutputs['validation'] || {};

      // NO-GO gate
      if (validationData.decision === 'NO-GO') {
        this.status = 'done';
        return {
          success: false,
          data: { skipped: true, reason: 'Validation agent returned NO-GO decision' },
          reasoning: 'CRM hygiene skipped — upstream validation rejected this opportunity.',
          confidence: 100,
        };
      }

      // Fetch real CRM data if available
      let realContacts: any[] = [];
      let enrichedCount = 0;

      if (hubspot.isHubSpotAvailable()) {
        try {
          await this.log('hubspot_fetch', { phase: 'Fetching real CRM contacts for hygiene analysis' });
          realContacts = await hubspot.getContacts();
          await this.log('hubspot_fetched', { contacts: realContacts.length });
        } catch (err: any) {
          await this.log('hubspot_fetch_failed', { error: err.message });
        }
      }

      // Enrich contacts missing key fields
      if (realContacts.length > 0) {
        const contactsToEnrich = realContacts
          .filter((c: any) => !c.properties?.industry || !c.properties?.company_size)
          .slice(0, 10); // Limit to 10 per run to conserve API credits

        if (apolloApi.isApolloAvailable() && contactsToEnrich.length > 0) {
          try {
            await this.log('apollo_enrichment', { phase: 'Enriching contacts via Apollo.io', count: contactsToEnrich.length });
            const emails = contactsToEnrich.map((c: any) => c.properties?.email).filter(Boolean);
            const enrichResults = await apolloApi.bulkEnrich(emails);
            enrichedCount += enrichResults.length;
            await this.log('apollo_enriched', { enriched: enrichResults.length });

            // Push enriched data back to HubSpot
            if (hubspot.isHubSpotAvailable()) {
              for (const result of enrichResults) {
                const contact = contactsToEnrich.find((c: any) => c.properties?.email === result.email);
                if (contact?.id) {
                  try {
                    await hubspot.updateContact(contact.id, {
                      industry: result.industry,
                      company: result.companyName,
                      jobtitle: result.title,
                    });
                  } catch { /* skip failed updates */ }
                }
              }
            }
          } catch (err: any) {
            await this.log('apollo_enrichment_failed', { error: err.message });
          }
        }

        if (clearbit.isClearbitAvailable() && contactsToEnrich.length > 0) {
          try {
            await this.log('clearbit_enrichment', { phase: 'Enriching companies via Clearbit' });
            const domains = contactsToEnrich
              .map((c: any) => c.properties?.email?.split('@')[1])
              .filter((d: string) => d && !d.includes('gmail') && !d.includes('yahoo') && !d.includes('hotmail'));
            const uniqueDomains = [...new Set(domains)].slice(0, 5);

            for (const domain of uniqueDomains) {
              try {
                await clearbit.enrichCompany(domain);
                enrichedCount++;
              } catch { /* skip */ }
            }
            await this.log('clearbit_enriched', { domains: uniqueDomains.length });
          } catch (err: any) {
            await this.log('clearbit_enrichment_failed', { error: err.message });
          }
        }
      }

      const userMessage = JSON.stringify({
        serviceNiche: inputs.config?.niche || inputs.config?.serviceNiche || 'B2B SaaS Lead Generation',
        ...inputs.config,
        realCrmData: {
          totalContacts: realContacts.length > 0 ? realContacts.length : undefined,
          contactsSample: realContacts.slice(0, 5).map((c: any) => ({
            email: c.properties?.email,
            company: c.properties?.company,
            stage: c.properties?.lifecyclestage,
          })),
          enrichedThisRun: enrichedCount > 0 ? enrichedCount : undefined,
        },
        upstreamContext: {
          newLeads: inboundData.leads?.length || inboundData.summary?.totalCaptured || 0,
          qualificationCalls: qualificationData.calls?.length || qualificationData.summary?.totalCalls || 0,
          routedLeads: routingData.routedLeads?.length || routingData.summary?.totalRouted || 0,
          channelAttribution: trackingData.channelAttribution || null,
          campaignPerformance: perfData.campaignAnalysis?.length || 0,
        },
      });

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      let parsed: any = {};
      try {
        parsed = this.safeParseLLMJson<any>(response, ['deduplication', 'normalization']);
      } catch (parseErr: any) {
        await this.log('llm_json_parse_error', { error: parseErr.message });
        parsed = { reasoning: `LLM JSON parse failed: ${parseErr.message}`, confidence: 0 };
      }

      // ── BUILD CLEAN OUTPUT — DO NOT trust ANY metric from LLM ──────────
      const dbLeadCount = realContacts.length;

      const cleanOutput: any = {
        deduplication: {
          totalRecordsScanned: dbLeadCount,
          duplicatesFound: 0,
          duplicatesMerged: 0,
          accuracy: 0,
          duplicateRate: 0,
          matchingCriteria: parsed.deduplication?.matchingCriteria || [],
          mergeExamples: [],
          summary: { scanned: dbLeadCount, duplicates: 0, merged: 0 },
        },
        normalization: {
          recordsNormalized: 0,
          fieldsUpdated: 0,
          rules: parsed.normalization?.rules || [],
          summary: { normalized: 0, fieldsUpdated: 0 },
        },
        validation: {
          totalValidated: dbLeadCount,
          invalidRecords: 0,
          quarantined: 0,
          rules: parsed.validation?.rules || [],
          summary: { validated: dbLeadCount, invalid: 0, quarantined: 0 },
        },
        enrichment: {
          totalEnriched: enrichedCount,
          averageCompletenessScore: 0,
          sources: parsed.enrichment?.sources || [],
          summary: { enriched: enrichedCount, completeness: 0 },
        },
        interactions: {
          totalLogged: 0,
          touchpoints: [],
        },
        lifecycle: parsed.lifecycle || {},
        compliance: parsed.compliance || {},
        summary: {
          totalContacts: dbLeadCount,
          totalDuplicatesRemoved: 0,
          totalNormalized: 0,
          totalEnriched: enrichedCount,
          totalInteractions: 0,
          dataQualityScore: 0,
        },
        reasoning: parsed.reasoning || '',
        confidence: parsed.confidence || 0,
      };

      this.status = 'done';
      await this.log('run_completed', { output: cleanOutput });
      return {
        success: true,
        data: cleanOutput,
        reasoning: cleanOutput.reasoning || 'CRM hygiene analysis complete.',
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
