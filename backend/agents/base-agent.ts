import Anthropic from '@anthropic-ai/sdk';

export type AgentStatus = 'idle' | 'running' | 'done' | 'error';

export interface AgentInput {
  pipelineId: string;
  config: Record<string, any>;
  previousOutputs?: Record<string, any>;
  userId?: string | null;
}

export interface AgentOutput {
  success: boolean;
  data: any;
  reasoning: string;
  confidence: number;
  error?: string;
}

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

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

  /** Call LLM — tries Anthropic first, falls back to Gemini if Anthropic fails.
   *  maxTokens: agent-specific output limit (default 8192, was 16384 — most agents need <4000 tokens) */
  protected async callClaude(systemPrompt: string, userMessage: string, maxRetries = 3, maxTokens = 8192): Promise<string> {
    // Try Anthropic first
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      try {
        const result = await this.callAnthropic(systemPrompt, userMessage, anthropicKey, maxRetries, maxTokens);
        return result;
      } catch (error: any) {
        await this.log('anthropic_failed', { error: error.message });
        // Fall through to Gemini
      }
    }

    // Fallback to Gemini
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        await this.log('gemini_fallback', { reason: 'Anthropic unavailable, using Gemini' });
        const result = await this.callGemini(systemPrompt, userMessage, geminiKey, maxRetries, maxTokens);
        return result;
      } catch (error: any) {
        await this.log('gemini_failed', { error: error.message });
        throw new Error(`Both Anthropic and Gemini failed. Anthropic: no credits. Gemini: ${error.message}`);
      }
    }

    throw new Error('No LLM API key configured — set ANTHROPIC_API_KEY or GEMINI_API_KEY');
  }

  private async callAnthropic(systemPrompt: string, userMessage: string, apiKey: string, maxRetries: number, maxTokens: number = 8192): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = new Anthropic({ apiKey, timeout: 120_000 });

        const message = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: maxTokens,
          system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
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
        await this.log('anthropic_retry', { attempt, maxRetries, error: error.message });

        // Don't retry on auth/billing/rate errors — fail fast to Gemini
        if (error.status === 401 || error.status === 403 || error.status === 429
            || error.message?.includes('credit balance')
            || error.message?.includes('overloaded')
            || error.message?.includes('rate_limit')) {
          throw error;
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    throw lastError || new Error('Anthropic call failed after retries');
  }

  private async callGemini(systemPrompt: string, userMessage: string, apiKey: string, maxRetries: number, maxTokens: number = 8192): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const geminiController = new AbortController();
        const geminiTimeout = setTimeout(() => geminiController.abort(), 120_000);
        const res = await fetch(`${GEMINI_BASE}/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: geminiController.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userMessage }] }],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: 0.7,
            },
          }),
        });

        clearTimeout(geminiTimeout);

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Gemini API error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from Gemini');
        }

        return text;
      } catch (error: any) {
        lastError = error;
        await this.log('gemini_retry', { attempt, maxRetries, error: error.message });

        // Don't retry on quota errors
        if (error.message?.includes('429') || error.message?.includes('quota')) {
          throw error;
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    throw lastError || new Error('Gemini call failed after retries');
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
