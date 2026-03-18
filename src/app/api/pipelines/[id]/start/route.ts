import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLeadOSAgents } from '@backend/agents/leados/index';
import { pipelineEvents } from '@backend/orchestrator/event-emitter';
import { getUserId } from '@/lib/auth';

// Allow up to 5 minutes for pipeline execution on Vercel
export const maxDuration = 300;

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
  // If status is not running or paused, pipeline was cancelled/stopped
  return status !== null && status !== 'running' && status !== 'paused';
}

async function waitWhilePaused(id: string, maxWaitMs = 600000): Promise<boolean> {
  const start = Date.now();
  while (await checkPaused(id)) {
    if (Date.now() - start > maxWaitMs) return false; // timed out while paused
    await new Promise((r) => setTimeout(r, 2000)); // poll every 2s
  }
  // Check if pipeline was cancelled/errored while paused
  try {
    const p = await prisma.pipeline.findUnique({ where: { id }, select: { status: true } });
    return p?.status === 'running';
  } catch {
    return false;
  }
}

async function runPipelineInBackground(id: string, agentsToRun: string[], projectData?: { name: string; url?: string; type: string; description?: string; config?: any }, pipelineUserId?: string | null) {
  const agents = getAgents();
  const previousOutputs: Record<string, any> = {};

  // Build project config to pass to each agent
  const projectConfig: Record<string, any> = {};
  if (projectData) {
    projectConfig.projectName = projectData.name;
    projectConfig.projectType = projectData.type;
    if (projectData.url) projectConfig.projectUrl = projectData.url;
    if (projectData.description) projectConfig.projectDescription = projectData.description;

    // Map project name/description into fields agents look for (focus, niche, serviceNiche)
    // so agents automatically research/generate for this specific project
    if (projectData.name) {
      projectConfig.focus = projectData.name;
      projectConfig.niche = projectData.name;
      projectConfig.serviceNiche = projectData.name;
    }

    // Merge any extra config from the project (e.g. enabledAgentIds, url, budget overrides)
    if (projectData.config) {
      const cfg = typeof projectData.config === 'string' ? JSON.parse(projectData.config) : projectData.config;
      Object.assign(projectConfig, cfg);
    }
  }

  for (let i = 0; i < agentsToRun.length; i++) {
    const agentId = agentsToRun[i];
    const agent = agents.get(agentId);
    if (!agent) continue;

    // Check if pipeline was cancelled
    if (await checkCancelled(id)) return;

    // Check if pipeline was paused — wait for resume
    if (await checkPaused(id)) {
      const resumed = await waitWhilePaused(id);
      if (!resumed) return; // pipeline was cancelled or timed out
    }

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
      userId: pipelineUserId || undefined,
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
          inputsJson: JSON.stringify(projectConfig),
          startedAt: new Date(),
        },
      });
    } catch {
      // ignore DB errors — still run the agent
    }

    try {
      const output = await agent.run({
        pipelineId: id,
        config: projectConfig,
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
        } catch {
          // ignore
        }
      }
    } catch (error: any) {
      // Emit SSE event: agent error
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
    userId: pipelineUserId || undefined,
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
  const userId = getUserId(req);

  // Check project type and config
  let isInternal = false;
  let enabledAgentIds: string[] | null = null;
  let projectData: { name: string; url?: string; type: string; description?: string; config?: any } | undefined;
  try {
    const pipeline = await prisma.pipeline.findFirst({
      where: { id, userId: userId ?? 'no-user' },
      include: { project: true },
    });
    if (pipeline?.project) {
      const proj = pipeline.project;
      if (proj.type === 'internal') {
        isInternal = true;
      }
      projectData = {
        name: proj.name,
        type: proj.type,
        description: proj.description || undefined,
        config: proj.config || undefined,
      };
      // Extract URL from config if present
      if (proj.config) {
        try {
          const parsedCfg = typeof proj.config === 'string' ? JSON.parse(proj.config) : proj.config;
          if (parsedCfg.url) projectData.url = parsedCfg.url;
        } catch { /* ignore */ }
      }
      // Read project-level agent config
      if (proj.config) {
        try {
          const config = typeof proj.config === 'string'
            ? JSON.parse(proj.config)
            : proj.config;
          if (Array.isArray(config.enabledAgentIds)) {
            enabledAgentIds = config.enabledAgentIds;
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  } catch {
    // ignore
  }

  // Also check pipeline's own config for enabledAgentIds (passed from frontend)
  if (!enabledAgentIds) {
    try {
      const pipelineRecord = await prisma.pipeline.findUnique({ where: { id }, select: { config: true } });
      if (pipelineRecord?.config) {
        const pipelineCfg = typeof pipelineRecord.config === 'string' ? JSON.parse(pipelineRecord.config) : pipelineRecord.config;
        if (Array.isArray(pipelineCfg.enabledAgentIds)) {
          enabledAgentIds = pipelineCfg.enabledAgentIds;
        }
      }
    } catch { /* ignore */ }
  }

  // Determine which agents to run
  let agentsToRun: string[];
  if (enabledAgentIds) {
    // Use agent selection from project or pipeline config, preserving pipeline order
    const enabledSet = new Set(enabledAgentIds);
    agentsToRun = ALL_AGENTS.filter((a) => enabledSet.has(a));
  } else if (isInternal) {
    agentsToRun = ALL_AGENTS.filter((a) => !DISCOVERY_AGENT_IDS.has(a));
  } else {
    agentsToRun = ALL_AGENTS;
  }

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
  runPipelineInBackground(id, agentsToRun, projectData, userId).catch((err) => {
    console.error('Pipeline background run failed:', err);
  });

  return NextResponse.json({
    id,
    status: 'running',
    agentsToRun,
    totalAgents: agentsToRun.length,
  });
}
