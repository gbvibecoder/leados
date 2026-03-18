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

  /** Call LLM — tries Gemini first (free), falls back to Anthropic (paid).
   *  Set AI_ENGINE=anthropic in .env to force Anthropic-first.
   *  maxTokens: output limit (default 16384) */
  protected async callClaude(systemPrompt: string, userMessage: string, maxRetries = 3, maxTokens = 16384): Promise<string> {
    const preferAnthropic = process.env.AI_ENGINE === 'anthropic';
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // Determine order: Gemini first (free) unless AI_ENGINE=anthropic
    const primary = preferAnthropic ? 'anthropic' : 'gemini';
    let primaryError = '';

    // Try primary engine
    if (primary === 'gemini' && geminiKey) {
      try {
        const result = await this.callGemini(systemPrompt, userMessage, geminiKey, maxRetries, maxTokens);
        return result;
      } catch (error: any) {
        primaryError = error.message || 'Gemini failed';
        await this.log('gemini_failed', { error: primaryError });
      }
    } else if (primary === 'anthropic' && anthropicKey) {
      try {
        const result = await this.callAnthropic(systemPrompt, userMessage, anthropicKey, maxRetries, maxTokens);
        return result;
      } catch (error: any) {
        primaryError = error.message || 'Anthropic failed';
        await this.log('anthropic_failed', { error: primaryError, status: error.status });
      }
    }

    // Try fallback engine
    const fallback = primary === 'gemini' ? 'anthropic' : 'gemini';
    const fallbackKey = fallback === 'anthropic' ? anthropicKey : geminiKey;

    if (fallbackKey) {
      try {
        await this.log(`${fallback}_fallback`, { reason: `${primary} failed: ${primaryError}` });
        if (fallback === 'anthropic') {
          return await this.callAnthropic(systemPrompt, userMessage, fallbackKey, maxRetries, maxTokens);
        } else {
          return await this.callGemini(systemPrompt, userMessage, fallbackKey, maxRetries, maxTokens);
        }
      } catch (error: any) {
        await this.log(`${fallback}_failed`, { error: error.message });
        throw new Error(`Both engines failed. ${primary}: ${primaryError}. ${fallback}: ${error.message}`);
      }
    }

    if (primaryError) {
      throw new Error(`${primary} failed: ${primaryError}. No fallback engine configured.`);
    }
    throw new Error('No LLM API key configured — set ANTHROPIC_API_KEY or GEMINI_API_KEY');
  }

  private async callAnthropic(systemPrompt: string, userMessage: string, apiKey: string, maxRetries: number, maxTokens: number = 16384): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const client = new Anthropic({ apiKey, timeout: 120_000 });

        // Hard 3-minute total timeout — AbortController kills the request regardless of activity
        const abortController = new AbortController();
        const hardTimeout = setTimeout(() => abortController.abort(), 180_000);

        let message;
        try {
          message = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: maxTokens,
            system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
            messages: [{ role: 'user', content: userMessage }],
          }, { signal: abortController.signal });
        } finally {
          clearTimeout(hardTimeout);
        }

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

        // Don't retry on auth/billing errors — fail fast to Gemini
        if (error.status === 401 || error.status === 403
            || error.message?.includes('credit balance')) {
          throw error;
        }

        // Retry on connection errors, overloaded, and rate limits with longer wait
        const isConnectionError = error.message?.includes('Connection error') || error.message?.includes('ECONNRESET') || error.message?.includes('fetch failed') || error.name === 'AbortError';
        const isOverloaded = error.status === 429 || error.status === 529 || error.message?.includes('overloaded') || error.message?.includes('rate_limit');
        if ((isConnectionError || isOverloaded) && attempt < maxRetries) {
          const waitSec = isOverloaded ? 15 * attempt : 5 * attempt;
          await this.log('anthropic_wait_retry', { waitSeconds: waitSec, reason: isConnectionError ? 'connection_error' : 'overloaded' });
          await new Promise(resolve => setTimeout(resolve, waitSec * 1000));
          continue;
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        }
      }
    }

    throw lastError || new Error('Anthropic call failed after retries');
  }

  private async callGemini(systemPrompt: string, userMessage: string, apiKey: string, maxRetries: number, maxTokens: number = 16384): Promise<string> {
    let lastError: Error | null = null;
    // Allow more retries for rate limits (free tier has 15 req/min)
    const totalAttempts = maxRetries + 3;

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
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
        const isRateLimit = error.message?.includes('429') || error.message?.includes('RATE_LIMIT');
        const isQuotaExhausted = error.message?.includes('quota') || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('suspended') || error.message?.includes('limit: 0');
        const isAuthError = error.message?.includes('403') || error.message?.includes('401') || error.message?.includes('PERMISSION_DENIED');

        await this.log('gemini_retry', { attempt, totalAttempts, error: error.message, isRateLimit, isQuotaExhausted });

        // Fail fast on quota exhaustion, auth errors, or suspension — no point retrying
        if (isQuotaExhausted || isAuthError) {
          throw error;
        }

        // For per-minute rate limits: wait and retry (Gemini free tier resets per minute)
        if (isRateLimit && attempt < totalAttempts) {
          const waitSec = Math.min(15 + attempt * 10, 60);
          await this.log('gemini_rate_limit_wait', { waitSeconds: waitSec, attempt });
          await new Promise(resolve => setTimeout(resolve, waitSec * 1000));
          continue;
        }

        // For non-rate-limit errors: standard exponential backoff
        if (!isRateLimit && attempt < totalAttempts) {
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
