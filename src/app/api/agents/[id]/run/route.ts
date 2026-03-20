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

    // Save result to DB
    if (agentRun) {
      try {
        await prisma.agentRun.update({
          where: { id: agentRun.id },
          data: {
            status: 'done',
            outputsJson: JSON.stringify(output),
            completedAt: new Date(),
          },
        });
      } catch (e) {
        console.error(`[agent-run] Failed to update agentRun ${id}:`, e);
      }
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
    const errorMsg = error.message || 'Unknown error';
    console.error(`[agent-run] Agent ${id} failed:`, errorMsg);

    if (agentRun) {
      try {
        await prisma.agentRun.update({
          where: { id: agentRun.id },
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
