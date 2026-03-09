'use client';

import { ArrowDown, Play, Pause, RotateCcw } from 'lucide-react';
import { AgentCard } from './agent-card';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import type { AgentStatus } from '@/lib/store';

interface PipelineAgent {
  id: string;
  name: string;
  status: AgentStatus;
  lastRunTime?: string;
  outputPreview?: string;
  progress?: number;
  error?: string;
}

interface PipelineFlowProps {
  agents: PipelineAgent[];
  pipelineStatus: 'idle' | 'running' | 'completed' | 'error' | 'paused';
  onRunPipeline: () => void;
  onPausePipeline: () => void;
  onResetPipeline: () => void;
  onAgentClick: (agentId: string) => void;
  onRunAgent: (agentId: string) => void;
  currentAgentIndex: number;
  title: string;
  accentColor?: string;
}

function PipelineFlowInner({
  agents,
  pipelineStatus,
  onRunPipeline,
  onPausePipeline,
  onResetPipeline,
  onAgentClick,
  onRunAgent,
  currentAgentIndex,
  title,
  accentColor = 'indigo',
}: PipelineFlowProps) {
  const completedCount = agents.filter((a) => a.status === 'done').length;
  const totalCount = agents.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-sm text-zinc-400">
            {completedCount}/{totalCount} agents completed ({progressPercent}%)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pipelineStatus === 'idle' || pipelineStatus === 'completed' || pipelineStatus === 'error' ? (
            <button
              onClick={onRunPipeline}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors',
                accentColor === 'emerald'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              )}
            >
              <Play className="h-4 w-4" />
              Run Pipeline
            </button>
          ) : pipelineStatus === 'running' ? (
            <button
              onClick={onPausePipeline}
              className="flex items-center gap-2 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
          ) : null}

          {pipelineStatus !== 'idle' && (
            <button
              onClick={onResetPipeline}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              accentColor === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500'
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {agents.map((agent, index) => (
          <div key={agent.id}>
            <AgentCard
              id={agent.id}
              name={agent.name}
              status={agent.status}
              order={index + 1}
              lastRunTime={agent.lastRunTime}
              outputPreview={agent.outputPreview}
              progress={agent.progress}
              error={agent.error}
              onClick={() => onAgentClick(agent.id)}
              onRun={() => onRunAgent(agent.id)}
              isActive={index === currentAgentIndex && pipelineStatus === 'running'}
            />
            {index < agents.length - 1 && (
              <div className="flex justify-center py-1">
                <ArrowDown className="h-4 w-4 text-zinc-700" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PipelineFlow(props: PipelineFlowProps) {
  return (
    <ErrorBoundary>
      <PipelineFlowInner {...props} />
    </ErrorBoundary>
  );
}
