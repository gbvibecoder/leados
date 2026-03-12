'use client';

import { X, Play, Clock, FileJson, Terminal, MessageSquare, Send, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
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
  onClose: () => void;
  onRun: () => void;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function AgentDetailPanelInner({ agentId, agentName, description, isRunning, elapsedTime, agentStatus, agentError, onClose, onRun }: AgentDetailPanelProps) {
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

  // Auto-refresh runs when agent finishes (running → not running)
  useEffect(() => {
    if (prevRunningRef.current && !isRunning) {
      setTimeout(() => fetchRuns(), 500);
    }
    prevRunningRef.current = isRunning;
  }, [isRunning]);

  const handleRunWithPrompt = () => {
    onRun();
  };

  const latestRun = runs[0];
  const olderRuns = runs.slice(1);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Centered Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="flex items-center justify-between border-b border-zinc-800 px-6 py-4 shrink-0"
          >
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{agentName}</h3>
                <p className="text-xs text-zinc-500 mt-0.5">{agentId}</p>
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
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>

          {/* Running Progress Banner */}
          <AnimatePresence>
            {isRunning && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 py-4 bg-indigo-950 border-b border-indigo-500/40">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <Loader2 className="h-5 w-5 text-indigo-400 animate-spin" />
                      </div>
                      <span className="text-sm font-semibold text-white">Agent is processing...</span>
                    </div>
                    {typeof elapsedTime === 'number' && (
                      <span className="text-xs font-mono text-white bg-indigo-500/30 border border-indigo-400/30 px-2.5 py-1 rounded-md">
                        {formatElapsed(elapsedTime)}
                      </span>
                    )}
                  </div>
                  {/* Animated progress bar */}
                  <div className="w-full h-2 bg-indigo-500/20 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full animate-progress-indeterminate" />
                  </div>
                  <p className="text-xs text-indigo-300 mt-2">
                    Analyzing data, calling APIs, and generating insights...
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <p className="text-sm text-zinc-300 leading-relaxed">{description}</p>
              </motion.div>
            )}

            {/* Prompt + Run */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="space-y-3"
            >
              <h4 className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <MessageSquare className="h-4 w-4" />
                Agent Prompt
              </h4>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Enter custom instructions for ${agentName}...`}
                  rows={2}
                  disabled={isRunning}
                  className="w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none disabled:opacity-50"
                />
                <div className="flex items-center justify-between px-2 pb-1">
                  <p className="text-[10px] text-zinc-600">Customize how this agent processes data</p>
                  {prompt.trim() && (
                    <span className="text-[10px] text-indigo-400">{prompt.length} chars</span>
                  )}
                </div>
              </div>

              {/* Run Button — changes based on state */}
              <button
                onClick={handleRunWithPrompt}
                disabled={isRunning}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all',
                  isRunning
                    ? 'bg-blue-600/20 border border-blue-500/30 text-blue-300 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-500'
                )}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running... {typeof elapsedTime === 'number' && `(${formatElapsed(elapsedTime)})`}
                  </>
                ) : prompt.trim() ? (
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
            </motion.div>

            {/* Run History — collapsible */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.28 }}
            >
              <h4 className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3">
                <Clock className="h-4 w-4" />
                Run History
                {runs.length > 0 && (
                  <span className="text-[10px] text-zinc-500 bg-zinc-800 rounded-full px-2 py-0.5">{runs.length}</span>
                )}
              </h4>

              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-500" />
                </div>
              ) : runs.length === 0 && !isRunning ? (
                <p className="py-4 text-center text-sm text-zinc-500">No runs yet — click Run Agent above to start</p>
              ) : (
                <div className="space-y-2">
                  {/* Latest run — always visible + selected by default */}
                  {latestRun && (
                    <button
                      onClick={() => setSelectedRun(latestRun)}
                      className={cn(
                        'w-full rounded-lg border p-3 text-left transition-all',
                        selectedRun?.id === latestRun.id
                          ? 'border-indigo-500 bg-indigo-950/20'
                          : 'border-zinc-800 hover:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-xs font-medium',
                            latestRun.status === 'done' ? 'text-emerald-400' :
                            latestRun.status === 'error' ? 'text-red-400' :
                            latestRun.status === 'running' ? 'text-blue-400' : 'text-zinc-400'
                          )}>
                            {latestRun.status?.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-zinc-600 bg-zinc-800 rounded px-1.5 py-0.5">Latest</span>
                        </div>
                        <span className="text-xs text-zinc-500">
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
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-zinc-800/50 py-1.5 text-[11px] text-zinc-500 hover:text-zinc-400 hover:border-zinc-700 transition-colors"
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
                                    ? 'border-indigo-500 bg-indigo-950/20'
                                    : 'border-zinc-800 hover:border-zinc-700'
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={cn(
                                    'text-xs font-medium',
                                    run.status === 'done' ? 'text-emerald-400' :
                                    run.status === 'error' ? 'text-red-400' :
                                    run.status === 'running' ? 'text-blue-400' : 'text-zinc-400'
                                  )}>
                                    {run.status?.toUpperCase()}
                                  </span>
                                  <span className="text-xs text-zinc-500">
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
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
                    <FileJson className="h-4 w-4" />
                    Output
                  </h4>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 overflow-x-auto">
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
    </>
  );
}

export function AgentDetailPanel(props: AgentDetailPanelProps) {
  return (
    <ErrorBoundary>
      <AgentDetailPanelInner {...props} />
    </ErrorBoundary>
  );
}
