import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLeadOSAgents } from '@backend/agents/leados/index';
import { getUserId } from '@/lib/auth';

// AI Qualification waits for Bland AI calls (up to 8 min).
// Vercel Pro: 300s. Vercel Hobby: 60s (will timeout — use local dev or Pro plan).
export const maxDuration = 300;

// Singleton agent instances
let agentMap: Map<string, any> | null = null;
function getAgents() {
  if (!agentMap) agentMap = createLeadOSAgents();
  return agentMap;
}

/** Convert raw technical error messages into clean, user-friendly text */
function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes('all engines failed')) {
    // Extract provider name from "All engines failed. anthropic: ..." format
    const providerMatch = raw.match(/failed\.\s*(openrouter|gemini|anthropic)\s*:/i);
    const provider = providerMatch
      ? { openrouter: 'OpenRouter', gemini: 'Gemini', anthropic: 'Anthropic' }[providerMatch[1].toLowerCase()] || providerMatch[1]
      : null;
    const providerLabel = provider ? `${provider} ` : '';

    if (lower.includes('401') || lower.includes('authentication') || lower.includes('unauthorized'))
      return `${providerLabel}API key is invalid or expired. Please check your API key in Settings.`;
    if (lower.includes('402') || lower.includes('credit') || lower.includes('billing') || lower.includes('insufficient'))
      return `${providerLabel}credits exhausted. Please add credits or switch to a different provider in Settings.`;
    if (lower.includes('429') || lower.includes('rate limit') || lower.includes('quota'))
      return `${providerLabel}rate limit reached. Please wait a moment and try again.`;
    if (lower.includes('400'))
      return `${providerLabel}API key may be out of credits or invalid. Check your ${provider || 'provider'} dashboard.`;
    if (lower.includes('timeout') || lower.includes('timed out'))
      return `${providerLabel}timed out. Please try again.`;
    return `All AI providers failed. Please verify your API keys in Settings.`;
  }

  if (lower.includes('no llm api key configured'))
    return 'No AI provider configured. Add an API key (Gemini, OpenRouter, or Anthropic) in your environment.';

  if (lower.includes('timeout') || lower.includes('timed out'))
    return 'Request timed out. The AI provider took too long to respond — please try again.';

  if (lower.includes('network') || lower.includes('econnrefused') || lower.includes('fetch failed'))
    return 'Network error — could not reach the AI provider. Check your internet connection.';

  // Strip JSON objects from error messages to keep it readable
  const cleaned = raw.replace(/\s*\{[\s\S]*\}\s*/g, '').replace(/\s*\[[\s\S]*\]\s*/g, '').trim();
  return cleaned || 'An unexpected error occurred. Please try again.';
}

/**
 * POST /api/agents/[id]/run
 *
 * Runs a SINGLE agent synchronously and returns the result.
 * The frontend orchestrates the pipeline by calling this endpoint
 * for each agent sequentially, keeping each call under 60s.
 *
 * Body: { pipelineId, config, previousOutputs }
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);
  const body = await req.json().catch(() => ({}));

  const agents = getAgents();
  const agent = agents.get(id);

  if (!agent) {
    return NextResponse.json({ error: `Agent '${id}' not found` }, { status: 404 });
  }

  const pipelineId = body.pipelineId;
  const config = body.config || {};
  const previousOutputs = body.previousOutputs || {};

  // Create agentRun record
  let agentRun;
  try {
    agentRun = await prisma.agentRun.create({
      data: {
        pipelineId: pipelineId || 'standalone',
        agentId: id,
        agentName: agent.name,
        status: 'running',
        inputsJson: JSON.stringify(config),
        startedAt: new Date(),
      },
    });
  } catch (e) {
    console.error(`[agent-run] Failed to create agentRun for ${id}:`, e);
  }

  try {
    // Run agent SYNCHRONOUSLY — await the result
    const output = await agent.run({
      pipelineId: pipelineId || 'standalone',
      config,
      previousOutputs,
      userId,
    });

    // Check if agent returned success: false (e.g. LLM call failed but agent caught the error)
    const agentFailed = output.success === false;
    const rawError = agentFailed ? (output.error || output.reasoning || 'Agent failed') : null;
    const agentErrorMsg = rawError ? friendlyError(rawError) : null;

    // Save result to DB — only mark as 'done' if the run is STILL 'running'.
    // If the pause-agents endpoint already set it to 'idle', this conditional update
    // won't match, preventing the race condition entirely.
    if (agentRun) {
      try {
        const outputJson = JSON.stringify(output);
        const finalStatus = agentFailed ? 'error' : 'done';

        // Atomic conditional update: only change status if still 'running'
        const updated = await prisma.agentRun.updateMany({
          where: { id: agentRun.id, status: 'running' },
          data: {
            status: finalStatus,
            outputsJson: agentFailed ? null : outputJson,
            error: agentErrorMsg,
            completedAt: new Date(),
          },
        });

        // If no rows were updated, the run was paused — save output without changing status
        if (updated.count === 0 && !agentFailed) {
          await prisma.agentRun.update({
            where: { id: agentRun.id },
            data: { outputsJson: outputJson },
          });
        }
      } catch (e) {
        console.error(`[agent-run] Failed to update agentRun ${id}:`, e);
      }
    }

    // If agent returned success: false, respond with error status
    if (agentFailed) {
      return NextResponse.json({
        agentRunId: agentRun?.id,
        agentId: id,
        agentName: agent.name,
        status: 'error',
        error: agentErrorMsg,
        output,
      }, { status: 500 });
    }

    // Return the full output so frontend has it for chaining
    return NextResponse.json({
      agentRunId: agentRun?.id,
      agentId: id,
      agentName: agent.name,
      status: 'done',
      output,
    });
  } catch (error: any) {
    const rawMsg = error.message || 'Unknown error';
    console.error(`[agent-run] Agent ${id} failed:`, rawMsg);
    const errorMsg = friendlyError(rawMsg);

    if (agentRun) {
      try {
        // Only set error if still running (not paused)
        await prisma.agentRun.updateMany({
          where: { id: agentRun.id, status: 'running' },
          data: { status: 'error', error: errorMsg, completedAt: new Date() },
        });
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      agentRunId: agentRun?.id,
      agentId: id,
      agentName: agent.name,
      status: 'error',
      error: errorMsg,
    }, { status: 500 });
  }
}
