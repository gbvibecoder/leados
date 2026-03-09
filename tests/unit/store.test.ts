import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/lib/store';

describe('AppStore', () => {
  beforeEach(() => {
    const { resetPipeline, clearActivities } = useAppStore.getState();
    resetPipeline();
    clearActivities();
    useAppStore.setState({ sidebarOpen: true });
  });

  describe('initial state', () => {
    it('has 13 LeadOS agents', () => {
      expect(useAppStore.getState().pipeline.agents).toHaveLength(13);
    });

    it('pipeline starts as idle', () => {
      expect(useAppStore.getState().pipeline.status).toBe('idle');
    });

    it('sidebar is open by default', () => {
      expect(useAppStore.getState().sidebarOpen).toBe(true);
    });

    it('activity feed is empty', () => {
      expect(useAppStore.getState().activityFeed).toHaveLength(0);
    });
  });

  describe('updatePipelineStatus', () => {
    it('updates pipeline status', () => {
      useAppStore.getState().updatePipelineStatus('running');
      expect(useAppStore.getState().pipeline.status).toBe('running');
    });

    it('updates to completed', () => {
      useAppStore.getState().updatePipelineStatus('completed');
      expect(useAppStore.getState().pipeline.status).toBe('completed');
    });
  });

  describe('updateAgentStatus', () => {
    it('updates agent status', () => {
      useAppStore.getState().updateAgentStatus('service-research', { status: 'running', progress: 50 });
      const agent = useAppStore.getState().pipeline.agents.find((a) => a.id === 'service-research');
      expect(agent?.status).toBe('running');
      expect(agent?.progress).toBe(50);
    });

    it('does not affect other agents', () => {
      useAppStore.getState().updateAgentStatus('service-research', { status: 'running' });
      const other = useAppStore.getState().pipeline.agents.find((a) => a.id === 'offer-engineering');
      expect(other?.status).toBe('idle');
    });
  });

  describe('setCurrentAgentIndex', () => {
    it('updates current agent index', () => {
      useAppStore.getState().setCurrentAgentIndex(5);
      expect(useAppStore.getState().pipeline.currentAgentIndex).toBe(5);
    });
  });

  describe('resetPipeline', () => {
    it('resets pipeline to idle', () => {
      useAppStore.getState().updatePipelineStatus('running');
      useAppStore.getState().updateAgentStatus('service-research', { status: 'done', progress: 100 });
      useAppStore.getState().setCurrentAgentIndex(5);

      useAppStore.getState().resetPipeline();

      const pipeline = useAppStore.getState().pipeline;
      expect(pipeline.status).toBe('idle');
      expect(pipeline.currentAgentIndex).toBe(0);
      expect(pipeline.agents.every((a) => a.status === 'idle')).toBe(true);
    });
  });

  describe('toggleSidebar', () => {
    it('toggles sidebar open/closed', () => {
      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().sidebarOpen).toBe(false);
      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('activityFeed', () => {
    it('adds activity to feed', () => {
      useAppStore.getState().addActivity({
        type: 'info',
        message: 'Test activity',
      });
      expect(useAppStore.getState().activityFeed).toHaveLength(1);
      expect(useAppStore.getState().activityFeed[0].message).toBe('Test activity');
      expect(useAppStore.getState().activityFeed[0].id).toBeDefined();
      expect(useAppStore.getState().activityFeed[0].timestamp).toBeDefined();
    });

    it('prepends new activities', () => {
      useAppStore.getState().addActivity({ type: 'info', message: 'First' });
      useAppStore.getState().addActivity({ type: 'info', message: 'Second' });
      expect(useAppStore.getState().activityFeed[0].message).toBe('Second');
      expect(useAppStore.getState().activityFeed[1].message).toBe('First');
    });

    it('limits feed to 50 items', () => {
      for (let i = 0; i < 60; i++) {
        useAppStore.getState().addActivity({ type: 'info', message: `Activity ${i}` });
      }
      expect(useAppStore.getState().activityFeed).toHaveLength(50);
    });

    it('clears all activities', () => {
      useAppStore.getState().addActivity({ type: 'info', message: 'Test' });
      useAppStore.getState().clearActivities();
      expect(useAppStore.getState().activityFeed).toHaveLength(0);
    });
  });
});
