'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Navbar } from '@/components/layout/navbar';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { connectSSE } from '@/lib/api';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { updateAgentStatus, updatePipelineStatus, addActivity } = useAppStore();

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = connectSSE((event) => {
        const { type, data } = event;
        switch (type) {
          case 'agent:started':
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
  }, [updateAgentStatus, updatePipelineStatus, addActivity]);

  return (
    <>
      <Sidebar />
      <Navbar />
      <PageWrapper>{children}</PageWrapper>
    </>
  );
}
