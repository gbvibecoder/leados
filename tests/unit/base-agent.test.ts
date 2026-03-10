import { describe, it, expect, vi } from 'vitest';

// Mock the Anthropic SDK before importing
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(),
}));

import { BaseAgent, AgentInput, AgentOutput } from '@backend/agents/base-agent';

// Concrete implementation for testing (mirrors real agents with try/catch fallback)
class TestAgent extends BaseAgent {
  async run(inputs: AgentInput): Promise<AgentOutput> {
    this.status = 'running';
    try {
      const response = await this.callClaude('test prompt', 'test message');
      this.status = 'done';
      return { success: true, data: response, reasoning: 'test', confidence: 90 };
    } catch {
      this.status = 'done';
      return { success: true, data: { mock: true }, reasoning: 'mock fallback', confidence: 75 };
    }
  }

  // Expose protected methods for testing
  public testParseLLMJson<T>(text: string): T {
    return this.parseLLMJson<T>(text);
  }

  public testGetMockResponse(): string {
    return this.getMockResponse();
  }
}

describe('BaseAgent', () => {
  const agent = new TestAgent('test-agent', 'Test Agent', 'A test agent');

  describe('constructor', () => {
    it('sets id, name, description', () => {
      expect(agent.id).toBe('test-agent');
      expect(agent.name).toBe('Test Agent');
      expect(agent.description).toBe('A test agent');
    });

    it('starts with idle status', () => {
      expect(agent.getStatus()).toBe('idle');
    });

    it('starts with empty logs', () => {
      expect(agent.getLogs()).toHaveLength(0);
    });
  });

  describe('validate', () => {
    it('returns true when pipelineId is present', async () => {
      expect(await agent.validate({ pipelineId: 'pipe_1', config: {} })).toBe(true);
    });

    it('returns false when pipelineId is empty', async () => {
      expect(await agent.validate({ pipelineId: '', config: {} })).toBe(false);
    });
  });

  describe('log', () => {
    it('adds log entry', async () => {
      const initialLength = agent.getLogs().length;
      await agent.log('test_event', { foo: 'bar' });
      expect(agent.getLogs()).toHaveLength(initialLength + 1);
      const last = agent.getLogs()[agent.getLogs().length - 1];
      expect(last.event).toBe('test_event');
      expect(last.data).toEqual({ foo: 'bar' });
      expect(last.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('parseLLMJson', () => {
    it('parses raw JSON', () => {
      const result = agent.testParseLLMJson<{ foo: string }>('{"foo": "bar"}');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('parses JSON from markdown code block', () => {
      const text = 'Here is the result:\n```json\n{"foo": "bar"}\n```\nDone.';
      const result = agent.testParseLLMJson<{ foo: string }>(text);
      expect(result).toEqual({ foo: 'bar' });
    });

    it('parses JSON from code block without language', () => {
      const text = '```\n{"x": 1}\n```';
      const result = agent.testParseLLMJson<{ x: number }>(text);
      expect(result).toEqual({ x: 1 });
    });

    it('extracts JSON object from text', () => {
      const text = 'The analysis shows: {"score": 87, "decision": "GO"} based on research.';
      const result = agent.testParseLLMJson<{ score: number; decision: string }>(text);
      expect(result).toEqual({ score: 87, decision: 'GO' });
    });

    it('throws on completely invalid input', () => {
      expect(() => agent.testParseLLMJson('no json here at all')).toThrow('Failed to parse LLM JSON response');
    });
  });

  describe('getMockResponse', () => {
    it('returns valid JSON with agent name', () => {
      const response = agent.testGetMockResponse();
      const parsed = JSON.parse(response);
      expect(parsed.success).toBe(true);
      expect(parsed.data.message).toContain('Test Agent');
      expect(parsed.reasoning).toContain('mock');
      expect(parsed.confidence).toBe(75);
    });
  });

  describe('run (no API key)', () => {
    it('runs and returns output', async () => {
      const result = await agent.run({ pipelineId: 'pipe_1', config: {} });
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});
