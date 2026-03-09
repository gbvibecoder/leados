'use client';

import { Bot, CheckCircle2, AlertCircle, Loader2, Clock, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import type { AgentStatus } from '@/lib/store';

interface AgentCardProps {
  id: string;
  name: string;
  status: AgentStatus;
  order: number;
  lastRunTime?: string;
  outputPreview?: string;
  progress?: number;
  error?: string;
  onClick?: () => void;
  onRun?: () => void;
  isActive?: boolean;
  compact?: boolean;
}

const statusConfig: Record<AgentStatus, { icon: typeof Bot; color: string; bg: string; label: string }> = {
  idle: { icon: Clock, color: 'text-zinc-400', bg: 'bg-zinc-800', label: 'Idle' },
  running: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-900/30', label: 'Running' },
  done: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-900/30', label: 'Complete' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/30', label: 'Error' },
};

function AgentCardInner({
  id,
  name,
  status,
  order,
  lastRunTime,
  outputPreview,
  progress,
  error,
  onClick,
  onRun,
  isActive,
  compact,
}: AgentCardProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all hover:border-zinc-600',
          isActive ? 'border-indigo-500 bg-indigo-950/20' : 'border-zinc-800 bg-zinc-900/50',
          status === 'running' && 'border-blue-500/50'
        )}
      >
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', config.bg)}>
          <Icon className={cn('h-4 w-4', config.color, status === 'running' && 'animate-spin')} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-200">{name}</p>
          <p className={cn('text-xs', config.color)}>{config.label}</p>
        </div>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400">
          {order}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-xl border p-4 transition-all hover:border-zinc-600',
        isActive ? 'border-indigo-500 bg-indigo-950/20' : 'border-zinc-800 bg-zinc-900/50',
        status === 'running' && 'border-blue-500/50 shadow-lg shadow-blue-500/5'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', config.bg)}>
            <Icon className={cn('h-5 w-5', config.color, status === 'running' && 'animate-spin')} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400">
                {order}
              </span>
              <h3 className="text-sm font-semibold text-zinc-100">{name}</h3>
            </div>
            <span className={cn('text-xs font-medium', config.color)}>{config.label}</span>
          </div>
        </div>

        {status === 'idle' && onRun && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRun();
            }}
            className="rounded-lg p-2 text-zinc-500 opacity-0 transition-opacity hover:bg-zinc-800 hover:text-white group-hover:opacity-100"
          >
            <Play className="h-4 w-4" />
          </button>
        )}
      </div>

      {progress !== undefined && status === 'running' && (
        <div className="mt-3">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-zinc-500">{progress}%</p>
        </div>
      )}

      {lastRunTime && (
        <p className="mt-2 text-xs text-zinc-500">
          Last run: {new Date(lastRunTime).toLocaleString()}
        </p>
      )}

      {outputPreview && status === 'done' && (
        <p className="mt-2 truncate text-xs text-zinc-400">{outputPreview}</p>
      )}

      {error && status === 'error' && (
        <p className="mt-2 truncate text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

export function AgentCard(props: AgentCardProps) {
  return (
    <ErrorBoundary>
      <AgentCardInner {...props} />
    </ErrorBoundary>
  );
}
