import { BaseAgent, AgentInput, AgentOutput } from '../agents/base-agent';
import { pipelineEvents } from './event-emitter';

export class PipelineOrchestrator {
  private agentRegistry: Map<string, BaseAgent>;

  constructor(agentRegistry: Map<string, BaseAgent>) {
    this.agentRegistry = agentRegistry;
  }

  async runPipeline(
    pipelineId: string,
    type: 'leados',
    agentIds: string[],
    config: Record<string, any>,
    userId?: string | null
  ): Promise<Record<string, AgentOutput>> {
    const outputs: Record<string, AgentOutput> = {};
    let previousOutputs: Record<string, any> = {};

    for (let i = 0; i < agentIds.length; i++) {
      const agentId = agentIds[i];
      const agent = this.agentRegistry.get(agentId);

      if (!agent) {
        console.warn(`Agent ${agentId} not found in registry`);
        continue;
      }

      pipelineEvents.emitAgentStarted({
        agentId,
        agentName: agent.name,
        pipelineId,
        pipelineType: type,
        timestamp: new Date().toISOString(),
      });

      let output: AgentOutput | null = null;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries && !output) {
        try {
          const input: AgentInput = {
            pipelineId,
            config,
            previousOutputs,
            userId,
          };

          output = await agent.run(input);

          pipelineEvents.emitAgentCompleted({
            agentId,
            agentName: agent.name,
            pipelineType: type,
            outputSummary: output.reasoning || 'Completed',
            timestamp: new Date().toISOString(),
          });
        } catch (error: any) {
          retries++;
          if (retries >= maxRetries) {
            pipelineEvents.emitAgentError({
              agentId,
              agentName: agent.name,
              pipelineType: type,
              error: error.message || 'Unknown error',
              timestamp: new Date().toISOString(),
            });

            output = {
              success: false,
              data: null,
              reasoning: `Failed after ${maxRetries} retries`,
              confidence: 0,
              error: error.message,
            };
          } else {
            // Exponential backoff
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, retries) * 1000)
            );
          }
        }
      }

      if (output) {
        outputs[agentId] = output;
        if (output.success) {
          previousOutputs = { ...previousOutputs, [agentId]: output.data };
        }
      }
    }

    pipelineEvents.emitPipelineCompleted({
      pipelineId,
      pipelineType: type,
      summary: { totalAgents: agentIds.length, completed: Object.keys(outputs).length },
    });

    return outputs;
  }
}
