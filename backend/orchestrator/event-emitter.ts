import { EventEmitter } from 'events';

class PipelineEventEmitter extends EventEmitter {
  emitAgentStarted(data: { agentId: string; agentName: string; pipelineId: string; pipelineType: string; timestamp: string }) {
    this.emit('agent:started', data);
  }

  emitAgentProgress(data: { agentId: string; pipelineType: string; message: string; percentComplete: number }) {
    this.emit('agent:progress', data);
  }

  emitAgentCompleted(data: { agentId: string; agentName: string; pipelineType: string; outputSummary: string; timestamp: string }) {
    this.emit('agent:completed', data);
  }

  emitAgentError(data: { agentId: string; agentName: string; pipelineType: string; error: string; timestamp: string }) {
    this.emit('agent:error', data);
  }

  emitPipelineCompleted(data: { pipelineId: string; pipelineType: string; summary: Record<string, any> }) {
    this.emit('pipeline:completed', data);
  }
}

// Global singleton
const globalForEvents = globalThis as unknown as { pipelineEvents: PipelineEventEmitter | undefined };
export const pipelineEvents = globalForEvents.pipelineEvents ?? new PipelineEventEmitter();
if (process.env.NODE_ENV !== 'production') globalForEvents.pipelineEvents = pipelineEvents;
