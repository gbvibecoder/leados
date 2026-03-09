import Anthropic from '@anthropic-ai/sdk';

export type AgentStatus = 'idle' | 'running' | 'done' | 'error';

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

export abstract class BaseAgent {
  id: string;
  name: string;
  description: string;
  protected status: AgentStatus = 'idle';
  protected logs: Array<{ event: string; data: any; timestamp: Date }> = [];

  constructor(id: string, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.description = description;
  }

  abstract run(inputs: AgentInput): Promise<AgentOutput>;

  async validate(inputs: AgentInput): Promise<boolean> {
    return !!inputs.pipelineId;
  }

  async log(event: string, data: any): Promise<void> {
    this.logs.push({ event, data, timestamp: new Date() });
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getLogs() {
    return this.logs;
  }

  protected async callClaude(systemPrompt: string, userMessage: string): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      await this.log('mock_mode', { reason: 'No ANTHROPIC_API_KEY set' });
      return this.getMockResponse();
    }

    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      return textBlock ? textBlock.text : '';
    } catch (error: any) {
      await this.log('claude_error', { error: error.message });
      return this.getMockResponse();
    }
  }

  protected parseLLMJson<T>(text: string): T {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim());
    }
    // Try direct parse
    try {
      return JSON.parse(text);
    } catch {
      // Try to find JSON object in text
      const objMatch = text.match(/\{[\s\S]*\}/);
      if (objMatch) {
        return JSON.parse(objMatch[0]);
      }
      throw new Error('Failed to parse LLM JSON response');
    }
  }

  protected getMockResponse(): string {
    return JSON.stringify({
      success: true,
      data: { message: `Mock response from ${this.name}` },
      reasoning: 'Running in mock mode — no API key configured',
      confidence: 75,
    });
  }
}
