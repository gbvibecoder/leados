'use client';

import { ChevronRight, Check, SkipForward, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LEADOS_AGENTS, DISCOVERY_AGENT_IDS } from '@/lib/store';
import type { AgentStatus } from '@/lib/store';

export interface PhaseDefinition {
  id: string;
  label: string;
  shortLabel: string;
  agentIds: string[];
}

export const PIPELINE_PHASES: PhaseDefinition[] = [
  {
    id: 'discovery',
    label: 'Discovery & Offer',
    shortLabel: 'Discovery',
    agentIds: ['service-research', 'offer-engineering', 'validation', 'funnel-builder'],
  },
  {
    id: 'content',
    label: 'Funnel & Content',
    shortLabel: 'Content',
    agentIds: ['content-creative', 'paid-traffic'],
  },
  {
    id: 'generation',
    label: 'Lead Generation',
    shortLabel: 'Lead Gen',
    agentIds: ['outbound-outreach', 'inbound-capture'],
  },
  {
    id: 'qualification',
    label: 'Qualification & Routing',
    shortLabel: 'Qualify',
    agentIds: ['ai-qualification', 'sales-routing'],
  },
  {
    id: 'optimization',
    label: 'Optimization',
    shortLabel: 'Optimize',
    agentIds: ['tracking-attribution', 'performance-optimization', 'crm-hygiene'],
  },
];

interface PipelinePreviewProps {
  enabledAgentIds: Set<string>;
  skippedPhaseIds: Set<string>;
  startFromPhaseId?: string | null;
  activePhaseId?: string | null;
  agentStatuses?: Record<string, AgentStatus>;
  onPhaseClick?: (phaseId: string) => void;
  isRunning?: boolean;
}

function getPhaseStatus(
  phase: PhaseDefinition,
  enabledAgentIds: Set<string>,
  skippedPhaseIds: Set<string>,
  agentStatuses?: Record<string, AgentStatus>
): 'skipped' | 'disabled' | 'idle' | 'running' | 'done' | 'partial' {
  if (skippedPhaseIds.has(phase.id)) return 'skipped';

  const phaseAgents = phase.agentIds.filter((id) => LEADOS_AGENTS.some((a) => a.id === id));
  const enabledInPhase = phaseAgents.filter((id) => enabledAgentIds.has(id));

  if (enabledInPhase.length === 0) return 'disabled';

  if (agentStatuses) {
    const statuses = enabledInPhase.map((id) => agentStatuses[id] || 'idle');
    if (statuses.every((s) => s === 'done')) return 'done';
    if (statuses.some((s) => s === 'running')) return 'running';
    if (statuses.some((s) => s === 'done')) return 'partial';
  }

  return 'idle';
}

export function PipelinePreview({
  enabledAgentIds,
  skippedPhaseIds,
  startFromPhaseId,
  activePhaseId,
  agentStatuses,
  onPhaseClick,
  isRunning,
}: PipelinePreviewProps) {
  return (
    <div className="mb-6">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Pipeline Flow
      </p>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {PIPELINE_PHASES.map((phase, index) => {
          const status = getPhaseStatus(phase, enabledAgentIds, skippedPhaseIds, agentStatuses);
          const isActive = activePhaseId === phase.id;
          const isStartFrom = startFromPhaseId === phase.id;
          const enabledCount = phase.agentIds.filter((id) => enabledAgentIds.has(id)).length;

          return (
            <div key={phase.id} className="flex items-center">
              <button
                onClick={() => onPhaseClick?.(phase.id)}
                className={cn(
                  'relative flex flex-col items-center rounded-xl border px-4 py-3 transition-all min-w-[110px]',
                  status === 'skipped' && 'border-zinc-800/50 bg-zinc-900/20 opacity-40',
                  status === 'disabled' && 'border-zinc-800/50 bg-zinc-900/30 opacity-50',
                  status === 'idle' && !isActive && 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-600',
                  status === 'idle' && isActive && 'border-indigo-500 bg-indigo-950/30',
                  status === 'running' && 'border-blue-500/50 bg-blue-950/20',
                  status === 'done' && 'border-emerald-500/30 bg-emerald-950/20',
                  status === 'partial' && 'border-amber-500/30 bg-amber-950/10',
                  isStartFrom && status !== 'skipped' && 'ring-2 ring-indigo-500/40'
                )}
              >
                {/* Status indicator */}
                <div className={cn(
                  'mb-1.5 flex h-7 w-7 items-center justify-center rounded-full',
                  status === 'skipped' && 'bg-zinc-800 text-zinc-600',
                  status === 'disabled' && 'bg-zinc-800 text-zinc-600',
                  status === 'idle' && 'bg-zinc-800 text-zinc-400',
                  status === 'running' && 'bg-blue-900/50 text-blue-400',
                  status === 'done' && 'bg-emerald-900/50 text-emerald-400',
                  status === 'partial' && 'bg-amber-900/50 text-amber-400',
                )}>
                  {status === 'skipped' && <SkipForward className="h-3.5 w-3.5" />}
                  {status === 'disabled' && <span className="text-xs">—</span>}
                  {status === 'idle' && <span className="text-xs font-bold">{index + 1}</span>}
                  {status === 'running' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {status === 'done' && <Check className="h-3.5 w-3.5" />}
                  {status === 'partial' && <span className="text-xs font-bold">{index + 1}</span>}
                </div>

                <span className={cn(
                  'text-xs font-medium whitespace-nowrap',
                  status === 'skipped' || status === 'disabled' ? 'text-zinc-600' :
                  status === 'done' ? 'text-emerald-400' :
                  status === 'running' ? 'text-blue-400' :
                  isActive ? 'text-indigo-400' : 'text-zinc-300'
                )}>
                  {phase.shortLabel}
                </span>

                <span className={cn(
                  'mt-0.5 text-[10px]',
                  status === 'skipped' || status === 'disabled' ? 'text-zinc-700' : 'text-zinc-500'
                )}>
                  {status === 'skipped' ? 'Skipped' :
                   status === 'disabled' ? 'Off' :
                   `${enabledCount} agent${enabledCount !== 1 ? 's' : ''}`}
                </span>

                {isStartFrom && status !== 'skipped' && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-2 py-0.5">
                    <span className="text-[9px] font-bold uppercase text-white">Start</span>
                  </div>
                )}
              </button>

              {index < PIPELINE_PHASES.length - 1 && (
                <ChevronRight className={cn(
                  'mx-0.5 h-4 w-4 flex-shrink-0',
                  status === 'done' ? 'text-emerald-600' : 'text-zinc-700'
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
