'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ProjectSelector } from '@/components/projects/project-selector';
import { PIPELINE_PHASES } from '@/components/pipeline/pipeline-preview';
import { AgentDetailPanel } from '@/components/agents/agent-detail-panel';
import { useAppStore, DISCOVERY_AGENT_IDS, LEADOS_AGENTS } from '@/lib/store';
import { pipelines as pipelinesApi, agents as agentsApi, apiFetch } from '@/lib/api';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import {
  Building2, Pause, Play, RotateCcw, ChevronDown, ChevronUp, ChevronRight,
  Bot, Check, Loader2, AlertCircle, ArrowDown, Settings2,
  Target, Sparkles, ShieldCheck, Globe, Mail, MousePointer,
  Phone, ArrowRight, BarChart3, TrendingUp, RefreshCw,
  Eye, Zap, Clock, ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentStatus } from '@/lib/store';

const AGENT_META: Record<string, { icon: any; color: string; description: string; tools: string[] }> = {
  'service-research': { icon: Target, color: 'text-blue-400', description: 'Discovers high-demand service opportunities via Google Trends, Reddit, LinkedIn, and Upwork.', tools: ['Google Trends (SerpAPI)', 'Reddit API', 'LinkedIn', 'Upwork'] },
  'offer-engineering': { icon: Sparkles, color: 'text-purple-400', description: 'Packages services into compelling offers with ICP definition, pricing tiers, and guarantees.', tools: ['Claude AI', 'Market Data'] },
  'validation': { icon: ShieldCheck, color: 'text-emerald-400', description: 'Evaluates service viability — demand, competition, pricing. Returns GO/NO-GO with risk score.', tools: ['Claude AI', 'Google Trends'] },
  'funnel-builder': { icon: Globe, color: 'text-cyan-400', description: 'Builds acquisition infrastructure — landing pages, lead forms, booking, and CRM setup.', tools: ['Webflow API', 'Calendly', 'HubSpot CRM'] },
  'content-creative': { icon: Mail, color: 'text-pink-400', description: 'Produces ad copies, email sequences, LinkedIn scripts, and video scripts per channel.', tools: ['Claude AI', 'Multi-channel'] },
  'paid-traffic': { icon: MousePointer, color: 'text-orange-400', description: 'Manages Google Ads + Meta Ads — keyword research, audience targeting, bidding, budgets.', tools: ['Google Ads API', 'Meta Ads API'] },
  'outbound-outreach': { icon: Mail, color: 'text-yellow-400', description: 'Orchestrates cold email sequences via Instantly/Smartlead and LinkedIn DM automation.', tools: ['Instantly.ai', 'LinkedIn', 'Apollo.io'] },
  'inbound-capture': { icon: Bot, color: 'text-indigo-400', description: 'Captures form/chat/webhook leads, enriches via Apollo/Clay/Clearbit, scores and segments.', tools: ['Apollo.io', 'Clearbit', 'HubSpot'] },
  'ai-qualification': { icon: Phone, color: 'text-violet-400', description: 'Conducts AI voice calls to qualify leads using BANT criteria and scores responses.', tools: ['Bland AI', 'Vapi', 'ElevenLabs'] },
  'sales-routing': { icon: ArrowRight, color: 'text-teal-400', description: 'Routes qualified leads — high intent to checkout, complex to sales, medium to nurture.', tools: ['CRM Rules Engine', 'Calendly'] },
  'tracking-attribution': { icon: BarChart3, color: 'text-sky-400', description: 'Sets up GTM, Meta Pixel, Google Ads conversion tracking, and multi-touch attribution.', tools: ['Google Tag Manager', 'Meta Pixel', 'GA4'] },
  'performance-optimization': { icon: TrendingUp, color: 'text-rose-400', description: 'Monitors CPL/CAC/ROAS/LTV, kills losers, scales winners, adjusts budgets.', tools: ['Google Ads', 'Meta Ads', 'Analytics'] },
  'crm-hygiene': { icon: ShieldCheck, color: 'text-lime-400', description: 'Deduplicates (>99%), normalizes, enriches leads. Manages pipeline stages and logs touches.', tools: ['HubSpot CRM', 'Apollo.io', 'Clearbit'] },
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
    setPipelineId,
    projects,
    selectedProjectId,
    selectProject,
    createProject,
    createProjectAsync,
    loadProjects,
    disabledAgentIds,
    toggleAgent,
    enableAllAgents,
    disableAllAgents,
    loadAgentConfig,
    globalStartFromAgentId,
    addActivity,
    clearActivities,
  } = useAppStore();

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(PIPELINE_PHASES.map(p => p.id)));
  const [showConfig, setShowConfig] = useState(false);
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [agentOutputs, setAgentOutputs] = useState<Record<string, any>>({});
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({});
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const timerRef = useRef<Record<string, NodeJS.Timeout>>({});

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

  const isPaused = pipeline.status === 'paused';

  // Compute effective agent statuses — ENFORCES only ONE agent can be "running" at a time
  // If the store has multiple agents as "running" (due to SSE race conditions),
  // only the one at currentAgentIndex is truly running; others are forced to "done"
  const agentStatuses = useMemo(() => {
    const statuses: Record<string, AgentStatus> = {};
    const currentAgent = pipeline.agents[pipeline.currentAgentIndex];
    for (const agent of pipeline.agents) {
      let status = agent.status;
      // If this agent says "running" but it's NOT the current agent, force it to "done"
      if (status === 'running' && currentAgent && agent.id !== currentAgent.id) {
        status = 'done';
      }
      statuses[agent.id] = status;
    }
    return statuses;
  }, [pipeline.agents, pipeline.currentAgentIndex]);

  useEffect(() => {
    loadProjects();
    loadAgentConfig();
  }, [loadProjects, loadAgentConfig]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timerRef.current).forEach(clearInterval);
    };
  }, []);

  // Auto-manage timers based on CORRECTED agent statuses (only one running at a time)
  // Use a JSON key to detect changes without variable-length dependency arrays
  const agentStatusKey = JSON.stringify(
    pipeline.agents.map(a => agentStatuses[a.id] || 'idle')
  );
  useEffect(() => {
    for (const agent of pipeline.agents) {
      const effectiveStatus = agentStatuses[agent.id] || 'idle';
      const hasTimer = !!timerRef.current[agent.id];

      if (effectiveStatus === 'running' && !hasTimer && !isPaused) {
        // This agent is the ONLY one running — stop ALL other timers first
        for (const otherId of Object.keys(timerRef.current)) {
          if (otherId !== agent.id) {
            clearInterval(timerRef.current[otherId]);
            delete timerRef.current[otherId];
          }
        }
        // Start this agent's timer
        setElapsedTimes(prev => ({ ...prev, [agent.id]: 0 }));
        timerRef.current[agent.id] = setInterval(() => {
          setElapsedTimes(prev => ({ ...prev, [agent.id]: (prev[agent.id] || 0) + 1 }));
        }, 1000);
      } else if (effectiveStatus !== 'running' && hasTimer) {
        // Agent is no longer the running one — stop its timer
        clearInterval(timerRef.current[agent.id]);
        delete timerRef.current[agent.id];
      }
    }
  }, [agentStatusKey, isPaused]); // eslint-disable-line react-hooks/exhaustive-deps

  const startAgentTimer = useCallback((agentId: string) => {
    if (timerRef.current[agentId]) clearInterval(timerRef.current[agentId]);
    setElapsedTimes(prev => ({ ...prev, [agentId]: 0 }));
    timerRef.current[agentId] = setInterval(() => {
      setElapsedTimes(prev => ({ ...prev, [agentId]: (prev[agentId] || 0) + 1 }));
    }, 1000);
  }, []);

  const stopAgentTimer = useCallback((agentId: string) => {
    if (timerRef.current[agentId]) {
      clearInterval(timerRef.current[agentId]);
      delete timerRef.current[agentId];
    }
  }, []);

  // Run full pipeline — calls real API, SSE handles status updates
  const handleRunPipeline = async () => {
    setPipelineError(null);
    setAgentOutputs({});
    setElapsedTimes({});
    updatePipelineStatus('running');
    setCurrentAgentIndex(0);

    // Stop all existing timers
    Object.keys(timerRef.current).forEach(id => {
      clearInterval(timerRef.current[id]);
      delete timerRef.current[id];
    });

    // Cancel any previously running pipeline so its SSE events stop
    if (pipeline.id) {
      try {
        await apiFetch(`/api/pipelines/${pipeline.id}/pause`, { method: 'POST' });
      } catch {
        // ignore
      }
    }

    // Reset all agent statuses
    for (const agent of pipeline.agents) {
      updateAgentStatus(agent.id, { status: 'idle', progress: 0, error: undefined, outputPreview: undefined, lastRunTime: undefined });
    }

    try {
      const created = await pipelinesApi.create({
        type: 'leados',
        config: { enabledAgentIds: [...enabledAgentIds] },
        projectId: selectedProjectId || undefined,
      });
      setPipelineId(created.id);

      addActivity({
        type: 'info',
        message: `Pipeline started with ${enabledAgentIds.size} agents`,
      });

      // Start pipeline — runs in background, SSE events update the UI
      const result = await pipelinesApi.start(created.id);

      addActivity({
        type: 'info',
        message: `Pipeline running: ${result.totalAgents} agents queued`,
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to start pipeline';
      setPipelineError(errorMsg);
      updatePipelineStatus('error');
      addActivity({
        type: 'agent_error',
        message: `Pipeline failed: ${errorMsg}`,
      });
    }
  };

  // Run a single agent with real API call — enforces sequential order
  const handleRunAgent = async (agentId: string) => {
    // Block if pipeline is already running (SSE handles agent progression)
    if (isRunning) return;

    // Enforce sequential order: all previous agents must be done
    const agentIndex = pipeline.agents.findIndex(a => a.id === agentId);
    if (agentIndex > 0) {
      const previousAgents = pipeline.agents.slice(0, agentIndex);
      const allPreviousDone = previousAgents.every(a => a.status === 'done');
      if (!allPreviousDone) {
        const firstPending = previousAgents.find(a => a.status !== 'done');
        setPipelineError(`Cannot run ${LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId} — ${firstPending?.name || 'previous agent'} must complete first`);
        return;
      }
    }

    setRunningAgentId(agentId);
    setPipelineError(null);
    updateAgentStatus(agentId, { status: 'running', progress: 0, error: undefined });
    startAgentTimer(agentId);

    addActivity({
      type: 'agent_started',
      agentId,
      agentName: LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId,
      message: `${LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId} started`,
    });

    try {
      // Fire agent — returns immediately with status: 'running'
      await agentsApi.run(agentId, {
        pipelineId: pipeline.id,
        config: {},
      });

      // Poll for completion every 3 seconds
      const pollForCompletion = async () => {
        const maxPolls = 200; // ~10 minutes max
        for (let i = 0; i < maxPolls; i++) {
          await new Promise(r => setTimeout(r, 3000));
          try {
            const runs = await agentsApi.runs(agentId);
            const latestRun = runs?.[0];
            if (!latestRun) continue;

            if (latestRun.status === 'done') {
              stopAgentTimer(agentId);
              const output = latestRun.outputsJson || latestRun;
              setAgentOutputs(prev => ({ ...prev, [agentId]: output }));

              const preview = output?.reasoning
                || output?.data?.reasoning
                || (output?.success ? 'Completed successfully with live data' : 'Completed');

              updateAgentStatus(agentId, {
                status: 'done',
                progress: 100,
                lastRunTime: new Date().toISOString(),
                outputPreview: typeof preview === 'string' ? preview.slice(0, 120) : 'Agent completed successfully',
              });

              addActivity({
                type: 'agent_completed',
                agentId,
                agentName: LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId,
                message: `${LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId} completed`,
              });
              return;
            }

            if (latestRun.status === 'error') {
              throw new Error(latestRun.error || 'Agent execution failed');
            }
          } catch (pollErr: any) {
            if (pollErr.message && pollErr.message !== 'Agent execution failed') {
              // Network error during poll — keep trying
              continue;
            }
            throw pollErr;
          }
        }
        throw new Error('Agent timed out after 10 minutes');
      };

      await pollForCompletion();
    } catch (err: any) {
      stopAgentTimer(agentId);
      const errorMsg = err.message || 'Agent execution failed';

      updateAgentStatus(agentId, {
        status: 'error',
        error: errorMsg,
      });

      addActivity({
        type: 'agent_error',
        agentId,
        agentName: LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId,
        message: `${LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId} failed: ${errorMsg}`,
      });
    } finally {
      setRunningAgentId(null);
    }
  };

  // Get the prerequisite agent name that must complete before this agent can run
  const getPrerequisiteAgent = useCallback((agentId: string): string | null => {
    const agentIndex = pipeline.agents.findIndex(a => a.id === agentId);
    if (agentIndex <= 0) return null; // First agent has no prerequisite
    const previousAgents = pipeline.agents.slice(0, agentIndex);
    const firstPending = previousAgents.find(a => (agentStatuses[a.id] || 'idle') !== 'done');
    if (!firstPending) return null; // All previous agents are done
    return firstPending.name || LEADOS_AGENTS.find(a => a.id === firstPending.id)?.name || firstPending.id;
  }, [pipeline.agents, agentStatuses]);

  // Pause a specific running agent — only affects that agent, not the pipeline
  const handlePauseAgent = useCallback((agentId: string) => {
    stopAgentTimer(agentId);
    updateAgentStatus(agentId, { status: 'idle', error: undefined });
    setRunningAgentId(null);
    addActivity({
      type: 'info',
      message: `${LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId} paused by user`,
    });
  }, [stopAgentTimer, updateAgentStatus, addActivity]);

  // Reset a specific agent — clears its status and output, does not affect others
  const handleResetAgent = useCallback((agentId: string) => {
    stopAgentTimer(agentId);
    updateAgentStatus(agentId, { status: 'idle', progress: 0, error: undefined, outputPreview: undefined });
    setAgentOutputs(prev => {
      const next = { ...prev };
      delete next[agentId];
      return next;
    });
    setElapsedTimes(prev => ({ ...prev, [agentId]: 0 }));
    setRunningAgentId(null);
    addActivity({
      type: 'info',
      message: `${LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId} reset by user`,
    });
  }, [stopAgentTimer, updateAgentStatus, addActivity]);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  // Use corrected agentStatuses (not raw pipeline.agents) for counts
  const completedCount = Object.values(agentStatuses).filter(s => s === 'done').length;
  const errorCount = Object.values(agentStatuses).filter(s => s === 'error').length;
  const runningCount = Object.values(agentStatuses).filter(s => s === 'running').length;
  const totalAgents = pipeline.agents.length;
  const isRunning = pipeline.status === 'running';
  const hasRun = pipeline.status !== 'idle';
  const progressPercent = totalAgents > 0 ? Math.round((completedCount / totalAgents) * 100) : 0;

  // Auto-detect pipeline completion: all enabled agents are done/error, none running
  useEffect(() => {
    if (pipeline.status === 'running' && totalAgents > 0 && runningCount === 0 && (completedCount + errorCount) >= totalAgents) {
      // All agents finished — update pipeline status
      updatePipelineStatus('completed');
      // Stop all timers
      Object.keys(timerRef.current).forEach(id => {
        clearInterval(timerRef.current[id]);
        delete timerRef.current[id];
      });
      setRunningAgentId(null);
    }
  }, [pipeline.status, totalAgents, runningCount, completedCount, errorCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const getPhaseStatus = (phase: typeof PIPELINE_PHASES[0]) => {
    if (skippedPhaseIds.has(phase.id)) return 'skipped';
    const agents = phase.agentIds.filter(id => enabledAgentIds.has(id));
    if (agents.length === 0) return 'disabled';
    if (!hasRun) return 'idle';
    const statuses = agents.map(id => agentStatuses[id] || 'idle');
    if (statuses.every(s => s === 'done')) return 'done';
    if (statuses.some(s => s === 'running')) return isPaused ? 'paused' : 'running';
    if (statuses.some(s => s === 'error')) return 'error';
    if (statuses.some(s => s === 'done')) return 'partial';
    return 'idle';
  };

  const formatElapsed = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        >
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="h-6 w-6 text-indigo-400" />
              {selectedProject ? `${selectedProject.name} Pipeline` : 'LeadOS Pipeline'}
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {isRunning
                ? `${completedCount}/${totalAgents} completed, ${runningCount} running${errorCount > 0 ? `, ${errorCount} failed` : ''}`
                : hasRun
                ? `${completedCount}/${totalAgents} agents completed${errorCount > 0 ? ` (${errorCount} errors)` : ''}`
                : `${enabledAgentIds.size} agents ready — fetching live data from integrated APIs`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ProjectSelector
              projects={projects}
              selectedProjectId={selectedProjectId}
              onSelectProject={selectProject}
              onCreateProject={async (data) => {
                try {
                  const created = await createProjectAsync(data);
                  selectProject(created.id);
                } catch {
                  const created = createProject(data);
                  selectProject(created.id);
                }
              }}
            />
          </div>
        </motion.div>

        {/* Internal project notice */}
        {isInternal && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <Building2 className="h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-400/80">
              Internal project — Discovery phase is skipped. Pipeline starts at Content & Creative.
            </p>
          </div>
        )}

        {/* Pipeline Error */}
        {pipelineError && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <div className="flex-1">
              <p className="text-sm text-red-400">{pipelineError}</p>
            </div>
            <button onClick={() => setPipelineError(null)} className="text-red-400/60 hover:text-red-400 text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Pipeline Controls */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.25, 0.4, 0.25, 1] }}
          className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
        >
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
                  {isRunning ? 'Running — Live' : pipeline.status === 'completed' ? 'Completed' : pipeline.status.charAt(0).toUpperCase() + pipeline.status.slice(1)}
                </span>
              )}
              {!hasRun && (
                <span className="text-sm text-zinc-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
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
              {isRunning && pipeline.status !== 'completed' && (
                <button
                  onClick={() => {
                    updatePipelineStatus('paused');
                    // Pause in backend too so the background runner stops
                    if (pipeline.id) {
                      pipelinesApi.pause(pipeline.id).catch(() => {});
                    }
                    // Stop all running agent timers
                    Object.keys(timerRef.current).forEach(id => {
                      clearInterval(timerRef.current[id]);
                      delete timerRef.current[id];
                    });
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-500 transition-colors"
                >
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </button>
              )}
              {pipeline.status === 'paused' && (
                <button
                  onClick={async () => {
                    updatePipelineStatus('running');
                    // Update DB status back to running — the backend loop will auto-resume
                    if (pipeline.id) {
                      try {
                        await apiFetch(`/api/pipelines/${pipeline.id}/resume`, { method: 'POST' });
                      } catch {
                        // ignore
                      }
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </button>
              )}
              {hasRun && (
                <button
                  onClick={async () => {
                    // Cancel old pipeline in backend — set to 'cancelled' so backend loop exits
                    if (pipeline.id) {
                      try {
                        await apiFetch(`/api/pipelines/${pipeline.id}/cancel`, { method: 'POST' });
                      } catch {
                        // Fallback: try pause
                        try { await apiFetch(`/api/pipelines/${pipeline.id}/pause`, { method: 'POST' }); } catch {}
                      }
                    }
                    // Clear all agent run history from DB
                    for (const agent of LEADOS_AGENTS) {
                      apiFetch(`/api/agents/${agent.id}/runs`, { method: 'DELETE' }).catch(() => {});
                    }
                    // Stop ALL timers
                    Object.keys(timerRef.current).forEach(id => {
                      clearInterval(timerRef.current[id]);
                      delete timerRef.current[id];
                    });
                    // Reset ALL frontend state
                    setRunningAgentId(null);
                    setPipelineError(null);
                    setAgentOutputs({});
                    setElapsedTimes({});
                    clearActivities();
                    // Reset pipeline LAST — this clears pipeline.id which blocks further SSE events
                    resetPipeline();
                    // Show success snackbar
                    setSnackbar('Pipeline reset successfully');
                    setTimeout(() => setSnackbar(null), 3000);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {hasRun && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-zinc-500 flex items-center gap-1">
                  {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isRunning ? 'Processing agents sequentially...' : 'Progress'}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {completedCount}/{totalAgents} ({progressPercent}%)
                </span>
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
        </motion.div>

        {/* Agent Configuration Panel */}
        <AnimatePresence>
        {showConfig && !hasRun && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
            className="mb-6 overflow-hidden"
          >
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
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
                    <div className="flex-1 min-w-0">
                      <span className={cn('text-xs truncate block', isEnabled ? 'text-zinc-200' : 'text-zinc-500')}>
                        {agent.name.replace(' Agent', '')}
                      </span>
                      {meta?.tools && isEnabled && (
                        <span className="text-[9px] text-zinc-600 truncate block">{meta.tools.join(' · ')}</span>
                      )}
                    </div>
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
          </motion.div>
        )}
        </AnimatePresence>

        {/* Pipeline Flow — vertical phases */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } } }}
          className="space-y-3"
        >
          {PIPELINE_PHASES.map((phase, phaseIndex) => {
            const isSkipped = skippedPhaseIds.has(phase.id);
            const phaseStatus = getPhaseStatus(phase);
            const isExpanded = expandedPhases.has(phase.id);
            const colors = PHASE_COLORS[phase.id] || PHASE_COLORS.discovery;
            const enabledCount = phase.agentIds.filter(id => enabledAgentIds.has(id)).length;
            const phaseAgents = phase.agentIds
              .filter(id => enabledAgentIds.has(id))
              .map(id => LEADOS_AGENTS.find(a => a.id === id))
              .filter(Boolean) as typeof LEADOS_AGENTS;

            if (!isSkipped && enabledCount === 0) return null;

            return (
              <motion.div
                key={phase.id}
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] } } }}
              >
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

                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <h3 className={cn(
                          'text-sm font-semibold',
                          isSkipped ? 'text-zinc-600' :
                          phaseStatus === 'done' ? 'text-emerald-400' :
                          phaseStatus === 'running' ? 'text-blue-400' :
                          phaseStatus === 'paused' ? 'text-amber-400' : 'text-zinc-200'
                        )}>
                          {phase.label}
                        </h3>
                        {isSkipped && (
                          <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5">Skipped</span>
                        )}
                        {phaseStatus === 'running' && (
                          <span className="text-[10px] text-blue-400 bg-blue-500/10 rounded px-1.5 py-0.5 animate-pulse">LIVE</span>
                        )}
                        {phaseStatus === 'paused' && (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 rounded px-1.5 py-0.5">PAUSED</span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        {enabledCount} {enabledCount === 1 ? 'agent' : 'agents'}
                        {phaseStatus === 'done' && ' — completed'}
                        {phaseStatus === 'running' && ' — processing live data'}
                        {phaseStatus === 'paused' && ' — paused'}
                        {phaseStatus === 'error' && ' — has errors'}
                      </p>
                    </div>

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
                        const rawStatus = agentStatuses[agent.id] || 'idle';
                        const status = (rawStatus === 'running' && isPaused) ? 'paused' : rawStatus;
                        const pipelineAgent = pipeline.agents.find(a => a.id === agent.id);
                        const elapsed = elapsedTimes[agent.id];
                        const isThisRunning = runningAgentId === agent.id || rawStatus === 'running';

                        return (
                          <div
                            key={agent.id}
                            onClick={() => setSelectedAgent(agent.id)}
                            className={cn(
                              'group relative rounded-lg border transition-all cursor-pointer',
                              status === 'done' ? 'border-emerald-500/20 bg-emerald-950/5 hover:border-emerald-500/40 hover:bg-emerald-950/10' :
                              status === 'running' ? 'border-blue-500/30 bg-blue-950/10' :
                              status === 'paused' ? 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/40' :
                              status === 'error' ? 'border-red-500/30 bg-red-950/10 hover:border-red-500/40 hover:bg-red-950/15' :
                              'border-zinc-800/60 bg-zinc-900/20 hover:border-indigo-500/30 hover:bg-indigo-950/5'
                            )}
                          >
                            {/* Agent row */}
                            <div
                              className="flex items-center gap-3 px-3 py-2.5"
                            >
                              {/* Agent icon */}
                              <div className={cn(
                                'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                                status === 'done' ? 'bg-emerald-900/30' :
                                status === 'running' ? 'bg-blue-900/30' :
                                status === 'paused' ? 'bg-amber-900/30' :
                                status === 'error' ? 'bg-red-900/30' :
                                'bg-zinc-800/80'
                              )}>
                                {status === 'running' ? (
                                  <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />
                                ) : status === 'paused' ? (
                                  <Pause className="h-3.5 w-3.5 text-amber-400" />
                                ) : status === 'done' ? (
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                ) : status === 'error' ? (
                                  <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                                ) : (
                                  <Icon className={cn('h-3.5 w-3.5', meta?.color || 'text-zinc-400')} />
                                )}
                              </div>

                              {/* Agent info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={cn(
                                    'text-xs font-medium truncate',
                                    status === 'done' ? 'text-emerald-400' :
                                    status === 'running' ? 'text-blue-400' :
                                    status === 'paused' ? 'text-amber-400' :
                                    status === 'error' ? 'text-red-400' : 'text-zinc-200'
                                  )}>
                                    {agent.name}
                                  </p>
                                  {status === 'running' && (
                                    <span className="text-[9px] text-blue-400/70 bg-blue-500/10 rounded px-1 py-0.5">
                                      LIVE
                                    </span>
                                  )}
                                  {status === 'paused' && (
                                    <span className="text-[9px] text-amber-400/70 bg-amber-500/10 rounded px-1 py-0.5">
                                      PAUSED
                                    </span>
                                  )}
                                </div>
                                {pipelineAgent?.outputPreview && status === 'done' && (
                                  <p className="text-[10px] text-zinc-500 truncate mt-0.5">{typeof pipelineAgent.outputPreview === 'string' ? pipelineAgent.outputPreview : 'Completed successfully'}</p>
                                )}
                                {pipelineAgent?.error && status === 'error' && (
                                  <p className="text-[10px] text-red-400 truncate mt-0.5">{pipelineAgent.error}</p>
                                )}
                                {status === 'running' && (
                                  <p className="text-[10px] text-blue-400/70 mt-0.5">
                                    Fetching live data from {meta?.tools?.slice(0, 2).join(', ')}...
                                  </p>
                                )}
                                {status === 'paused' && (
                                  <p className="text-[10px] text-amber-400/70 mt-0.5">
                                    Paused — resume pipeline to continue
                                  </p>
                                )}
                                {!hasRun && status === 'idle' && (
                                  <p className="text-[10px] text-zinc-600 truncate mt-0.5">{meta?.description}</p>
                                )}
                              </div>

                              {/* Status / action */}
                              <div className="flex items-center gap-2 shrink-0">
                                {status === 'running' && elapsed !== undefined && (
                                  <span className="text-[10px] text-blue-400 flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatElapsed(elapsed)}
                                  </span>
                                )}
                                {status === 'done' && pipelineAgent?.lastRunTime && (
                                  <span className="text-[10px] text-zinc-600">
                                    {new Date(pipelineAgent.lastRunTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                                {status === 'idle' && !isRunning && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRunAgent(agent.id); }}
                                    disabled={isThisRunning}
                                    className="rounded-md p-1.5 text-zinc-600 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-50"
                                    title="Run this agent"
                                  >
                                    <Play className="h-3 w-3" />
                                  </button>
                                )}
                                {status === 'error' && !isRunning && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRunAgent(agent.id); }}
                                    disabled={isThisRunning}
                                    className="rounded-md p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-950/30 transition-all"
                                    title="Retry agent"
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </button>
                                )}
                                {status === 'done' && !isRunning && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRunAgent(agent.id); }}
                                    disabled={isThisRunning}
                                    className="rounded-md p-1.5 text-zinc-600 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-white transition-all"
                                    title="Re-run agent"
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </button>
                                )}
                                {/* View details indicator */}
                                <span className="flex items-center gap-1 text-[10px] text-zinc-600 group-hover:text-indigo-400 transition-colors">
                                  <span className="hidden group-hover:inline">Details</span>
                                  <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                              </div>
                            </div>

                            {/* Running indicator bar */}
                            {status === 'running' && (
                              <div className="px-3 pb-2">
                                <div className="h-0.5 w-full overflow-hidden rounded-full bg-blue-950/50">
                                  <div className="h-full w-1/3 rounded-full bg-blue-500 animate-pulse" style={{
                                    animation: 'indeterminate 1.5s infinite ease-in-out',
                                  }} />
                                </div>
                              </div>
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
              </motion.div>
            );
          })}
        </motion.div>

        {/* Agent detail panel */}
        <AnimatePresence>
          {selectedAgent && (
            <AgentDetailPanel
              agentId={selectedAgent}
              agentName={
                pipeline.agents.find((a) => a.id === selectedAgent)?.name
                || LEADOS_AGENTS.find((a) => a.id === selectedAgent)?.name
                || selectedAgent
              }
              description={AGENT_META[selectedAgent]?.description}
              isRunning={runningAgentId === selectedAgent}
              elapsedTime={elapsedTimes[selectedAgent] || 0}
              agentStatus={agentStatuses[selectedAgent] || 'idle'}
              agentError={pipeline.agents.find((a) => a.id === selectedAgent)?.error}
              prerequisiteAgent={getPrerequisiteAgent(selectedAgent)}
              isPipelineRunning={isRunning || (!!runningAgentId && runningAgentId !== selectedAgent)}
              onClose={() => setSelectedAgent(null)}
              onRun={() => handleRunAgent(selectedAgent)}
              onPause={() => handlePauseAgent(selectedAgent)}
              onReset={() => handleResetAgent(selectedAgent)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Snackbar */}
      <AnimatePresence>
        {snackbar && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
          >
            <Check className="h-4 w-4" />
            {snackbar}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indeterminate animation keyframes */}
      <style jsx>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </ErrorBoundary>
  );
}
