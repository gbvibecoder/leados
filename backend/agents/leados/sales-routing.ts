import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import * as hubspot from '../../integrations/hubspot';

/** Fetch Calendly scheduling link for sales rep booking */
async function getCalendlyBookingUrl(): Promise<string | null> {
  const apiKey = process.env.CALENDLY_API_KEY;
  if (!apiKey) return null;
  try {
    const userRes = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!userRes.ok) return null;
    const userData = await userRes.json();
    const userUri = userData.resource?.uri;
    if (!userUri) return null;

    const eventsRes = await fetch(
      `https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&active=true&count=5`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    );
    if (!eventsRes.ok) return null;
    const eventsData = await eventsRes.json();
    const eventType = eventsData.collection?.[0];
    return eventType?.scheduling_url || null;
  } catch {
    return null;
  }
}

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
Based on BANT qualification score from Agent 9 AND explicit budget confirmation from the AI qualification call transcript/data.
You MUST check BOTH the BANT score AND whether the prospect explicitly confirmed budget availability during the qualification call. A high BANT score alone is NOT sufficient for checkout routing — budget must be explicitly confirmed (e.g., prospect stated a dollar amount, confirmed they have budget allocated, or agreed to pricing).

🔥 HOT → Checkout (score >= 85 AND budget explicitly confirmed)
  - High intent + confirmed budget → send to checkout/payment page
  - Send directly to Stripe payment page with pre-filled info
  - SLA: < 60 seconds from qualification
  - Auto-send checkout link via SMS + email
  - If score >= 85 but budget NOT confirmed, route to sales_call instead

🌡 WARM → Sales Call (score 70-84, OR score >= 85 without confirmed budget, OR complex/enterprise needs)
  - Complex needs → book into Sales Rep's calendar via Calendly
  - Round-robin assignment based on rep specialization + capacity
  - SLA: < 5 minutes — instant booking confirmation

💧 MEDIUM → Nurture (score 50-69, medium interest, no urgency)
  - Medium interest, no urgency → enter nurture email sequence
  - Enter automated email drip sequence
  - 7-day cadence with value-first content
  - Re-qualification after 3 interactions
  - SLA: < 1 hour

❄ COLD → Disqualify (score < 50, low interest or bad fit)
  - Low interest or bad fit → disqualify, remove from pipeline
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
- Update CRM stage and log routing decision
- Map routes to HubSpot lifecycle stages:
  - checkout → "opportunity"
  - sales_call → "salesqualifiedlead"
  - nurture → "marketingqualifiedlead"
  - disqualify → "other"
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
        "name": "string (full name of sales rep)",
        "email": "string (rep email for notifications and CRM assignment)",
        "specialization": "string (Enterprise|Mid-Market|SMB|General)",
        "maxCapacity": "number (maximum active deals this rep can handle)",
        "currentLoad": "number (current number of active deals assigned)",
        "calendlyUrl": "string (rep-specific Calendly booking link)"
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

      // Fetch user's leads from DB to validate upstream data — prevent cross-user leakage
      let userLeadEmails = new Set<string>();
      let userLeadNames = new Set<string>();
      try {
        const { prisma } = await import('@/lib/prisma');
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

        const userDbLeads = await prisma.lead.findMany({
          where: { AND: [ownershipCondition, projectCondition] },
          select: { email: true, name: true },
        });
        for (const l of userDbLeads) {
          if (l.email) userLeadEmails.add(l.email);
          if (l.name) userLeadNames.add(l.name.toLowerCase());
        }
        await this.log('user_leads_verified', { count: userDbLeads.length });
      } catch (err: any) {
        await this.log('user_leads_verify_error', { error: err.message });
      }

      // Helper: check if a lead belongs to the current user
      const isUserLead = (lead: any): boolean => {
        if (userLeadEmails.size === 0 && userLeadNames.size === 0) return false;
        const email = lead.leadEmail || lead.email;
        const name = lead.leadName || lead.name;
        if (email && userLeadEmails.has(email)) return true;
        if (name && userLeadNames.has(name.toLowerCase())) return true;
        return false;
      };

      // Filter upstream data to only include this user's leads
      const scopedCallResults = (qualificationData.callResults || []).filter(isUserLead);
      const scopedInboundLeads = (inboundData.leadsProcessed || []).filter(isUserLead);

      const userMessage = JSON.stringify({
        serviceNiche: inputs.config?.niche || inputs.config?.serviceNiche || 'B2B SaaS Lead Generation',
        ...inputs.config,
        upstreamContext: {
          callResults: scopedCallResults.length > 0 ? scopedCallResults : null,
          qualificationThresholds: qualificationData.qualificationThresholds || null,
          qualificationSummary: qualificationData.summary || null,
          leadsProcessed: scopedInboundLeads.length > 0 ? scopedInboundLeads : null,
          pricingTiers: offerData.pricingTiers || offerData.pricing || null,
          guarantee: offerData.guarantee || null,
        },
      });

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage, 1, 8192);
      let parsed: any = {};
      try {
        parsed = this.safeParseLLMJson<any>(response, ['routingEngine', 'routedLeads', 'summary']);
      } catch (parseErr: any) {
        await this.log('llm_json_parse_error', { error: parseErr.message });
        parsed = { reasoning: `LLM JSON parse failed: ${parseErr.message}`, confidence: 0 };
      }

      // ── BUILD CLEAN OUTPUT — route from REAL upstream data, not LLM ──────
      // The LLM provides routing engine config (rules, round-robin) only.
      // Actual lead routing is determined by real qualification outcomes + inbound scores.

      // Build routedLeads from REAL upstream data — never trust LLM routing decisions
      const routedLeads: any[] = [];

      // Route leads from AI Qualification results (user-scoped, real call outcomes)
      for (const result of scopedCallResults) {
        if (!result.leadName && !result.leadEmail) continue;
        const outcome = result.outcome || 'pending_call';
        // Check for explicit budget confirmation from qualification call data
        const budgetConfirmed = result.budgetConfirmed === true
          || result.bantBreakdown?.budget >= 80
          || (result.transcript && /budget.*(confirm|approv|allocat|ready|set aside)/i.test(result.transcript));
        // Map qualification outcome to routing decision
        // SOP: checkout requires BOTH high intent AND confirmed budget
        let route: string;
        let reason: string;
        if (outcome === 'high_intent_checkout' && budgetConfirmed) {
          route = 'checkout';
          reason = 'High BANT score + budget explicitly confirmed — route to checkout/payment';
        } else if (outcome === 'high_intent_checkout' && !budgetConfirmed) {
          route = 'sales_call';
          reason = 'High BANT score but budget NOT explicitly confirmed — route to sales call for budget discussion';
        } else if (outcome === 'high_intent_sales') {
          route = 'sales_call';
          reason = 'High intent, complex needs — book sales call';
        } else if (outcome === 'medium_intent') {
          route = 'nurture';
          reason = 'Medium interest — add to nurture sequence';
        } else if (outcome === 'low_intent' || outcome === 'disqualified') {
          route = 'disqualify';
          reason = 'Low BANT score or disqualified during call';
        } else {
          route = 'nurture';
          reason = `Call not completed (${result.callStatus || 'unknown'}) — default to nurture`;
        }
        routedLeads.push({
          leadName: result.leadName || result.name || '',
          leadEmail: result.leadEmail || result.email || '',
          company: result.company || '',
          qualificationScore: result.score || 0,
          bantBreakdown: result.bantBreakdown || { budget: 0, authority: 0, need: 0, timeline: 0 },
          route,
          reason,
          destination: '',
          assignedRep: null,
          routedAt: new Date().toISOString(),
          latency: '0ms',
          slaStatus: 'pending' as const,
          actions: [],
        });
      }

      // Route user's inbound leads that weren't in qualification (e.g. no phone → never called)
      const alreadyRouted = new Set(routedLeads.map((r: any) => r.leadEmail));
      for (const lead of scopedInboundLeads) {
        if (!lead.email || alreadyRouted.has(lead.email)) continue;
        const score = lead.score || 0;
        let route: string;
        let reason: string;
        if (score >= 70) {
          route = 'nurture';
          reason = 'High inbound score but no qualification call completed — nurture until called';
        } else if (score >= 40) {
          route = 'nurture';
          reason = 'Warm lead — add to nurture sequence';
        } else {
          route = 'disqualify';
          reason = `Low inbound score (${score}) — does not meet qualification threshold`;
        }
        routedLeads.push({
          leadName: lead.name || '',
          leadEmail: lead.email || '',
          company: lead.company || '',
          qualificationScore: score,
          bantBreakdown: { budget: 0, authority: 0, need: 0, timeline: 0 },
          route,
          reason,
          destination: '',
          assignedRep: null,
          routedAt: new Date().toISOString(),
          latency: '0ms',
          slaStatus: 'pending' as const,
          actions: [],
        });
      }

      await this.log('routing_built_from_upstream', {
        fromQualification: scopedCallResults.length,
        fromInbound: routedLeads.length - scopedCallResults.length,
        total: routedLeads.length,
      });

      const cleanOutput: any = {
        routingEngine: parsed.routingEngine || { rules: [], roundRobinConfig: { enabled: false, reps: [] } },
        routedLeads,
        notifications: parsed.notifications || [],
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

      // Fetch Calendly booking URL for sales_call leads
      let calendlyUrl: string | null = null;
      const hasSalesCallLeads = cleanOutput.routedLeads.some((l: any) => l.route === 'sales_call');
      if (hasSalesCallLeads) {
        calendlyUrl = await getCalendlyBookingUrl();
        if (calendlyUrl) {
          await this.log('calendly_url_fetched', { url: calendlyUrl });
          // Attach booking URL to all sales_call routed leads
          for (const lead of cleanOutput.routedLeads) {
            if (lead.route === 'sales_call') {
              lead.bookingUrl = calendlyUrl;
              lead.destination = calendlyUrl;
            }
          }
          cleanOutput.calendlyBookingUrl = calendlyUrl;
        }
      }

      // Update CRM with routing data if HubSpot is available (in parallel)
      if (hubspot.isHubSpotAvailable() && cleanOutput.routedLeads.length > 0) {
        await Promise.all(cleanOutput.routedLeads.slice(0, 20).map(async (lead: any) => {
          try {
            const stage = lead.route === 'checkout' ? 'opportunity'
              : lead.route === 'sales_call' ? 'salesqualifiedlead'
              : lead.route === 'nurture' ? 'marketingqualifiedlead'
              : 'other';
            await hubspot.upsertContact({
              email: lead.leadEmail,
              properties: {
                lifecyclestage: stage,
                qualification_outcome: lead.route,
                lead_score: String(lead.qualificationScore || 0),
                ...(lead.bookingUrl ? { booking_url: lead.bookingUrl } : {}),
              },
            });
          } catch { /* skip individual CRM failures */ }
        }));
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
