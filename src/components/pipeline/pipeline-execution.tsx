'use client';

import { Bot, CheckCircle2, AlertCircle, Loader2, Clock, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PIPELINE_PHASES } from './pipeline-preview';
import type { AgentStatus } from '@/lib/store';

interface AgentState {
  id: string;
  name: string;
  status: AgentStatus;
  lastRunTime?: string;
  outputPreview?: string;
  progress?: number;
  error?: string;
}

interface PipelineExecutionProps {
  agents: AgentState[];
  currentAgentIndex: number;
  pipelineStatus: string;
  onAgentClick: (agentId: string) => void;
  onRunAgent: (agentId: string) => void;
}

const statusConfig: Record<AgentStatus, { icon: typeof Bot; color: string; bg: string; borderColor: string }> = {
  idle: { icon: Clock, color: 'text-zinc-400', bg: 'bg-zinc-800', borderColor: 'border-zinc-800' },
  running: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-900/30', borderColor: 'border-blue-500/40' },
  done: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-900/30', borderColor: 'border-emerald-500/30' },
  error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-900/30', borderColor: 'border-red-500/30' },
};

export function PipelineExecution({
  agents,
  currentAgentIndex,
  pipelineStatus,
  onAgentClick,
  onRunAgent,
}: PipelineExecutionProps) {
  // Group agents by phase
  const agentMap = new Map(agents.map((a) => [a.id, a]));

  return (
    <div className="space-y-6">
      {PIPELINE_PHASES.map((phase) => {
        const phaseAgents = phase.agentIds
          .map((id) => agentMap.get(id))
          .filter(Boolean) as AgentState[];

        if (phaseAgents.length === 0) return null;

        const allDone = phaseAgents.every((a) => a.status === 'done');
        const anyRunning = phaseAgents.some((a) => a.status === 'running');
        const anyError = phaseAgents.some((a) => a.status === 'error');

        return (
          <div key={phase.id}>
            {/* Phase header */}
            <div className="mb-3 flex items-center gap-3">
              <div className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                allDone ? 'bg-emerald-900/50 text-emerald-400' :
                anyRunning ? 'bg-blue-900/50 text-blue-400' :
                anyError ? 'bg-red-900/50 text-red-400' :
                'bg-zinc-800 text-zinc-400'
              )}>
                {allDone ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                 anyRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                 <span>{PIPELINE_PHASES.indexOf(phase) + 1}</span>}
              </div>
              <h4 className={cn(
                'text-xs font-semibold uppercase tracking-wider',
                allDone ? 'text-emerald-400' :
                anyRunning ? 'text-blue-400' :
                'text-zinc-500'
              )}>
                {phase.label}
              </h4>
            </div>

            {/* Agent rows */}
            <div className="space-y-2 pl-3 border-l-2 border-zinc-800/50 ml-3">
              {phaseAgents.map((agent) => {
                const config = statusConfig[agent.status];
                const Icon = config.icon;
                const isActive = agents.indexOf(agent) === currentAgentIndex && pipelineStatus === 'running';

                return (
                  <div
                    key={agent.id}
                    onClick={() => onAgentClick(agent.id)}
                    className={cn(
                      'group cursor-pointer rounded-xl border p-4 transition-all hover:border-zinc-600',
                      config.borderColor,
                      isActive && 'bg-blue-950/10 border-blue-500/50 shadow-lg shadow-blue-500/5',
                      agent.status === 'done' && 'bg-emerald-950/5'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', config.bg)}>
                        <Icon className={cn('h-4 w-4', config.color, agent.status === 'running' && 'animate-spin')} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <h5 className="text-sm font-medium text-zinc-200">{agent.name}</h5>
                        {agent.outputPreview && agent.status === 'done' && (
                          <p className="mt-0.5 truncate text-xs text-zinc-500">{agent.outputPreview}</p>
                        )}
                        {agent.error && agent.status === 'error' && (
                          <p className="mt-0.5 truncate text-xs text-red-400">{agent.error}</p>
                        )}
                      </div>

                      {agent.status === 'idle' && pipelineStatus !== 'running' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onRunAgent(agent.id); }}
                          className="rounded-lg p-2 text-zinc-600 opacity-0 transition-all hover:bg-zinc-800 hover:text-white group-hover:opacity-100"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}

                      {agent.lastRunTime && agent.status === 'done' && (
                        <span className="text-[10px] text-zinc-600">
                          {new Date(agent.lastRunTime).toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {agent.progress !== undefined && agent.status === 'running' && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                          <div
                            className="h-full rounded-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${agent.progress}%` }}
                          />
                        </div>
                        <p className="mt-1 text-right text-[10px] text-zinc-600">{agent.progress}%</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
