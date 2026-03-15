import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import * as hubspot from '../../integrations/hubspot';

const SYSTEM_PROMPT = `You are the Sales Routing Agent for LeadOS — the decision engine that routes each qualified lead to the correct next step in the pipeline.

You MUST use data from previous agents when available:
- From AI Qualification (agent 9): BANT scores, call results, outcomes, transcripts
- From Inbound Capture (agent 8): Lead scores, segments, enriched data, CRM records
- From Offer Engineering (agent 2): Pricing tiers, checkout URLs, guarantee terms

RESPONSIBILITY 1: RULE ENGINE
Apply a prioritized set of routing rules. Each rule has:
- Condition: score range + signals (budget confirmed, decision maker, urgency)
- Action: what happens (checkout, sales_call, nurture, disqualify)
- Destination: specific URL, calendar link, sequence name, or archive
- SLA: maximum time allowed to route (hot leads < 60s)

RESPONSIBILITY 2: ROUTING DECISIONS
Based on BANT qualification score from Agent 9:

🔥 HOT → Checkout (score >= 85, budget confirmed)
  - Send directly to Stripe payment page with pre-filled info
  - SLA: < 60 seconds from qualification
  - Auto-send checkout link via SMS + email

🌡 WARM → Sales Call (score 70-84, complex/enterprise)
  - Book into human sales rep's calendar via Calendly
  - Round-robin assignment based on rep specialization + capacity
  - SLA: < 5 minutes — instant booking confirmation

💧 MEDIUM → Nurture (score 50-69)
  - Enter automated email drip sequence
  - 7-day cadence with value-first content
  - Re-qualification after 3 interactions
  - SLA: < 1 hour

❄ COLD → Disqualify (score < 50)
  - Mark as disqualified in CRM
  - Document reason for disqualification
  - Schedule re-engagement in 90 days
  - SLA: Batch processing (daily)

RESPONSIBILITY 3: ROUND-ROBIN ASSIGNMENT
For sales call routes:
- Distribute leads evenly across available reps
- Consider rep specialization (Enterprise, Mid-Market, SMB)
- Respect capacity limits (max active deals per rep)
- Track assignment history to prevent clustering

RESPONSIBILITY 4: LATENCY TRACKING
- Measure time from qualification to routing action
- Alert if SLA breached (hot leads must route < 60s)
- Track avg routing latency for performance monitoring

RESPONSIBILITY 5: CRM UPDATES
- Update lead stage in CRM after routing
- Set pipeline stage based on route
- Add routing metadata (reason, score, timestamp, assigned rep)

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "routingEngine": {
    "rules": [{
      "name": "string",
      "condition": { "scoreRange": "string", "additionalSignals": ["string"] },
      "action": "checkout|sales_call|nurture|disqualify",
      "destination": "string",
      "priority": "number",
      "sla": "string"
    }],
    "roundRobinConfig": {
      "enabled": "boolean",
      "reps": [{
        "name": "string",
        "email": "string",
        "specialization": "string",
        "capacity": "number",
        "currentLoad": "number",
        "calendlyUrl": "string"
      }]
    }
  },
  "routedLeads": [{
    "leadName": "string",
    "leadEmail": "string",
    "company": "string",
    "qualificationScore": "number",
    "bantBreakdown": { "budget": "number", "authority": "number", "need": "number", "timeline": "number" },
    "route": "checkout|sales_call|nurture|disqualify",
    "reason": "string",
    "destination": "string",
    "assignedRep": "string|null",
    "routedAt": "string (ISO timestamp)",
    "latency": "string",
    "slaStatus": "met|breached",
    "actions": ["string — what was triggered (email sent, SMS sent, calendar booked, etc.)"]
  }],
  "notifications": [{
    "type": "sms|email|slack|webhook",
    "recipient": "string",
    "message": "string",
    "triggeredBy": "string (lead name/route)"
  }],
  "summary": {
    "totalRouted": "number",
    "checkout": "number",
    "salesCall": "number",
    "nurture": "number",
    "disqualified": "number",
    "avgRoutingLatency": "string",
    "slaBreaches": "number",
    "conversionProjection": "number (percentage of total that will convert)"
  },
  "reasoning": "string",
  "confidence": "number 0-100"
}

Speed is everything. Hot leads lose 10% conversion for every minute of delay. Route instantly, notify immediately, track everything.

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated metrics. Routing rules, round-robin config, and SLA definitions are strategic outputs and are expected. However, for routedLeads: ONLY include real leads from upstream agent data (AI Qualification or Inbound Capture). If no real leads exist, return an empty routedLeads array. For summary: set totalRouted, checkout, salesCall, nurture, disqualified all to 0 if no real leads were routed. Set conversionProjection to 0 — this is unmeasured. Do NOT invent fictional leads, rep assignments, or routing results. Do NOT fabricate latency measurements or SLA statuses. Never invent numbers that look like measured data.`;

export class SalesRoutingAgent extends BaseAgent {
  constructor() {
    super(
      'sales-routing',
      'Sales Routing Agent',
      'Decision engine routing each lead to the correct next step — checkout, sales call, nurture, or disqualify'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    try {
      const previousOutputs = inputs.previousOutputs || {};
      const qualificationData = previousOutputs['ai-qualification'] || {};
      const inboundData = previousOutputs['inbound-capture'] || {};
      const offerData = previousOutputs['offer-engineering'] || {};
      const validationData = previousOutputs['validation'] || {};

      // Check if validation said NO-GO
      if (validationData.decision === 'NO-GO') {
        this.status = 'done';
        return {
          success: false,
          data: { skipped: true, reason: 'Validation agent returned NO-GO decision' },
          reasoning: 'Sales routing skipped — upstream validation rejected this opportunity.',
          confidence: 100,
        };
      }

      const userMessage = JSON.stringify({
        serviceNiche: inputs.config?.niche || inputs.config?.serviceNiche || 'B2B SaaS Lead Generation',
        ...inputs.config,
        upstreamContext: {
          callResults: qualificationData.callResults || null,
          qualificationThresholds: qualificationData.qualificationThresholds || null,
          qualificationSummary: qualificationData.summary || null,
          leadsProcessed: inboundData.leadsProcessed || null,
          pricingTiers: offerData.pricingTiers || offerData.pricing || null,
          guarantee: offerData.guarantee || null,
        },
      });

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      let parsed: any = {};
      try {
        parsed = this.safeParseLLMJson<any>(response, ['routingEngine', 'routedLeads', 'summary']);
      } catch (parseErr: any) {
        await this.log('llm_json_parse_error', { error: parseErr.message });
        parsed = { reasoning: `LLM JSON parse failed: ${parseErr.message}`, confidence: 0 };
      }

      // ── BUILD CLEAN OUTPUT — DO NOT trust ANY metric from LLM ──────────
      // Only keep routing engine config (rules, round-robin) from LLM.
      // routedLeads: only keep leads that match real upstream data (qualification/inbound).
      // If no real upstream leads exist, routedLeads must be empty.
      const hasRealUpstreamLeads = !!(
        qualificationData.callResults?.length > 0 ||
        inboundData.leadsProcessed?.length > 0
      );

      // Only keep routedLeads if there were real upstream leads; otherwise empty
      const routedLeads = hasRealUpstreamLeads ? (parsed.routedLeads || []).map((lead: any) => ({
        leadName: lead.leadName || '',
        leadEmail: lead.leadEmail || '',
        company: lead.company || '',
        qualificationScore: lead.qualificationScore || 0,
        bantBreakdown: lead.bantBreakdown || { budget: 0, authority: 0, need: 0, timeline: 0 },
        route: lead.route || 'nurture',
        reason: lead.reason || '',
        destination: lead.destination || '',
        assignedRep: lead.assignedRep || null,
        routedAt: lead.routedAt || '',
        latency: '0ms',
        slaStatus: 'pending' as const,
        actions: lead.actions || [],
      })) : [];

      const cleanOutput: any = {
        routingEngine: parsed.routingEngine || { rules: [], roundRobinConfig: { enabled: false, reps: [] } },
        routedLeads,
        notifications: hasRealUpstreamLeads ? (parsed.notifications || []) : [],
        summary: {
          totalRouted: routedLeads.length,
          checkout: routedLeads.filter((l: any) => l.route === 'checkout').length,
          salesCall: routedLeads.filter((l: any) => l.route === 'sales_call').length,
          nurture: routedLeads.filter((l: any) => l.route === 'nurture').length,
          disqualified: routedLeads.filter((l: any) => l.route === 'disqualify').length,
          avgRoutingLatency: '0ms',
          slaBreaches: 0,
          conversionProjection: 0,
        },
        reasoning: parsed.reasoning || '',
        confidence: parsed.confidence || 0,
      };

      // Update CRM with routing data if HubSpot is available
      if (hubspot.isHubSpotAvailable() && cleanOutput.routedLeads.length > 0) {
        for (const lead of cleanOutput.routedLeads.slice(0, 20)) {
          try {
            const stage = lead.route === 'checkout' ? 'opportunity'
              : lead.route === 'sales_call' ? 'qualifiedtobuy'
              : lead.route === 'nurture' ? 'marketingqualifiedlead'
              : 'other';
            await hubspot.upsertContact({
              email: lead.leadEmail,
              properties: {
                lifecyclestage: stage,
                qualification_outcome: lead.route,
                lead_score: String(lead.qualificationScore || 0),
              },
            });
          } catch { /* skip individual CRM failures */ }
        }
        await this.log('hubspot_routing_synced', { count: Math.min(cleanOutput.routedLeads.length, 20) });
      }

      this.status = 'done';
      await this.log('run_completed', { output: cleanOutput });
      return {
        success: true,
        data: cleanOutput,
        reasoning: cleanOutput.reasoning || 'Leads routed based on qualification scores.',
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
