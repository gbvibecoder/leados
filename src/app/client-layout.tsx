'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { AuthGuard } from '@/components/auth-guard';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { connectSSE } from '@/lib/api';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLandingPage = pathname === '/';
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isFunnelPage = pathname.startsWith('/funnel');
  const { updateAgentStatus, updatePipelineStatus, addActivity, setCurrentAgentIndex, loadProjects, loadBlacklist } = useAppStore();

  // Load global state on mount
  useEffect(() => {
    loadProjects();
    loadBlacklist();
  }, [loadProjects, loadBlacklist]);

  // Warn user before page refresh/close if pipeline is running.
  // On reload the zustand module re-evaluates → store starts fresh → pipeline resets automatically.
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const pipelineStatus = useAppStore.getState().pipeline.status;
      if (pipelineStatus === 'running' || pipelineStatus === 'paused') {
        e.preventDefault();
        e.returnValue = 'Pipeline is currently running. If you refresh, the pipeline will reset. Are you sure?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = connectSSE((event) => {
        const { type, data } = event;

        // Only process events for the current pipeline — ignore stale events from old runs
        const currentPipelineId = useAppStore.getState().pipeline.id;
        if (data.pipelineId && (!currentPipelineId || data.pipelineId !== currentPipelineId)) {
          return;
        }

        switch (type) {
          case 'agent:started': {
            // Find the agent's index in the current pipeline to set currentAgentIndex
            const currentAgents = useAppStore.getState().pipeline.agents;
            const agentIdx = currentAgents.findIndex(
              (a) => a.id === data.agentId
            );
            if (agentIdx >= 0) {
              setCurrentAgentIndex(agentIdx);
            }
            // Mark any previously running agent as done before starting new one
            for (const a of currentAgents) {
              if (a.id !== data.agentId && a.status === 'running') {
                updateAgentStatus(a.id, { status: 'done', progress: 100 });
              }
            }
            updateAgentStatus(data.agentId, {
              status: 'running',
              progress: 0,
            });
            addActivity({
              type: 'agent_started',
              agentId: data.agentId,
              agentName: data.agentName,
              message: `${data.agentName || data.agentId} started`,
            });
            break;
          }
          case 'agent:progress':
            updateAgentStatus(data.agentId, {
              progress: data.percentComplete,
            });
            break;
          case 'agent:completed':
            updateAgentStatus(data.agentId, {
              status: 'done',
              progress: 100,
              lastRunTime: data.timestamp,
              outputPreview: typeof data.outputSummary === 'string' ? data.outputSummary : (data.outputSummary ? JSON.stringify(data.outputSummary).slice(0, 120) : 'Completed'),
            });
            addActivity({
              type: 'agent_completed',
              agentId: data.agentId,
              agentName: data.agentName,
              message: `${data.agentName || data.agentId} completed`,
            });
            break;
          case 'agent:error':
            updateAgentStatus(data.agentId, {
              status: 'error',
              error: data.error,
            });
            addActivity({
              type: 'agent_error',
              agentId: data.agentId,
              agentName: data.agentName,
              message: `${data.agentName || data.agentId} failed: ${data.error}`,
            });
            break;
          case 'pipeline:completed': {
            // Force ALL agents to done — no agent should be stuck in "running"
            const allAgents = useAppStore.getState().pipeline.agents;
            for (const a of allAgents) {
              if (a.status === 'running') {
                updateAgentStatus(a.id, { status: 'done', progress: 100 });
              }
            }
            updatePipelineStatus('completed');
            addActivity({
              type: 'pipeline_completed',
              message: 'LeadOS pipeline completed',
            });
            break;
          }
        }
      });
    } catch {
      // SSE not available, that's ok
    }

    return () => {
      es?.close();
    };
  }, [updateAgentStatus, updatePipelineStatus, addActivity, setCurrentAgentIndex]);

  if (isLandingPage || isAuthPage || isFunnelPage) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <Sidebar />
      <Navbar />
      <PageWrapper>{children}</PageWrapper>
    </AuthGuard>
  );
}
