'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Play, RotateCcw, Settings2, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LEADOS_AGENTS, DISCOVERY_AGENT_IDS } from '@/lib/store';
import { PIPELINE_PHASES } from './pipeline-preview';
import { AgentToggleCard } from './agent-toggle-card';
import type { PhaseDefinition } from './pipeline-preview';

const AGENT_DESCRIPTIONS: Record<string, string> = {
  'service-research': 'Discovers high-demand service opportunities via Google Trends, Reddit, LinkedIn, and Upwork.',
  'offer-engineering': 'Packages services into compelling offers with ICP definition, pricing tiers, and guarantees.',
  'validation': 'Evaluates service viability — demand, competition, pricing. Returns GO/NO-GO with risk score.',
  'funnel-builder': 'Builds acquisition infrastructure — landing pages, lead forms, booking, and CRM setup.',
  'content-creative': 'Produces ad copies, hooks, email sequences, LinkedIn scripts, and video scripts.',
  'paid-traffic': 'Manages Google Ads + Meta Ads — keyword research, audience targeting, bidding, budgets.',
  'outbound-outreach': 'Orchestrates cold email sequences via Instantly/Smartlead and LinkedIn DM automation.',
  'inbound-capture': 'Captures form/chat/webhook leads, enriches via Apollo/Clay/Clearbit, scores and segments.',
  'ai-qualification': 'Conducts AI voice calls to qualify leads using BANT criteria and scores responses.',
  'sales-routing': 'Routes qualified leads — high intent to checkout, complex to sales, medium to nurture.',
  'tracking-attribution': 'Sets up GTM, Meta Pixel, Google Ads conversion tracking, and multi-touch attribution.',
  'performance-optimization': 'Monitors CPL/CAC/ROAS/LTV, kills losers, scales winners, adjusts budgets.',
  'crm-hygiene': 'Deduplicates (>99%), normalizes, enriches leads. Manages pipeline stages and logs touches.',
};

interface PipelineWizardProps {
  enabledAgentIds: Set<string>;
  skippedPhaseIds: Set<string>;
  startFromPhaseId: string | null;
  isInternal: boolean;
  onToggleAgent: (agentId: string) => void;
  onEnableAll: () => void;
  onDisableAll: () => void;
  onSetStartFrom: (phaseId: string | null) => void;
  onRunPipeline: () => void;
  onPausePipeline: () => void;
  onResetPipeline: () => void;
  onAgentClick?: (agentId: string) => void;
  pipelineStatus: 'idle' | 'running' | 'completed' | 'error' | 'paused';
}

export function PipelineWizard({
  enabledAgentIds,
  skippedPhaseIds,
  startFromPhaseId,
  isInternal,
  onToggleAgent,
  onEnableAll,
  onDisableAll,
  onSetStartFrom,
  onRunPipeline,
  onPausePipeline,
  onResetPipeline,
  onAgentClick,
  pipelineStatus,
}: PipelineWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isConfiguring, setIsConfiguring] = useState(false);

  const activePhases = PIPELINE_PHASES.filter((p) => !skippedPhaseIds.has(p.id));
  const currentPhase = activePhases[currentStep];

  const totalEnabled = LEADOS_AGENTS.filter((a) => enabledAgentIds.has(a.id)).length;
  const totalAvailable = LEADOS_AGENTS.filter((a) => {
    if (isInternal && DISCOVERY_AGENT_IDS.includes(a.id)) return false;
    return true;
  }).length;

  if (!isConfiguring) {
    // Summary view — compact overview with configure button
    return (
      <div className="mb-6 space-y-4">
        {/* Pipeline summary */}
        <div className="rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Settings2 className="h-5 w-5 text-cyan-400" />
              <div>
                <h3 className="text-sm font-semibold text-white">Pipeline Configuration</h3>
                <p className="text-xs text-gray-500">
                  {totalEnabled} of {totalAvailable} agents enabled
                  {startFromPhaseId && ` · Starting from ${PIPELINE_PHASES.find((p) => p.id === startFromPhaseId)?.label}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => { setCurrentStep(0); setIsConfiguring(true); }}
              className="rounded-lg border border-white/[0.08] px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              Configure
            </button>
          </div>

          {/* Mini phase summary */}
          <div className="grid gap-2 sm:grid-cols-5">
            {PIPELINE_PHASES.map((phase) => {
              const isSkipped = skippedPhaseIds.has(phase.id);
              const enabled = phase.agentIds.filter((id) => enabledAgentIds.has(id)).length;
              const total = phase.agentIds.length;
              const isStart = startFromPhaseId === phase.id;

              return (
                <div
                  key={phase.id}
                  className={cn(
                    'rounded-lg border p-3 text-center',
                    isSkipped ? 'border-white/[0.03] bg-zinc-900/20 opacity-40' :
                    enabled === 0 ? 'border-white/[0.03] bg-zinc-900/30' :
                    enabled === total ? 'border-cyan-500/30 bg-cyan-950/20' :
                    'border-amber-500/20 bg-amber-950/10'
                  )}
                >
                  <p className={cn(
                    'text-xs font-medium',
                    isSkipped ? 'text-gray-600' : 'text-gray-300'
                  )}>
                    {phase.shortLabel}
                  </p>
                  <p className={cn(
                    'mt-0.5 text-[10px]',
                    isSkipped ? 'text-zinc-700' :
                    enabled === total ? 'text-cyan-400' :
                    enabled > 0 ? 'text-amber-400' : 'text-gray-600'
                  )}>
                    {isSkipped ? 'Skipped' : `${enabled}/${total}`}
                  </p>
                  {isStart && (
                    <p className="mt-1 text-[9px] font-bold uppercase text-cyan-400">Start</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Run controls */}
        <div className="flex items-center gap-3">
          {(pipelineStatus === 'idle' || pipelineStatus === 'completed' || pipelineStatus === 'error') && (
            <button
              onClick={onRunPipeline}
              disabled={totalEnabled === 0}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="h-4 w-4" />
              Run Pipeline ({totalEnabled} agents)
            </button>
          )}

          {pipelineStatus === 'paused' && (
            <button
              onClick={onRunPipeline}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-sm font-semibold text-white hover:bg-cyan-500 transition-colors"
            >
              <Play className="h-4 w-4" />
              Resume Pipeline
            </button>
          )}

          {pipelineStatus === 'running' && (
            <button
              onClick={onPausePipeline}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-500 transition-colors"
            >
              <Pause className="h-4 w-4" />
              Pause Pipeline
            </button>
          )}

          {pipelineStatus !== 'idle' && (
            <button
              onClick={onResetPipeline}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-3 text-sm text-gray-300 hover:bg-white/5 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          )}
        </div>
      </div>
    );
  }

  // Wizard view — step-by-step configuration
  return (
    <div className="mb-6">
      {/* Step indicator */}
      <div className="mb-6 flex items-center gap-2">
        {activePhases.map((phase, index) => (
          <div key={phase.id} className="flex items-center">
            <button
              onClick={() => setCurrentStep(index)}
              className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                index === currentStep
                  ? 'bg-cyan-600 text-white'
                  : index < currentStep
                    ? 'bg-cyan-600/20 text-cyan-400'
                    : 'bg-white/5 text-gray-500 hover:text-gray-300'
              )}
            >
              {index < currentStep ? (
                <Check className="h-3 w-3" />
              ) : (
                <span>{index + 1}</span>
              )}
              <span className="hidden sm:inline">{phase.shortLabel}</span>
            </button>
            {index < activePhases.length - 1 && (
              <ChevronRight className="mx-1 h-3 w-3 text-zinc-700" />
            )}
          </div>
        ))}
      </div>

      {/* Current step content */}
      {currentPhase && (
        <div className="rounded-xl p-6">
          {/* Step header */}
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                Step {currentStep + 1}: {currentPhase.label}
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                {getPhaseDescription(currentPhase.id)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  currentPhase.agentIds.forEach((id) => {
                    if (!enabledAgentIds.has(id)) onToggleAgent(id);
                  });
                }}
                className="rounded-lg px-3 py-1.5 text-xs text-emerald-400 hover:bg-white/5 transition-colors"
              >
                Enable all
              </button>
              <button
                onClick={() => {
                  currentPhase.agentIds.forEach((id) => {
                    if (enabledAgentIds.has(id)) onToggleAgent(id);
                  });
                }}
                className="rounded-lg px-3 py-1.5 text-xs text-red-400 hover:bg-white/5 transition-colors"
              >
                Disable all
              </button>
            </div>
          </div>

          {/* Start from this step option */}
          {currentStep > 0 && (
            <button
              onClick={() => onSetStartFrom(
                startFromPhaseId === currentPhase.id ? null : currentPhase.id
              )}
              className={cn(
                'mb-5 flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-sm transition-all',
                startFromPhaseId === currentPhase.id
                  ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-400'
                  : 'border-white/[0.04] bg-[rgba(2,2,5,0.6)]/30 text-gray-500 hover:border-cyan-500/15 hover:text-gray-300'
              )}
            >
              <div className={cn(
                'flex h-5 w-5 items-center justify-center rounded',
                startFromPhaseId === currentPhase.id
                  ? 'bg-cyan-600 text-white'
                  : 'border border-white/[0.08] bg-white/5'
              )}>
                {startFromPhaseId === currentPhase.id && <Check className="h-3 w-3" />}
              </div>
              Start pipeline from this step (skip previous steps)
            </button>
          )}

          {/* Clear start-from when on step 0 and a start-from is active */}
          {currentStep === 0 && startFromPhaseId && (
            <button
              onClick={() => onSetStartFrom(null)}
              className="mb-5 flex w-full items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-950/10 px-4 py-2.5 text-sm text-amber-400 transition-all hover:bg-amber-950/20"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-600 text-white">
                <Check className="h-3 w-3" />
              </div>
              Starting from this step — click to run all steps instead
            </button>
          )}

          {/* Agent cards */}
          <div className="space-y-3">
            {currentPhase.agentIds
              .filter((id) => LEADOS_AGENTS.some((a) => a.id === id))
              .map((agentId) => {
                const agent = LEADOS_AGENTS.find((a) => a.id === agentId)!;
                const isSkippedInternal = isInternal && DISCOVERY_AGENT_IDS.includes(agentId);

                return (
                  <AgentToggleCard
                    key={agentId}
                    id={agentId}
                    name={agent.name}
                    description={AGENT_DESCRIPTIONS[agentId] || ''}
                    enabled={enabledAgentIds.has(agentId)}
                    skipped={isSkippedInternal}
                    skipReason={isSkippedInternal ? 'Internal project' : undefined}
                    onToggle={() => onToggleAgent(agentId)}
                    onCardClick={() => onAgentClick?.(agentId)}
                  />
                );
              })}
          </div>

          {/* Navigation */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={() => {
                if (currentStep > 0) {
                  setCurrentStep(currentStep - 1);
                } else {
                  setIsConfiguring(false);
                }
              }}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              {currentStep === 0 ? 'Back to Overview' : 'Previous Step'}
            </button>

            {currentStep < activePhases.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 transition-colors"
              >
                Next Step
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setIsConfiguring(false)}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                <Check className="h-4 w-4" />
                Done Configuring
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getPhaseDescription(phaseId: string): string {
  const descriptions: Record<string, string> = {
    discovery: 'Research service opportunities, engineer offers, validate viability, and build funnels.',
    content: 'Create content assets, ad copy, and manage paid advertising campaigns.',
    generation: 'Execute outbound outreach and capture inbound leads from all channels.',
    qualification: 'Qualify leads with AI voice calls and route them to the right destination.',
    optimization: 'Track attribution, optimize performance, and maintain CRM data quality.',
  };
  return descriptions[phaseId] || '';
}
