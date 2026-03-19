'use client';

import { X, Play, Clock, FileJson, Terminal, MessageSquare, Send, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle, Pause, RotateCcw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { agents as agentsApi } from '@/lib/api';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import { AgentOutput } from './AgentOutput';
import { motion, AnimatePresence } from 'framer-motion';

interface AgentDetailPanelProps {
  agentId: string;
  agentName: string;
  description?: string;
  isRunning?: boolean;
  elapsedTime?: number;
  agentStatus?: 'idle' | 'running' | 'done' | 'error';
  agentError?: string;
  /** Name of the prerequisite agent that must complete first (null if none) */
  prerequisiteAgent?: string | null;
  /** Whether any other agent in the pipeline is currently running */
  isPipelineRunning?: boolean;
  onClose: () => void;
  onRun: () => void;
  onPause?: () => void;
  onReset?: () => void;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function AgentDetailPanelInner({ agentId, agentName, description, isRunning, elapsedTime, agentStatus, agentError, prerequisiteAgent, isPipelineRunning, onClose, onRun, onPause, onReset }: AgentDetailPanelProps) {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const prevRunningRef = useRef(isRunning);

  const fetchRuns = () => {
    agentsApi.runs(agentId)
      .then((data) => {
        const runsList = Array.isArray(data) ? data : [];
        setRuns(runsList);
        if (runsList.length > 0) setSelectedRun(runsList[0]);
      })
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    setPrompt('');
    setHistoryExpanded(false);
    fetchRuns();
  }, [agentId]);

  // Auto-refresh runs when agent finishes (running → done/error)
  const prevStatusRef = useRef(agentStatus);
  useEffect(() => {
    const wasRunning = prevRunningRef.current || prevStatusRef.current === 'running';
    const nowDone = !isRunning && agentStatus !== 'running';
    if (wasRunning && nowDone) {
      setTimeout(() => fetchRuns(), 500);
    }
    prevRunningRef.current = isRunning;
    prevStatusRef.current = agentStatus;
  }, [isRunning, agentStatus]);

  // Poll for completion while agent is running (handles background execution)
  useEffect(() => {
    if (!isRunning && agentStatus !== 'running') return;
    const interval = setInterval(() => {
      agentsApi.runs(agentId).then((data) => {
        const runsList = Array.isArray(data) ? data : [];
        if (runsList.length > 0 && runsList[0].status !== 'running') {
          setRuns(runsList);
          setSelectedRun(runsList[0]);
        }
      }).catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, [isRunning, agentStatus, agentId]);

  const handleRunWithPrompt = () => {
    onRun();
  };

  const latestRun = runs[0];
  const olderRuns = runs.slice(1);

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Centered Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
          style={{ background: 'rgba(2,2,5,0.97)', border: '1px solid rgba(0,242,255,0.06)', backdropFilter: 'blur(20px)' }}
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="flex items-center justify-between px-6 py-4 shrink-0 relative"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
          >
            {/* Aurora line */}
            {isRunning && <div className="absolute top-0 left-0 right-0 h-px aurora-bg" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,242,255,0.3), transparent)', backgroundSize: '300% 100%' }} />}
            <div className="flex items-center gap-3">
              <div>
                <div className="mono-ui text-[8px] text-cyan-400/50 mb-0.5">{agentId}</div>
                <h3 className="font-cinzel text-base text-white">{agentName}</h3>
              </div>
              {/* Live status badge */}
              {isRunning && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-full px-2.5 py-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                  </span>
                  Running
                </span>
              )}
              {!isRunning && agentStatus === 'done' && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </span>
              )}
              {!isRunning && agentStatus === 'error' && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1">
                  <AlertCircle className="h-3 w-3" />
                  Failed
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>

          {/* Running Progress Banner */}
          {isRunning && (
            <div className="px-6 py-4 shrink-0" style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.06), rgba(139,92,246,0.03), rgba(2,2,5,0.8))', borderBottom: '1px solid rgba(0,242,255,0.1)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-6 h-6">
                    <div className="absolute inset-0 rounded-full orbit-rotate" style={{ border: '1.5px solid rgba(0,242,255,0.3)' }}>
                      <div className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 6px #00f2ff' }} />
                    </div>
                    <Loader2 className="absolute inset-0.5 h-5 w-5 text-cyan-400 animate-spin" />
                  </div>
                  <span className="text-sm font-semibold text-white">Agent is processing...</span>
                </div>
                {typeof elapsedTime === 'number' && (
                  <span className="mono-ui text-[9px] rounded-full px-3 py-1" style={{ color: '#00f2ff', background: 'rgba(0,242,255,0.1)', border: '1px solid rgba(0,242,255,0.15)' }}>
                    {formatElapsed(elapsedTime)}
                  </span>
                )}
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,242,255,0.06)' }}>
                <div className="h-full rounded-full animate-progress-indeterminate" style={{ background: 'linear-gradient(90deg, rgba(0,242,255,0.6), rgba(139,92,246,0.4))', boxShadow: '0 0 8px rgba(0,242,255,0.3)' }} />
              </div>
              <p className="text-xs text-gray-500 mt-2">Analyzing data, calling APIs, and generating insights...</p>
            </div>
          )}

          {/* Completed Banner */}
          <AnimatePresence>
            {!isRunning && agentStatus === 'done' && latestRun && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-3 bg-emerald-500/5 border-b border-emerald-500/20 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm text-emerald-300">Agent completed successfully</span>
                  <span className="text-xs text-emerald-400/60 ml-auto">
                    {latestRun.startedAt ? new Date(latestRun.startedAt).toLocaleString() : ''}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Banner */}
          <AnimatePresence>
            {!isRunning && agentStatus === 'error' && agentError && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-3 bg-red-500/5 border-b border-red-500/20 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-300 truncate">{agentError}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Description */}
            {description && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="rounded-lg rounded-xl p-4"
              >
                <p className="text-sm text-gray-300 leading-relaxed">{description}</p>
              </motion.div>
            )}

            {/* Prompt + Run */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="space-y-3"
            >
              <h4 className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <MessageSquare className="h-4 w-4" />
                Agent Prompt
              </h4>
              <div className="rounded-lg rounded-xl p-1">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Enter custom instructions for ${agentName}...`}
                  rows={2}
                  disabled={isRunning}
                  className="w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm text-gray-200 placeholder-zinc-600 focus:outline-none disabled:opacity-50"
                />
                <div className="flex items-center justify-between px-2 pb-1">
                  <p className="text-[10px] text-gray-600">Customize how this agent processes data</p>
                  {prompt.trim() && (
                    <span className="text-[10px] text-cyan-400">{prompt.length} chars</span>
                  )}
                </div>
              </div>

              {/* This agent is currently running (via pipeline or manual run) */}
              {(isRunning || agentStatus === 'running') && (
                <div className="space-y-2">
                  <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <Loader2 className="h-4 w-4 text-blue-400 mt-0.5 shrink-0 animate-spin" />
                    <div>
                      <p className="text-sm font-medium text-blue-300">This Agent is Running</p>
                      <p className="text-xs text-blue-400/80 mt-0.5">
                        {agentName} is currently processing. {typeof elapsedTime === 'number' && elapsedTime > 0 && `Elapsed: ${formatElapsed(elapsedTime)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onPause}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-amber-600/20 border border-amber-500/30 text-amber-300 hover:bg-amber-600/30 transition-all"
                    >
                      <Pause className="h-4 w-4" />
                      Pause Agent
                    </button>
                    <button
                      onClick={onReset}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/30 transition-all"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset Agent
                    </button>
                  </div>
                </div>
              )}

              {/* Dependency Warning Popup */}
              {!isRunning && agentStatus !== 'running' && prerequisiteAgent && (
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">Prerequisite Required</p>
                    <p className="text-xs text-amber-400/80 mt-0.5">
                      <span className="font-semibold">{prerequisiteAgent}</span> must complete before this agent can run. Agents execute in pipeline order.
                    </p>
                  </div>
                </div>
              )}

              {/* Another agent is running (not this one, and this one hasn't completed yet) */}
              {!isRunning && agentStatus !== 'running' && agentStatus !== 'done' && !prerequisiteAgent && isPipelineRunning && (
                <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <Loader2 className="h-4 w-4 text-blue-400 mt-0.5 shrink-0 animate-spin" />
                  <div>
                    <p className="text-sm font-medium text-blue-300">Another Agent is Running</p>
                    <p className="text-xs text-blue-400/80 mt-0.5">
                      Another agent is currently running. Wait for it to finish or pause the pipeline first.
                    </p>
                  </div>
                </div>
              )}

              {/* Run Button — only shown when this agent is NOT running */}
              {!isRunning && agentStatus !== 'running' && (
                <button
                  onClick={handleRunWithPrompt}
                  disabled={!!prerequisiteAgent || !!isPipelineRunning}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                    (prerequisiteAgent || isPipelineRunning)
                      ? 'bg-white/5 border border-white/[0.08] text-gray-500 cursor-not-allowed'
                      : 'bg-cyan-600 text-white hover:bg-cyan-500'
                  )}
                >
                  {prompt.trim() ? (
                    <>
                      <Send className="h-4 w-4" />
                      Run with Prompt
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run Agent
                    </>
                  )}
                </button>
              )}
            </motion.div>

            {/* Run History — collapsible */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.28 }}
            >
              <h4 className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-3">
                <Clock className="h-4 w-4" />
                Run History
                {runs.length > 0 && (
                  <span className="text-[10px] text-gray-500 bg-white/5 rounded-full px-2 py-0.5">{runs.length}</span>
                )}
              </h4>

              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-500" />
                </div>
              ) : runs.length === 0 && !isRunning ? (
                <p className="py-4 text-center text-sm text-gray-500">No runs yet — click Run Agent above to start</p>
              ) : (
                <div className="space-y-2">
                  {/* Latest run — always visible + selected by default */}
                  {latestRun && (
                    <button
                      onClick={() => setSelectedRun(latestRun)}
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition-all',
                        selectedRun?.id === latestRun.id
                          ? 'border-cyan-500 bg-cyan-950/20'
                          : 'border-white/[0.04] hover:border-cyan-500/15'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-xs font-medium',
                            latestRun.status === 'done' ? 'text-emerald-400' :
                            latestRun.status === 'error' ? 'text-red-400' :
                            latestRun.status === 'running' ? 'text-blue-400' : 'text-gray-400'
                          )}>
                            {latestRun.status?.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-gray-600 bg-white/5 rounded px-1.5 py-0.5">Latest</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {latestRun.startedAt ? new Date(latestRun.startedAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </button>
                  )}

                  {/* Older runs — collapsible */}
                  {olderRuns.length > 0 && (
                    <>
                      <button
                        onClick={() => setHistoryExpanded(!historyExpanded)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.04]/50 py-1.5 text-[11px] text-gray-500 hover:text-gray-400 hover:border-cyan-500/15 transition-colors"
                      >
                        {historyExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3" />
                            Hide {olderRuns.length} older {olderRuns.length === 1 ? 'run' : 'runs'}
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3" />
                            Show {olderRuns.length} older {olderRuns.length === 1 ? 'run' : 'runs'}
                          </>
                        )}
                      </button>

                      <AnimatePresence>
                        {historyExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
                            className="overflow-hidden space-y-2"
                          >
                            {olderRuns.map((run: any) => (
                              <motion.button
                                key={run.id}
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                onClick={() => setSelectedRun(run)}
                                className={cn(
                                  'w-full rounded-lg border p-3 text-left transition-colors',
                                  selectedRun?.id === run.id
                                    ? 'border-cyan-500 bg-cyan-950/20'
                                    : 'border-white/[0.04] hover:border-cyan-500/15'
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={cn(
                                    'text-xs font-medium',
                                    run.status === 'done' ? 'text-emerald-400' :
                                    run.status === 'error' ? 'text-red-400' :
                                    run.status === 'running' ? 'text-blue-400' : 'text-gray-400'
                                  )}>
                                    {run.status?.toUpperCase()}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {run.startedAt ? new Date(run.startedAt).toLocaleString() : 'N/A'}
                                  </span>
                                </div>
                              </motion.button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              )}
            </motion.div>

            {/* Output */}
            <AnimatePresence mode="wait">
              {selectedRun && (
                <motion.div
                  key={selectedRun.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                >
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-300">
                    <FileJson className="h-4 w-4" />
                    Output
                  </h4>
                  <div className="rounded-lg rounded-xl p-4 overflow-x-auto">
                    <AgentOutput
                      agentId={agentId}
                      agentName={agentName}
                      data={selectedRun.outputsJson || selectedRun.outputs || {}}
                      isLive={agentId === 'service-research'}
                    />
                  </div>

                  {selectedRun.error && (
                    <div className="mt-3">
                      <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-red-400">
                        <Terminal className="h-4 w-4" />
                        Error
                      </h4>
                      <div className="rounded-lg border border-red-800/50 bg-red-950/20 p-3 overflow-x-auto">
                        <pre className="text-xs text-red-300 whitespace-pre-wrap break-words">{selectedRun.error}</pre>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Indeterminate progress bar animation */}
      <style jsx>{`
        @keyframes progress-indeterminate {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 40%; margin-left: 30%; }
          100% { width: 0%; margin-left: 100%; }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s ease-in-out infinite;
        }
      `}</style>
    </>,
    document.body
  );
}

export function AgentDetailPanel(props: AgentDetailPanelProps) {
  return (
    <ErrorBoundary>
      <AgentDetailPanelInner {...props} />
    </ErrorBoundary>
  );
}
