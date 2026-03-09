export type AgentStatus = 'idle' | 'running' | 'done' | 'error';
export type PipelineType = 'leados';
export type PipelineStatus = 'idle' | 'running' | 'completed' | 'error' | 'paused';

export interface AgentInput {
  pipelineId: string;
  config: Record<string, any>;
  previousOutputs?: Record<string, any>;
}

export interface AgentOutput {
  success: boolean;
  data: any;
  reasoning: string;
  confidence: number;
  error?: string;
}

export type LeadStage = 'new' | 'contacted' | 'qualified' | 'booked' | 'won' | 'lost';

export type QualificationOutcome =
  | 'high_intent_budget'
  | 'high_intent_complex'
  | 'medium_intent'
  | 'low_intent';

export type RoutingDecision = 'checkout' | 'sales_call' | 'nurture' | 'disqualify';

export type LeadOSAgentId =
  | 'service-research'
  | 'offer-engineering'
  | 'validation'
  | 'funnel-builder'
  | 'content-creative'
  | 'paid-traffic'
  | 'outbound-outreach'
  | 'inbound-capture'
  | 'ai-qualification'
  | 'sales-routing'
  | 'tracking-attribution'
  | 'performance-optimization'
  | 'crm-hygiene';

export interface SSEEvent {
  type:
    | 'agent:started'
    | 'agent:progress'
    | 'agent:completed'
    | 'agent:error'
    | 'pipeline:completed';
  data: {
    agentId?: string;
    agentName?: string;
    pipelineId?: string;
    pipelineType?: PipelineType;
    timestamp?: string;
    message?: string;
    percentComplete?: number;
    outputSummary?: string;
    error?: string;
    summary?: Record<string, any>;
  };
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  inputs: string;
  outputs: string;
  order: number;
  pipeline: PipelineType;
}
