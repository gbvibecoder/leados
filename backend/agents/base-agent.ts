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
  /** Set by agents at the start of run() so callClaude can inject localization */
  protected _runConfig: Record<string, any> = {};

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

  /**
   * Call LLM — priority order:
   *  1. OpenRouter (if OPENROUTER_API_KEY set) — cheapest, no quota issues, auto-fallback
   *  2. Gemini (if GEMINI_API_KEY set) — free tier
   *  3. Anthropic (if ANTHROPIC_API_KEY set) — paid
   *
   * Override with AI_ENGINE=openrouter|gemini|anthropic to force a specific engine.
   */
  protected async callClaude(systemPrompt: string, userMessage: string, maxRetries = 3, maxTokens = 16384): Promise<string> {
    // Auto-inject language instruction from project config so ALL agents respect it
    const locInstruction = this._runConfig?.localization?.instruction;
    if (locInstruction) {
      systemPrompt = `LANGUAGE REQUIREMENT (MANDATORY): ${locInstruction}\nAll text output you generate MUST be in the specified language. Do NOT default to English unless the project language is English.\n\n${systemPrompt}`;
    }

    const aiEngine = process.env.AI_ENGINE;
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    // Build ordered engine list based on AI_ENGINE preference
    type Engine = { name: string; call: () => Promise<string> };
    const engines: Engine[] = [];

    const addOpenRouter = () => {
      if (openrouterKey) engines.push({
        name: 'openrouter',
        call: () => this.callOpenRouter(systemPrompt, userMessage, openrouterKey, maxRetries, maxTokens),
      });
    };
    const addGemini = () => {
      if (geminiKey) engines.push({
        name: 'gemini',
        call: () => this.callGemini(systemPrompt, userMessage, geminiKey, maxRetries, maxTokens),
      });
    };
    const addAnthropic = () => {
      if (anthropicKey) engines.push({
        name: 'anthropic',
        call: () => this.callAnthropic(systemPrompt, userMessage, anthropicKey, maxRetries, maxTokens),
      });
    };

    if (aiEngine === 'openrouter') { addOpenRouter(); addGemini(); addAnthropic(); }
    else if (aiEngine === 'anthropic') { addAnthropic(); addOpenRouter(); addGemini(); }
    else if (aiEngine === 'gemini') { addGemini(); addOpenRouter(); addAnthropic(); }
    else { addOpenRouter(); addGemini(); addAnthropic(); } // default: openrouter > gemini > anthropic

    if (engines.length === 0) {
      throw new Error('No LLM API key configured — set OPENROUTER_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY');
    }

    let lastError = '';
    for (let i = 0; i < engines.length; i++) {
      const engine = engines[i];
      try {
        const result = await engine.call();
        return result;
      } catch (error: any) {
        lastError = `${engine.name}: ${error.message || 'Unknown error'}`;
        await this.log(`${engine.name}_failed`, { error: error.message, status: error.status });
        if (i < engines.length - 1) {
          await this.log('engine_fallback', { from: engine.name, to: engines[i + 1].name, reason: lastError });
        }
      }
    }

    throw new Error(`All engines failed. ${lastError}`);
  }

  private async callOpenRouter(systemPrompt: string, userMessage: string, apiKey: string, maxRetries: number, maxTokens: number): Promise<string> {
    let lastError: Error | null = null;
    const isVercel = !!process.env.VERCEL;
    const timeoutMs = isVercel ? 45_000 : 180_000;
    const model = process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-001';

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://leados.app',
            'X-Title': 'LeadOS',
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature: 0.7,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
          }),
        });

        clearTimeout(timeout);

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`OpenRouter API error ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;

        if (!text || text.trim().length === 0) {
          throw new Error('Empty response from OpenRouter');
        }

        await this.log('openrouter_success', { model, attempt });
        return text;
      } catch (error: any) {
        lastError = error;
        await this.log('openrouter_retry', { attempt, maxRetries, error: error.message });

        // Don't retry on auth errors
        if (error.message?.includes('401') || error.message?.includes('403')) {
          throw error;
        }

        // Retry on rate limits with short wait
        if (error.message?.includes('429') && attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          continue;
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError || new Error('OpenRouter call failed after retries');
  }

  private async callAnthropic(systemPrompt: string, userMessage: string, apiKey: string, maxRetries: number, maxTokens: number = 16384): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const isVercel = !!process.env.VERCEL;
        const timeoutMs = isVercel ? 45_000 : 180_000; // 45s on Vercel, 3min locally
        const client = new Anthropic({ apiKey, timeout: timeoutMs });

        const abortController = new AbortController();
        const hardTimeout = setTimeout(() => abortController.abort(), timeoutMs);

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
          const waitMs = isOverloaded ? 2000 : 1000;
          await this.log('anthropic_wait_retry', { waitMs, reason: isConnectionError ? 'connection_error' : 'overloaded' });
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError || new Error('Anthropic call failed after retries');
  }

  private async callGemini(systemPrompt: string, userMessage: string, apiKey: string, maxRetries: number, maxTokens: number = 16384): Promise<string> {
    let lastError: Error | null = null;
    // Allow 1 extra retry for transient rate limits, but not more
    const totalAttempts = maxRetries + 1;

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      try {
        const geminiController = new AbortController();
        const geminiTimeoutMs = !!process.env.VERCEL ? 45_000 : 180_000;
        const geminiTimeout = setTimeout(() => geminiController.abort(), geminiTimeoutMs);
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

        // For per-minute rate limits: short wait and retry (keep short for Vercel 60s limit)
        if (isRateLimit && attempt < totalAttempts) {
          const waitMs = Math.min(2000 + attempt * 1000, 5000);
          await this.log('gemini_rate_limit_wait', { waitMs, attempt });
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }

        // For non-rate-limit errors: short backoff
        if (!isRateLimit && attempt < totalAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError || new Error('Gemini call failed after retries');
  }

  protected parseLLMJson<T>(text: string): T {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    let jsonStr = jsonMatch ? jsonMatch[1].trim() : text;

    // If no code block, try to find JSON object in text
    if (!jsonMatch) {
      const objMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (objMatch) jsonStr = objMatch[0];
    }

    // Try direct parse first
    try {
      return JSON.parse(jsonStr);
    } catch (firstError: any) {
      // Fix common LLM JSON issues:
      // 1. Bad escape characters (e.g., \' or \x or unescaped control chars)
      // 2. Trailing commas before } or ]
      // 3. Single quotes instead of double quotes in keys
      let fixed = jsonStr
        .replace(/\\'/g, "'")                           // \' → '
        .replace(/\\x[0-9a-fA-F]{2}/g, '')             // \x00 hex escapes
        .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '') // control chars
        .replace(/,\s*([\]}])/g, '$1')                  // trailing commas
        .replace(/\n/g, '\\n')                          // unescaped newlines in strings
        .replace(/\r/g, '\\r')                          // unescaped carriage returns
        .replace(/\t/g, '\\t');                         // unescaped tabs

      // Re-extract JSON object after fixing
      const fixedMatch = fixed.match(/\{[\s\S]*\}/);
      if (fixedMatch) fixed = fixedMatch[0];

      try {
        return JSON.parse(fixed);
      } catch {
        // Last resort: repair truncated JSON by closing open brackets/braces
        let repaired = fixed;

        // Find the last valid position by truncating at last complete value
        const lastBrace = repaired.lastIndexOf('}');
        const lastBracket = repaired.lastIndexOf(']');
        const lastPos = Math.max(lastBrace, lastBracket);
        if (lastPos > 0) {
          repaired = repaired.substring(0, lastPos + 1);
        }

        // Count unclosed brackets and braces, then close them
        let openBraces = 0, openBrackets = 0;
        let inString = false, escaped = false;
        for (const ch of repaired) {
          if (escaped) { escaped = false; continue; }
          if (ch === '\\') { escaped = true; continue; }
          if (ch === '"') { inString = !inString; continue; }
          if (inString) continue;
          if (ch === '{') openBraces++;
          else if (ch === '}') openBraces--;
          else if (ch === '[') openBrackets++;
          else if (ch === ']') openBrackets--;
        }
        // Remove trailing comma before closing
        repaired = repaired.replace(/,\s*$/, '');
        // Close unclosed brackets/braces in correct order
        for (let i = 0; i < openBrackets; i++) repaired += ']';
        for (let i = 0; i < openBraces; i++) repaired += '}';

        try {
          return JSON.parse(repaired);
        } catch { /* fall through */ }

        throw new Error(`${firstError.message}`);
      }
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
