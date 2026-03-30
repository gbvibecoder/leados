'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ProjectSelector } from '@/components/projects/project-selector';
import { PIPELINE_PHASES } from '@/components/pipeline/pipeline-preview';
import { AgentDetailPanel } from '@/components/agents/agent-detail-panel';
import { useAppStore, DISCOVERY_AGENT_IDS, LEADOS_AGENTS, SUPPORTED_LANGUAGES } from '@/lib/store';
import { pipelines as pipelinesApi, agents as agentsApi, apiFetch } from '@/lib/api';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import { preTranslateAgent } from '@/components/agents/AgentOutput';

/** Strip JSON objects/arrays from error strings so users see clean messages */
function cleanErrorMsg(raw: string): string {
  if (!raw) return 'Agent failed';
  const cleaned = raw.replace(/\s*\{[\s\S]*\}\s*/g, '').replace(/\s*\[[\s\S]*\]\s*/g, '').trim();
  return cleaned || 'Agent failed — check your API keys in Settings.';
}
import {
  Building2, Pause, Play, RotateCcw, ChevronDown, ChevronUp, ChevronRight,
  Bot, Check, Loader2, AlertCircle, ArrowDown, Settings2,
  Target, Sparkles, ShieldCheck, Globe, Mail, MousePointer,
  Phone, ArrowRight, BarChart3, TrendingUp, RefreshCw,
  Eye, Zap, Clock, ExternalLink, Megaphone, CheckCircle2,
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
  'inbound-capture': { icon: Bot, color: 'text-cyan-400', description: 'Captures form/chat/webhook leads, enriches via Apollo/Clay/Clearbit, scores and segments.', tools: ['Apollo.io', 'Clearbit', 'HubSpot'] },
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
    cacheProjectPipeline,
    getProjectPipelineCache,
    clearProjectPipelineCache,
  } = useAppStore();

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(PIPELINE_PHASES.map(p => p.id)));
  const [showConfig, setShowConfig] = useState(false);
  const [runningAgentId, setRunningAgentId] = useState<string | null>(null);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [agentOutputs, setAgentOutputs] = useState<Record<string, any>>({});
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({});
  const [snackbar, setSnackbar] = useState<string | null>(null);
  // State for resuming pipeline after pause (manual or auto paid-traffic pause)
  const pausedPipelineRef = useRef<{
    agentsToRun: string[];
    projectConfig: Record<string, any>;
    previousOutputs: Record<string, any>;
    pipelineId: string;
    pausedAfterIndex: number;
  } | null>(null);
  // Tracks the live execution context so manual pause can save it for resume
  const activePipelineCtxRef = useRef<{
    agentsToRun: string[];
    projectConfig: Record<string, any>;
    previousOutputs: Record<string, any>;
    pipelineId: string;
    currentIndex: number;
  } | null>(null);
  const timerRef = useRef<Record<string, NodeJS.Timeout>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // Total pipeline timer
  const [pipelineStartTime, setPipelineStartTime] = useState<number | null>(null);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const totalTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const isInternal = selectedProject?.type === 'internal';

  // Load agent run statuses from DB for a project that was run previously
  /** Fetch runs from DB for a project and apply them to the current pipeline + page state */
  const loadProjectRunsFromDB = useCallback(async (projectId: string) => {
    try {
      const allPipelines = await apiFetch('/api/pipelines').then(r => r.json());
      if (!Array.isArray(allPipelines)) return;

      const projectPipeline = allPipelines.find((p: any) => p.projectId === projectId);
      if (!projectPipeline || !projectPipeline.agentRuns?.length) return;

      // Bail if user already switched away while we were fetching
      if (useAppStore.getState().selectedProjectId !== projectId) return;

      const restoredOutputs: Record<string, any> = {};
      let restoredCount = 0;
      for (const run of projectPipeline.agentRuns) {
        if (run.status === 'done' || run.status === 'error') {
          updateAgentStatus(run.agentId, {
            status: run.status,
            progress: run.status === 'done' ? 100 : 0,
            lastRunTime: run.completedAt || run.startedAt,
            outputPreview: typeof run.outputsJson?.reasoning === 'string'
              ? run.outputsJson.reasoning.slice(0, 120)
              : run.status === 'done' ? 'Completed successfully' : undefined,
            error: run.status === 'error' ? cleanErrorMsg(run.error || 'Agent failed') : undefined,
          });
          restoredCount++;
          if (run.status === 'done' && run.outputsJson) {
            restoredOutputs[run.agentId] = run.outputsJson;
          } else if (run.status === 'error') {
            delete restoredOutputs[run.agentId];
          }
        }
      }

      if (Object.keys(restoredOutputs).length > 0) {
        setAgentOutputs(restoredOutputs);
      }

      if (restoredCount > 0) {
        if (projectPipeline.status === 'completed') {
          updatePipelineStatus('completed');
        } else if (projectPipeline.status === 'error') {
          updatePipelineStatus('error');
        } else if (projectPipeline.status === 'paused') {
          updatePipelineStatus('paused');
        }
      }

      requestAnimationFrame(() => {
        if (useAppStore.getState().selectedProjectId === projectId) {
          cacheProjectPipeline(projectId, restoredOutputs, {});
        }
      });
    } catch {
      // DB unavailable — no previous runs to show
    }
  }, [updateAgentStatus, updatePipelineStatus, cacheProjectPipeline]);

  /**
   * Pre-fetch project runs from DB and populate the pipeline cache BEFORE
   * selectProject runs, so the switch is instant with no idle flash.
   */
  const prefetchProjectPipeline = useCallback(async (projectId: string) => {
    try {
      const allPipelines = await apiFetch('/api/pipelines').then(r => r.json());
      if (!Array.isArray(allPipelines)) return;

      const projectPipeline = allPipelines.find((p: any) => p.projectId === projectId);
      if (!projectPipeline || !projectPipeline.agentRuns?.length) return;

      // Build agent states from DB runs
      const state = useAppStore.getState();
      const project = state.projects.find(p => p.id === projectId);
      const baseAgents = LEADOS_AGENTS.map(a => ({
        ...a,
        status: 'idle' as const,
        lastRunTime: undefined as string | undefined,
        outputPreview: undefined as string | undefined,
        progress: undefined as number | undefined,
        error: undefined as string | undefined,
      }));

      const restoredOutputs: Record<string, any> = {};
      let restoredCount = 0;

      for (const run of projectPipeline.agentRuns) {
        if (run.status === 'done' || run.status === 'error') {
          const agent = baseAgents.find(a => a.id === run.agentId);
          if (agent) {
            agent.status = run.status;
            agent.progress = run.status === 'done' ? 100 : 0;
            agent.lastRunTime = run.completedAt || run.startedAt;
            agent.outputPreview = typeof run.outputsJson?.reasoning === 'string'
              ? run.outputsJson.reasoning.slice(0, 120)
              : run.status === 'done' ? 'Completed successfully' : undefined;
            agent.error = run.status === 'error' ? cleanErrorMsg(run.error || 'Agent failed') : undefined;
          }
          restoredCount++;
          if (run.status === 'done' && run.outputsJson) {
            restoredOutputs[run.agentId] = run.outputsJson;
          }
        }
      }

      if (restoredCount > 0) {
        // Filter agents for the project type (internal projects skip discovery)
        const enabledIds = project?.config?.enabledAgentIds;
        const isInternal = project?.type === 'internal';
        let filteredAgents = baseAgents;
        if (enabledIds) {
          const enabledSet = new Set(enabledIds);
          filteredAgents = baseAgents.filter(a => enabledSet.has(a.id));
        } else if (isInternal) {
          const discoveryIds = new Set(['service-research', 'offer-engineering', 'validation', 'funnel-builder']);
          filteredAgents = baseAgents.filter(a => !discoveryIds.has(a.id));
        }

        const pipelineStatus = projectPipeline.status === 'completed' ? 'completed'
          : projectPipeline.status === 'error' ? 'error'
          : projectPipeline.status === 'paused' ? 'paused' : 'idle';

        cacheProjectPipeline(projectId, restoredOutputs, {});
        // Also cache the pipeline state directly in the store
        useAppStore.setState((prev) => ({
          projectPipelineCache: {
            ...prev.projectPipelineCache,
            [projectId]: {
              pipeline: {
                id: projectPipeline.id,
                status: pipelineStatus as any,
                agents: filteredAgents,
                currentAgentIndex: 0,
              },
              agentOutputs: restoredOutputs,
              elapsedTimes: {},
            },
          },
        }));
      }
    } catch {
      // DB unavailable — will fall back to idle pipeline
    }
  }, [cacheProjectPipeline]);

  // Keep a ref to agentOutputs/elapsedTimes so the project-switch effect
  // can cache them without stale closures
  const agentOutputsRef = useRef(agentOutputs);
  agentOutputsRef.current = agentOutputs;
  const elapsedTimesRef = useRef(elapsedTimes);
  elapsedTimesRef.current = elapsedTimes;

  // React to selectedProjectId changes — works on mount AND when triggered from page or navbar
  const prevProjectIdRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const isMount = prevProjectIdRef.current === undefined;
    if (!isMount && prevProjectIdRef.current === selectedProjectId) return;

    const prevId = prevProjectIdRef.current;
    prevProjectIdRef.current = selectedProjectId;

    // On project switch (not mount), close panels and clear stale context
    if (!isMount) {
      setSelectedAgent(null);
      setPipelineError(null);
      pausedPipelineRef.current = null;
      activePipelineCtxRef.current = null;
    }

    // Cache outgoing project/default agentOutputs (skip on mount — nothing to cache yet)
    if (!isMount && prevId !== undefined) {
      cacheProjectPipeline(prevId || '__default__', agentOutputsRef.current, elapsedTimesRef.current);
    }

    // Restore incoming project/default cached outputs, or load from DB
    const cacheKey = selectedProjectId || '__default__';
    const cached = getProjectPipelineCache(cacheKey);
    const cacheHasOutputs = cached && Object.keys(cached.agentOutputs).length > 0;
    const cacheHasStatuses = cached && cached.pipeline.agents.some(a => a.status === 'done' || a.status === 'error');
    if (cached && (cacheHasOutputs || cacheHasStatuses)) {
      const cleanOutputs = { ...cached.agentOutputs };
      for (const agent of cached.pipeline.agents) {
        if (agent.status === 'error') {
          delete cleanOutputs[agent.id];
        }
      }
      setAgentOutputs(cleanOutputs);
      setElapsedTimes(cached.elapsedTimes);
      if (cacheHasStatuses && !cacheHasOutputs && selectedProjectId) {
        loadProjectRunsFromDB(selectedProjectId);
      }
    } else {
      if (!isMount) {
        setAgentOutputs({});
        setElapsedTimes({});
      }
      if (selectedProjectId) {
        loadProjectRunsFromDB(selectedProjectId);
      }
    }
  }, [selectedProjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Wraps selectProject to cache outgoing agentOutputs BEFORE the store replaces pipeline
  const handleSelectProject = useCallback(async (projectId: string | null) => {
    const currentProjectId = useAppStore.getState().selectedProjectId;
    if (currentProjectId === projectId) return;
    // Cache agentOutputs for outgoing project/default before store.selectProject caches pipeline
    cacheProjectPipeline(currentProjectId || '__default__', agentOutputs, elapsedTimes);
    // Pre-fetch target project's runs from DB if no cache exists — prevents idle flash
    if (projectId && !getProjectPipelineCache(projectId)) {
      await prefetchProjectPipeline(projectId);
    }
    selectProject(projectId);
  }, [selectProject, cacheProjectPipeline, getProjectPipelineCache, prefetchProjectPipeline, agentOutputs, elapsedTimes]);

  /** Build projectConfig with language/localization from the selected project */
  const buildProjectConfig = useCallback((): Record<string, any> => {
    const cfg: Record<string, any> = {};
    if (!selectedProject) return cfg;
    cfg.projectName = selectedProject.name;
    cfg.projectType = selectedProject.type;
    if (selectedProject.description) cfg.projectDescription = selectedProject.description;
    if (selectedProject.name) {
      cfg.focus = selectedProject.name;
      cfg.niche = selectedProject.name;
      cfg.serviceNiche = selectedProject.name;
    }
    if (selectedProject.language) {
      cfg.language = selectedProject.language;
      const langLabel = SUPPORTED_LANGUAGES.find(l => l.code === selectedProject.language)?.label || selectedProject.language;
      cfg.localization = {
        instruction: `Generate all output content (ad copy, emails, landing page text, keywords, etc.) in ${langLabel}. If the product uses English brand terms, keep those in English but write surrounding copy in ${langLabel}.`,
      };
    }
    if (selectedProject.config) {
      const projCfg = typeof selectedProject.config === 'string'
        ? JSON.parse(selectedProject.config)
        : selectedProject.config;
      if (projCfg.url) cfg.projectUrl = projCfg.url;
      // Merge but preserve localization we already set
      const { localization: _ignored, ...rest } = projCfg;
      Object.assign(cfg, rest);
    }
    return cfg;
  }, [selectedProject]);

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

  // Compute effective agent statuses — enforces only ONE agent running at a time
  const agentStatuses = useMemo(() => {
    const statuses: Record<string, AgentStatus> = {};
    const currentAgent = pipeline.agents[pipeline.currentAgentIndex];
    for (const agent of pipeline.agents) {
      let status = agent.status;
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

  // Total pipeline timer — start/stop based on pipeline status
  useEffect(() => {
    if (pipeline.status === 'running' && !totalTimerRef.current) {
      // When resuming from pause, adjust start time so elapsed continues from where it left off
      setPipelineStartTime(Date.now() - totalElapsed * 1000);
      totalTimerRef.current = setInterval(() => {
        setPipelineStartTime(prev => {
          if (!prev) return prev;
          setTotalElapsed(Math.floor((Date.now() - prev) / 1000));
          return prev;
        });
      }, 1000);
    } else if (pipeline.status !== 'running' && totalTimerRef.current) {
      // Pause or stop: clear the interval but keep totalElapsed for resume
      clearInterval(totalTimerRef.current);
      totalTimerRef.current = null;
    }
  }, [pipeline.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timerRef.current).forEach(clearInterval);
      if (totalTimerRef.current) clearInterval(totalTimerRef.current);
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

  // Run full pipeline — frontend orchestrates by calling each agent sequentially.
  // Each agent runs in its own serverless invocation (< 60s), avoiding Vercel Hobby timeout.
  const handleRunPipeline = async () => {
    setPipelineError(null);
    setAgentOutputs({});
    setElapsedTimes({});
    setTotalElapsed(0);
    setPipelineStartTime(Date.now());
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
      // Create pipeline record
      const created = await pipelinesApi.create({
        type: 'leados',
        config: { enabledAgentIds: [...enabledAgentIds] },
        projectId: selectedProjectId || undefined,
      });
      setPipelineId(created.id);

      // Get ordered agent list + project config from the server
      const result = await pipelinesApi.start(created.id);
      const agentsToRun: string[] = result.agentsToRun;
      const projectConfig = result.projectConfig || {};

      addActivity({
        type: 'info',
        message: `Pipeline started with ${agentsToRun.length} agents`,
      });

      // Orchestrate: call each agent one by one from the frontend
      const previousOutputs: Record<string, any> = {};

      // Track live execution context for manual pause → resume
      activePipelineCtxRef.current = {
        agentsToRun,
        projectConfig,
        previousOutputs,
        pipelineId: created.id,
        currentIndex: 0,
      };

      for (let i = 0; i < agentsToRun.length; i++) {
        const agentId = agentsToRun[i];
        const agentName = LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId;

        // Update live context with current index
        if (activePipelineCtxRef.current) {
          activePipelineCtxRef.current.currentIndex = i;
        }

        // Check if pipeline was cancelled/paused
        const currentStatus = useAppStore.getState().pipeline.status;
        if (currentStatus !== 'running') break;

        // Update UI: mark agent as running
        setCurrentAgentIndex(i);
        setRunningAgentId(agentId);
        updateAgentStatus(agentId, { status: 'running', progress: 0 });
        startAgentTimer(agentId);
        addActivity({ type: 'agent_started', agentId, agentName, message: `${agentName} started` });

        try {
          // Call single agent endpoint — awaits result (< 60s per agent)
          const controller = new AbortController();
          abortControllerRef.current = controller;
          const agentResult = await agentsApi.run(agentId, {
            pipelineId: created.id,
            config: projectConfig,
            previousOutputs,
          }, controller.signal);
          abortControllerRef.current = null;

          // Check if pipeline was paused/cancelled while agent was running
          const statusAfterAgent = useAppStore.getState().pipeline.status;
          if (statusAfterAgent !== 'running') {
            stopAgentTimer(agentId);
            // Keep agent in 'running' visual state so Resume can pick it up
            break;
          }

          // Check if agent returned success: false (e.g. JSON parse failure)
          if (agentResult.output && agentResult.output.success === false) {
            stopAgentTimer(agentId);
            const errMsg = cleanErrorMsg(agentResult.output.error || agentResult.output.reasoning || 'Agent failed');
            updateAgentStatus(agentId, { status: 'error', error: errMsg });
            setAgentOutputs(prev => ({ ...prev, [agentId]: agentResult.output }));
            addActivity({ type: 'agent_error', agentId, agentName, message: `${agentName} failed: ${errMsg}` });

            // Stop pipeline on error
            setPipelineError(`${agentName} failed: ${errMsg}`);
            updatePipelineStatus('error');
            setRunningAgentId(null);
            activePipelineCtxRef.current = null;

            try {
              await apiFetch(`/api/pipelines/${created.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'error' }),
              });
            } catch { /* ignore */ }
            break;
          }

          // Store output for chaining to next agent
          if (agentResult.output?.success) {
            previousOutputs[agentId] = agentResult.output.data;
          }

          // Update UI: mark agent as done
          stopAgentTimer(agentId);
          updateAgentStatus(agentId, {
            status: 'done',
            progress: 100,
            lastRunTime: new Date().toISOString(),
            outputPreview: typeof agentResult.output?.reasoning === 'string'
              ? agentResult.output.reasoning
              : 'Completed successfully',
          });
          setAgentOutputs(prev => ({ ...prev, [agentId]: agentResult.output }));
          addActivity({ type: 'agent_completed', agentId, agentName, message: `${agentName} completed` });

          // Pre-translate in background so it's ready when user opens the popup
          if (selectedProject?.language && selectedProject.language !== 'en') {
            preTranslateAgent(agentId, selectedProject.language, agentResult.output).catch(() => {});
          }

          // Auto-open landing page when funnel-builder completes
          if (agentId === 'funnel-builder') {
            window.open('/funnel', '_blank');
          }

          // Auto-pause pipeline after paid-traffic agent for user review/approval
          if (agentId === 'paid-traffic') {
            pausedPipelineRef.current = {
              agentsToRun,
              projectConfig,
              previousOutputs: { ...previousOutputs },
              pipelineId: created.id,
              pausedAfterIndex: i,
            };
            updatePipelineStatus('paused');
            setRunningAgentId(null);
            setSelectedAgent('paid-traffic');
            addActivity({
              type: 'info',
              message: 'Pipeline paused — review Paid Traffic campaigns before continuing',
            });
            break;
          }

        } catch (agentErr: any) {
          // If aborted due to pause, don't treat as error
          if (agentErr.name === 'AbortError') {
            stopAgentTimer(agentId);
            break;
          }
          stopAgentTimer(agentId);
          const errMsg = cleanErrorMsg(agentErr.message || 'Agent failed');
          updateAgentStatus(agentId, { status: 'error', error: errMsg });
          addActivity({ type: 'agent_error', agentId, agentName, message: `${agentName} failed: ${errMsg}` });

          // Stop pipeline on error
          setPipelineError(`${agentName} failed: ${errMsg}`);
          updatePipelineStatus('error');
          setRunningAgentId(null);
          activePipelineCtxRef.current = null;

          try {
            await apiFetch(`/api/pipelines/${created.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'error' }),
            });
          } catch { /* ignore */ }
          return;
        }
      }

      // Only mark as completed if the pipeline was not paused or cancelled
      const finalStatus = useAppStore.getState().pipeline.status;
      setRunningAgentId(null);
      activePipelineCtxRef.current = null;
      if (finalStatus === 'running') {
        updatePipelineStatus('completed');
        addActivity({ type: 'pipeline_completed', message: 'LeadOS pipeline completed' });

        try {
          await apiFetch(`/api/pipelines/${created.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'completed' }),
          });
        } catch { /* ignore */ }
      }

    } catch (err: any) {
      const errorMsg = cleanErrorMsg(err.message || 'Failed to start pipeline');
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
        config: buildProjectConfig(),
      });

      // Poll for completion every 1.5 seconds (was 3s — halved for faster response)
      const pollForCompletion = async () => {
        const maxPolls = 400; // ~10 minutes max at 1.5s intervals
        for (let i = 0; i < maxPolls; i++) {
          await new Promise(r => setTimeout(r, 1500));
          try {
            const runs = await agentsApi.runs(agentId);
            const latestRun = runs?.[0];
            if (!latestRun) continue;

            if (latestRun.status === 'done') {
              stopAgentTimer(agentId);
              const output = latestRun.outputsJson || latestRun;
              setAgentOutputs(prev => ({ ...prev, [agentId]: output }));

              // Check if agent returned success: false (e.g. JSON parse failure)
              if (output && output.success === false) {
                const errMsg = cleanErrorMsg(output.error || output.reasoning || 'Agent failed');
                updateAgentStatus(agentId, { status: 'error', error: errMsg });
                addActivity({
                  type: 'agent_error',
                  agentId,
                  agentName: LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId,
                  message: `${LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId} failed: ${errMsg}`,
                });
                setRunningAgentId(null);
                return;
              }

              const preview = output?.reasoning
                || output?.data?.reasoning
                || 'Completed successfully with live data';

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

              // Pre-translate in background
              if (selectedProject?.language && selectedProject.language !== 'en') {
                preTranslateAgent(agentId, selectedProject.language, output).catch(() => {});
              }

              // Auto-open landing page when funnel-builder completes
              if (agentId === 'funnel-builder') {
                window.open('/funnel', '_blank');
              }
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
      const errorMsg = cleanErrorMsg(err.message || 'Agent execution failed');

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

  // After AI Qualification calls are resolved, re-run downstream agents with real data
  const DOWNSTREAM_AGENTS = ['sales-routing', 'tracking-attribution', 'performance-optimization', 'crm-hygiene'];

  const handleQualificationResolved = useCallback(async (resolvedData: any) => {
    if (!pipeline.id) return;

    // Update the AI Qualification output in local state
    setAgentOutputs(prev => ({
      ...prev,
      'ai-qualification': { success: true, data: resolvedData },
    }));

    addActivity({
      type: 'info',
      message: 'AI Qualification calls resolved — re-running downstream agents with real scores',
    });

    // Build previousOutputs from all completed agent outputs
    const currentOutputs: Record<string, any> = {
      ...agentOutputs,
      'ai-qualification': resolvedData,
    };
    // Flatten: each key should be the agent's data, not the full output wrapper
    const previousOutputs: Record<string, any> = {};
    for (const [key, val] of Object.entries(currentOutputs)) {
      previousOutputs[key] = val?.data || val;
    }

    // Get project config from the selected project (includes language/localization)
    const projectConfig = buildProjectConfig();

    // Re-run each downstream agent sequentially
    for (const agentId of DOWNSTREAM_AGENTS) {
      if (!enabledAgentIds.has(agentId)) continue;

      const agentName = LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId;
      updateAgentStatus(agentId, { status: 'running', progress: 0 });
      startAgentTimer(agentId);
      addActivity({ type: 'agent_started', agentId, agentName, message: `${agentName} re-running with resolved data` });

      try {
        const result = await agentsApi.run(agentId, {
          pipelineId: pipeline.id,
          config: projectConfig,
          previousOutputs,
        });

        if (result.output?.success) {
          previousOutputs[agentId] = result.output.data;
        }

        stopAgentTimer(agentId);
        updateAgentStatus(agentId, {
          status: 'done',
          progress: 100,
          lastRunTime: new Date().toISOString(),
          outputPreview: typeof result.output?.reasoning === 'string'
            ? result.output.reasoning
            : 'Re-run completed with resolved data',
        });
        setAgentOutputs(prev => ({ ...prev, [agentId]: result.output }));
        addActivity({ type: 'agent_completed', agentId, agentName, message: `${agentName} completed (re-run)` });

        // Pre-translate in background
        if (selectedProject?.language && selectedProject.language !== 'en') {
          preTranslateAgent(agentId, selectedProject.language, result.output).catch(() => {});
        }
      } catch (err: any) {
        stopAgentTimer(agentId);
        updateAgentStatus(agentId, { status: 'error', error: cleanErrorMsg(err.message || 'Re-run failed') });
        addActivity({ type: 'agent_error', agentId, agentName, message: `${agentName} re-run failed: ${err.message}` });
      }
    }

    addActivity({ type: 'info', message: 'All downstream agents re-run complete' });
  }, [pipeline.id, agentOutputs, selectedProject, enabledAgentIds, updateAgentStatus, startAgentTimer, stopAgentTimer, addActivity, buildProjectConfig]);

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

  // Reset all agents for the current project — wipes all DB data and frontend state
  const handleResetAgent = useCallback((_agentId: string) => {
    const pipelineId = pipeline.id;
    const projectId = selectedProjectId;

    // 1. Abort any in-flight requests FIRST
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    // 2. Stop ALL agent timers
    Object.keys(timerRef.current).forEach(id => {
      clearInterval(timerRef.current[id]);
      delete timerRef.current[id];
    });
    if (totalTimerRef.current) { clearInterval(totalTimerRef.current); totalTimerRef.current = null; }
    // 3. Reset ALL frontend state immediately (synchronous)
    setRunningAgentId(null);
    activePipelineCtxRef.current = null;
    pausedPipelineRef.current = null;
    setPipelineError(null);
    setAgentOutputs({});
    setElapsedTimes({});
    setTotalElapsed(0);
    setPipelineStartTime(null);
    clearActivities();
    // 4. Clear cached pipeline state for this project
    if (projectId) clearProjectPipelineCache(projectId);
    // 5. Reset pipeline — clears pipeline.id and resets all agent statuses to idle
    resetPipeline();
    addActivity({
      type: 'info',
      message: `All agents reset by user`,
    });

    // 6. Clean up DB in background (fire-and-forget) — cancel pipeline, delete all project data
    (async () => {
      if (pipelineId) {
        try {
          await apiFetch(`/api/pipelines/${pipelineId}/cancel`, { method: 'POST' });
        } catch {
          try { await apiFetch(`/api/pipelines/${pipelineId}/pause`, { method: 'POST' }); } catch {}
        }
      }
      if (projectId) {
        try {
          await apiFetch(`/api/projects/${projectId}/reset`, { method: 'POST' });
        } catch {}
      }
    })();
  }, [pipeline.id, selectedProjectId, resetPipeline, clearActivities, clearProjectPipelineCache, addActivity]);

  // Resume pipeline from paused state (shared by header Resume button and approval gate)
  const handleResumePipeline = useCallback(async () => {
    updatePipelineStatus('running');
    if (pipeline.id) {
      try {
        await apiFetch(`/api/pipelines/${pipeline.id}/resume`, { method: 'POST' });
      } catch { /* ignore */ }
    }

    const saved = pausedPipelineRef.current;
    if (saved) {
      pausedPipelineRef.current = null;
      const { agentsToRun, projectConfig, previousOutputs, pipelineId, pausedAfterIndex } = saved;

      activePipelineCtxRef.current = {
        agentsToRun,
        projectConfig,
        previousOutputs,
        pipelineId,
        currentIndex: pausedAfterIndex + 1,
      };

      addActivity({ type: 'info', message: 'Pipeline resumed — continuing remaining agents' });

      for (let i = pausedAfterIndex + 1; i < agentsToRun.length; i++) {
        const agentId = agentsToRun[i];
        const agentName = LEADOS_AGENTS.find(a => a.id === agentId)?.name || agentId;

        if (activePipelineCtxRef.current) {
          activePipelineCtxRef.current.currentIndex = i;
        }

        const currentStatus = useAppStore.getState().pipeline.status;
        if (currentStatus !== 'running') break;

        setCurrentAgentIndex(i);
        setRunningAgentId(agentId);
        updateAgentStatus(agentId, { status: 'running', progress: 0 });
        startAgentTimer(agentId);
        addActivity({ type: 'agent_started', agentId, agentName, message: `${agentName} started` });

        try {
          const controller = new AbortController();
          abortControllerRef.current = controller;
          const agentResult = await agentsApi.run(agentId, {
            pipelineId,
            config: projectConfig,
            previousOutputs,
          }, controller.signal);
          abortControllerRef.current = null;

          const statusAfterAgent = useAppStore.getState().pipeline.status;
          if (statusAfterAgent !== 'running') {
            stopAgentTimer(agentId);
            break;
          }

          if (agentResult.output?.success) {
            previousOutputs[agentId] = agentResult.output.data;
          }

          stopAgentTimer(agentId);
          updateAgentStatus(agentId, {
            status: 'done', progress: 100,
            lastRunTime: new Date().toISOString(),
            outputPreview: typeof agentResult.output?.reasoning === 'string' ? agentResult.output.reasoning : 'Completed successfully',
          });
          setAgentOutputs(prev => ({ ...prev, [agentId]: agentResult.output }));
          addActivity({ type: 'agent_completed', agentId, agentName, message: `${agentName} completed` });

          if (selectedProject?.language && selectedProject.language !== 'en') {
            preTranslateAgent(agentId, selectedProject.language, agentResult.output).catch(() => {});
          }
        } catch (agentErr: any) {
          if (agentErr.name === 'AbortError') { stopAgentTimer(agentId); break; }
          stopAgentTimer(agentId);
          const errorMsg = agentErr.message || 'Agent failed';
          updateAgentStatus(agentId, { status: 'error', error: errorMsg });
          addActivity({ type: 'agent_error', agentId, agentName, message: `${agentName} failed: ${errorMsg}` });
        }
      }

      setRunningAgentId(null);
      activePipelineCtxRef.current = null;
      const finalStatus = useAppStore.getState().pipeline.status;
      if (finalStatus === 'running') {
        updatePipelineStatus('completed');
        addActivity({ type: 'info', message: 'Pipeline completed' });
      }
    }
  }, [pipeline.id, updatePipelineStatus, updateAgentStatus, setCurrentAgentIndex, startAgentTimer, stopAgentTimer, addActivity, selectedProject?.language]);

  // Whether the pipeline is paused specifically because paid-traffic just completed (auto-pause for ad review)
  const isPausedForAdReview = pipeline.status === 'paused'
    && (agentStatuses['paid-traffic'] === 'done')
    && !!pausedPipelineRef.current;

  // Auto-resume pipeline when ads are launched (fired from PaidTrafficOutput or useMetaCampaign)
  useEffect(() => {
    const onAdsLaunched = () => {
      if (useAppStore.getState().pipeline.status === 'paused' && pausedPipelineRef.current) {
        handleResumePipeline();
      }
    };
    window.addEventListener('leados:ads-launched', onAdsLaunched);
    return () => window.removeEventListener('leados:ads-launched', onAdsLaunched);
  }, [handleResumePipeline]);

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
      {/* ══ Animated flowing cross-grid background ══ */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">

        {/* ── Layer 1: Cross/plus mark grid with flowing wave ── */}
        <svg className="absolute inset-0 w-full h-full" style={{ animation: 'grid-drift 30s linear infinite' }}>
          <defs>
            <pattern id="cross-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              {/* Horizontal tick */}
              <line x1="16" y1="20" x2="24" y2="20" stroke="rgba(120,130,180,0.18)" strokeWidth="0.8" strokeLinecap="round" />
              {/* Vertical tick */}
              <line x1="20" y1="16" x2="20" y2="24" stroke="rgba(120,130,180,0.18)" strokeWidth="0.8" strokeLinecap="round" />
            </pattern>
            {/* Radial mask to fade edges */}
            <radialGradient id="grid-fade" cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="white" stopOpacity="1" />
              <stop offset="70%" stopColor="white" stopOpacity="0.6" />
              <stop offset="100%" stopColor="white" stopOpacity="0.1" />
            </radialGradient>
            <mask id="grid-mask">
              <rect width="100%" height="100%" fill="url(#grid-fade)" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#cross-grid)" mask="url(#grid-mask)" />
        </svg>

        {/* ── Layer 2: Flowing wave overlay that sweeps across the grid ── */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, transparent 0%, rgba(99,102,241,0.04) 25%, transparent 50%, rgba(0,242,255,0.03) 75%, transparent 100%)', backgroundSize: '400% 400%', animation: 'wave-flow 12s ease-in-out infinite' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(225deg, transparent 0%, rgba(139,92,246,0.03) 30%, transparent 55%, rgba(99,102,241,0.04) 80%, transparent 100%)', backgroundSize: '400% 400%', animation: 'wave-flow 16s ease-in-out infinite 4s' }} />

        {/* ── Layer 3: Soft aurora glow spots ── */}
        <div className="absolute rounded-full"
          style={{ width: '600px', height: '600px', top: '5%', left: '-5%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 60%)', filter: 'blur(80px)', animation: 'aurora-drift-1 25s ease-in-out infinite' }} />
        <div className="absolute rounded-full"
          style={{ width: '500px', height: '500px', top: '40%', right: '-8%', background: 'radial-gradient(circle, rgba(0,242,255,0.05) 0%, transparent 60%)', filter: 'blur(80px)', animation: 'aurora-drift-2 30s ease-in-out infinite' }} />
        <div className="absolute rounded-full"
          style={{ width: '450px', height: '450px', bottom: '5%', left: '25%', background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 60%)', filter: 'blur(80px)', animation: 'aurora-drift-3 28s ease-in-out infinite' }} />

        {/* ── Layer 4: Glowing node spots ── */}
        <div className="absolute w-2 h-2 rounded-full" style={{ top: '22%', left: '38%', background: 'rgba(120,130,200,0.5)', boxShadow: '0 0 15px 6px rgba(99,102,241,0.15)', animation: 'node-pulse 5s ease-in-out infinite' }} />
        <div className="absolute w-1.5 h-1.5 rounded-full" style={{ top: '55%', left: '68%', background: 'rgba(120,130,200,0.4)', boxShadow: '0 0 12px 5px rgba(99,102,241,0.12)', animation: 'node-pulse 6s ease-in-out infinite 2s' }} />
        <div className="absolute w-1.5 h-1.5 rounded-full" style={{ top: '75%', left: '25%', background: 'rgba(120,130,200,0.35)', boxShadow: '0 0 10px 4px rgba(99,102,241,0.10)', animation: 'node-pulse 7s ease-in-out infinite 4s' }} />
      </div>

      <div className="max-w-4xl mx-auto relative z-0">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.4, 0.25, 1] }}
          className="mb-6 relative rounded-2xl overflow-visible p-5 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
          style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.03), rgba(139,92,246,0.02), rgba(2,2,5,0.8))', border: '1px solid rgba(0,242,255,0.08)' }}
        >
          {/* Decorative mini orbit */}
          <div className="absolute top-1/2 right-6 -translate-y-1/2 w-24 h-24 pointer-events-none hidden sm:block opacity-20">
            <div className="w-full h-full rounded-full border border-cyan-400/20 orbit-rotate">
              <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
            </div>
          </div>
          <div>
            <div className="mono-ui text-[8px] text-cyan-400/50 mb-1.5 flex items-center gap-2">
              <span className="w-3 h-px bg-cyan-500/30" />Pipeline Control
            </div>
            <h1 className="font-cinzel text-xl md:text-2xl text-white flex items-center gap-3">
              <div className="relative w-8 h-8 shrink-0">
                <div className="absolute inset-0 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.12), rgba(139,92,246,0.08))', border: '1px solid rgba(0,242,255,0.2)' }}>
                  <Zap className="h-4 w-4 text-cyan-400" />
                </div>
              </div>
              {selectedProject ? `${selectedProject.name}` : 'LeadOS Pipeline'}
            </h1>
            <p className="mt-1.5 text-sm text-gray-500">
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
              onSelectProject={handleSelectProject}
              disabled={pipeline.status === 'running'}
              onCreateProject={async (data) => {
                try {
                  const created = await createProjectAsync(data);
                  handleSelectProject(created.id);
                } catch {
                  const created = createProject(data);
                  handleSelectProject(created.id);
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
          className="mb-6 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasRun && (
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  isRunning ? 'bg-blue-500/10 text-blue-400' :
                  pipeline.status === 'paused' ? 'bg-amber-500/10 text-amber-400' :
                  pipeline.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                  pipeline.status === 'error' ? 'bg-red-500/10 text-red-400' : 'text-gray-400'
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
                <span className="text-sm text-gray-400 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
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
                      ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-400'
                      : 'border-white/[0.08] text-gray-400 hover:bg-white/5 hover:text-gray-200'
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
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  {hasRun ? 'Run Again' : 'Run Pipeline'}
                </button>
              )}
              {isRunning && pipeline.status !== 'completed' && (
                <button
                  onClick={async () => {
                    // 1. FIRST: update DB — set pipeline to 'paused' and agent runs to 'idle'
                    //    This MUST complete before the server-side agent can write 'done'
                    if (pipeline.id) {
                      try {
                        await apiFetch(`/api/pipelines/${pipeline.id}/pause-agents`, { method: 'POST' });
                      } catch { /* ignore */ }
                    }

                    // 2. Save execution context so Resume can continue from here
                    const ctx = activePipelineCtxRef.current;
                    if (ctx) {
                      pausedPipelineRef.current = {
                        agentsToRun: ctx.agentsToRun,
                        projectConfig: ctx.projectConfig,
                        previousOutputs: { ...ctx.previousOutputs },
                        pipelineId: ctx.pipelineId,
                        pausedAfterIndex: ctx.currentIndex - 1,
                      };
                      activePipelineCtxRef.current = null;
                    }

                    // 3. Update frontend state
                    const pausedAgentId = runningAgentId;
                    if (pausedAgentId) {
                      updateAgentStatus(pausedAgentId, { status: 'idle' });
                    }
                    setRunningAgentId(null);
                    updatePipelineStatus('paused');

                    // 4. Abort the in-flight client request
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort();
                      abortControllerRef.current = null;
                    }

                    // 5. Stop all running agent timers
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
                  onClick={handleResumePipeline}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </button>
              )}
              {hasRun && (
                <button
                  onClick={() => {
                    handleResetAgent('');
                    setSelectedAgent(null);
                    setSnackbar('Pipeline reset successfully');
                    setTimeout(() => setSnackbar(null), 3000);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Progress bar + Total Timer */}
          {hasRun && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
                  {isRunning ? 'Processing agents...' : 'Progress'}
                </span>
                <div className="flex items-center gap-3">
                  {/* Total elapsed timer */}
                  {totalElapsed > 0 && (
                    <span className="mono-ui text-[9px] flex items-center gap-1 rounded-full px-2.5 py-0.5"
                      style={{
                        color: isRunning ? '#00f2ff' : pipeline.status === 'completed' ? '#10b981' : '#f59e0b',
                        background: isRunning ? 'rgba(0,242,255,0.08)' : pipeline.status === 'completed' ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
                        border: `1px solid ${isRunning ? 'rgba(0,242,255,0.15)' : pipeline.status === 'completed' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}`,
                      }}>
                      <Clock className="h-3 w-3" />
                      {Math.floor(totalElapsed / 60)}m {totalElapsed % 60}s
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500">
                    {completedCount}/{totalAgents} ({progressPercent}%)
                  </span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700 relative overflow-hidden',
                    pipeline.status === 'completed' ? 'bg-emerald-500' :
                    pipeline.status === 'paused' ? 'bg-amber-500' :
                    pipeline.status === 'error' ? 'bg-red-500' : 'bg-cyan-500'
                  )}
                  style={{
                    width: `${progressPercent}%`,
                    boxShadow: progressPercent > 0 ? `0 0 12px ${pipeline.status === 'completed' ? 'rgba(16,185,129,0.4)' : pipeline.status === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(0,242,255,0.4)'}` : undefined,
                  }}
                >
                  {isRunning && <div className="absolute inset-0 aurora-bg" style={{ background: 'linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)', backgroundSize: '200% 100%' }} />}
                </div>
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
          <div className="rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-200">Agent Configuration</h3>
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
                      isSkipped ? 'border-white/[0.04]/40 bg-zinc-900/20 opacity-40' :
                      isEnabled ? 'border-cyan-500/30 bg-cyan-950/10' : 'border-white/[0.04] bg-[rgba(2,2,5,0.6)]/30'
                    )}
                  >
                    {meta && <meta.icon className={cn('h-3.5 w-3.5 shrink-0', isEnabled ? meta.color : 'text-gray-600')} />}
                    <div className="flex-1 min-w-0">
                      <span className={cn('text-xs truncate block', isEnabled ? 'text-gray-200' : 'text-gray-500')}>
                        {agent.name.replace(' Agent', '')}
                      </span>
                      {meta?.tools && isEnabled && (
                        <span className="text-[9px] text-gray-600 truncate block">{meta.tools.join(' · ')}</span>
                      )}
                    </div>
                    <button
                      onClick={() => !isSkipped && toggleAgent(agent.id)}
                      disabled={isSkipped}
                      className={cn(
                        'h-5 w-9 rounded-full p-0.5 transition-colors shrink-0',
                        isSkipped ? 'bg-white/5 cursor-not-allowed' :
                        isEnabled ? 'bg-cyan-600' : 'bg-zinc-700'
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

        {/* ══════ PIPELINE FLOW — Planet & Moon System ══════ */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}
          className="space-y-6"
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

            const phaseAccent =
              phase.id === 'discovery' ? '#3b82f6' :
              phase.id === 'content' ? '#ec4899' :
              phase.id === 'generation' ? '#f59e0b' :
              phase.id === 'qualification' ? '#8b5cf6' : '#10b981';

            return (
              <motion.div
                key={phase.id}
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
              >
                {/* ════ PLANET — Phase Card ════ */}
                <div className={cn('relative rounded-2xl overflow-hidden transition-all duration-500', isSkipped && 'opacity-30')}
                  style={{
                    background: `linear-gradient(145deg, rgba(12,14,22,0.9), rgba(6,8,14,0.95))`,
                    border: `1px solid ${isSkipped ? 'rgba(255,255,255,0.03)' : phaseStatus === 'running' ? `${phaseAccent}50` : phaseStatus === 'done' ? `${phaseAccent}35` : 'rgba(255,255,255,0.10)'}`,
                    boxShadow: isSkipped ? 'none'
                      : phaseStatus === 'running' ? `0 4px 24px ${phaseAccent}12, 0 0 0 1px ${phaseAccent}08, inset 0 1px 0 rgba(255,255,255,0.04)`
                      : phaseStatus === 'done' ? `0 4px 20px ${phaseAccent}10, 0 0 0 1px ${phaseAccent}06, inset 0 1px 0 rgba(255,255,255,0.03)`
                      : '0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.04)',
                  }}>

                  {/* Running aurora */}
                  {phaseStatus === 'running' && (
                    <div className="absolute top-0 left-0 right-0 h-px aurora-bg" style={{ background: `linear-gradient(90deg, transparent, ${phaseAccent}40, transparent)`, backgroundSize: '300% 100%' }} />
                  )}

                  {/* Planet header — clickable */}
                  <button onClick={() => !isSkipped && togglePhase(phase.id)} disabled={isSkipped}
                    className="w-full flex items-center gap-4 p-4 group text-left">

                    {/* Planet orb */}
                    <div className="relative w-14 h-14 shrink-0">
                      {/* Outer orbit ring */}
                      <div className="absolute inset-0 rounded-full transition-all duration-700"
                        style={{ border: `2px solid ${phaseStatus === 'running' ? `${phaseAccent}35` : phaseStatus === 'done' ? `${phaseAccent}20` : 'rgba(255,255,255,0.04)'}` }}>
                        {phaseStatus === 'running' && (
                          <div className="absolute inset-0 rounded-full orbit-rotate">
                            <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full"
                              style={{ background: phaseAccent, boxShadow: `0 0 10px ${phaseAccent}` }} />
                          </div>
                        )}
                      </div>
                      {/* Planet core */}
                      <div className="absolute inset-2 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300"
                        style={{
                          background: `radial-gradient(circle at 40% 40%, ${phaseAccent}20, ${phaseAccent}08)`,
                          color: isSkipped ? '#4b5563' : phaseAccent,
                          boxShadow: phaseStatus === 'running' ? `0 0 20px ${phaseAccent}15, inset 0 0 15px ${phaseAccent}10` : phaseStatus === 'done' ? `0 0 15px ${phaseAccent}10` : undefined,
                        }}>
                        {phaseStatus === 'done' ? <Check className="h-5 w-5" /> :
                         phaseStatus === 'running' ? <Loader2 className="h-5 w-5 animate-spin" /> :
                         phaseStatus === 'error' ? <AlertCircle className="h-5 w-5" /> :
                         phaseIndex + 1}
                      </div>
                    </div>

                    {/* Phase info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-0.5">
                        <h3 className="text-base font-semibold" style={{ color: isSkipped ? '#4b5563' : phaseStatus === 'idle' ? '#e5e7eb' : phaseAccent }}>
                          {phase.label}
                        </h3>
                        {isSkipped && <span className="mono-ui text-[7px] text-gray-600 rounded px-1.5 py-0.5" style={{ background: 'rgba(255,255,255,0.03)' }}>Skipped</span>}
                        {phaseStatus === 'running' && (
                          <span className="mono-ui text-[7px] rounded-full px-2.5 py-0.5 animate-pulse" style={{ color: phaseAccent, background: `${phaseAccent}15`, border: `1px solid ${phaseAccent}20` }}>LIVE</span>
                        )}
                        {phaseStatus === 'paused' && (
                          <span className="mono-ui text-[7px] text-amber-400 bg-amber-500/10 rounded-full px-2.5 py-0.5 border border-amber-500/20">PAUSED</span>
                        )}
                      </div>
                      <p className="mono-ui text-[8px] text-gray-600">
                        {enabledCount} {enabledCount === 1 ? 'agent' : 'agents'}
                        {phaseStatus === 'done' && ' — completed'}{phaseStatus === 'running' && ' — processing'}{phaseStatus === 'error' && ' — has errors'}
                      </p>

                      {/* ── Moon dots preview (collapsed view) ── */}
                      {!isExpanded && !isSkipped && (
                        <div className="flex items-center gap-2 mt-2.5">
                          {phaseAgents.map(agent => {
                            const s = agentStatuses[agent.id] || 'idle';
                            const sc = s === 'done' ? '#10b981' : s === 'running' ? '#00f2ff' : s === 'error' ? '#ef4444' : 'rgba(255,255,255,0.1)';
                            return (
                              <div key={agent.id} className="relative" title={agent.name}>
                                <div className="w-3 h-3 rounded-full transition-all duration-500"
                                  style={{ background: sc, boxShadow: s !== 'idle' ? `0 0 6px ${sc}` : undefined }} />
                                {s === 'running' && <div className="absolute inset-0 rounded-full" style={{ border: `1px solid ${sc}`, animation: 'pulse-ring 2s ease-out infinite' }} />}
                              </div>
                            );
                          })}
                          <span className="mono-ui text-[7px] text-gray-600 ml-1">
                            {phaseAgents.filter(a => (agentStatuses[a.id] || 'idle') === 'done').length}/{phaseAgents.length}
                          </span>
                        </div>
                      )}
                    </div>

                    {!isSkipped && (
                      <div className="p-1.5 rounded-lg transition-colors group-hover:bg-white/5">
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                      </div>
                    )}
                  </button>

                  {/* ════ MOONS — Agent Cards ════ */}
                  <AnimatePresence>
                  {isExpanded && !isSkipped && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }} className="overflow-hidden">
                      <div className="px-4 pb-4">
                        {/* Subtle separator between header and agent cards */}
                        <div className="mb-3 ml-5 mr-5 h-px" style={{ background: `linear-gradient(90deg, transparent, ${phaseAccent}15, transparent)` }} />

                        <div className="grid gap-3 sm:grid-cols-2">
                          {phaseAgents.map((agent, agentIdx) => {
                            const meta = AGENT_META[agent.id];
                            const Icon = meta?.icon || Bot;
                            const rawStatus = agentStatuses[agent.id] || 'idle';
                            const status = (rawStatus === 'running' && isPaused) ? 'paused' : rawStatus;
                            const pipelineAgent = pipeline.agents.find(a => a.id === agent.id);
                            const elapsed = elapsedTimes[agent.id];
                            const isThisRunning = runningAgentId === agent.id || rawStatus === 'running';
                            const sc = status === 'done' ? '#10b981' : status === 'running' ? '#00f2ff' : status === 'paused' ? '#f59e0b' : status === 'error' ? '#ef4444' : phaseAccent;

                            return (
                              <motion.div key={agent.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: agentIdx * 0.06 }}
                                onClick={() => setSelectedAgent(agent.id)}
                                whileHover={{ y: -3, transition: { duration: 0.25 } }}
                                className="group relative rounded-xl cursor-pointer transition-all duration-500 overflow-hidden"
                                style={{
                                  background: status === 'idle' ? 'rgba(4,6,12,0.7)' : `linear-gradient(145deg, rgba(4,6,12,0.8), rgba(2,3,8,0.9))`,
                                  border: `1px solid ${status === 'idle' ? 'rgba(255,255,255,0.07)' : `${sc}30`}`,
                                  boxShadow: status === 'idle'
                                    ? '0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)'
                                    : `0 2px 12px ${sc}10, inset 0 1px 0 ${sc}06`,
                                }}>

                                {/* Running top aurora */}
                                {status === 'running' && (
                                  <div className="absolute top-0 left-0 right-0 h-px aurora-bg" style={{ background: `linear-gradient(90deg, transparent, ${sc}50, transparent)`, backgroundSize: '300% 100%' }} />
                                )}

                                <div className="p-4">
                                  <div className="flex items-start gap-3">
                                    {/* Moon orb */}
                                    <div className="relative w-10 h-10 shrink-0">
                                      <div className="absolute inset-0 rounded-full transition-all duration-500"
                                        style={{ border: `1.5px solid ${status === 'idle' ? 'rgba(255,255,255,0.1)' : `${sc}35`}`, boxShadow: status === 'running' ? `0 0 15px ${sc}15` : status === 'done' ? `0 0 8px ${sc}10` : undefined }}>
                                        {status === 'running' && (
                                          <div className="absolute -top-[2px] -right-[2px] w-2 h-2 rounded-full" style={{ background: sc, boxShadow: `0 0 6px ${sc}`, animation: 'pulse-ring 2s ease-out infinite' }} />
                                        )}
                                        {status === 'done' && (
                                          <div className="absolute -top-[2px] -right-[2px] w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 4px #10b981' }} />
                                        )}
                                      </div>
                                      <div className="absolute inset-1 rounded-full flex items-center justify-center"
                                        style={{ background: `radial-gradient(circle at 40% 40%, ${sc}15, ${sc}05)` }}>
                                        {status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: sc }} /> :
                                         status === 'done' ? <Check className="h-4 w-4 text-emerald-400" /> :
                                         status === 'error' ? <AlertCircle className="h-4 w-4 text-red-400" /> :
                                         status === 'paused' ? <Pause className="h-4 w-4 text-amber-400" /> :
                                         <Icon className={cn('h-4 w-4', meta?.color || 'text-gray-400')} />}
                                      </div>
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <p className="text-xs font-semibold truncate" style={{ color: status === 'idle' ? '#d1d5db' : sc }}>{agent.name}</p>
                                        {status === 'running' && <span className="mono-ui text-[6px] rounded-full px-1.5 py-0.5 animate-pulse" style={{ color: sc, background: `${sc}12`, border: `1px solid ${sc}18` }}>LIVE</span>}
                                        {status === 'paused' && <span className="mono-ui text-[6px] text-amber-400 bg-amber-500/10 rounded-full px-1.5 py-0.5">PAUSED</span>}
                                      </div>

                                      {status === 'idle' && !hasRun && <p className="text-[10px] text-gray-600 leading-relaxed line-clamp-2">{meta?.description}</p>}
                                      {status === 'running' && <p className="text-[10px]" style={{ color: `${sc}80` }}>Fetching from {meta?.tools?.slice(0, 2).join(' & ')}...</p>}
                                      {status === 'paused' && <p className="text-[10px] text-amber-400/60">Paused — resume to continue</p>}
                                      {pipelineAgent?.outputPreview && status === 'done' && <p className="text-[10px] text-gray-500 truncate">{typeof pipelineAgent.outputPreview === 'string' ? pipelineAgent.outputPreview : 'Completed'}</p>}
                                      {pipelineAgent?.error && status === 'error' && <p className="text-[10px] text-red-400 truncate">{pipelineAgent.error}</p>}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                      {status === 'running' && elapsed !== undefined && (
                                        <span className="mono-ui text-[7px] flex items-center gap-1 rounded-full px-2.5 py-0.5"
                                          style={{ color: sc, background: `${sc}10`, border: `1px solid ${sc}15` }}>
                                          <Clock className="h-2.5 w-2.5" />{formatElapsed(elapsed)}
                                        </span>
                                      )}
                                      {status === 'done' && (
                                        <div className="flex flex-col items-end gap-0.5">
                                          {/* Duration this agent took */}
                                          {elapsed !== undefined && elapsed > 0 && (
                                            <span className="mono-ui text-[7px] flex items-center gap-1 rounded-full px-2 py-0.5"
                                              style={{ color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.12)' }}>
                                              <Clock className="h-2.5 w-2.5" />{formatElapsed(elapsed)}
                                            </span>
                                          )}
                                          {pipelineAgent?.lastRunTime && (
                                            <span className="mono-ui text-[6px] text-gray-600">{new Date(pipelineAgent.lastRunTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                          )}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1">
                                        {status === 'idle' && !isRunning && (
                                          <button onClick={(e) => { e.stopPropagation(); handleRunAgent(agent.id); }} disabled={isThisRunning}
                                            className="rounded-full p-1 text-gray-600 opacity-0 group-hover:opacity-100 transition-all" style={{ border: '1px solid rgba(255,255,255,0.06)' }} title="Run"><Play className="h-2.5 w-2.5" /></button>
                                        )}
                                        {status === 'error' && !isRunning && (
                                          <button onClick={(e) => { e.stopPropagation(); handleRunAgent(agent.id); }} disabled={isThisRunning}
                                            className="rounded-full p-1 text-red-400/60 hover:text-red-400 transition-all" style={{ border: '1px solid rgba(239,68,68,0.15)' }} title="Retry"><RefreshCw className="h-2.5 w-2.5" /></button>
                                        )}
                                        {status === 'done' && !isRunning && (
                                          <button onClick={(e) => { e.stopPropagation(); handleRunAgent(agent.id); }} disabled={isThisRunning}
                                            className="rounded-full p-1 text-gray-600 opacity-0 group-hover:opacity-100 transition-all" style={{ border: '1px solid rgba(255,255,255,0.06)' }} title="Re-run"><RefreshCw className="h-2.5 w-2.5" /></button>
                                        )}
                                        <ChevronRight className="h-3 w-3 text-gray-700 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Running progress bar */}
                                  {status === 'running' && (
                                    <div className="mt-3 h-1 w-full overflow-hidden rounded-full" style={{ background: `${sc}08` }}>
                                      <div className="h-full w-1/3 rounded-full" style={{ background: `linear-gradient(90deg, ${sc}80, ${sc})`, boxShadow: `0 0 8px ${sc}25`, animation: 'indeterminate 1.5s infinite ease-in-out' }} />
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </div>

                {/* ════ Energy Connector between planets ════ */}
                {phaseIndex < PIPELINE_PHASES.length - 1 && !isSkipped && (
                  <>
                    <div className="flex justify-center py-2">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-px h-3" style={{ background: `linear-gradient(to bottom, ${phaseAccent}25, transparent)` }} />
                        <div className="w-2 h-2 rounded-full" style={{
                          background: phaseStatus === 'done' ? phaseAccent : 'rgba(255,255,255,0.06)',
                          boxShadow: phaseStatus === 'done' ? `0 0 8px ${phaseAccent}40` : phaseStatus === 'running' ? `0 0 6px ${phaseAccent}30` : undefined,
                        }}>
                          {phaseStatus === 'running' && <div className="w-full h-full rounded-full" style={{ background: phaseAccent, animation: 'pulse-ring 2s ease-out infinite' }} />}
                        </div>
                        <div className="w-px h-3" style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06))' }} />
                      </div>
                    </div>

                    {/* ════ Ad Approval Gate — shown between Content and Lead Gen when paused after paid-traffic ════ */}
                    {phase.id === 'content' && isPausedForAdReview && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
                        className="relative mx-auto mb-3 max-w-md"
                      >
                        {/* Glowing border */}
                        <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-orange-500/30 via-amber-500/30 to-orange-500/30 blur-sm" />
                        <div className="relative rounded-2xl overflow-hidden"
                          style={{ background: 'rgba(2,2,5,0.9)', border: '1px solid rgba(245,158,11,0.25)' }}>

                          {/* Animated top accent */}
                          <div className="h-0.5 w-full" style={{
                            background: 'linear-gradient(90deg, transparent, #f59e0b, #f97316, #f59e0b, transparent)',
                            backgroundSize: '200% 100%',
                            animation: 'shimmer 3s ease-in-out infinite',
                          }} />

                          <div className="p-5">
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className="relative">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center"
                                  style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
                                  <Megaphone className="w-5 h-5 text-amber-400" />
                                </div>
                                <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center"
                                  style={{ boxShadow: '0 0 8px rgba(245,158,11,0.5)' }}>
                                  <Pause className="w-2 h-2 text-black" />
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-amber-300">Ad Review Required</h4>
                                <p className="text-[11px] text-gray-500">Pipeline paused for your approval</p>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-gray-400 leading-relaxed mb-4">
                              Your ad campaigns (Google Ads & Meta Ads) have been generated. Please review the targeting, budgets, and creatives before they go live.
                            </p>

                            {/* Action button */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedAgent('paid-traffic')}
                                className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all"
                                style={{
                                  background: 'rgba(245,158,11,0.08)',
                                  border: '1px solid rgba(245,158,11,0.2)',
                                  color: '#fbbf24',
                                }}
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Review Ads
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </>
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
              isPipelinePaused={pipeline.status === 'paused'}
              projectId={selectedProjectId}
              fallbackOutput={agentOutputs[selectedAgent]}
              onClose={() => setSelectedAgent(null)}
              onRun={() => handleRunAgent(selectedAgent)}
              onPause={() => handlePauseAgent(selectedAgent)}
              onReset={() => { handleResetAgent(selectedAgent); setSelectedAgent(null); }}
              onResolved={selectedAgent === 'ai-qualification' ? handleQualificationResolved : undefined}
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

      {/* Pipeline background animations */}
      <style>{`
        @keyframes grid-drift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-40px, -40px); }
        }
        @keyframes wave-flow {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }
        @keyframes aurora-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          33% { transform: translate(80px, 40px) scale(1.1); opacity: 1; }
          66% { transform: translate(-40px, 80px) scale(0.95); opacity: 0.7; }
        }
        @keyframes aurora-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          33% { transform: translate(-60px, -50px) scale(1.15); opacity: 0.9; }
          66% { transform: translate(50px, -30px) scale(0.9); opacity: 0.6; }
        }
        @keyframes aurora-drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          50% { transform: translate(60px, -60px) scale(1.2); opacity: 1; }
        }
        @keyframes node-pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.5); }
        }
      `}</style>
    </ErrorBoundary>
  );
}
