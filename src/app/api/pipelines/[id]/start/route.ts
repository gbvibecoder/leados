import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLeadOSAgents } from '@backend/agents/leados/index';

// Discovery & Offer Phase + Funnel Build (first 4 agents)
const PHASE_1_AGENTS = ['service-research', 'offer-engineering', 'validation', 'funnel-builder'];

let agentMap: Map<string, any> | null = null;
function getAgents() {
  if (!agentMap) agentMap = createLeadOSAgents();
  return agentMap;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Update pipeline status
  try {
    await prisma.pipeline.update({
      where: { id },
      data: { status: 'running', currentAgentIndex: 0 },
    });
  } catch {
    // Pipeline might not exist in DB yet — that's ok for now
  }

  const agents = getAgents();
  const previousOutputs: Record<string, any> = {};
  const results: any[] = [];

  // Run first 3 agents in sequence
  for (let i = 0; i < PHASE_1_AGENTS.length; i++) {
    const agentId = PHASE_1_AGENTS[i];
    const agent = agents.get(agentId);
    if (!agent) continue;

    // Update pipeline progress
    try {
      await prisma.pipeline.update({
        where: { id },
        data: { currentAgentIndex: i },
      });
    } catch {
      // ignore
    }

    // Create run record
    const agentRun = await prisma.agentRun.create({
      data: {
        pipelineId: id,
        agentId,
        agentName: agent.name,
        status: 'running',
        inputsJson: JSON.stringify({}),
        startedAt: new Date(),
      },
    });

    try {
      const output = await agent.run({
        pipelineId: id,
        config: {},
        previousOutputs,
      });

      // Store output for next agent in chain
      previousOutputs[agentId] = output;

      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: 'done',
          outputsJson: JSON.stringify(output),
          completedAt: new Date(),
        },
      });

      results.push({
        agentId,
        agentName: agent.name,
        status: 'done',
        output,
      });
    } catch (error: any) {
      await prisma.agentRun.update({
        where: { id: agentRun.id },
        data: {
          status: 'error',
          error: error.message,
          completedAt: new Date(),
        },
      });

      results.push({
        agentId,
        agentName: agent.name,
        status: 'error',
        error: error.message,
      });
      // Stop pipeline on error
      break;
    }
  }

  // Update pipeline status
  const allDone = results.every(r => r.status === 'done');
  try {
    await prisma.pipeline.update({
      where: { id },
      data: {
        status: allDone ? 'completed' : 'error',
        currentAgentIndex: results.length,
      },
    });
  } catch {
    // ignore
  }

  return NextResponse.json({
    id,
    status: allDone ? 'completed' : 'error',
    agentsExecuted: results.length,
    results,
  });
}
