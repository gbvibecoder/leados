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

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = connectSSE((event) => {
        const { type, data } = event;

        // Only process events for the current pipeline — ignore stale events from old runs
        const currentPipelineId = useAppStore.getState().pipeline.id;
        if (data.pipelineId && currentPipelineId && data.pipelineId !== currentPipelineId) {
          return;
        }

        switch (type) {
          case 'agent:started': {
            // Find the agent's index in the current pipeline to set currentAgentIndex
            const agentIdx = useAppStore.getState().pipeline.agents.findIndex(
              (a) => a.id === data.agentId
            );
            if (agentIdx >= 0) {
              setCurrentAgentIndex(agentIdx);
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
              outputPreview: data.outputSummary,
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
          case 'pipeline:completed':
            updatePipelineStatus('completed');
            addActivity({
              type: 'pipeline_completed',
              message: 'LeadOS pipeline completed',
            });
            break;
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
