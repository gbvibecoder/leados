'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProjectSelector } from '@/components/projects/project-selector';
import { PIPELINE_PHASES } from '@/components/pipeline/pipeline-preview';
import { AgentDetailPanel } from '@/components/agents/agent-detail-panel';
import { useAppStore, DISCOVERY_AGENT_IDS, LEADOS_AGENTS } from '@/lib/store';
import { pipelines as pipelinesApi, agents as agentsApi } from '@/lib/api';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import {
  Building2, Pause, Play, RotateCcw, ChevronDown, ChevronUp,
  Bot, Check, Loader2, AlertCircle, ArrowDown, Settings2,
  Target, Sparkles, ShieldCheck, Globe, Mail, MousePointer,
  Phone, ArrowRight, BarChart3, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/lib/store';

const AGENT_META: Record<string, { icon: any; color: string; description: string }> = {
  'service-research': { icon: Target, color: 'text-blue-400', description: 'Discovers high-demand service opportunities via Google Trends, Reddit, LinkedIn, and Upwork.' },
  'offer-engineering': { icon: Sparkles, color: 'text-purple-400', description: 'Packages services into compelling offers with ICP definition, pricing tiers, and guarantees.' },
  'validation': { icon: ShieldCheck, color: 'text-emerald-400', description: 'Evaluates service viability — demand, competition, pricing. Returns GO/NO-GO with risk score.' },
  'funnel-builder': { icon: Globe, color: 'text-cyan-400', description: 'Builds acquisition infrastructure — landing pages, lead forms, booking, and CRM setup.' },
  'content-creative': { icon: Mail, color: 'text-pink-400', description: 'Produces ad copies, email sequences, LinkedIn scripts, and video scripts per channel.' },
  'paid-traffic': { icon: MousePointer, color: 'text-orange-400', description: 'Manages Google Ads + Meta Ads — keyword research, audience targeting, bidding, budgets.' },
  'outbound-outreach': { icon: Mail, color: 'text-yellow-400', description: 'Orchestrates cold email sequences via Instantly/Smartlead and LinkedIn DM automation.' },
  'inbound-capture': { icon: Bot, color: 'text-indigo-400', description: 'Captures form/chat/webhook leads, enriches via Apollo/Clay/Clearbit, scores and segments.' },
  'ai-qualification': { icon: Phone, color: 'text-violet-400', description: 'Conducts AI voice calls to qualify leads using BANT criteria and scores responses.' },
  'sales-routing': { icon: ArrowRight, color: 'text-teal-400', description: 'Routes qualified leads — high intent to checkout, complex to sales, medium to nurture.' },
  'tracking-attribution': { icon: BarChart3, color: 'text-sky-400', description: 'Sets up GTM, Meta Pixel, Google Ads conversion tracking, and multi-touch attribution.' },
  'performance-optimization': { icon: TrendingUp, color: 'text-rose-400', description: 'Monitors CPL/CAC/ROAS/LTV, kills losers, scales winners, adjusts budgets.' },
  'crm-hygiene': { icon: ShieldCheck, color: 'text-lime-400', description: 'Deduplicates (>99%), normalizes, enriches leads. Manages pipeline stages and logs touches.' },
};

const PHASE_COLORS: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  discovery: { border: 'border-blue-500/30', bg: 'bg-blue-950/20', text: 'text-blue-400', dot: 'bg-blue-500' },
  content: { border: 'border-pink-500/30', bg: 'bg-pink-950/20', text: 'text-pink-400', dot: 'bg-pink-500' },
  generation: { border: 'border-amber-500/30', bg: 'bg-amber-950/20', text: 'text-amber-400', dot: 'bg-amber-500' },
  qualification: { border: 'border-violet-500/30', bg: 'bg-violet-950/20', text: 'text-violet-400', dot: 'bg-violet-500' },
  optimization: { border: 'border-emerald-500/30', bg: 'bg-emerald-950/20', text: 'text-emerald-400', dot: 'bg-emerald-500' },
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
    globalStartFromAgentId,
  } = useAppStore();

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(PIPELINE_PHASES.map(p => p.id)));
  const [showConfig, setShowConfig] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const isInternal = selectedProject?.type === 'internal';

  const startFromAgentId = selectedProject?.config?.startFromAgentId || (!selectedProjectId ? globalStartFromAgentId : null);
  const startFromPhaseId = useMemo(() => {
    if (!startFromAgentId) return null;
    const phase = PIPELINE_PHASES.find((p) => p.agentIds.includes(startFromAgentId));
    return phase?.id || null;
  }, [startFromAgentId]);

  const hasExplicitAgentConfig = !!selectedProject?.config?.enabledAgentIds;

  const skippedPhaseIds = useMemo(() => {
    const skipped = new Set<string>();
    // Only auto-skip discovery for internal projects when there's no explicit agent selection
    if (isInternal && !hasExplicitAgentConfig) skipped.add('discovery');
    if (startFromPhaseId) {
      for (const phase of PIPELINE_PHASES) {
        if (phase.id === startFromPhaseId) break;
        if (!skipped.has(phase.id)) skipped.add(phase.id);
      }
    }
    return skipped;
  }, [isInternal, hasExplicitAgentConfig, startFromPhaseId]);

  const enabledAgentIds = useMemo(() => {
    const enabled = new Set<string>();
    const projectEnabled = selectedProject?.config?.enabledAgentIds;
    for (const agent of LEADOS_AGENTS) {
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
          outputPreview: `${agent.name} completed successfully.`,
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
        outputPreview: 'Agent completed successfully.',
      });
    }
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  const completedCount = pipeline.agents.filter((a) => a.status === 'done').length;
  const totalAgents = pipeline.agents.length;
  const isRunning = pipeline.status === 'running';
  const hasRun = pipeline.status !== 'idle';
  const progressPercent = totalAgents > 0 ? Math.round((completedCount / totalAgents) * 100) : 0;

  const getPhaseStatus = (phase: typeof PIPELINE_PHASES[0]) => {
    if (skippedPhaseIds.has(phase.id)) return 'skipped';
    const agents = phase.agentIds.filter(id => enabledAgentIds.has(id));
    if (agents.length === 0) return 'disabled';
    if (!hasRun) return 'idle';
    const statuses = agents.map(id => agentStatuses[id] || 'idle');
    if (statuses.every(s => s === 'done')) return 'done';
    if (statuses.some(s => s === 'running')) return 'running';
    if (statuses.some(s => s === 'error')) return 'error';
    if (statuses.some(s => s === 'done')) return 'partial';
    return 'idle';
  };

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {selectedProject ? `${selectedProject.name} Pipeline` : 'LeadOS Pipeline'}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {hasRun
                ? `${completedCount}/${totalAgents} agents completed`
                : `${enabledAgentIds.size} agents ready to run`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ProjectSelector
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={selectProject}
              onCreateProject={(data) => {
                const created = createProject(data);
                selectProject(created.id);
              }}
            />
          </div>
        </div>

        {/* Internal project notice */}
        {isInternal && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <Building2 className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-400/80">
              Internal project — Discovery phase is skipped. Pipeline starts at Content & Creative.
            </p>
          </div>
        )}

        {/* Pipeline Controls */}
        <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasRun && (
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  isRunning ? 'bg-blue-500/10 text-blue-400' :
                  pipeline.status === 'paused' ? 'bg-amber-500/10 text-amber-400' :
                  pipeline.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                  pipeline.status === 'error' ? 'bg-red-500/10 text-red-400' : 'text-zinc-400'
                )}>
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isRunning ? 'bg-blue-400 animate-pulse' :
                    pipeline.status === 'completed' ? 'bg-emerald-400' :
                    pipeline.status === 'paused' ? 'bg-amber-400' :
                    'bg-red-400'
                  )} />
                  {isRunning ? 'Running' : pipeline.status === 'completed' ? 'Completed' : pipeline.status.charAt(0).toUpperCase() + pipeline.status.slice(1)}
                </span>
              )}
              {!hasRun && (
                <span className="text-sm text-zinc-400">
                  {enabledAgentIds.size} of {LEADOS_AGENTS.length} agents enabled
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {!hasRun && (
                <button
                  onClick={() => setShowConfig(v => !v)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors',
                    showConfig
                      ? 'border-indigo-500/40 bg-indigo-950/20 text-indigo-400'
                      : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  )}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Configure
                </button>
              )}
              {(pipeline.status === 'idle' || pipeline.status === 'completed' || pipeline.status === 'error') && (
                <button
                  onClick={handleRunPipeline}
                  disabled={enabledAgentIds.size === 0}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  {hasRun ? 'Run Again' : 'Run Pipeline'}
                </button>
              )}
              {isRunning && (
                <button
                  onClick={() => updatePipelineStatus('paused')}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-500 transition-colors"
                >
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </button>
              )}
              {pipeline.status === 'paused' && (
                <button
                  onClick={handleRunPipeline}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </button>
              )}
              {hasRun && !isRunning && (
                <button
                  onClick={resetPipeline}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Progress bar (only when running or completed) */}
          {hasRun && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-zinc-500">Progress</span>
                <span className="text-[10px] text-zinc-500">{progressPercent}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    pipeline.status === 'completed' ? 'bg-emerald-500' :
                    pipeline.status === 'paused' ? 'bg-amber-500' :
                    pipeline.status === 'error' ? 'bg-red-500' : 'bg-indigo-500'
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Agent Configuration Panel (collapsible) */}
        {showConfig && !hasRun && (
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-zinc-200">Agent Configuration</h3>
              <div className="flex gap-2">
                <button onClick={enableAllAgents} className="text-[10px] text-emerald-400 hover:text-emerald-300">Enable All</button>
                <span className="text-zinc-700">|</span>
                <button onClick={disableAllAgents} className="text-[10px] text-red-400 hover:text-red-300">Disable All</button>
              </div>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {LEADOS_AGENTS.map(agent => {
                const meta = AGENT_META[agent.id];
                const isEnabled = enabledAgentIds.has(agent.id);
                const isSkippedInternal = isInternal && DISCOVERY_AGENT_IDS.includes(agent.id);
                const agentPhase = PIPELINE_PHASES.find(p => p.agentIds.includes(agent.id));
                const isSkippedPhase = agentPhase ? skippedPhaseIds.has(agentPhase.id) : false;
                const isSkipped = isSkippedInternal || isSkippedPhase;

                return (
                  <div
                    key={agent.id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors',
                      isSkipped ? 'border-zinc-800/40 bg-zinc-900/20 opacity-40' :
                      isEnabled ? 'border-indigo-500/30 bg-indigo-950/10' : 'border-zinc-800 bg-zinc-900/30'
                    )}
                  >
                    {meta && <meta.icon className={cn('h-3.5 w-3.5 shrink-0', isEnabled ? meta.color : 'text-zinc-600')} />}
                    <span className={cn('flex-1 text-xs truncate', isEnabled ? 'text-zinc-200' : 'text-zinc-500')}>
                      {agent.name.replace(' Agent', '')}
                    </span>
                    <button
                      onClick={() => !isSkipped && toggleAgent(agent.id)}
                      disabled={isSkipped}
                      className={cn(
                        'h-5 w-9 rounded-full p-0.5 transition-colors shrink-0',
                        isSkipped ? 'bg-zinc-800 cursor-not-allowed' :
                        isEnabled ? 'bg-indigo-600' : 'bg-zinc-700'
                      )}
                    >
                      <div className={cn(
                        'h-4 w-4 rounded-full bg-white transition-transform',
                        isEnabled ? 'translate-x-4' : 'translate-x-0',
                        isSkipped && 'bg-zinc-600'
                      )} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pipeline Flow — vertical phases */}
        <div className="space-y-3">
          {PIPELINE_PHASES.map((phase, phaseIndex) => {
            const isSkipped = skippedPhaseIds.has(phase.id);
            const phaseStatus = getPhaseStatus(phase);
            const isExpanded = expandedPhases.has(phase.id);
            const colors = PHASE_COLORS[phase.id] || PHASE_COLORS.discovery;
            const enabledCount = phase.agentIds.filter(id => enabledAgentIds.has(id)).length;
            const totalCount = phase.agentIds.length;
            const phaseAgents = phase.agentIds
              .map(id => LEADOS_AGENTS.find(a => a.id === id))
              .filter(Boolean) as typeof LEADOS_AGENTS;

            return (
              <div key={phase.id}>
                {/* Phase card */}
                <div
                  className={cn(
                    'rounded-xl border transition-all',
                    isSkipped ? 'border-zinc-800/40 bg-zinc-900/20 opacity-40' :
                    phaseStatus === 'done' ? 'border-emerald-500/30 bg-emerald-950/10' :
                    phaseStatus === 'running' ? cn(colors.border, colors.bg) :
                    phaseStatus === 'error' ? 'border-red-500/30 bg-red-950/10' :
                    'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                  )}
                >
                  {/* Phase header */}
                  <button
                    onClick={() => !isSkipped && togglePhase(phase.id)}
                    disabled={isSkipped}
                    className="flex w-full items-center gap-3 px-4 py-3"
                  >
                    {/* Step number / status */}
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold shrink-0',
                      isSkipped ? 'bg-zinc-800 text-zinc-600' :
                      phaseStatus === 'done' ? 'bg-emerald-900/50 text-emerald-400' :
                      phaseStatus === 'running' ? 'bg-blue-900/50 text-blue-400' :
                      phaseStatus === 'error' ? 'bg-red-900/50 text-red-400' :
                      'bg-zinc-800 text-zinc-400'
                    )}>
                      {phaseStatus === 'done' ? <Check className="h-4 w-4" /> :
                       phaseStatus === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> :
                       phaseStatus === 'error' ? <AlertCircle className="h-4 w-4" /> :
                       phaseIndex + 1}
                    </div>

                    {/* Phase info */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          'text-sm font-semibold',
                          isSkipped ? 'text-zinc-600' :
                          phaseStatus === 'done' ? 'text-emerald-400' :
                          phaseStatus === 'running' ? 'text-blue-400' : 'text-zinc-200'
                        )}>
                          {phase.label}
                        </h3>
                        {isSkipped && (
                          <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5">Skipped</span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {enabledCount}/{totalCount} agents
                        {phaseStatus === 'done' && ' — completed'}
                        {phaseStatus === 'running' && ' — in progress'}
                      </p>
                    </div>

                    {/* Expand/collapse */}
                    {!isSkipped && (
                      isExpanded
                        ? <ChevronUp className="h-4 w-4 text-zinc-500" />
                        : <ChevronDown className="h-4 w-4 text-zinc-500" />
                    )}
                  </button>

                  {/* Expanded agent list */}
                  {isExpanded && !isSkipped && (
                    <div className="px-4 pb-3 space-y-1.5">
                      <div className="h-px bg-zinc-800/50 mb-2" />
                      {phaseAgents.map(agent => {
                        const meta = AGENT_META[agent.id];
                        const Icon = meta?.icon || Bot;
                        const isEnabled = enabledAgentIds.has(agent.id);
                        const status = agentStatuses[agent.id] || 'idle';
                        const pipelineAgent = pipeline.agents.find(a => a.id === agent.id);

                        return (
                          <div
                            key={agent.id}
                            onClick={() => setSelectedAgent(agent.id)}
                            className={cn(
                              'group flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-all',
                              !isEnabled ? 'border-zinc-800/40 bg-zinc-900/20 opacity-40' :
                              status === 'done' ? 'border-emerald-500/20 bg-emerald-950/5 hover:border-emerald-500/40' :
                              status === 'running' ? 'border-blue-500/30 bg-blue-950/10' :
                              status === 'error' ? 'border-red-500/30 bg-red-950/10' :
                              'border-zinc-800/60 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-900/40'
                            )}
                          >
                            {/* Agent icon */}
                            <div className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                              !isEnabled ? 'bg-zinc-800/50' :
                              status === 'done' ? 'bg-emerald-900/30' :
                              status === 'running' ? 'bg-blue-900/30' :
                              'bg-zinc-800/80'
                            )}>
                              {status === 'running' ? (
                                <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                              ) : status === 'done' ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : status === 'error' ? (
                                <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                              ) : (
                                <Icon className={cn('h-3.5 w-3.5', isEnabled ? meta?.color || 'text-zinc-400' : 'text-zinc-600')} />
                              )}
                            </div>

                            {/* Agent info */}
                            <div className="flex-1 min-w-0">
                              <p className={cn(
                                'text-xs font-medium truncate',
                                !isEnabled ? 'text-zinc-600' :
                                status === 'done' ? 'text-emerald-400' :
                                status === 'running' ? 'text-blue-400' : 'text-zinc-200'
                              )}>
                                {agent.name}
                              </p>
                              {pipelineAgent?.outputPreview && status === 'done' && (
                                <p className="text-[10px] text-zinc-500 truncate mt-0.5">{pipelineAgent.outputPreview}</p>
                              )}
                              {pipelineAgent?.error && status === 'error' && (
                                <p className="text-[10px] text-red-400 truncate mt-0.5">{pipelineAgent.error}</p>
                              )}
                              {!hasRun && isEnabled && (
                                <p className="text-[10px] text-zinc-600 truncate mt-0.5">{meta?.description}</p>
                              )}
                            </div>

                            {/* Status / action */}
                            {status === 'running' && pipelineAgent?.progress !== undefined && (
                              <span className="text-[10px] text-blue-400 shrink-0">{pipelineAgent.progress}%</span>
                            )}
                            {status === 'done' && pipelineAgent?.lastRunTime && (
                              <span className="text-[10px] text-zinc-600 shrink-0">
                                {new Date(pipelineAgent.lastRunTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            {status === 'idle' && isEnabled && !isRunning && hasRun && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRunAgent(agent.id); }}
                                className="rounded-md p-1.5 text-zinc-600 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-white transition-all"
                              >
                                <Play className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Connector arrow between phases */}
                {phaseIndex < PIPELINE_PHASES.length - 1 && !isSkipped && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-4 w-4 text-zinc-700" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Agent detail panel */}
        {selectedAgent && (
          <AgentDetailPanel
            agentId={selectedAgent}
            agentName={
              pipeline.agents.find((a) => a.id === selectedAgent)?.name
              || LEADOS_AGENTS.find((a) => a.id === selectedAgent)?.name
              || selectedAgent
            }
            description={AGENT_META[selectedAgent]?.description}
            onClose={() => setSelectedAgent(null)}
            onRun={() => handleRunAgent(selectedAgent)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
