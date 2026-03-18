'use client';

import { useState } from 'react';
import { Settings2, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LEADOS_AGENTS, DISCOVERY_AGENT_IDS } from '@/lib/store';
import type { ProjectConfig } from '@/lib/store';

interface AgentCustomizerProps {
  disabledAgentIds: Set<string>;
  onToggleAgent: (agentId: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  isInternal?: boolean;
  projectConfig?: ProjectConfig | null;
  startFromAgentId?: string;
}

const AGENT_PHASES: { label: string; ids: string[] }[] = [
  {
    label: 'Discovery & Offer',
    ids: ['service-research', 'offer-engineering', 'validation', 'funnel-builder'],
  },
  {
    label: 'Funnel & Content',
    ids: ['content-creative', 'paid-traffic'],
  },
  {
    label: 'Lead Generation',
    ids: ['outbound-outreach', 'inbound-capture'],
  },
  {
    label: 'Qualification & Routing',
    ids: ['ai-qualification', 'sales-routing'],
  },
  {
    label: 'Optimization',
    ids: ['tracking-attribution', 'performance-optimization', 'crm-hygiene'],
  },
];

export function AgentCustomizer({
  disabledAgentIds,
  onToggleAgent,
  onEnableAll,
  onDisableAll,
  isInternal,
  projectConfig,
  startFromAgentId,
}: AgentCustomizerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const agentMap = new Map(LEADOS_AGENTS.map((a) => [a.id, a.name]));
  const totalAgents = LEADOS_AGENTS.length;

  // Compute agents skipped by startFromAgentId
  const skippedByStartFrom = new Set<string>();
  if (startFromAgentId) {
    const allIds = LEADOS_AGENTS.map((a) => a.id);
    const startIdx = allIds.indexOf(startFromAgentId);
    if (startIdx > 0) {
      for (let i = 0; i < startIdx; i++) {
        // Don't double-count agents already skipped by internal project
        if (!(isInternal && DISCOVERY_AGENT_IDS.includes(allIds[i]))) {
          skippedByStartFrom.add(allIds[i]);
        }
      }
    }
  }

  // Determine enabled count based on project config or global disabled set
  const hasProjectConfig = !!projectConfig?.enabledAgentIds;
  const enabledCount = hasProjectConfig
    ? projectConfig!.enabledAgentIds!.length
    : totalAgents - disabledAgentIds.size;

  const isAgentEnabled = (agentId: string): boolean => {
    if (hasProjectConfig) {
      return projectConfig!.enabledAgentIds!.includes(agentId);
    }
    return !disabledAgentIds.has(agentId);
  };

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg rounded-xl px-4 py-3 transition-colors hover:border-cyan-500/15"
      >
        <div className="flex items-center gap-3">
          <Settings2 className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-300">Customize Agents</span>
          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-400">
            {enabledCount}/{totalAgents} enabled
          </span>
          {hasProjectConfig && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
              Project-specific
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {isOpen && (
        <div className="mt-2 rounded-lg border border-white/[0.04] bg-[rgba(2,2,5,0.6)]/80 p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Toggle agents on/off. {hasProjectConfig ? 'Config is saved per project.' : 'Only enabled agents will run in the pipeline.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onEnableAll}
                className="rounded px-2 py-1 text-xs text-emerald-400 hover:bg-white/5"
              >
                Enable all
              </button>
              <button
                onClick={onDisableAll}
                className="rounded px-2 py-1 text-xs text-red-400 hover:bg-white/5"
              >
                Disable all
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {AGENT_PHASES.map((phase) => {
              const phaseAgents = phase.ids.filter((id) => agentMap.has(id));
              const allSkippedByProject = isInternal && phase.ids.every((id) => DISCOVERY_AGENT_IDS.includes(id));
              const allSkippedByStartFrom = phase.ids.every((id) => skippedByStartFrom.has(id) || (isInternal && DISCOVERY_AGENT_IDS.includes(id)));

              return (
                <div key={phase.label}>
                  <div className="mb-2 flex items-center gap-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-600">
                      {phase.label}
                    </p>
                    {allSkippedByProject && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                        Skipped (internal)
                      </span>
                    )}
                    {!allSkippedByProject && allSkippedByStartFrom && (
                      <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                        Skipped (start from)
                      </span>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {phaseAgents.map((agentId) => {
                      const isDisabled = !isAgentEnabled(agentId);
                      const isSkippedByProject = isInternal && DISCOVERY_AGENT_IDS.includes(agentId);
                      const isSkippedByStart = skippedByStartFrom.has(agentId);
                      const isSkipped = isSkippedByProject || isSkippedByStart;

                      return (
                        <button
                          key={agentId}
                          onClick={() => {
                            if (!isSkipped) onToggleAgent(agentId);
                          }}
                          disabled={isSkipped}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all',
                            isSkipped
                              ? 'cursor-not-allowed border-white/[0.03] bg-zinc-900/30 opacity-40'
                              : isDisabled
                                ? 'border-white/[0.04] bg-[rgba(2,2,5,0.6)]/30 hover:border-cyan-500/15'
                                : 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/50'
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-5 w-5 shrink-0 items-center justify-center rounded',
                              isSkipped
                                ? 'bg-white/5 text-gray-600'
                                : isDisabled
                                  ? 'border border-white/[0.08] bg-white/5'
                                  : 'bg-cyan-600 text-white'
                            )}
                          >
                            {isSkipped ? (
                              <X className="h-3 w-3" />
                            ) : !isDisabled ? (
                              <Check className="h-3 w-3" />
                            ) : null}
                          </div>
                          <span
                            className={cn(
                              'text-sm',
                              isSkipped
                                ? 'text-gray-600 line-through'
                                : isDisabled
                                  ? 'text-gray-500'
                                  : 'text-gray-200'
                            )}
                          >
                            {agentMap.get(agentId)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
