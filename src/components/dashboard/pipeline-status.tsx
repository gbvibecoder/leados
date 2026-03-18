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
  const progress = (completedCount / 13) * 100;

  return (
    <Link href="/leados"
      className="group block rounded-xl p-5 transition-all duration-500"
      style={{ background: 'rgba(2,2,5,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl relative"
            style={{ background: 'rgba(0,242,255,0.08)', border: '1px solid rgba(0,242,255,0.15)' }}>
            <Workflow className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-100">LeadOS Pipeline</h3>
            <p className="text-xs text-gray-500">13 agents</p>
          </div>
        </div>
        <StatusBadge status={pipeline.status} />
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-gray-300">{completedCount} done</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-gray-300">{runningCount} running</span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-gray-300">{errorCount} errors</span>
          </div>
        )}
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <div className="h-full rounded-full transition-all duration-700 bg-cyan-500"
          style={{ width: `${progress}%`, boxShadow: progress > 0 ? '0 0 8px rgba(0,242,255,0.4)' : undefined }} />
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    idle: { label: 'Idle', bg: 'transparent', text: 'text-gray-500', border: 'rgba(255,255,255,0.08)' },
    running: { label: 'Running', bg: 'rgba(0,242,255,0.05)', text: 'text-cyan-400', border: 'rgba(0,242,255,0.2)' },
    completed: { label: 'Completed', bg: 'rgba(16,185,129,0.05)', text: 'text-emerald-400', border: 'rgba(16,185,129,0.2)' },
    error: { label: 'Error', bg: 'rgba(239,68,68,0.05)', text: 'text-red-400', border: 'rgba(239,68,68,0.2)' },
    paused: { label: 'Paused', bg: 'rgba(245,158,11,0.05)', text: 'text-yellow-400', border: 'rgba(245,158,11,0.2)' },
  };
  const c = config[status] || config.idle;
  return (
    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', c.text)}
      style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}
