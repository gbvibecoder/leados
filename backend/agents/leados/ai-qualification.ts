import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import * as blandAI from '../../integrations/bland-ai';

const SYSTEM_PROMPT = `You are the AI Qualification Agent for LeadOS — the Service Acquisition Machine. You conduct AI-powered voice calls to qualify leads using the BANT framework (Budget, Authority, Need, Timeline) and decide the next step for each lead.

You MUST use data from previous agents when available:
- From Offer Engineering (agent 2): ICP definition, pricing tiers, guarantee
- From Inbound Capture (agent 8): Scored leads, segments, enriched data, CRM records

RESPONSIBILITY 1: VOICE PROVIDER SETUP
- Configure Bland AI (primary) or Vapi/ElevenLabs (fallback) for natural AI voice calls
- Set voice parameters: warm, professional, conversational tone
- Configure call recording and transcription
- Set max call duration (5 minutes) and silence detection

RESPONSIBILITY 2: CALL SCRIPT GENERATION
- Dynamic greeting that references the lead's company and how they came in
- BANT qualification questions (Budget → Authority → Need → Timeline)
- Natural transitions between questions — never robotic
- Objection handling library for 6+ common objections
- Soft closing based on qualification level
- Compliance: consent verification at start of call, TCPA/GDPR compliant

RESPONSIBILITY 3: BANT SCORING (0-100)
- Budget (0-30 pts): Monthly spend capacity vs pricing tiers
- Authority (0-25 pts): Decision-making power, title, buying authority
- Need (0-25 pts): Pain point clarity, urgency of problem, current solution gaps
- Timeline (0-20 pts): Implementation urgency, upcoming deadlines

RESPONSIBILITY 4: ROUTING DECISIONS
Based on BANT score, route leads to one of:
- high_intent_checkout (score >= 85): Send checkout link — ready to buy now
- high_intent_sales (score 70-84): Book human sales call — complex or enterprise
- medium_intent (score 50-69): Enter nurture sequence — needs education
- low_intent (score < 50): Disqualify — add to long-term drip

RESPONSIBILITY 5: CALL EXECUTION & ANALYSIS
- Execute calls for all qualified leads from Agent 8 (score >= 60)
- Record and transcribe every call
- Extract key buying signals, objections raised, sentiment
- Update CRM record with qualification data

Return ONLY valid JSON (no markdown, no explanation outside JSON) with this structure:
{
  "voiceConfig": {
    "provider": "string (bland_ai|vapi|elevenlabs)",
    "voiceName": "string",
    "voiceSettings": { "tone": "string", "speed": "string", "style": "string" },
    "maxCallDuration": "number (seconds)",
    "recordingEnabled": "boolean",
    "transcriptionEnabled": "boolean",
    "consentScript": "string"
  },
  "callScript": {
    "greeting": "string",
    "qualificationQuestions": {
      "budget": { "question": "string", "followUp": "string", "goodAnswers": ["string"], "scoring": { "tier": "points" } },
      "authority": { "question": "string", "followUp": "string", "goodAnswers": ["string"], "scoring": {} },
      "need": { "question": "string", "followUp": "string", "goodAnswers": ["string"], "scoring": {} },
      "timeline": { "question": "string", "followUp": "string", "goodAnswers": ["string"], "scoring": {} }
    },
    "objectionHandling": { "objection": "response" },
    "closingScripts": {
      "high_intent_checkout": "string",
      "high_intent_sales": "string",
      "medium_intent": "string",
      "low_intent": "string"
    }
  },
  "qualificationThresholds": {
    "high_intent_checkout": { "minScore": "number", "action": "string", "description": "string" },
    "high_intent_sales": { "minScore": "number", "action": "string", "description": "string" },
    "medium_intent": { "minScore": "number", "action": "string", "description": "string" },
    "low_intent": { "minScore": "number", "action": "string", "description": "string" }
  },
  "callResults": [{
    "leadName": "string",
    "leadEmail": "string",
    "company": "string",
    "phone": "string",
    "callId": "string",
    "callStatus": "completed|no_answer|voicemail|declined",
    "duration": "number (seconds)",
    "score": "number (0-100)",
    "bantBreakdown": { "budget": "number", "authority": "number", "need": "number", "timeline": "number" },
    "outcome": "high_intent_checkout|high_intent_sales|medium_intent|low_intent",
    "routingAction": "string",
    "transcript": "string",
    "keySignals": ["string"],
    "objectionsRaised": ["string"],
    "sentiment": "positive|neutral|hesitant|negative",
    "consentObtained": "boolean"
  }],
  "summary": {
    "totalCallsAttempted": "number",
    "totalCallsCompleted": "number",
    "totalNoAnswer": "number",
    "avgCallDuration": "number (seconds)",
    "avgScore": "number",
    "highIntentCheckout": "number",
    "highIntentSales": "number",
    "mediumIntent": "number",
    "lowIntent": "number",
    "qualificationRate": "number (percentage)",
    "topObjection": "string"
  },
  "reasoning": "string",
  "confidence": "number 0-100"
}

Keep conversations under 5 minutes. Be warm, consultative, and never pushy. The goal is to qualify — not to sell on the call. Always obtain consent before proceeding.

CRITICAL DATA INTEGRITY RULE: Do NOT generate projected, estimated, or fabricated metrics. Voice config, call scripts, BANT questions, and qualification thresholds are strategic outputs and are expected. However, for callResults: ONLY include results from real Bland AI calls or real leads provided in the input. If no real calls were made, set callStatus to "not_called", score to 0, duration to 0, and transcript to empty string. For summary: only count real calls — set totalCallsAttempted, totalCallsCompleted, avgCallDuration, avgScore, qualificationRate all to 0 if no real calls were made. Never fabricate call transcripts, BANT scores, or call outcomes. Never invent fictional lead names or companies.`;

export class AIQualificationAgent extends BaseAgent {
  constructor() {
    super(
      'ai-qualification',
      'AI Qualification Agent',
      'Conducts AI voice calls to qualify leads using BANT framework, scores responses, handles objections, and routes based on qualification level'
    );
  }

  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    await this.log('run_started', { inputs });

    try {
      const previousOutputs = inputs.previousOutputs || {};
      const offerData = previousOutputs['offer-engineering'] || {};
      const inboundData = previousOutputs['inbound-capture'] || {};
      const validationData = previousOutputs['validation'] || {};

      if (validationData.decision === 'NO-GO') {
        this.status = 'done';
        return {
          success: false,
          data: { skipped: true, reason: 'Validation agent returned NO-GO decision' },
          reasoning: 'AI qualification skipped — upstream validation rejected this opportunity.',
          confidence: 100,
        };
      }

      // ALWAYS fetch leads from database with proper userId scoping
      // Never trust upstream leadsProcessed — it may contain other users' leads
      let qualifiedLeads: any[] = [];

      {
        try {
          const { prisma } = await import('@/lib/prisma');

          // Build ownership filter: only fetch leads belonging to this user
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

          const dbLeads = await prisma.lead.findMany({
            where: {
              AND: [
                ownershipCondition,
                projectCondition,
                { stage: 'new' }, // only call leads that haven't been processed yet
                { qualificationOutcome: null }, // not yet qualified
                { score: { gte: 30 } }, // minimum score threshold for qualification
              ],
            },
            orderBy: { score: 'desc' },
            take: 20,
          });
          if (dbLeads.length > 0) {
            qualifiedLeads = dbLeads.map((l: any) => ({
              name: l.name,
              email: l.email,
              company: l.company,
              phone: l.phone,
              source: l.source,
              channel: l.channel || 'inbound',
              score: l.score || 0,
              segment: l.segment || 'unknown',
              stage: l.stage || 'new',
            }));
            await this.log('db_leads_fetched_for_qualification', { count: dbLeads.length });
          }
        } catch (err: any) {
          await this.log('db_leads_error', { error: err.message });
        }
      }

      // Enrich leads missing phone numbers by looking up from DB (scoped to user)
      if (qualifiedLeads.length > 0) {
        try {
          const { prisma } = await import('@/lib/prisma');
          const userFilter = inputs.userId ? { userId: inputs.userId } : { userId: 'no-user' };
          for (const lead of qualifiedLeads) {
            if (!lead.phone && lead.email) {
              const dbLead = await prisma.lead.findFirst({ where: { email: lead.email, ...userFilter }, select: { phone: true } });
              if (dbLead?.phone) lead.phone = dbLead.phone;
            }
            if (!lead.phone && lead.name) {
              const dbLead = await prisma.lead.findFirst({ where: { name: lead.name, ...userFilter }, select: { phone: true } });
              if (dbLead?.phone) lead.phone = dbLead.phone;
            }
          }
        } catch { /* continue without DB lookup */ }
      }

      // Validate phone numbers and normalize to international format for Bland AI
      const normalizePhone = (phone: string | null | undefined): string | null => {
        if (!phone) return null;
        const cleaned = phone.replace(/[\s\-().]/g, '');
        // Already international format
        if (/^\+\d{10,15}$/.test(cleaned)) return cleaned;
        // US/CA 10-digit without country code — add +1
        if (/^\d{10}$/.test(cleaned)) return `+1${cleaned}`;
        // US/CA with leading 1 (11 digits)
        if (/^1\d{10}$/.test(cleaned)) return `+${cleaned}`;
        // Indian 10-digit without country code — add +91
        if (/^[6-9]\d{9}$/.test(cleaned)) return `+91${cleaned}`;
        // Any number with 10+ digits — assume it needs a +
        if (/^\d{10,15}$/.test(cleaned)) return `+${cleaned}`;
        return null;
      };
      const isValidPhone = (phone: string | null | undefined): boolean => normalizePhone(phone) !== null;

      // Split leads: callable (valid phone) vs email-only (no/invalid phone)
      // Normalize phone numbers for calling
      for (const lead of qualifiedLeads) {
        const normalized = normalizePhone(lead.phone);
        if (normalized) lead.phone = normalized;
      }
      const callableLeads = qualifiedLeads.filter((l: any) => isValidPhone(l.phone));
      const emailOnlyLeads = qualifiedLeads.filter((l: any) => !isValidPhone(l.phone));

      if (emailOnlyLeads.length > 0) {
        await this.log('leads_without_valid_phone', {
          count: emailOnlyLeads.length,
          leads: emailOnlyLeads.map((l: any) => ({ name: l.name, phone: l.phone, reason: 'invalid_phone_format' })),
          action: 'Route to email nurture instead of voice call',
        });
      }

      // Execute real AI voice calls via Bland AI when API key is configured
      let realCallResults: any[] = [];
      const blandAvailable = blandAI.isBlandAIAvailable();

      if (blandAvailable && callableLeads.length > 0) {
        const niche = inputs.config?.niche || 'B2B SaaS Lead Generation';
        const leadsToCall = callableLeads.slice(0, 8);

        // Step 1: Initiate ALL calls in parallel (fast — ~1-2s total)
        await this.log('bland_ai_initiating', { count: leadsToCall.length });
        const initiatedCalls: Array<{ lead: any; callId: string }> = [];

        const initPromises = leadsToCall.map(async (lead: any) => {
          try {
            const callTask = `You are Alex, an AI qualification specialist from LeadOS. You're calling ${lead.name || 'the prospect'} at ${lead.company || 'their company'} to qualify them for ${niche} services. Follow the BANT framework: ask about Budget, Authority, Need, and Timeline. Be warm, consultative, never pushy. Keep the call under 5 minutes. Start by obtaining consent to record.`;

            const call = await blandAI.makeCall({
              phone: lead.phone,
              task: callTask,
              firstSentence: `Hi ${lead.name?.split(' ')[0] || 'there'}, this is Alex from LeadOS. Thanks for your interest in our growth services — do you have about 3 minutes for a quick chat?`,
              maxDuration: 300,
              record: true,
              metadata: { leadEmail: lead.email, leadScore: lead.score },
            });

            await this.log('bland_ai_call_initiated', { callId: call.callId, lead: lead.name });
            return { lead, callId: call.callId };
          } catch (err: any) {
            await this.log('bland_ai_call_error', { lead: lead.name, error: err.message });
            return null;
          }
        });

        const initResults = await Promise.allSettled(initPromises);
        for (const r of initResults) {
          if (r.status === 'fulfilled' && r.value) {
            initiatedCalls.push(r.value);
          }
        }
        await this.log('bland_ai_all_initiated', { total: initiatedCalls.length });

        // Step 2: Wait for ALL calls to complete in parallel (each polls independently)
        if (initiatedCalls.length > 0) {
          await this.log('bland_ai_waiting', { message: `Waiting for ${initiatedCalls.length} call(s) to complete...` });

          const waitPromises = initiatedCalls.map(async ({ lead, callId }) => {
            try {
              const completed = await blandAI.waitForCall(callId, 480000); // max 8 min per call
              await this.log('bland_ai_call_completed', { callId, lead: lead.name, status: completed.status, duration: completed.duration });
              return {
                leadName: lead.name,
                leadEmail: lead.email,
                company: lead.company,
                phone: lead.phone,
                callId,
                callStatus: (completed.status === 'completed' || completed.status === 'ended') ? 'completed' as const : completed.status as any,
                duration: completed.duration || 0,
                transcript: completed.transcript || '',
                recordingUrl: completed.recordingUrl || '',
                analysis: {},
                dataSource: 'live_bland_ai',
              };
            } catch (err: any) {
              await this.log('bland_ai_wait_error', { callId, lead: lead.name, error: err.message });
              return {
                leadName: lead.name,
                leadEmail: lead.email,
                company: lead.company,
                phone: lead.phone,
                callId,
                callStatus: 'error' as const,
                duration: 0,
                transcript: '',
                recordingUrl: '',
                analysis: {},
                dataSource: 'live_bland_ai',
              };
            }
          });

          const waitResults = await Promise.allSettled(waitPromises);
          for (const r of waitResults) {
            if (r.status === 'fulfilled' && r.value) {
              realCallResults.push(r.value);
            }
          }

          const completed = realCallResults.filter(r => r.callStatus === 'completed');
          await this.log('bland_ai_all_completed', {
            total: realCallResults.length,
            completed: completed.length,
            withTranscript: completed.filter(r => r.transcript.length > 50).length,
          });
        }
      }

      const userMessage = JSON.stringify({
        serviceNiche: inputs.config?.niche || inputs.config?.serviceNiche || 'B2B SaaS Lead Generation',
        ...inputs.config,
        upstreamContext: {
          icp: offerData.icp || offerData.idealCustomerProfile || null,
          pricing: offerData.pricingTiers || offerData.pricing || null,
          guarantee: offerData.guarantee || null,
          callableLeads: callableLeads.length > 0 ? callableLeads : null,
          emailOnlyLeads: emailOnlyLeads.length > 0 ? emailOnlyLeads : null,
          allLeads: qualifiedLeads.length > 0 ? qualifiedLeads : null,
          scoringModel: inboundData.scoringModel || null,
          segments: inboundData.segmentation?.segments || null,
        },
        IMPORTANT_INSTRUCTION: qualifiedLeads.length > 0
          ? realCallResults.length > 0
            ? `USE ONLY the real leads provided and the REAL call data from Bland AI. Do NOT invent fictional leads or fabricate call results.
CRITICAL: Each call in realData.callResults has a real transcript and duration from a completed Bland AI call. Read the transcript carefully and score each call using the BANT framework based on what was ACTUALLY said. Use the real duration and callStatus. Do NOT override them with made-up values.
For leads in emailOnlyLeads (invalid/missing phone): set callStatus to "no_valid_phone", outcome to "medium_intent", and routingAction to "Route to email nurture — no valid phone for voice call".
For summary: count from the real call results — totalCallsAttempted = number of calls, totalCallsCompleted = calls with callStatus "completed", avgScore = average of real BANT scores you assigned, etc.`
            : blandAvailable
            ? `USE ONLY the real leads provided. Real Bland AI calls were attempted but may not have completed in time.
For leads in emailOnlyLeads (invalid/missing phone): set callStatus to "no_valid_phone", outcome to "medium_intent", and routingAction to "Route to email nurture — no valid phone for voice call".`
            : `IMPORTANT: No voice calling API (Bland AI) is configured. Do NOT pretend calls were made.
For ALL leads: set callStatus to "not_called", outcome to "pending_call", routingAction to "Awaiting voice qualification — Bland AI API key not configured". Generate the call script, BANT questions, and qualification thresholds but do NOT fabricate call results or scores. Set score to 0 and leave transcript empty.
For leads in emailOnlyLeads: set callStatus to "no_valid_phone", outcome to "medium_intent", routingAction to "Route to email nurture — no valid phone for voice call".`
          : null,
        realData: {
          callResults: realCallResults.length > 0 ? realCallResults : null,
          dataSource: realCallResults.length > 0 ? 'live_bland_ai' : blandAvailable ? 'bland_ai_attempted' : 'no_voice_api',
        },
      });

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage, 1, 8192);
      let parsed: any = {};
      try {
        parsed = this.safeParseLLMJson<any>(response, ['callScript', 'qualificationThresholds', 'callResults']);
      } catch (parseErr: any) {
        await this.log('llm_json_parse_error', { error: parseErr.message });
        parsed = { reasoning: `LLM JSON parse failed: ${parseErr.message}`, confidence: 0 };
      }

      // Data integrity: handle metrics based on whether real calls were made
      if (realCallResults.length === 0) {
        // No real Bland AI calls — zero all summary metrics
        if (parsed.summary) {
          parsed.summary.totalCallsAttempted = 0;
          parsed.summary.totalCallsCompleted = 0;
          parsed.summary.totalNoAnswer = 0;
          parsed.summary.avgCallDuration = 0;
          parsed.summary.avgScore = 0;
          parsed.summary.highIntentCheckout = 0;
          parsed.summary.highIntentSales = 0;
          parsed.summary.mediumIntent = 0;
          parsed.summary.lowIntent = 0;
          parsed.summary.qualificationRate = 0;
        }
        if (parsed.callResults) {
          for (const result of parsed.callResults) {
            if (!blandAvailable) {
              result.score = 0;
              result.duration = 0;
              result.bantBreakdown = { budget: 0, authority: 0, need: 0, timeline: 0 };
              result.transcript = '';
              result.callStatus = 'not_called';
              result.outcome = 'pending_call';
            }
          }
        }
      } else {
        // Real calls completed — inject real data into LLM results
        // The LLM scored based on real transcripts, but we override with actual call metadata
        const completedCalls = realCallResults.filter(r => r.callStatus === 'completed');

        if (parsed.callResults) {
          for (const result of parsed.callResults) {
            const realCall = realCallResults.find((rc) =>
              rc.leadEmail === result.leadEmail || rc.leadName === result.leadName
            );
            if (realCall) {
              result.callId = realCall.callId;
              result.callStatus = realCall.callStatus;
              result.duration = realCall.duration || result.duration;
              result.transcript = realCall.transcript || result.transcript;
              result.recordingUrl = realCall.recordingUrl || '';
              result.dataSource = 'live_bland_ai';
              // Keep LLM's BANT scores since they were generated from the real transcript
            }
          }
        }

        // Recompute summary from real data
        if (parsed.summary) {
          parsed.summary.totalCallsAttempted = realCallResults.length;
          parsed.summary.totalCallsCompleted = completedCalls.length;
          parsed.summary.totalNoAnswer = realCallResults.filter(r => r.callStatus === 'no-answer' || r.callStatus === 'no_answer').length;
          parsed.summary.avgCallDuration = completedCalls.length > 0
            ? Math.round(completedCalls.reduce((sum: number, r: any) => sum + (r.duration || 0), 0) / completedCalls.length)
            : 0;
        }
      }

      // CRITICAL: Filter callResults to ONLY include leads that exist in the user's DB
      // Then use DB leads as source of truth for name, email, company, phone
      if (parsed.callResults && qualifiedLeads.length > 0) {
        parsed.callResults = parsed.callResults.filter((result: any) =>
          qualifiedLeads.some((l: any) =>
            l.email === result.leadEmail || (l.name && l.name.toLowerCase() === (result.leadName || '').toLowerCase())
          )
        );
        for (const result of parsed.callResults) {
          const dbLead = qualifiedLeads.find((l: any) =>
            l.email === result.leadEmail || (l.name && l.name.toLowerCase() === (result.leadName || '').toLowerCase())
          );
          if (dbLead) {
            result.leadName = dbLead.name || result.leadName;
            result.leadEmail = dbLead.email || result.leadEmail;
            result.company = dbLead.company || result.company;
            result.phone = dbLead.phone || result.phone;
          }
        }
      } else if (parsed.callResults && qualifiedLeads.length === 0) {
        // No user leads found — discard all LLM-generated callResults
        parsed.callResults = [];
      }

      // Merge real Bland AI call data into LLM output — real data takes precedence
      // for callId, transcript, duration, status, recording; LLM scores are kept
      // since they were generated from the real transcript
      if (realCallResults.length > 0 && parsed.callResults) {
        const enrichedResults = parsed.callResults.map((r: any) => {
          const realCall = realCallResults.find((rc) => rc.leadEmail === r.leadEmail || rc.leadName === r.leadName);
          if (realCall) {
            return {
              ...r,
              callId: realCall.callId,
              transcript: realCall.transcript || r.transcript,
              duration: realCall.duration || r.duration,
              callStatus: realCall.callStatus,
              recordingUrl: realCall.recordingUrl,
              company: realCall.company || r.company,
              dataSource: 'live_bland_ai',
            };
          }
          return r;
        });
        parsed.callResults = enrichedResults;
      }

      // Update lead stage + qualification data in the database
      try {
        const { prisma } = await import('@/lib/prisma');
        const stageMap: Record<string, string> = {
          high_intent_checkout: 'qualified',
          high_intent_sales: 'qualified',
          medium_intent: 'nurture',
          low_intent: 'disqualified',
          pending_call: '',
        };
        const userScope = inputs.userId ? { userId: inputs.userId } : {};

        // Batch all DB operations in a single transaction for speed
        await prisma.$transaction(async (tx: any) => {
          for (const result of parsed.callResults || []) {
            if (!result.leadEmail) continue;
            const isNoPhone = result.callStatus === 'no_valid_phone';
            const isNotCalled = result.callStatus === 'not_called' || result.outcome === 'pending_call';
            const newStage = isNotCalled ? '' : isNoPhone ? 'contacted' : (stageMap[result.outcome] || 'contacted');
            if (isNotCalled) continue;

            await tx.lead.updateMany({
              where: { email: result.leadEmail, ...userScope },
              data: {
                stage: newStage,
                score: result.score || undefined,
                qualificationScore: result.score || null,
                qualificationOutcome: result.outcome || null,
                routingDecision: result.routingAction || null,
                ...(inputs.userId && { userId: inputs.userId }),
              },
            });

            const lead = await tx.lead.findFirst({ where: { email: result.leadEmail, ...userScope } });
            if (lead) {
              await tx.interaction.create({
                data: {
                  leadId: lead.id,
                  type: 'ai_qualification_call',
                  content: `AI call: ${result.callStatus} | Score: ${result.score} | Outcome: ${result.outcome} | Duration: ${result.duration}s`,
                  metadata: JSON.stringify({
                    callStatus: result.callStatus,
                    duration: result.duration,
                    score: result.score,
                    outcome: result.outcome,
                    sentiment: result.sentiment,
                    keySignals: result.keySignals,
                    objectionsRaised: result.objectionsRaised,
                    callId: result.callId || null,
                  }),
                },
              });
            }
          }
        });
        await this.log('db_leads_updated', { count: (parsed.callResults || []).length });
      } catch (err: any) {
        await this.log('db_update_error', { error: err.message });
      }

      this.status = 'done';
      await this.log('run_completed', { output: parsed });
      return {
        success: true,
        data: parsed,
        reasoning: parsed.reasoning || 'AI qualification calls completed and leads routed.',
        confidence: parsed.confidence || 85,
      };
    } catch (error: any) {
      this.status = 'error';
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
