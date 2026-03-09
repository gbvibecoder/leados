'use client';

import { Workflow, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import Link from 'next/link';

export function PipelineStatus() {
  const { pipeline } = useAppStore();

  const completedCount = pipeline.agents.filter((a) => a.status === 'done').length;
  const runningCount = pipeline.agents.filter((a) => a.status === 'running').length;
  const errorCount = pipeline.agents.filter((a) => a.status === 'error').length;

  return (
    <Link
      href="/leados"
      className="group block rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-zinc-700"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-900/30">
            <Workflow className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">LeadOS Pipeline</h3>
            <p className="text-xs text-zinc-400">13 agents</p>
          </div>
        </div>
        <StatusBadge status={pipeline.status} />
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-zinc-300">{completedCount} done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-zinc-300">{runningCount} running</span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-zinc-300">{errorCount} errors</span>
          </div>
        )}
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-700"
          style={{ width: `${(completedCount / 13) * 100}%` }}
        />
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; class: string }> = {
    idle: { label: 'Idle', class: 'border-zinc-700 text-zinc-400' },
    running: { label: 'Running', class: 'border-blue-700 text-blue-400 bg-blue-950/50' },
    completed: { label: 'Completed', class: 'border-emerald-700 text-emerald-400 bg-emerald-950/50' },
    error: { label: 'Error', class: 'border-red-700 text-red-400 bg-red-950/50' },
    paused: { label: 'Paused', class: 'border-yellow-700 text-yellow-400 bg-yellow-950/50' },
  };

  const c = config[status] || config.idle;
  return (
    <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-medium', c.class)}>
      {c.label}
    </span>
  );
}
