import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLeadOSAgents } from '@backend/agents/leados/index';
import { pipelineEvents } from '@backend/orchestrator/event-emitter';

// All 13 agents in pipeline order
const ALL_AGENTS = [
  'service-research',
  'offer-engineering',
  'validation',
  'funnel-builder',
  'content-creative',
  'paid-traffic',
  'outbound-outreach',
  'inbound-capture',
  'ai-qualification',
  'sales-routing',
  'tracking-attribution',
  'performance-optimization',
  'crm-hygiene',
];

// First 4 agents skipped for internal projects
const DISCOVERY_AGENT_IDS = new Set([
  'service-research',
  'offer-engineering',
  'validation',
  'funnel-builder',
]);

let agentMap: Map<string, any> | null = null;
function getAgents() {
  if (!agentMap) agentMap = createLeadOSAgents();
  return agentMap;
}

async function runPipelineInBackground(id: string, agentsToRun: string[]) {
  const agents = getAgents();
  const previousOutputs: Record<string, any> = {};

  for (let i = 0; i < agentsToRun.length; i++) {
    const agentId = agentsToRun[i];
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

    // Emit SSE event: agent started
    pipelineEvents.emitAgentStarted({
      agentId,
      agentName: agent.name,
      pipelineId: id,
      pipelineType: 'leados',
      timestamp: new Date().toISOString(),
    });

    // Create run record
    let agentRun;
    try {
      agentRun = await prisma.agentRun.create({
        data: {
          pipelineId: id,
          agentId,
          agentName: agent.name,
          status: 'running',
          inputsJson: JSON.stringify({}),
          startedAt: new Date(),
        },
      });
    } catch {
      // ignore DB errors — still run the agent
    }

    try {
      const output = await agent.run({
        pipelineId: id,
        config: {},
        previousOutputs,
      });

      // Store output for next agent in chain
      if (output?.success) {
        previousOutputs[agentId] = output.data;
      }

      // Emit SSE event: agent completed
      pipelineEvents.emitAgentCompleted({
        agentId,
        agentName: agent.name,
        pipelineType: 'leados',
        outputSummary: output?.reasoning || 'Completed successfully',
        timestamp: new Date().toISOString(),
      });

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
        } catch {
          // ignore
        }
      }
    } catch (error: any) {
      // Emit SSE event: agent error
      pipelineEvents.emitAgentError({
        agentId,
        agentName: agent.name,
        pipelineType: 'leados',
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      if (agentRun) {
        try {
          await prisma.agentRun.update({
            where: { id: agentRun.id },
            data: {
              status: 'error',
              error: error.message,
              completedAt: new Date(),
            },
          });
        } catch {
          // ignore
        }
      }

      // Update pipeline to error and stop
      try {
        await prisma.pipeline.update({
          where: { id },
          data: { status: 'error', currentAgentIndex: i },
        });
      } catch {
        // ignore
      }
      return; // Stop pipeline on error
    }
  }

  // All agents completed successfully
  pipelineEvents.emitPipelineCompleted({
    pipelineId: id,
    pipelineType: 'leados',
    summary: { totalAgents: agentsToRun.length, completed: agentsToRun.length },
  });

  try {
    await prisma.pipeline.update({
      where: { id },
      data: { status: 'completed', currentAgentIndex: agentsToRun.length },
    });
  } catch {
    // ignore
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Check if pipeline is linked to an internal project
  let isInternal = false;
  try {
    const pipeline = await prisma.pipeline.findUnique({
      where: { id },
      include: { project: true },
    });
    if (pipeline?.project?.type === 'internal') {
      isInternal = true;
    }
  } catch {
    // ignore
  }

  // Determine which agents to run
  const agentsToRun = isInternal
    ? ALL_AGENTS.filter((a) => !DISCOVERY_AGENT_IDS.has(a))
    : ALL_AGENTS;

  // Update pipeline status to running
  try {
    await prisma.pipeline.update({
      where: { id },
      data: { status: 'running', currentAgentIndex: 0 },
    });
  } catch {
    // Pipeline might not exist in DB yet
  }

  // Run pipeline in background — don't block the HTTP response
  runPipelineInBackground(id, agentsToRun).catch((err) => {
    console.error('Pipeline background run failed:', err);
  });

  return NextResponse.json({
    id,
    status: 'running',
    agentsToRun,
    totalAgents: agentsToRun.length,
  });
}
