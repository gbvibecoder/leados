import { describe, it, expect, vi } from 'vitest';
import { pipelineEvents } from '@backend/orchestrator/event-emitter';

describe('PipelineEventEmitter', () => {
  it('exports a singleton', () => {
    expect(pipelineEvents).toBeDefined();
    expect(typeof pipelineEvents.emit).toBe('function');
    expect(typeof pipelineEvents.on).toBe('function');
  });

  it('emits agent:started events', () => {
    const handler = vi.fn();
    pipelineEvents.on('agent:started', handler);
    const data = { agentId: 'test', agentName: 'Test', pipelineId: 'p1', pipelineType: 'leados', timestamp: new Date().toISOString() };
    pipelineEvents.emitAgentStarted(data);
    expect(handler).toHaveBeenCalledWith(data);
    pipelineEvents.removeListener('agent:started', handler);
  });

  it('emits agent:progress events', () => {
    const handler = vi.fn();
    pipelineEvents.on('agent:progress', handler);
    const data = { agentId: 'test', pipelineType: 'leados', message: '50%', percentComplete: 50 };
    pipelineEvents.emitAgentProgress(data);
    expect(handler).toHaveBeenCalledWith(data);
    pipelineEvents.removeListener('agent:progress', handler);
  });

  it('emits agent:completed events', () => {
    const handler = vi.fn();
    pipelineEvents.on('agent:completed', handler);
    const data = { agentId: 'test', agentName: 'Test', pipelineType: 'leados', outputSummary: 'done', timestamp: new Date().toISOString() };
    pipelineEvents.emitAgentCompleted(data);
    expect(handler).toHaveBeenCalledWith(data);
    pipelineEvents.removeListener('agent:completed', handler);
  });

  it('emits agent:error events', () => {
    const handler = vi.fn();
    pipelineEvents.on('agent:error', handler);
    const data = { agentId: 'test', agentName: 'Test', pipelineType: 'leados', error: 'fail', timestamp: new Date().toISOString() };
    pipelineEvents.emitAgentError(data);
    expect(handler).toHaveBeenCalledWith(data);
    pipelineEvents.removeListener('agent:error', handler);
  });

  it('emits pipeline:completed events', () => {
    const handler = vi.fn();
    pipelineEvents.on('pipeline:completed', handler);
    const data = { pipelineId: 'p1', pipelineType: 'leados', summary: { agents: 13 } };
    pipelineEvents.emitPipelineCompleted(data);
    expect(handler).toHaveBeenCalledWith(data);
    pipelineEvents.removeListener('pipeline:completed', handler);
  });
});
