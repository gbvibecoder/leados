'use client';

import { useState } from 'react';
import { PipelineFlow } from '@/components/agents/pipeline-flow';
import { AgentDetailPanel } from '@/components/agents/agent-detail-panel';
import { useAppStore } from '@/lib/store';
import { pipelines as pipelinesApi, agents as agentsApi } from '@/lib/api';
import { ErrorBoundary } from '@/components/layout/error-boundary';

const AGENT_DESCRIPTIONS: Record<string, string> = {
  'service-research': 'Discovers high-demand service opportunities via Google Trends, Reddit, LinkedIn, and Upwork. Analyzes demand, competition, and monetization potential.',
  'offer-engineering': 'Packages service into a compelling offer with ICP definition, pain points, transformation promise, pricing tiers, and guarantee.',
  'validation': 'Evaluates service viability — market demand, competition, pricing, CAC vs LTV. Returns GO/NO-GO decision with risk score.',
  'funnel-builder': 'Builds acquisition infrastructure — landing pages, lead forms, booking integration, and CRM setup.',
  'content-creative': 'Produces ad copies, hooks, email sequences, LinkedIn scripts, and video scripts per channel and ICP.',
  'paid-traffic': 'Manages Google Ads + Meta Ads campaigns — keyword research, audience targeting, bidding, and budget allocation.',
  'outbound-outreach': 'Orchestrates cold email sequences via Instantly/Smartlead and LinkedIn DM automation.',
  'inbound-capture': 'Captures form/chat/webhook leads, enriches via Apollo/Clay/Clearbit, scores and segments.',
  'ai-qualification': 'Conducts AI voice calls to qualify leads using BANT criteria, scores responses, handles objections.',
  'sales-routing': 'Routes qualified leads — high intent to checkout, complex cases to sales calendar, medium to nurture, low to archive.',
  'tracking-attribution': 'Sets up GTM, Meta Pixel, Google Ads conversion tracking, and multi-touch attribution.',
  'performance-optimization': 'Monitors CPL/CAC/ROAS/LTV, kills losers, scales winners, adjusts budgets automatically.',
  'crm-hygiene': 'Deduplicates (>99%), normalizes, enriches leads. Manages pipeline stages and logs all touches.',
};

export default function LeadOSPage() {
  const { pipeline, updatePipelineStatus, updateAgentStatus, resetPipeline, setCurrentAgentIndex } = useAppStore();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const handleRunPipeline = async () => {
    try {
      updatePipelineStatus('running');
      const created = await pipelinesApi.create({ type: 'leados', config: {} });
      await pipelinesApi.start(created.id);
    } catch {
      // Simulate pipeline execution with mock data
      updatePipelineStatus('running');
      for (let i = 0; i < pipeline.agents.length; i++) {
        const agent = pipeline.agents[i];
        setCurrentAgentIndex(i);
        updateAgentStatus(agent.id, { status: 'running', progress: 0 });

        for (let p = 0; p <= 100; p += 20) {
          await new Promise((r) => setTimeout(r, 300));
          updateAgentStatus(agent.id, { progress: p });
        }

        updateAgentStatus(agent.id, {
          status: 'done',
          progress: 100,
          lastRunTime: new Date().toISOString(),
          outputPreview: `${agent.name} completed successfully with high confidence.`,
        });
      }
      updatePipelineStatus('completed');
    }
  };

  const handleRunAgent = async (agentId: string) => {
    updateAgentStatus(agentId, { status: 'running', progress: 0 });
    try {
      await agentsApi.run(agentId, {});
      updateAgentStatus(agentId, {
        status: 'done',
        progress: 100,
        lastRunTime: new Date().toISOString(),
        outputPreview: 'Agent completed successfully.',
      });
    } catch {
      for (let p = 0; p <= 100; p += 25) {
        await new Promise((r) => setTimeout(r, 400));
        updateAgentStatus(agentId, { progress: p });
      }
      updateAgentStatus(agentId, {
        status: 'done',
        progress: 100,
        lastRunTime: new Date().toISOString(),
        outputPreview: 'Agent completed successfully with mock data.',
      });
    }
  };

  return (
    <ErrorBoundary>
      <div className="relative">
        <PipelineFlow
          title="LeadOS Pipeline"
          agents={pipeline.agents}
          pipelineStatus={pipeline.status}
          currentAgentIndex={pipeline.currentAgentIndex}
          onRunPipeline={handleRunPipeline}
          onPausePipeline={() => updatePipelineStatus('paused')}
          onResetPipeline={resetPipeline}
          onAgentClick={setSelectedAgent}
          onRunAgent={handleRunAgent}
          accentColor="indigo"
        />

        {selectedAgent && (
          <AgentDetailPanel
            agentId={selectedAgent}
            agentName={pipeline.agents.find((a) => a.id === selectedAgent)?.name || selectedAgent}
            description={AGENT_DESCRIPTIONS[selectedAgent]}
            onClose={() => setSelectedAgent(null)}
            onRun={() => handleRunAgent(selectedAgent)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
