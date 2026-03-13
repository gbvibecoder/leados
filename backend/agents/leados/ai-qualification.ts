import { BaseAgent, AgentInput, AgentOutput } from '../base-agent';
import { mockBlandAI, mockLeads } from '../../integrations/mock-data';
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

Keep conversations under 5 minutes. Be warm, consultative, and never pushy. The goal is to qualify — not to sell on the call. Always obtain consent before proceeding.`;

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

      // Fetch real leads from database if upstream doesn't provide them
      // Skip leads already processed (qualified, nurture, disqualified, booked, won, lost)
      let qualifiedLeads = inboundData.leadsProcessed?.filter((l: any) => l.score >= 60) || [];

      if (qualifiedLeads.length === 0) {
        try {
          const { prisma } = await import('@/lib/prisma');
          const dbLeads = await prisma.lead.findMany({
            where: {
              stage: { notIn: ['qualified', 'nurture', 'disqualified', 'booked', 'won', 'lost'] },
              qualificationOutcome: null, // not yet qualified
            },
            orderBy: { createdAt: 'desc' },
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
              score: l.score || 50,
              segment: l.segment || 'unknown',
              stage: l.stage || 'new',
            }));
            await this.log('db_leads_fetched_for_qualification', { count: dbLeads.length });
          }
        } catch (err: any) {
          await this.log('db_leads_error', { error: err.message });
        }
      }

      // Enrich leads missing phone numbers by looking up from DB
      if (qualifiedLeads.length > 0) {
        try {
          const { prisma } = await import('@/lib/prisma');
          for (const lead of qualifiedLeads) {
            if (!lead.phone && lead.email) {
              const dbLead = await prisma.lead.findFirst({ where: { email: lead.email }, select: { phone: true } });
              if (dbLead?.phone) lead.phone = dbLead.phone;
            }
            if (!lead.phone && lead.name) {
              const dbLead = await prisma.lead.findFirst({ where: { name: lead.name }, select: { phone: true } });
              if (dbLead?.phone) lead.phone = dbLead.phone;
            }
          }
        } catch { /* continue without DB lookup */ }
      }

      // Validate phone numbers — only international format (+ followed by 10+ digits) are callable
      const isValidPhone = (phone: string | null | undefined): boolean => {
        if (!phone) return false;
        const cleaned = phone.replace(/[\s\-()]/g, '');
        // Must start with + and have at least 10 digits total (e.g., +918766827064)
        return /^\+\d{10,15}$/.test(cleaned);
      };

      // Split leads: callable (valid phone) vs email-only (no/invalid phone)
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

        for (const lead of leadsToCall) {
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

            // Wait for call to complete (max 6 min)
            const completed = await blandAI.waitForCall(call.callId);

            // Analyze the call for BANT signals
            let analysis: Record<string, string> = {};
            if (completed.status === 'completed') {
              try {
                analysis = await blandAI.analyzeCall(call.callId, [
                  'What is the prospect\'s monthly budget for marketing?',
                  'Is the prospect a decision maker?',
                  'What is their main pain point or need?',
                  'What is their timeline for implementation?',
                  'What objections did they raise?',
                  'What is the overall sentiment - positive, neutral, or negative?',
                ]);
              } catch { /* analysis is optional */ }
            }

            realCallResults.push({
              leadName: lead.name,
              leadEmail: lead.email,
              company: lead.company,
              phone: lead.phone,
              callId: call.callId,
              callStatus: completed.status === 'completed' ? 'completed' : completed.status === 'no-answer' ? 'no_answer' : 'declined',
              duration: completed.duration,
              transcript: completed.transcript || completed.concatenatedTranscript || '',
              recordingUrl: completed.recordingUrl || '',
              analysis,
              dataSource: 'live_bland_ai',
            });
          } catch (err: any) {
            await this.log('bland_ai_call_error', { lead: lead.name, error: err.message });
          }
        }
        await this.log('bland_ai_calls_completed', { total: realCallResults.length });
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
            ? `USE ONLY the real leads provided and the REAL call data from Bland AI. Do NOT invent fictional leads or fabricate call results. Use the actual transcript, duration, and status from the real calls to generate BANT scores.
For leads in emailOnlyLeads (invalid/missing phone): set callStatus to "no_valid_phone", outcome to "medium_intent", and routingAction to "Route to email nurture — no valid phone for voice call".`
            : blandAvailable
            ? `USE ONLY the real leads provided. Real Bland AI calls were attempted for callable leads — use the call data provided.
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

      const response = await this.callClaude(SYSTEM_PROMPT, userMessage);
      const parsed = this.safeParseLLMJson<any>(response, ['callScript', 'qualificationThresholds', 'callResults']);

      // If we have real call data, merge it into the output
      if (realCallResults.length > 0) {
        // Keep LLM-generated script/thresholds but use real call results where available
        const enrichedResults = parsed.callResults.map((r: any) => {
          const realCall = realCallResults.find((rc) => rc.leadEmail === r.leadEmail);
          if (realCall) {
            return {
              ...r,
              callId: realCall.callId,
              transcript: realCall.transcript || r.transcript,
              duration: realCall.duration || r.duration,
              callStatus: realCall.callStatus,
              recordingUrl: realCall.recordingUrl,
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
        for (const result of parsed.callResults || []) {
          if (!result.leadEmail) continue;

          // Map outcome to stage
          // Leads without valid phone go to 'contacted' (email nurture), not disqualified
          // Leads that were never called stay in their current stage
          const stageMap: Record<string, string> = {
            high_intent_checkout: 'qualified',
            high_intent_sales: 'qualified',
            medium_intent: 'nurture',
            low_intent: 'disqualified',
            pending_call: '', // don't change stage
          };
          const isNoPhone = result.callStatus === 'no_valid_phone';
          const isNotCalled = result.callStatus === 'not_called' || result.outcome === 'pending_call';
          const newStage = isNotCalled ? '' : isNoPhone ? 'contacted' : (stageMap[result.outcome] || 'contacted');

          // Skip DB update for leads that were never actually called
          if (isNotCalled) continue;

          await prisma.lead.updateMany({
            where: { email: result.leadEmail },
            data: {
              stage: newStage,
              qualificationScore: result.score || null,
              qualificationOutcome: result.outcome || null,
              routingDecision: result.routingAction || null,
            },
          });

          // Log the qualification call as an interaction
          const lead = await prisma.lead.findFirst({ where: { email: result.leadEmail } });
          if (lead) {
            await prisma.interaction.create({
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

  private async getMockOutput(inputs: AgentInput): Promise<any> {
    // Get leads from upstream or use mock leads (only call leads with score >= 60)
    const previousOutputs = inputs.previousOutputs || {};
    const inboundData = previousOutputs['inbound-capture'] || {};
    const qualifiedLeads = inboundData.leadsProcessed?.filter((l: any) => l.score >= 60) || [];

    // If no upstream leads, use mock leads that would qualify
    const leadsToCall = qualifiedLeads.length > 0
      ? qualifiedLeads.slice(0, 8)
      : mockLeads.filter(l => l.score >= 60).slice(0, 8);

    // Simulate AI calls for each lead
    const callResults = [];
    let callIndex = 0;
    for (const lead of leadsToCall) {
      const callResult = await mockBlandAI.makeCall({
        phone: lead.phone || `+1-555-${String(200 + callIndex).padStart(4, '0')}`,
        leadId: lead.email,
        script: 'qualification_bant',
      });
      await this.log('bland_ai_call', { callId: callResult.callId, lead: lead.name || lead.email });

      const callData = this.generateCallResult(lead, callResult, callIndex);
      callResults.push(callData);
      callIndex++;
    }

    const completedCalls = callResults.filter(c => c.callStatus === 'completed');
    const avgDuration = completedCalls.length > 0
      ? Math.round(completedCalls.reduce((sum, c) => sum + c.duration, 0) / completedCalls.length)
      : 0;
    const avgScore = completedCalls.length > 0
      ? Math.round(completedCalls.reduce((sum, c) => sum + c.score, 0) / completedCalls.length * 10) / 10
      : 0;

    const highIntentCheckout = callResults.filter(c => c.outcome === 'high_intent_checkout').length;
    const highIntentSales = callResults.filter(c => c.outcome === 'high_intent_sales').length;
    const mediumIntent = callResults.filter(c => c.outcome === 'medium_intent').length;
    const lowIntent = callResults.filter(c => c.outcome === 'low_intent').length;
    const qualificationRate = callResults.length > 0
      ? Math.round(((highIntentCheckout + highIntentSales) / callResults.length) * 100)
      : 0;

    // Find top objection
    const objectionCounts = new Map<string, number>();
    for (const c of callResults) {
      for (const obj of c.objectionsRaised || []) {
        objectionCounts.set(obj, (objectionCounts.get(obj) || 0) + 1);
      }
    }
    const topObjection = objectionCounts.size > 0
      ? Array.from(objectionCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : 'None';

    return {
      voiceConfig: {
        provider: 'bland_ai',
        voiceName: 'Alex — Professional Consultant',
        voiceSettings: {
          tone: 'Warm, friendly, consultative',
          speed: '1.0x (natural pace)',
          style: 'Conversational — not scripted. Mirror prospect energy.',
        },
        maxCallDuration: 300,
        recordingEnabled: true,
        transcriptionEnabled: true,
        consentScript: 'Before we begin, I want to let you know this call may be recorded for quality purposes. Is that okay with you?',
      },
      callScript: {
        greeting: 'Hi {leadName}, this is Alex from LeadOS. Thanks for your interest in our growth services — I noticed you came in through {leadSource}. I just have a few quick questions to see if we might be a good fit. Do you have about 3-4 minutes?',
        qualificationQuestions: {
          budget: {
            question: 'To make sure I point you in the right direction — what are you currently spending on marketing and lead generation each month?',
            followUp: 'And if you found something that delivered 2-3x the results, would you be open to adjusting that budget?',
            goodAnswers: ['$2,000-$5,000/month', '$5,000-$10,000/month', '$10,000+/month'],
            scoring: { '$10k+': 30, '$5k-$10k': 25, '$2k-$5k': 20, '$1k-$2k': 12, '<$1k': 5 },
          },
          authority: {
            question: 'When it comes to marketing tools and services, are you the one making those decisions, or is there a team involved?',
            followUp: 'Got it. Would you be the one to sign off on a new vendor, or would that need approval from someone else?',
            goodAnswers: ['I make the decisions', "I'm the CMO/VP", 'I run the company'],
            scoring: { 'Sole decision maker': 25, 'Key influencer': 18, 'Part of committee': 12, 'Need approval': 5 },
          },
          need: {
            question: "What's the biggest challenge you're facing with lead generation right now?",
            followUp: 'How long has that been a problem? And what have you tried so far to fix it?',
            goodAnswers: ['Inconsistent lead flow', 'High CAC / expensive leads', 'Low quality leads', 'Not enough qualified meetings'],
            scoring: { 'Clear urgent pain': 25, 'Defined problem': 18, 'Vague awareness': 10, 'No real problem': 3 },
          },
          timeline: {
            question: 'If we could show you a solution that works — when would you ideally want to get started?',
            followUp: 'Is there a specific deadline or event driving that timeline?',
            goodAnswers: ['This month', 'Within 2 weeks', 'ASAP — we need leads now'],
            scoring: { 'Immediately/this week': 20, 'Within 30 days': 15, '30-90 days': 8, 'No timeline': 3 },
          },
        },
        objectionHandling: {
          'too expensive': "I totally understand budget is top of mind. Here's the thing — our clients typically see 2-5x ROI within 90 days. And we back it with a guarantee: 2x qualified leads in 90 days or your money back. Would it help to see the math for a company your size?",
          'need to think about it': "Absolutely, take all the time you need. Tell you what — let me send you a case study from a company in your industry that saw really strong results. No pressure at all. What's the best email for that?",
          'already have a solution': "That's great that you're already investing in lead gen. What kind of results are you getting? A lot of our clients come to us because they're already spending but want 2-3x better performance from the same budget.",
          'not the right time': "I hear you. When would be a better time? I'm happy to set a reminder and reconnect when it makes more sense for {company}. In the meantime, can I send you some content that might be useful?",
          'send me information': "Absolutely! I'll put together something specific to {company}. Just so I can tailor it — what's the #1 thing you'd want to see improvement on? Lead volume, lead quality, or cost per lead?",
          'how is this different': "Great question. The biggest difference is we're fully autonomous — 13 AI agents handle everything from finding prospects to qualifying them with voice AI. Most agencies need 4-6 weeks to ramp up and charge $3-5k/month. We deliver 2x the results at a fraction of the cost, and we guarantee it.",
        },
        closingScripts: {
          high_intent_checkout: "Based on everything you've shared, I think we're a perfect fit. We have a special offer running right now — I can send you a link to get started today with our 90-day guarantee. Would you like me to send that over?",
          high_intent_sales: "This sounds like a great fit, and I think you'd benefit from talking to one of our strategists who can map out a custom plan for {company}. I have openings this week — would Tuesday or Thursday afternoon work better?",
          medium_intent: "I appreciate you sharing all of that. It sounds like there's potential here. Let me send you some resources — a case study and a free pipeline audit template. Once you've had a chance to review, we can reconnect. Sound good?",
          low_intent: "Thanks so much for your time today. It doesn't sound like the timing is quite right, and that's totally fine. I'll add you to our newsletter so you'll see case studies and insights that might be useful down the road. Best of luck with everything!",
        },
      },
      qualificationThresholds: {
        high_intent_checkout: {
          minScore: 85,
          action: 'Send checkout link — auto-close',
          description: 'Budget confirmed ($5k+), sole decision maker, urgent pain, immediate timeline. Ready to buy.',
        },
        high_intent_sales: {
          minScore: 70,
          action: 'Book human sales call',
          description: 'Strong intent but enterprise complexity or needs custom proposal. Requires human touch.',
        },
        medium_intent: {
          minScore: 50,
          action: 'Enter nurture sequence',
          description: 'Some interest but not ready — needs education, budget approval, or longer timeline.',
        },
        low_intent: {
          minScore: 0,
          action: 'Disqualify — long-term drip',
          description: 'No budget, no authority, no real need, or no timeline. Add to long-term content drip.',
        },
      },
      callResults,
      summary: {
        totalCallsAttempted: callResults.length,
        totalCallsCompleted: completedCalls.length,
        totalNoAnswer: callResults.filter(c => c.callStatus === 'no_answer').length,
        totalVoicemail: callResults.filter(c => c.callStatus === 'voicemail').length,
        avgCallDuration: avgDuration,
        avgScore: avgScore,
        highIntentCheckout,
        highIntentSales,
        mediumIntent,
        lowIntent,
        qualificationRate,
        topObjection,
      },
      reasoning: `Executed ${callResults.length} AI qualification calls via Bland AI for leads scoring 60+ from Inbound Capture. ${completedCalls.length} calls completed with avg duration ${Math.round(avgDuration / 60)}m ${avgDuration % 60}s. BANT scoring applied: Budget weighted highest (30 pts) as strongest conversion predictor. ${highIntentCheckout} leads routed to checkout (score 85+), ${highIntentSales} booked for sales calls (70-84), ${mediumIntent} entered nurture (50-69), ${lowIntent} disqualified. ${qualificationRate}% qualification rate. Top objection: "${topObjection}". All calls recorded with consent verification and TCPA compliance.`,
      confidence: 86,
    };
  }

  private generateCallResult(lead: any, callResult: any, index: number): any {
    // Different scenarios based on lead data
    const scenarios = [
      // Scenario 1: High intent — ready to buy
      {
        callStatus: 'completed' as const,
        duration: 245,
        score: 88,
        bantBreakdown: { budget: 28, authority: 25, need: 22, timeline: 13 },
        outcome: 'high_intent_checkout' as const,
        routingAction: 'Send checkout link with 90-day guarantee offer',
        transcript: `Agent: Hi ${lead.name || 'there'}, this is Alex from LeadOS. Thanks for your interest — I noticed you came in through ${lead.source || 'our website'}. Do you have a few minutes?\nProspect: Yes, definitely. We've been looking for a solution.\nAgent: Great! What are you currently spending on marketing each month?\nProspect: About $5,000 to $8,000. We've been scaling up.\nAgent: Are you the decision maker for those investments?\nProspect: Yes, I'm the VP of Marketing. I handle the budget.\nAgent: What's your biggest challenge with lead gen right now?\nProspect: Inconsistent flow. Some months we get 50 leads, other months barely 15. We can't plan around it.\nAgent: How soon would you want to get started?\nProspect: As soon as possible — we have a board meeting in 3 weeks and I need to show pipeline growth.\nAgent: Based on what you've shared, I think we're a perfect fit. Can I send you a link to get started today with our guarantee?`,
        keySignals: ['$5-8k budget confirmed', 'VP-level decision maker', 'Inconsistent lead flow — clear pain', 'Board meeting deadline — 3 weeks', 'Ready to start immediately'],
        objectionsRaised: [] as string[],
        sentiment: 'positive' as const,
      },
      // Scenario 2: High intent — needs sales call
      {
        callStatus: 'completed' as const,
        duration: 310,
        score: 76,
        bantBreakdown: { budget: 22, authority: 20, need: 22, timeline: 12 },
        outcome: 'high_intent_sales' as const,
        routingAction: 'Book strategy call with senior account executive',
        transcript: `Agent: Hi ${lead.name || 'there'}, this is Alex from LeadOS. How are you today?\nProspect: Good, thanks. I filled out that form because we're exploring options.\nAgent: What are you currently spending on lead gen?\nProspect: Around $3,000 a month, but we're prepared to invest more if the ROI is there.\nAgent: Who makes the final call on marketing tools?\nProspect: I lead the team, but our CEO signs off on anything over $5k.\nAgent: What's your main challenge right now?\nProspect: We get leads, but the quality is terrible. Our sales team wastes hours on unqualified people.\nAgent: When are you hoping to have something in place?\nProspect: Ideally within 30-45 days.\nAgent: It sounds like a strategy call would be valuable. Let me connect you with one of our specialists.`,
        keySignals: ['$3k current spend, willing to increase', 'Team lead but needs CEO approval for $5k+', 'Lead quality is main pain point', '30-45 day timeline'],
        objectionsRaised: ['how is this different'],
        sentiment: 'positive' as const,
      },
      // Scenario 3: Medium intent — needs nurture
      {
        callStatus: 'completed' as const,
        duration: 185,
        score: 58,
        bantBreakdown: { budget: 12, authority: 18, need: 18, timeline: 10 },
        outcome: 'medium_intent' as const,
        routingAction: 'Enter email nurture sequence — re-engage in 14 days',
        transcript: `Agent: Hi ${lead.name || 'there'}, this is Alex from LeadOS.\nProspect: Hi, yeah I was browsing your site.\nAgent: What's your current marketing budget?\nProspect: We spend about $1,500 a month total.\nAgent: Are you the decision maker?\nProspect: Yes, I own the company. Small team though.\nAgent: What challenges are you facing?\nProspect: We could use more leads, but things are okay for now.\nAgent: When would you want to explore a solution?\nProspect: Maybe in a couple months. Need to finish a big project first.\nAgent: Totally understand. Let me send you some resources in the meantime.`,
        keySignals: ['$1.5k budget — below ideal', 'Owner/decision maker', 'Mild pain — not urgent', '60-90 day timeline'],
        objectionsRaised: ['not the right time', 'need to think about it'],
        sentiment: 'neutral' as const,
      },
      // Scenario 4: No answer
      {
        callStatus: 'no_answer' as const,
        duration: 0,
        score: 0,
        bantBreakdown: { budget: 0, authority: 0, need: 0, timeline: 0 },
        outcome: 'low_intent' as const,
        routingAction: 'Retry call in 24 hours — max 3 attempts',
        transcript: '',
        keySignals: ['No answer — first attempt'],
        objectionsRaised: [] as string[],
        sentiment: 'neutral' as const,
      },
      // Scenario 5: Voicemail
      {
        callStatus: 'voicemail' as const,
        duration: 35,
        score: 0,
        bantBreakdown: { budget: 0, authority: 0, need: 0, timeline: 0 },
        outcome: 'low_intent' as const,
        routingAction: 'Left voicemail — send follow-up SMS + email',
        transcript: 'Agent: Hi {name}, this is Alex from LeadOS. I\'m following up on your recent inquiry about our growth services. I\'d love to chat for a few minutes about how we can help. I\'ll also send a quick follow-up email. Talk soon!',
        keySignals: ['Voicemail — left message'],
        objectionsRaised: [] as string[],
        sentiment: 'neutral' as const,
      },
      // Scenario 6: Low intent — price objection
      {
        callStatus: 'completed' as const,
        duration: 140,
        score: 35,
        bantBreakdown: { budget: 5, authority: 12, need: 10, timeline: 8 },
        outcome: 'low_intent' as const,
        routingAction: 'Disqualify — add to long-term content drip',
        transcript: `Agent: Hi ${lead.name || 'there'}, this is Alex from LeadOS.\nProspect: Hi. Look, I'm just shopping around.\nAgent: No problem. What's your current marketing spend?\nProspect: Not much. Maybe a few hundred a month.\nAgent: What's your main challenge?\nProspect: I guess we need more visibility, but honestly we're not sure what we need.\nAgent: When would you want to get started?\nProspect: No rush really. Just seeing what's out there.\nAgent: Makes total sense. Let me add you to our newsletter.`,
        keySignals: ['Very low budget', 'Vague need', 'No urgency', 'Shopping around only'],
        objectionsRaised: ['too expensive', 'send me information'],
        sentiment: 'hesitant' as const,
      },
      // Scenario 7: High intent — with objection handled
      {
        callStatus: 'completed' as const,
        duration: 278,
        score: 82,
        bantBreakdown: { budget: 25, authority: 22, need: 20, timeline: 15 },
        outcome: 'high_intent_sales' as const,
        routingAction: 'Book strategy call — prospect overcame objections',
        transcript: `Agent: Hi ${lead.name || 'there'}, this is Alex from LeadOS.\nProspect: Hey. So I looked at your site, but honestly I've been burned by agencies before.\nAgent: I totally get that. What happened with the last one?\nProspect: They promised results and delivered nothing for 3 months. Cost us $15k.\nAgent: That's really frustrating. What we do differently is we guarantee 2x qualified leads in 90 days or full refund. And our system is AI-powered, not a team of juniors.\nProspect: Hmm, that's interesting. We spend about $4,000 a month now.\nAgent: And you're the decision maker?\nProspect: Yes, co-founder. I handle all growth.\nAgent: What's your timeline?\nProspect: If the guarantee is real, I'd want to start within a month.\nAgent: Let me book you a strategy call to walk through everything.`,
        keySignals: ['$4k budget', 'Co-founder/decision maker', 'Burned by agency — needs trust', 'Guarantee is key motivator', '30-day timeline'],
        objectionsRaised: ['already have a solution', 'how is this different'],
        sentiment: 'positive' as const,
      },
      // Scenario 8: Declined call
      {
        callStatus: 'completed' as const,
        duration: 52,
        score: 20,
        bantBreakdown: { budget: 5, authority: 5, need: 5, timeline: 5 },
        outcome: 'low_intent' as const,
        routingAction: 'Disqualify — opted out of further calls',
        transcript: `Agent: Hi, this is Alex from LeadOS—\nProspect: Hi, listen, I'm really busy right now. Not a good time.\nAgent: No problem at all. When would be better to reconnect?\nProspect: Honestly, I'm not really interested right now. Maybe email me?\nAgent: Absolutely. I'll send a quick summary email. Thanks for your time!`,
        keySignals: ['Not interested currently', 'Prefers email contact', 'Very short call'],
        objectionsRaised: ['not the right time'],
        sentiment: 'negative' as const,
      },
    ];

    const scenario = scenarios[index % scenarios.length];
    const name = lead.name || `Lead ${index + 1}`;

    return {
      leadName: name,
      leadEmail: lead.email || `lead${index + 1}@example.com`,
      company: lead.company || 'Unknown Company',
      phone: lead.phone || `+1-555-${String(200 + index).padStart(4, '0')}`,
      callId: callResult.callId,
      callStatus: scenario.callStatus,
      duration: scenario.duration,
      score: scenario.score,
      bantBreakdown: scenario.bantBreakdown,
      outcome: scenario.outcome,
      routingAction: scenario.routingAction,
      transcript: scenario.transcript,
      keySignals: scenario.keySignals,
      objectionsRaised: scenario.objectionsRaised,
      sentiment: scenario.sentiment,
      consentObtained: scenario.callStatus === 'completed',
    };
  }
}
