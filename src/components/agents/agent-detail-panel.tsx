'use client';

import { X, Play, Clock, FileJson, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { agents as agentsApi } from '@/lib/api';
import { ErrorBoundary } from '@/components/layout/error-boundary';

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

  useEffect(() => {
    setLoading(true);
    agentsApi.runs(agentId)
      .then((data) => {
        setRuns(Array.isArray(data) ? data : []);
        if (data && data.length > 0) setSelectedRun(data[0]);
      })
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  }, [agentId]);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg border-l border-zinc-800 bg-zinc-950 shadow-2xl">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{agentName}</h3>
            <p className="text-sm text-zinc-400">{agentId}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {description && (
            <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
              <p className="text-sm text-zinc-300">{description}</p>
            </div>
          )}

          <div className="mb-4">
            <button
              onClick={onRun}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Play className="h-4 w-4" />
              Run Agent
            </button>
          </div>

          <div>
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
                {runs.map((run: any) => (
                  <button
                    key={run.id}
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
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedRun && (
            <div className="mt-4">
              <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
                <FileJson className="h-4 w-4" />
                Output
              </h4>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <pre className="max-h-64 overflow-auto text-xs text-zinc-300">
                  {JSON.stringify(selectedRun.outputsJson || selectedRun.outputs || {}, null, 2)}
                </pre>
              </div>

              {selectedRun.error && (
                <div className="mt-2">
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-red-400">
                    <Terminal className="h-4 w-4" />
                    Error
                  </h4>
                  <div className="rounded-lg border border-red-800/50 bg-red-950/20 p-3">
                    <pre className="text-xs text-red-300">{selectedRun.error}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AgentDetailPanel(props: AgentDetailPanelProps) {
  return (
    <ErrorBoundary>
      <AgentDetailPanelInner {...props} />
    </ErrorBoundary>
  );
}
