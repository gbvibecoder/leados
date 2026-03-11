'use client';

import { useState, useEffect } from 'react';
import { PipelineFlow } from '@/components/agents/pipeline-flow';
import { AgentDetailPanel } from '@/components/agents/agent-detail-panel';
import { AgentCustomizer } from '@/components/agents/agent-customizer';
import { ProjectSelector } from '@/components/projects/project-selector';
import { useAppStore, DISCOVERY_AGENT_IDS, LEADOS_AGENTS } from '@/lib/store';
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
    updateProjectConfig,
  } = useAppStore();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const isInternal = selectedProject?.type === 'internal';

  // Start-from-step state
  const startFromAgentId = selectedProject?.config?.startFromAgentId || null;

  // Available agents for start-from dropdown (respects internal project filtering)
  const availableStartAgents = LEADOS_AGENTS.filter((a) => {
    if (isInternal && DISCOVERY_AGENT_IDS.includes(a.id)) return false;
    return true;
  });

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
      await pipelinesApi.start(created.id);
    } catch {
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

  const handleStartFromChange = (agentId: string) => {
    if (!selectedProjectId) return;
    updateProjectConfig(selectedProjectId, {
      startFromAgentId: agentId || undefined,
    });
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

        {/* Start from any step */}
        {selectedProject && (
          <div className="mb-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
            <div className="flex items-center gap-4">
              <label className="text-sm text-zinc-400 whitespace-nowrap">Start workflow from:</label>
              <select
                value={startFromAgentId || ''}
                onChange={(e) => handleStartFromChange(e.target.value)}
                className="h-9 flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 text-sm text-zinc-300 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Beginning (first agent)</option>
                {availableStartAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              {startFromAgentId && (
                <p className="text-xs text-indigo-400">
                  Skipping {availableStartAgents.findIndex((a) => a.id === startFromAgentId)} agent(s) before {LEADOS_AGENTS.find((a) => a.id === startFromAgentId)?.name}
                </p>
              )}
            </div>
          </div>
        )}

        <AgentCustomizer
          disabledAgentIds={disabledAgentIds}
          onToggleAgent={toggleAgent}
          onEnableAll={enableAllAgents}
          onDisableAll={disableAllAgents}
          isInternal={isInternal}
          projectConfig={selectedProject?.config}
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
