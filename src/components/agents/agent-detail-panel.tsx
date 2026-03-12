'use client';

import { X, Play, Clock, FileJson, Terminal, MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { agents as agentsApi } from '@/lib/api';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import { AgentOutput } from './AgentOutput';
import { motion } from 'framer-motion';

interface AgentDetailPanelProps {
  agentId: string;
  agentName: string;
  description?: string;
  onClose: () => void;
  onRun: () => void;
}

function AgentDetailPanelInner({ agentId, agentName, description, onClose, onRun }: AgentDetailPanelProps) {
  const [runs, setRuns] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    setLoading(true);
    setPrompt('');
    agentsApi.runs(agentId)
      .then((data) => {
        setRuns(Array.isArray(data) ? data : []);
        if (data && data.length > 0) setSelectedRun(data[0]);
      })
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, [agentId]);

  const handleRunWithPrompt = () => {
    onRun();
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
            className="flex items-center justify-between border-b border-zinc-800 p-4"
          >
            <div>
              <h3 className="text-lg font-semibold text-white">{agentName}</h3>
              <p className="text-sm text-zinc-400">{agentId}</p>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </motion.div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Description */}
            {description && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
                className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3"
              >
                <p className="text-sm text-zinc-300">{description}</p>
              </motion.div>
            )}

            {/* Prompt input section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.28, ease: [0.25, 0.4, 0.25, 1] }}
              className="mb-4"
            >
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                <MessageSquare className="h-4 w-4" />
                Agent Prompt
              </h4>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-1">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={`Enter custom instructions for ${agentName}...`}
                  rows={3}
                  className="w-full resize-none rounded-lg bg-transparent px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none"
                />
                <div className="flex items-center justify-between px-2 pb-1">
                  <p className="text-[10px] text-zinc-600">
                    Customize how this agent processes data
                  </p>
                  {prompt.trim() && (
                    <span className="text-[10px] text-indigo-400">
                      {prompt.length} chars
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Run agent button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.35, ease: [0.25, 0.4, 0.25, 1] }}
              className="mb-4"
            >
              <button
                onClick={handleRunWithPrompt}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
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
            </motion.div>

            {/* Run History */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.42, ease: [0.25, 0.4, 0.25, 1] }}
            >
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                <Clock className="h-4 w-4" />
                Run History
              </h4>

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-indigo-500" />
                </div>
              ) : runs.length === 0 ? (
                <p className="py-4 text-center text-sm text-zinc-500">No runs yet</p>
              ) : (
                <div className="space-y-2">
                  {runs.map((run: any, i: number) => (
                    <motion.button
                      key={run.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.45 + i * 0.05, ease: [0.25, 0.4, 0.25, 1] }}
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
                </div>
              )}
            </motion.div>

            {/* Output */}
            {selectedRun && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
                className="mt-4"
              >
                <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                  <FileJson className="h-4 w-4" />
                  Output
                </h4>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <AgentOutput
                    agentId={agentId}
                    agentName={agentName}
                    data={selectedRun.outputsJson || selectedRun.outputs || {}}
                    isLive={agentId === 'service-research'}
                  />
                </div>

                {selectedRun.error && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.25 }}
                    className="mt-2"
                  >
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-red-400">
                      <Terminal className="h-4 w-4" />
                      Error
                    </h4>
                    <div className="rounded-lg border border-red-800/50 bg-red-950/20 p-3">
                      <pre className="text-xs text-red-300">{selectedRun.error}</pre>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
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
