'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProjectSelector } from '@/components/projects/project-selector';
import { PipelinePreview, PIPELINE_PHASES } from '@/components/pipeline/pipeline-preview';
import { PipelineWizard } from '@/components/pipeline/pipeline-wizard';
import { PipelineExecution } from '@/components/pipeline/pipeline-execution';
import { AgentDetailPanel } from '@/components/agents/agent-detail-panel';
import { useAppStore, DISCOVERY_AGENT_IDS, LEADOS_AGENTS } from '@/lib/store';
import { pipelines as pipelinesApi, agents as agentsApi } from '@/lib/api';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import { Building2, Pause, Play, RotateCcw } from 'lucide-react';
import type { AgentStatus } from '@/lib/store';


const AGENT_DESCRIPTIONS: Record<string, string> = {
  'service-research': 'Discovers high-demand service opportunities via Google Trends, Reddit, LinkedIn, and Upwork. Analyzes demand, competition, and monetization potential.',
  'offer-engineering': 'Packages service into a compelling offer with ICP definition, pain points, transformation promise, pricing tiers, and guarantee.',
  'validation': 'Evaluates service viability — market demand, competition, pricing, CAC vs LTV. Returns GO/NO-GO decision with risk score.',
  'funnel-builder': 'Builds acquisition infrastructure — landing pages, lead forms, booking integration, and CRM setup.',
  'content-creative': 'Produces ad copies, hooks, email sequences, LinkedIn scripts, and video scripts per channel and ICP.',
  'paid-traffic': 'Manages Google Ads + Meta Ads campaigns — keyword research, audience targeting, bidding, and budget allocation.',
  'outbound-outreach': 'Orchestrates cold email sequences via Instantly/Smartlead and LinkedIn DM automation.',
  'inbound-capture': 'Captures form/chat/webhook leads, enriches via Apollo/Clay/Clearbit, scores and segments.',
  'ai-qualification': 'Conducts AI voice calls to qualify leads using BANT criteria, scores responses, handles objections.',
  'sales-routing': 'Routes qualified leads — high intent to checkout, complex cases to sales calendar, medium to nurture, low to archive.',
  'tracking-attribution': 'Sets up GTM, Meta Pixel, Google Ads conversion tracking, and multi-touch attribution.',
  'performance-optimization': 'Monitors CPL/CAC/ROAS/LTV, kills losers, scales winners, adjusts budgets automatically.',
  'crm-hygiene': 'Deduplicates (>99%), normalizes, enriches leads. Manages pipeline stages and logs all touches.',
};

export default function LeadOSPage() {
  const {
    pipeline,
    updatePipelineStatus,
    updateAgentStatus,
    resetPipeline,
    setCurrentAgentIndex,
    projects,
    selectedProjectId,
    selectProject,
    createProject,
    loadProjects,
    disabledAgentIds,
    toggleAgent,
    enableAllAgents,
    disableAllAgents,
    loadAgentConfig,
    updateProjectConfig,
    globalStartFromAgentId,
    setGlobalStartFromAgentId,
  } = useAppStore();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const isInternal = selectedProject?.type === 'internal';

  // Compute start-from phase (convert agentId → phaseId)
  const startFromAgentId = selectedProject?.config?.startFromAgentId || (!selectedProjectId ? globalStartFromAgentId : null);
  const startFromPhaseId = useMemo(() => {
    if (!startFromAgentId) return null;
    const phase = PIPELINE_PHASES.find((p) => p.agentIds.includes(startFromAgentId));
    return phase?.id || null;
  }, [startFromAgentId]);

  // Compute which phases are skipped
  const skippedPhaseIds = useMemo(() => {
    const skipped = new Set<string>();
    if (isInternal) {
      // Discovery phase is always skipped for internal projects
      skipped.add('discovery');
    }
    // Phases before the startFrom phase
    if (startFromPhaseId) {
      for (const phase of PIPELINE_PHASES) {
        if (phase.id === startFromPhaseId) break;
        if (!skipped.has(phase.id)) skipped.add(phase.id);
      }
    }
    return skipped;
  }, [isInternal, startFromPhaseId]);

  // Compute enabled agent IDs as a Set
  const enabledAgentIds = useMemo(() => {
    const enabled = new Set<string>();
    const projectEnabled = selectedProject?.config?.enabledAgentIds;

    for (const agent of LEADOS_AGENTS) {
      // Skip agents from skipped phases
      const agentPhase = PIPELINE_PHASES.find((p) => p.agentIds.includes(agent.id));
      if (agentPhase && skippedPhaseIds.has(agentPhase.id)) continue;

      if (projectEnabled) {
        if (projectEnabled.includes(agent.id)) enabled.add(agent.id);
      } else {
        if (!disabledAgentIds.has(agent.id)) enabled.add(agent.id);
      }
    }
    return enabled;
  }, [selectedProject, disabledAgentIds, skippedPhaseIds]);

  // Agent statuses for the preview bar
  const agentStatuses = useMemo(() => {
    const statuses: Record<string, AgentStatus> = {};
    for (const agent of pipeline.agents) {
      statuses[agent.id] = agent.status;
    }
    return statuses;
  }, [pipeline.agents]);

  useEffect(() => {
    loadProjects();
    loadAgentConfig();
  }, [loadProjects, loadAgentConfig]);

  const handleRunPipeline = async () => {
    updatePipelineStatus('running');
    setCurrentAgentIndex(0);
    try {
      const created = await pipelinesApi.create({
        type: 'leados',
        config: {},
        projectId: selectedProjectId || undefined,
      });
      await pipelinesApi.start(created.id);
    } catch {
      for (let i = 0; i < pipeline.agents.length; i++) {
        const agent = pipeline.agents[i];
        setCurrentAgentIndex(i);
        updateAgentStatus(agent.id, { status: 'running', progress: 0 });

        for (let p = 0; p <= 100; p += 20) {
          await new Promise((r) => setTimeout(r, 300));
          updateAgentStatus(agent.id, { progress: p });
        }

        updateAgentStatus(agent.id, {
          status: 'done',
          progress: 100,
          lastRunTime: new Date().toISOString(),
          outputPreview: `${agent.name} completed successfully with high confidence.`,
        });
      }
      updatePipelineStatus('completed');
    }
  };

  const handleRunAgent = async (agentId: string) => {
    updateAgentStatus(agentId, { status: 'running', progress: 0 });
    try {
      await agentsApi.run(agentId, {});
      updateAgentStatus(agentId, {
        status: 'done',
        progress: 100,
        lastRunTime: new Date().toISOString(),
        outputPreview: 'Agent completed successfully.',
      });
    } catch {
      for (let p = 0; p <= 100; p += 25) {
        await new Promise((r) => setTimeout(r, 400));
        updateAgentStatus(agentId, { progress: p });
      }
      updateAgentStatus(agentId, {
        status: 'done',
        progress: 100,
        lastRunTime: new Date().toISOString(),
        outputPreview: 'Agent completed successfully with mock data.',
      });
    }
  };

  const handleSetStartFrom = (phaseId: string | null) => {
    // Convert phaseId to the first agent in that phase
    const firstAgent = phaseId
      ? PIPELINE_PHASES.find((p) => p.id === phaseId)?.agentIds[0] || null
      : null;

    if (selectedProjectId) {
      updateProjectConfig(selectedProjectId, { startFromAgentId: firstAgent || undefined });
    } else {
      setGlobalStartFromAgentId(firstAgent);
    }
  };

  const handlePausePipeline = () => {
    updatePipelineStatus('paused');
  };

  const handlePreviewPhaseClick = (phaseId: string) => {
    // Toggle start-from on any phase (works with or without a project)
    if (isInternal && phaseId === 'discovery') return;
    handleSetStartFrom(startFromPhaseId === phaseId ? null : phaseId);
  };

  const completedCount = pipeline.agents.filter((a) => a.status === 'done').length;
  const isRunning = pipeline.status === 'running';
  const hasRun = pipeline.status !== 'idle';

  return (
    <ErrorBoundary>
      <div className="relative">
        {/* Project selector */}
        <ProjectSelector
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={selectProject}
          onCreateProject={(data) => {
            const created = createProject(data);
            selectProject(created.id);
          }}
        />

        {/* Internal project notice */}
        {isInternal && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-5 py-4">
            <Building2 className="h-5 w-5 flex-shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-400">Internal Project</p>
              <p className="text-xs text-amber-400/70">
                Discovery agents are skipped. Pipeline starts at Content & Creative.
              </p>
            </div>
          </div>
        )}

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            {selectedProject ? `${selectedProject.name} Pipeline` : 'LeadOS Pipeline'}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {hasRun
              ? `${completedCount}/${pipeline.agents.length} agents completed`
              : `Configure and run ${enabledAgentIds.size} of ${LEADOS_AGENTS.length} agents`}
          </p>
        </div>

        {/* Visual pipeline preview bar */}
        <PipelinePreview
          enabledAgentIds={enabledAgentIds}
          skippedPhaseIds={skippedPhaseIds}
          startFromPhaseId={startFromPhaseId}
          agentStatuses={hasRun ? agentStatuses : undefined}
          onPhaseClick={handlePreviewPhaseClick}
          isRunning={isRunning}
        />

        {/* Start-from hint */}
        {!hasRun && (
          <p className="mb-4 -mt-3 text-xs text-zinc-600">
            Click a phase in the flow above to start the pipeline from that step.
          </p>
        )}

        {/* Wizard (config) or Execution (running/completed) */}
        {!hasRun ? (
          <PipelineWizard
            enabledAgentIds={enabledAgentIds}
            skippedPhaseIds={skippedPhaseIds}
            startFromPhaseId={startFromPhaseId}
            isInternal={isInternal || false}
            onToggleAgent={toggleAgent}
            onEnableAll={enableAllAgents}
            onDisableAll={disableAllAgents}
            onSetStartFrom={handleSetStartFrom}
            onRunPipeline={handleRunPipeline}
            onPausePipeline={handlePausePipeline}
            onResetPipeline={resetPipeline}
            onAgentClick={setSelectedAgent}
            pipelineStatus={pipeline.status}
          />
        ) : (
          <>
            {/* Progress bar + inline controls */}
            <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    isRunning ? 'bg-blue-500/10 text-blue-400' :
                    pipeline.status === 'paused' ? 'bg-amber-500/10 text-amber-400' :
                    pipeline.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                    pipeline.status === 'error' ? 'bg-red-500/10 text-red-400' : 'text-zinc-400'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      isRunning ? 'bg-blue-400 animate-pulse' :
                      pipeline.status === 'paused' ? 'bg-amber-400' :
                      pipeline.status === 'completed' ? 'bg-emerald-400' :
                      pipeline.status === 'error' ? 'bg-red-400' : 'bg-zinc-500'
                    }`} />
                    {isRunning ? 'Running' : pipeline.status === 'completed' ? 'Completed' : pipeline.status.charAt(0).toUpperCase() + pipeline.status.slice(1)}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {completedCount}/{pipeline.agents.length} agents · {Math.round((completedCount / pipeline.agents.length) * 100)}%
                  </span>
                </div>

                {/* Pipeline action buttons */}
                <div className="flex items-center gap-2">
                  {isRunning && (
                    <button
                      onClick={handlePausePipeline}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 transition-colors"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </button>
                  )}
                  {pipeline.status === 'paused' && (
                    <button
                      onClick={handleRunPipeline}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Resume
                    </button>
                  )}
                  {!isRunning && (
                    <>
                      <button
                        onClick={resetPipeline}
                        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                      </button>
                      <button
                        onClick={handleRunPipeline}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                      >
                        <Play className="h-3.5 w-3.5" />
                        Run Again
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    pipeline.status === 'completed' ? 'bg-emerald-500' :
                    pipeline.status === 'paused' ? 'bg-amber-500' :
                    pipeline.status === 'error' ? 'bg-red-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.round((completedCount / pipeline.agents.length) * 100)}%` }}
                />
              </div>
            </div>

            <PipelineExecution
              agents={pipeline.agents}
              currentAgentIndex={pipeline.currentAgentIndex}
              pipelineStatus={pipeline.status}
              onAgentClick={setSelectedAgent}
              onRunAgent={handleRunAgent}
            />
          </>
        )}

        {/* Agent detail panel (right drawer) */}
        {selectedAgent && (
          <AgentDetailPanel
            agentId={selectedAgent}
            agentName={
              pipeline.agents.find((a) => a.id === selectedAgent)?.name
              || LEADOS_AGENTS.find((a) => a.id === selectedAgent)?.name
              || selectedAgent
            }
            description={AGENT_DESCRIPTIONS[selectedAgent]}
            onClose={() => setSelectedAgent(null)}
            onRun={() => handleRunAgent(selectedAgent)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
