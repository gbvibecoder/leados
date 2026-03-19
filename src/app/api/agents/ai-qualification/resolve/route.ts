import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';
import * as blandAI from '@backend/integrations/bland-ai';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const SCORING_PROMPT = `You are a BANT scoring engine. Given a real call transcript between an AI qualification agent and a lead, score the call using the BANT framework.

BANT SCORING (0-100 total):
- Budget (0-30): Monthly spend capacity, willingness to invest
- Authority (0-25): Decision-making power, title, buying authority
- Need (0-25): Pain point clarity, urgency, current solution gaps
- Timeline (0-20): Implementation urgency, upcoming deadlines

ROUTING based on total score:
- high_intent_checkout (>= 85): Ready to buy now
- high_intent_sales (70-84): Book human sales call
- medium_intent (50-69): Enter nurture sequence
- low_intent (< 50): Disqualify

Read the transcript carefully. Score ONLY based on what was actually said.

Return ONLY valid JSON:
{
  "score": <number 0-100>,
  "bantBreakdown": { "budget": <0-30>, "authority": <0-25>, "need": <0-25>, "timeline": <0-20> },
  "outcome": "<high_intent_checkout|high_intent_sales|medium_intent|low_intent>",
  "routingAction": "<string describing next step>",
  "keySignals": [<string>],
  "objectionsRaised": [<string>],
  "sentiment": "<positive|neutral|hesitant|negative>"
}`;

/**
 * POST /api/agents/ai-qualification/resolve
 *
 * Phase 2 of AI Qualification: After Bland AI calls complete, this endpoint
 * fetches real transcripts, scores them with BANT via LLM, and updates
 * the AgentRun output in the database.
 *
 * Body: { agentRunId: string }
 *
 * Fits within Vercel Hobby's 60s — fetching transcripts is fast,
 * and scoring each call with LLM takes ~5-10s.
 */
export async function POST(req: Request) {
  const userId = getUserId(req);
  const body = await req.json().catch(() => ({}));
  const { agentRunId } = body;

  if (!agentRunId) {
    return NextResponse.json({ error: 'agentRunId is required' }, { status: 400 });
  }

  // Load the agent run
  const agentRun = await prisma.agentRun.findUnique({ where: { id: agentRunId } });
  if (!agentRun) {
    return NextResponse.json({ error: 'AgentRun not found' }, { status: 404 });
  }

  let output: any;
  try {
    output = typeof agentRun.outputsJson === 'string'
      ? JSON.parse(agentRun.outputsJson)
      : agentRun.outputsJson;
  } catch {
    return NextResponse.json({ error: 'Failed to parse agent output' }, { status: 500 });
  }

  const data = output?.data;
  if (!data?._pendingResolution || !data._callIds?.length) {
    return NextResponse.json({ error: 'No pending calls to resolve', alreadyResolved: true }, { status: 400 });
  }

  const callIds: string[] = data._callIds;
  const callResults: any[] = data.callResults || [];

  // Step 1: Fetch real call details from Bland AI (fast — just API calls)
  const resolvedCalls: any[] = [];
  for (const callId of callIds) {
    try {
      const details = await blandAI.getCallDetails(callId);
      resolvedCalls.push({ ...details, callId });
    } catch (err: any) {
      resolvedCalls.push({ callId, status: 'error', error: err.message });
    }
  }

  // Step 2: Score each completed call with LLM using real transcript
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const aiEngine = process.env.AI_ENGINE;

  // Build engine priority matching base-agent.ts
  type LLMCall = (system: string, user: string) => Promise<string>;
  const engines: { name: string; call: LLMCall }[] = [];

  const addOpenRouter = () => { if (openrouterKey) engines.push({ name: 'openrouter', call: (s, u) => callOpenRouter(s, u, openrouterKey) }); };
  const addGemini = () => { if (geminiKey) engines.push({ name: 'gemini', call: (s, u) => callGemini(s, u, geminiKey) }); };
  const addAnthropic = () => { if (anthropicKey) engines.push({ name: 'anthropic', call: (s, u) => callAnthropic(s, u, anthropicKey) }); };

  if (aiEngine === 'openrouter') { addOpenRouter(); addGemini(); addAnthropic(); }
  else if (aiEngine === 'anthropic') { addAnthropic(); addOpenRouter(); addGemini(); }
  else if (aiEngine === 'gemini') { addGemini(); addOpenRouter(); addAnthropic(); }
  else { addOpenRouter(); addGemini(); addAnthropic(); }

  for (const resolved of resolvedCalls) {
    // Find matching call result from agent output
    const callResult = callResults.find((c: any) => c.callId === resolved.callId);
    if (!callResult) continue;

    const isCompleted = resolved.status === 'completed' || resolved.status === 'ended';

    if (isCompleted && resolved.transcript) {
      // Score the real transcript with LLM
      try {
        const scoreInput = JSON.stringify({
          leadName: callResult.leadName,
          company: callResult.company,
          transcript: resolved.transcript,
          duration: resolved.duration,
        });

        let scoreText = '';

        // Try engines in priority order with fallback
        for (const engine of engines) {
          try {
            scoreText = await engine.call(SCORING_PROMPT, scoreInput);
            if (scoreText) break;
          } catch {
            continue;
          }
        }

        if (scoreText) {
          const scored = parseJSON(scoreText);
          callResult.score = scored.score || 0;
          callResult.bantBreakdown = scored.bantBreakdown || { budget: 0, authority: 0, need: 0, timeline: 0 };
          callResult.outcome = scored.outcome || 'medium_intent';
          callResult.routingAction = scored.routingAction || '';
          callResult.keySignals = scored.keySignals || [];
          callResult.objectionsRaised = scored.objectionsRaised || [];
          callResult.sentiment = scored.sentiment || 'neutral';
        }
      } catch {
        // Scoring failed — keep zeros, mark the error
        callResult.outcome = 'medium_intent';
        callResult.routingAction = 'Scoring failed — route to nurture as fallback';
      }

      callResult.callStatus = 'completed';
      callResult.duration = resolved.duration || 0;
      callResult.transcript = resolved.transcript || '';
      callResult.recordingUrl = resolved.recordingUrl || '';
    } else if (resolved.status === 'no-answer' || resolved.status === 'failed') {
      callResult.callStatus = resolved.status === 'no-answer' ? 'no_answer' : 'declined';
      callResult.outcome = 'low_intent';
      callResult.routingAction = `Call ${resolved.status} — add to retry queue`;
    } else {
      // Still in progress
      callResult.callStatus = 'initiated';
      callResult.outcome = 'pending_resolution';
    }
  }

  // Step 3: Recompute summary from scored results
  const completedCalls = callResults.filter((c: any) => c.callStatus === 'completed');
  const pendingCalls = callResults.filter((c: any) => c.callStatus === 'initiated');

  if (data.summary) {
    data.summary.totalCallsAttempted = callResults.length;
    data.summary.totalCallsCompleted = completedCalls.length;
    data.summary.totalNoAnswer = callResults.filter((c: any) => c.callStatus === 'no_answer').length;
    data.summary.avgCallDuration = completedCalls.length > 0
      ? Math.round(completedCalls.reduce((s: number, c: any) => s + (c.duration || 0), 0) / completedCalls.length)
      : 0;

    const scoredCalls = completedCalls.filter((c: any) => c.score > 0);
    data.summary.avgScore = scoredCalls.length > 0
      ? Math.round(scoredCalls.reduce((s: number, c: any) => s + c.score, 0) / scoredCalls.length)
      : 0;
    data.summary.highIntentCheckout = callResults.filter((c: any) => c.outcome === 'high_intent_checkout').length;
    data.summary.highIntentSales = callResults.filter((c: any) => c.outcome === 'high_intent_sales').length;
    data.summary.mediumIntent = callResults.filter((c: any) => c.outcome === 'medium_intent').length;
    data.summary.lowIntent = callResults.filter((c: any) => c.outcome === 'low_intent').length;
    const qualified = data.summary.highIntentCheckout + data.summary.highIntentSales;
    data.summary.qualificationRate = callResults.length > 0
      ? Math.round((qualified / callResults.length) * 100)
      : 0;
  }

  // Clear pending flag if all calls are resolved
  if (pendingCalls.length === 0) {
    delete data._pendingResolution;
    delete data._callIds;
  } else {
    data._callIds = pendingCalls.map((c: any) => c.callId).filter(Boolean);
  }

  // Step 4: Update AgentRun in database
  output.data = data;
  await prisma.agentRun.update({
    where: { id: agentRunId },
    data: { outputsJson: JSON.stringify(output) },
  });

  // Step 5: Update lead records in DB with real scores
  // Skip lead updates if no userId — prevents cross-tenant data leaks
  if (!userId) {
    return NextResponse.json({
      resolved: true,
      totalCalls: callResults.length,
      completed: completedCalls.length,
      pending: pendingCalls.length,
      output,
    });
  }
  const userScope = { userId };
  try {
    const stageMap: Record<string, string> = {
      high_intent_checkout: 'qualified',
      high_intent_sales: 'qualified',
      medium_intent: 'nurture',
      low_intent: 'disqualified',
    };

    for (const result of completedCalls) {
      if (!result.leadEmail) continue;
      const newStage = stageMap[result.outcome] || 'contacted';

      await prisma.lead.updateMany({
        where: { email: result.leadEmail, ...userScope },
        data: {
          stage: newStage,
          score: result.score || undefined,
          qualificationScore: result.score || null,
          qualificationOutcome: result.outcome || null,
          routingDecision: result.routingAction || null,
        },
      });
    }
  } catch {
    // DB update failed — non-critical, output is already saved
  }

  return NextResponse.json({
    resolved: true,
    totalCalls: callResults.length,
    completed: completedCalls.length,
    pending: pendingCalls.length,
    output,
  });
}

// --- LLM helpers (lightweight, no BaseAgent dependency) ---

async function callOpenRouter(system: string, user: string, apiKey: string): Promise<string> {
  const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://leados.app',
      'X-Title': 'LeadOS',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0.3,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(system: string, user: string, apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey, timeout: 30_000 });
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: [{ type: 'text', text: system }],
    messages: [{ role: 'user', content: user }],
  });
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('');
}

async function callGemini(system: string, user: string, apiKey: string): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.3 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

function parseJSON(text: string): any {
  try {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) return JSON.parse(jsonMatch[1].trim());
  } catch { /* fall through */ }
  try { return JSON.parse(text); } catch { /* fall through */ }
  try {
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) return JSON.parse(objMatch[0]);
  } catch { /* fall through */ }
  return {};
}
