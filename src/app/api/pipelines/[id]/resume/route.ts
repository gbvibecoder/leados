import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLeadOSAgents } from '@backend/agents/leados/index';
import { pipelineEvents } from '@backend/orchestrator/event-emitter';
import { getUserId } from '@/lib/auth';

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

async function getPipelineStatus(id: string): Promise<string | null> {
  try {
    const p = await prisma.pipeline.findUnique({ where: { id }, select: { status: true } });
    return p?.status || null;
  } catch {
    return null;
  }
}

async function checkPaused(id: string): Promise<boolean> {
  return (await getPipelineStatus(id)) === 'paused';
}

async function checkCancelled(id: string): Promise<boolean> {
  const status = await getPipelineStatus(id);
  return status !== null && status !== 'running' && status !== 'paused';
}

async function waitWhilePaused(id: string, maxWaitMs = 600000): Promise<boolean> {
  const start = Date.now();
  while (await checkPaused(id)) {
    if (Date.now() - start > maxWaitMs) return false;
    await new Promise((r) => setTimeout(r, 2000));
  }
  try {
    const p = await prisma.pipeline.findUnique({ where: { id }, select: { status: true } });
    return p?.status === 'running';
  } catch {
    return false;
  }
}

async function runPipelineFromIndex(
  id: string,
  agentsToRun: string[],
  startIndex: number,
  previousOutputs: Record<string, any>,
  projectData?: { name: string; url?: string; type: string; description?: string; config?: any },
  pipelineUserId?: string | null
) {
  const agents = getAgents();

  const projectConfig: Record<string, any> = {};
  if (projectData) {
    projectConfig.projectName = projectData.name;
    projectConfig.projectType = projectData.type;
    if (projectData.url) projectConfig.projectUrl = projectData.url;
    if (projectData.description) projectConfig.projectDescription = projectData.description;
    if (projectData.name) {
      projectConfig.focus = projectData.name;
      projectConfig.niche = projectData.name;
      projectConfig.serviceNiche = projectData.name;
    }
    if (projectData.config) {
      const cfg = typeof projectData.config === 'string' ? JSON.parse(projectData.config) : projectData.config;
      Object.assign(projectConfig, cfg);
    }
  }

  for (let i = startIndex; i < agentsToRun.length; i++) {
    const agentId = agentsToRun[i];
    const agent = agents.get(agentId);
    if (!agent) continue;

    if (await checkCancelled(id)) return;
    if (await checkPaused(id)) {
      const resumed = await waitWhilePaused(id);
      if (!resumed) return;
    }

    try {
      await prisma.pipeline.update({
        where: { id },
        data: { currentAgentIndex: i },
      });
    } catch { /* ignore */ }

    pipelineEvents.emitAgentStarted({
      agentId,
      agentName: agent.name,
      pipelineId: id,
      pipelineType: 'leados',
      userId: pipelineUserId || undefined,
      timestamp: new Date().toISOString(),
    });

    let agentRun;
    try {
      agentRun = await prisma.agentRun.create({
        data: {
          pipelineId: id,
          agentId,
          agentName: agent.name,
          status: 'running',
          inputsJson: JSON.stringify(projectConfig),
          startedAt: new Date(),
        },
      });
    } catch { /* ignore */ }

    try {
      const output = await agent.run({
        pipelineId: id,
        config: projectConfig,
        previousOutputs,
      });

      if (output?.success) {
        previousOutputs[agentId] = output.data;
      }

      pipelineEvents.emitAgentCompleted({
        agentId,
        agentName: agent.name,
        pipelineId: id,
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
        } catch { /* ignore */ }
      }
    } catch (error: any) {
      pipelineEvents.emitAgentError({
        agentId,
        agentName: agent.name,
        pipelineId: id,
        pipelineType: 'leados',
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      });

      if (agentRun) {
        try {
          await prisma.agentRun.update({
            where: { id: agentRun.id },
            data: { status: 'error', error: error.message, completedAt: new Date() },
          });
        } catch { /* ignore */ }
      }

      try {
        await prisma.pipeline.update({
          where: { id },
          data: { status: 'error', currentAgentIndex: i },
        });
      } catch { /* ignore */ }
      return;
    }
  }

  pipelineEvents.emitPipelineCompleted({
    pipelineId: id,
    pipelineType: 'leados',
    userId: pipelineUserId || undefined,
    summary: { totalAgents: agentsToRun.length, completed: agentsToRun.length },
  });

  try {
    await prisma.pipeline.update({
      where: { id },
      data: { status: 'completed', currentAgentIndex: agentsToRun.length },
    });
  } catch { /* ignore */ }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  // Get pipeline with project and completed agent runs
  const pipeline = await prisma.pipeline.findFirst({
    where: { id, userId: userId ?? 'no-user' },
    include: { project: true, agentRuns: { where: { status: 'done' }, orderBy: { startedAt: 'asc' } } },
  });

  if (!pipeline) {
    return NextResponse.json({ error: 'Pipeline not found' }, { status: 404 });
  }

  // Determine which agents to run (same logic as start)
  let isInternal = false;
  let enabledAgentIds: string[] | null = null;
  let projectData: { name: string; url?: string; type: string; description?: string; config?: any } | undefined;

  if (pipeline.project) {
    const proj = pipeline.project;
    if (proj.type === 'internal') isInternal = true;
    projectData = {
      name: proj.name,
      type: proj.type,
      description: proj.description || undefined,
      config: proj.config || undefined,
    };
    if (proj.config) {
      try {
        const parsedCfg = typeof proj.config === 'string' ? JSON.parse(proj.config) : proj.config;
        if (parsedCfg.url) projectData.url = parsedCfg.url;
        if (Array.isArray(parsedCfg.enabledAgentIds)) enabledAgentIds = parsedCfg.enabledAgentIds;
      } catch { /* ignore */ }
    }
  }

  let agentsToRun: string[];
  if (enabledAgentIds) {
    const enabledSet = new Set(enabledAgentIds);
    agentsToRun = ALL_AGENTS.filter((a) => enabledSet.has(a));
  } else if (isInternal) {
    agentsToRun = ALL_AGENTS.filter((a) => !DISCOVERY_AGENT_IDS.has(a));
  } else {
    agentsToRun = ALL_AGENTS;
  }

  // Rebuild previousOutputs from completed agent runs
  const previousOutputs: Record<string, any> = {};
  const completedAgentIds = new Set<string>();
  for (const run of pipeline.agentRuns) {
    completedAgentIds.add(run.agentId);
    if (run.outputsJson) {
      try {
        const output = typeof run.outputsJson === 'string' ? JSON.parse(run.outputsJson) : run.outputsJson;
        if (output?.data) {
          previousOutputs[run.agentId] = output.data;
        }
      } catch { /* ignore */ }
    }
  }

  // Find the index to resume from (first agent not completed)
  let resumeIndex = 0;
  for (let i = 0; i < agentsToRun.length; i++) {
    if (completedAgentIds.has(agentsToRun[i])) {
      resumeIndex = i + 1;
    } else {
      break;
    }
  }

  // Update status to running
  try {
    await prisma.pipeline.update({
      where: { id },
      data: { status: 'running', currentAgentIndex: resumeIndex },
    });
  } catch { /* ignore */ }

  // Run pipeline from where it left off
  runPipelineFromIndex(id, agentsToRun, resumeIndex, previousOutputs, projectData, userId).catch((err) => {
    console.error('Pipeline resume failed:', err);
  });

  return NextResponse.json({
    id,
    status: 'running',
    message: 'Pipeline resumed',
    resumeFromAgent: agentsToRun[resumeIndex] || 'completed',
    completedAgents: Array.from(completedAgentIds),
    remainingAgents: agentsToRun.slice(resumeIndex),
  });
}
