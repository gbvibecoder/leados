import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLeadOSAgents } from '@backend/agents/leados/index';
import { getUserId } from '@/lib/auth';

// Singleton agent instances
let agentMap: Map<string, any> | null = null;

function getAgents() {
  if (!agentMap) {
    agentMap = createLeadOSAgents();
  }
  return agentMap;
}

// Agent execution order for chaining
const AGENT_ORDER = [
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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);
  const body = await req.json().catch(() => ({}));

  const agents = getAgents();
  const agent = agents.get(id);

  if (!agent) {
    return NextResponse.json({ error: `Agent '${id}' not found` }, { status: 404 });
  }

  // Create or use pipeline
  let pipelineId = body.pipelineId;
  if (!pipelineId) {
    const pipeline = await prisma.pipeline.create({
      data: { type: 'leados', status: 'running', ...(userId && { userId }) },
    });
    pipelineId = pipeline.id;
  }

  // Create the agent run record
  const agentRun = await prisma.agentRun.create({
    data: {
      pipelineId,
      agentId: id,
      agentName: agent.name,
      status: 'running',
      inputsJson: JSON.stringify(body.config || {}),
      startedAt: new Date(),
    },
  });

  // Gather previous agent outputs from this pipeline for chaining
  const previousOutputs: Record<string, any> = {};
  const agentIndex = AGENT_ORDER.indexOf(id);

  if (agentIndex > 0) {
    const previousAgentIds = AGENT_ORDER.slice(0, agentIndex);
    const previousRuns = await prisma.agentRun.findMany({
      where: {
        pipelineId,
        agentId: { in: previousAgentIds },
        status: 'done',
      },
      orderBy: { completedAt: 'desc' },
    });

    for (const run of previousRuns) {
      if (run.outputsJson && !previousOutputs[run.agentId]) {
        try {
          previousOutputs[run.agentId] = JSON.parse(run.outputsJson);
        } catch {
          // skip unparseable
        }
      }
    }
  }

  // Execute the agent
  try {
    const output = await agent.run({
      pipelineId,
      config: body.config || {},
      previousOutputs,
      userId,
    });

    // Update the run record with results
    const completedRun = await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'done',
        outputsJson: JSON.stringify(output),
        completedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: completedRun.id,
      pipelineId,
      agentId: id,
      agentName: agent.name,
      status: 'done',
      inputsJson: body.config || {},
      outputsJson: output,
      startedAt: completedRun.startedAt,
      completedAt: completedRun.completedAt,
      createdAt: completedRun.createdAt,
    });
  } catch (error: any) {
    // Update run as error
    await prisma.agentRun.update({
      where: { id: agentRun.id },
      data: {
        status: 'error',
        error: error.message,
        completedAt: new Date(),
      },
    });

    return NextResponse.json(
      { error: `Agent execution failed: ${error.message}` },
      { status: 500 }
    );
  }
}
