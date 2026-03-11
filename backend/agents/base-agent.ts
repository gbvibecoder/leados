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

  protected async callClaude(systemPrompt: string, userMessage: string, maxRetries = 3): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      await this.log('mock_mode', { reason: 'No ANTHROPIC_API_KEY set' });
      throw new Error('No ANTHROPIC_API_KEY configured — using mock fallback');
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = new Anthropic({ apiKey });

        const message = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 8192,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });

        const text = message.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map(block => block.text)
          .join('');

        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Claude');
        }

        return text;
      } catch (error: any) {
        lastError = error;
        await this.log('llm_retry', { attempt, maxRetries, error: error.message });

        // Don't retry on auth errors
        if (error.status === 401 || error.status === 403) {
          throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    throw lastError || new Error('LLM call failed after retries');
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

  protected safeParseLLMJson<T>(text: string, requiredFields: string[] = []): T {
    const parsed = this.parseLLMJson<T>(text);

    // Validate required fields exist
    if (requiredFields.length > 0 && typeof parsed === 'object' && parsed !== null) {
      const missing = requiredFields.filter(f => !(f in (parsed as Record<string, unknown>)));
      if (missing.length > 0) {
        throw new Error(`LLM response missing required fields: ${missing.join(', ')}`);
      }
    }

    return parsed;
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
