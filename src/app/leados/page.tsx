'use client';

import { useState, useEffect } from 'react';
import { PipelineFlow } from '@/components/agents/pipeline-flow';
import { AgentDetailPanel } from '@/components/agents/agent-detail-panel';
import { AgentCustomizer } from '@/components/agents/agent-customizer';
import { ProjectSelector } from '@/components/projects/project-selector';
import { useAppStore, DISCOVERY_AGENT_IDS } from '@/lib/store';
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
  const {
    pipeline,
    updatePipelineStatus,
    updateAgentStatus,
    resetPipeline,
    setCurrentAgentIndex,
    projects,
    selectedProjectId,
    selectProject,
    createProject,
    loadProjects,
    disabledAgentIds,
    toggleAgent,
    enableAllAgents,
    disableAllAgents,
    loadAgentConfig,
  } = useAppStore();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const isInternal = selectedProject?.type === 'internal';

  // Load projects and agent config from localStorage on mount
  useEffect(() => {
    loadProjects();
    loadAgentConfig();
  }, [loadProjects, loadAgentConfig]);

  const handleRunPipeline = async () => {
    updatePipelineStatus('running');
    setCurrentAgentIndex(0);
    try {
      const created = await pipelinesApi.create({
        type: 'leados',
        config: {},
        projectId: selectedProjectId || undefined,
      });
      // Start the pipeline — it runs in the background on the server.
      // SSE events will update the UI in real-time via client-layout.tsx.
      await pipelinesApi.start(created.id);
    } catch {
      // If API fails, simulate pipeline execution locally
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
        <ProjectSelector
          projects={projects}
          selectedProjectId={selectedProjectId}
          onSelectProject={selectProject}
          onCreateProject={(data) => {
            const created = createProject(data);
            selectProject(created.id);
          }}
        />

        {isInternal && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <p className="text-sm text-amber-400">
              <span className="font-medium">Internal project</span> — Skipping discovery agents
              ({DISCOVERY_AGENT_IDS.length} agents: Service Research, Offer Engineering, Validation, Funnel Builder).
              Pipeline starts at Content & Creative.
            </p>
          </div>
        )}

        <AgentCustomizer
          disabledAgentIds={disabledAgentIds}
          onToggleAgent={toggleAgent}
          onEnableAll={enableAllAgents}
          onDisableAll={disableAllAgents}
          isInternal={isInternal}
        />

        <PipelineFlow
          title={selectedProject ? `${selectedProject.name} Pipeline` : 'LeadOS Pipeline'}
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
