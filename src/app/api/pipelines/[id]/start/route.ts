import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

// First 4 agents skipped for internal projects
const DISCOVERY_AGENT_IDS = new Set([
  'service-research',
  'offer-engineering',
  'validation',
  'funnel-builder',
]);

/**
 * POST /api/pipelines/[id]/start
 *
 * Lightweight route — just sets pipeline status to "running" and returns
 * the ordered list of agents + project config. The frontend orchestrates
 * agent execution by calling /api/agents/[id]/run for each agent sequentially.
 * This keeps each serverless invocation under Vercel Hobby's 60s limit.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = getUserId(req);

  // Check project type and config
  let isInternal = false;
  let enabledAgentIds: string[] | null = null;
  let projectConfig: Record<string, any> = {};

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

      projectConfig.projectId = proj.id;
      projectConfig.projectName = proj.name;
      projectConfig.projectType = proj.type;
      if (proj.description) projectConfig.projectDescription = proj.description;
      if (proj.name) {
        projectConfig.focus = proj.name;
        projectConfig.niche = proj.name;
        projectConfig.serviceNiche = proj.name;
      }

      if (proj.config) {
        try {
          const cfg = typeof proj.config === 'string' ? JSON.parse(proj.config) : proj.config;
          if (cfg.url) projectConfig.projectUrl = cfg.url;
          if (Array.isArray(cfg.enabledAgentIds)) {
            enabledAgentIds = cfg.enabledAgentIds;
          }
          Object.assign(projectConfig, cfg);
        } catch { /* ignore */ }
      }

      // Set language/localization AFTER Object.assign so it can't be overwritten
      if (proj.language) {
        projectConfig.language = proj.language;
        const langLabel = { en: 'English', es: 'Spanish', fr: 'French', de: 'German', pt: 'Portuguese', it: 'Italian', nl: 'Dutch', hi: 'Hindi', ja: 'Japanese', ko: 'Korean', zh: 'Chinese', ar: 'Arabic', ru: 'Russian', tr: 'Turkish', pl: 'Polish', sv: 'Swedish', da: 'Danish', fi: 'Finnish', no: 'Norwegian', th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay', he: 'Hebrew', cs: 'Czech', ro: 'Romanian', hu: 'Hungarian', uk: 'Ukrainian', el: 'Greek', bn: 'Bengali' }[proj.language] || proj.language;
        projectConfig.localization = {
          instruction: `Generate all output content (ad copy, emails, landing page text, keywords, etc.) in ${langLabel}. If the product uses English brand terms, keep those in English but write surrounding copy in ${langLabel}.`,
        };
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

  return NextResponse.json({
    id,
    status: 'running',
    agentsToRun,
    totalAgents: agentsToRun.length,
    projectConfig,
  });
}
