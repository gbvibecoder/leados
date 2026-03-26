import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Allow up to 300s — this webhook handles long-running call completions
export const maxDuration = 300;

/**
 * POST /api/webhooks/bland-ai
 *
 * Receives a call-completed event from Bland AI.
 * Bland AI fires this webhook when a call ends (including calls that were still
 * in-progress when the AI Qualification Agent timed out at 280s).
 *
 * Payload fields used:
 *   call_id                - Bland AI call ID
 *   concatenated_transcript - Full call transcript
 *   call_length            - Call duration in minutes
 *   status                 - "completed" | "no-answer" | "failed" | etc.
 *   metadata               - Object we passed at call creation: { leadEmail, leadScore }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const callId: string = body.call_id || body.callId || '';
    const transcript: string = body.concatenated_transcript || body.transcript || '';
    const callLengthMinutes: number = body.call_length || 0;
    const callDurationSeconds: number = Math.round(callLengthMinutes * 60);
    const status: string = body.status || 'completed';
    const metadata: Record<string, any> = body.metadata || {};
    const leadEmail: string = metadata.leadEmail || '';
    const leadScore: number = metadata.leadScore || 0;

    if (!callId) {
      return NextResponse.json({ error: 'Missing call_id' }, { status: 400 });
    }

    // Look up the lead by email from call metadata
    if (!leadEmail) {
      console.warn('[bland-ai webhook] No leadEmail in metadata for call:', callId);
      return NextResponse.json({ received: true, note: 'No leadEmail in metadata — skipping DB update' });
    }

    // Find the lead (look up without userId scope — metadata is our link)
    const lead = await prisma.lead.findFirst({
      where: { email: leadEmail },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        userId: true,
        stage: true,
        qualificationOutcome: true,
      },
    });

    if (!lead) {
      console.warn('[bland-ai webhook] Lead not found for email:', leadEmail);
      return NextResponse.json({ received: true, note: 'Lead not found' });
    }

    // If the lead already has a final qualification outcome (was processed by the agent
    // within the 280s window), skip re-processing to avoid overwriting real scores.
    const alreadyProcessed =
      lead.qualificationOutcome &&
      lead.qualificationOutcome !== '' &&
      lead.stage !== 'contacted';

    if (alreadyProcessed) {
      console.log('[bland-ai webhook] Lead already processed, skipping:', leadEmail);
      return NextResponse.json({ received: true, note: 'Lead already processed by agent — skipping' });
    }

    // Handle non-completed calls (no-answer, failed, etc.) — just log the interaction
    if (status !== 'completed' && status !== 'ended') {
      await prisma.$transaction(async (tx: any) => {
        await tx.lead.updateMany({
          where: { email: leadEmail },
          data: {
            stage: 'contacted',
            routingDecision: `bland_ai_${status}:${callId}`,
          },
        });
        await tx.interaction.create({
          data: {
            leadId: lead.id,
            type: 'ai_qualification_call',
            content: `AI call ${status}: call_id=${callId} | Duration: ${callDurationSeconds}s`,
            metadata: JSON.stringify({ callId, status, callDurationSeconds, source: 'bland_ai_webhook' }),
          },
        });
      });
      return NextResponse.json({ received: true, note: `Call status: ${status} — logged without scoring` });
    }

    // Score the transcript using LLM (BANT framework)
    let bantScore = 0;
    let bantBreakdown = { budget: 0, authority: 0, need: 0, timeline: 0 };
    let outcome = 'medium_intent';
    let sentiment = 'neutral';
    let keySignals: string[] = [];
    let objectionsRaised: string[] = [];
    let budgetConfirmed = false;

    if (transcript && transcript.length > 50) {
      try {
        const scoringResult = await scoreBantFromTranscript(transcript, leadScore);
        bantScore = scoringResult.score;
        bantBreakdown = scoringResult.bantBreakdown;
        outcome = scoringResult.outcome;
        sentiment = scoringResult.sentiment;
        keySignals = scoringResult.keySignals;
        objectionsRaised = scoringResult.objectionsRaised;
        budgetConfirmed = scoringResult.budgetConfirmed;
      } catch (llmErr: any) {
        console.error('[bland-ai webhook] LLM BANT scoring failed:', llmErr.message);
        // Fall through with defaults — still update the DB with call completion
      }
    }

    // Map outcome to DB stage
    const stageMap: Record<string, string> = {
      high_intent_checkout: 'qualified',
      high_intent_sales: 'qualified',
      medium_intent: 'nurture',
      low_intent: 'disqualified',
    };
    const newStage = stageMap[outcome] || 'nurture';

    // Update lead + create interaction in a transaction
    await prisma.$transaction(async (tx: any) => {
      await tx.lead.updateMany({
        where: { email: leadEmail },
        data: {
          stage: newStage,
          score: bantScore || undefined,
          qualificationScore: bantScore || null,
          qualificationOutcome: outcome,
          routingDecision: getRoutingAction(outcome, budgetConfirmed),
        },
      });

      await tx.interaction.create({
        data: {
          leadId: lead.id,
          type: 'ai_qualification_call',
          content: `AI call (webhook): ${status} | Score: ${bantScore} | Outcome: ${outcome} | Duration: ${callDurationSeconds}s`,
          metadata: JSON.stringify({
            callId,
            callStatus: status,
            duration: callDurationSeconds,
            score: bantScore,
            outcome,
            sentiment,
            keySignals,
            objectionsRaised,
            budgetConfirmed,
            bantBreakdown,
            source: 'bland_ai_webhook',
          }),
        },
      });
    });

    console.log(`[bland-ai webhook] Processed call ${callId} for ${leadEmail}: score=${bantScore}, outcome=${outcome}`);
    return NextResponse.json({ received: true, leadEmail, outcome, score: bantScore });
  } catch (error: any) {
    console.error('[bland-ai webhook] Error:', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Map outcome + budget confirmation to a human-readable routing action */
function getRoutingAction(outcome: string, budgetConfirmed: boolean): string {
  if (outcome === 'high_intent_checkout' && budgetConfirmed) return 'Route to checkout — high BANT score + confirmed budget';
  if (outcome === 'high_intent_checkout') return 'Route to sales call — high BANT score but budget not confirmed';
  if (outcome === 'high_intent_sales') return 'Route to sales call — high intent, complex needs';
  if (outcome === 'medium_intent') return 'Add to nurture sequence — medium interest';
  if (outcome === 'low_intent') return 'Disqualify — low BANT score';
  return 'Add to nurture sequence';
}

/**
 * Score a call transcript using BANT framework via LLM.
 * Uses direct Gemini/Anthropic/OpenRouter call (not a full agent run).
 */
async function scoreBantFromTranscript(transcript: string, leadScore: number): Promise<{
  score: number;
  bantBreakdown: { budget: number; authority: number; need: number; timeline: number };
  outcome: string;
  sentiment: string;
  keySignals: string[];
  objectionsRaised: string[];
  budgetConfirmed: boolean;
}> {
  const systemPrompt = `You are a BANT qualification scorer. Given a sales call transcript, score the lead on the BANT framework and determine the routing outcome.

BANT Scoring:
- Budget (0-30 pts): Monthly spend capacity, budget explicitly confirmed or stated
- Authority (0-25 pts): Decision-making power, job title, buying authority
- Need (0-25 pts): Pain point clarity, urgency, gaps in current solution
- Timeline (0-20 pts): Implementation urgency, upcoming deadlines

Outcomes based on total BANT score:
- high_intent_checkout: score >= 85 AND budget explicitly confirmed (prospect stated dollar amount or confirmed budget is available)
- high_intent_sales: score 70-84, OR score >= 85 without explicit budget confirmation
- medium_intent: score 50-69
- low_intent: score < 50

Return ONLY valid JSON with this exact structure:
{
  "score": <number 0-100, total BANT score>,
  "bantBreakdown": { "budget": <0-30>, "authority": <0-25>, "need": <0-25>, "timeline": <0-20> },
  "outcome": "high_intent_checkout|high_intent_sales|medium_intent|low_intent",
  "sentiment": "positive|neutral|hesitant|negative",
  "keySignals": ["<signal>"],
  "objectionsRaised": ["<objection>"],
  "budgetConfirmed": <true|false — true only if prospect explicitly stated a dollar amount or confirmed budget is allocated>
}`;

  const userMessage = `Lead's prior inbound score: ${leadScore}/100\n\nCall transcript:\n${transcript.substring(0, 8000)}`;

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const aiEngine = process.env.AI_ENGINE;

  let llmResponse = '';

  // Try engines in priority order (same as BaseAgent)
  const engines: Array<{ name: string; call: () => Promise<string> }> = [];

  if (aiEngine === 'anthropic') {
    if (anthropicKey) engines.push({ name: 'anthropic', call: () => callAnthropic(systemPrompt, userMessage, anthropicKey) });
    if (openrouterKey) engines.push({ name: 'openrouter', call: () => callOpenRouter(systemPrompt, userMessage, openrouterKey) });
    if (geminiKey) engines.push({ name: 'gemini', call: () => callGemini(systemPrompt, userMessage, geminiKey) });
  } else if (aiEngine === 'gemini') {
    if (geminiKey) engines.push({ name: 'gemini', call: () => callGemini(systemPrompt, userMessage, geminiKey) });
    if (openrouterKey) engines.push({ name: 'openrouter', call: () => callOpenRouter(systemPrompt, userMessage, openrouterKey) });
    if (anthropicKey) engines.push({ name: 'anthropic', call: () => callAnthropic(systemPrompt, userMessage, anthropicKey) });
  } else {
    // Default: openrouter > gemini > anthropic
    if (openrouterKey) engines.push({ name: 'openrouter', call: () => callOpenRouter(systemPrompt, userMessage, openrouterKey) });
    if (geminiKey) engines.push({ name: 'gemini', call: () => callGemini(systemPrompt, userMessage, geminiKey) });
    if (anthropicKey) engines.push({ name: 'anthropic', call: () => callAnthropic(systemPrompt, userMessage, anthropicKey) });
  }

  if (engines.length === 0) throw new Error('No LLM API key configured for BANT scoring');

  let lastError = '';
  for (const engine of engines) {
    try {
      llmResponse = await engine.call();
      break;
    } catch (err: any) {
      lastError = `${engine.name}: ${err.message}`;
      console.warn(`[bland-ai webhook] ${engine.name} failed for BANT scoring:`, err.message);
    }
  }

  if (!llmResponse) throw new Error(`All LLM engines failed for BANT scoring. Last: ${lastError}`);

  // Parse JSON from response (handle markdown fences)
  const jsonMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
  let jsonStr = jsonMatch ? jsonMatch[1].trim() : llmResponse;
  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objMatch) jsonStr = objMatch[0];

  const parsed = JSON.parse(jsonStr);

  return {
    score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 0,
    bantBreakdown: parsed.bantBreakdown || { budget: 0, authority: 0, need: 0, timeline: 0 },
    outcome: parsed.outcome || 'medium_intent',
    sentiment: parsed.sentiment || 'neutral',
    keySignals: Array.isArray(parsed.keySignals) ? parsed.keySignals : [],
    objectionsRaised: Array.isArray(parsed.objectionsRaised) ? parsed.objectionsRaised : [],
    budgetConfirmed: parsed.budgetConfirmed === true,
  };
}

// ── Minimal LLM callers (no retry — webhook has its own error handling) ────────

async function callOpenRouter(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://leados.app',
      'X-Title': 'LeadOS',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty OpenRouter response');
  return text;
}

async function callGemini(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

async function callAnthropic(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-20240307',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  if (!text) throw new Error('Empty Anthropic response');
  return text;
}
