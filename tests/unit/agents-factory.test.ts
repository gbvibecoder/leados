import { describe, it, expect, vi } from 'vitest';

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(),
}));

import { createLeadOSAgents } from '@backend/agents/leados/index';
import { createAllAgents } from '@backend/agents/index';

describe('Agent Factories', () => {
  describe('createLeadOSAgents', () => {
    const agents = createLeadOSAgents();

    it('returns a Map', () => {
      expect(agents).toBeInstanceOf(Map);
    });

    it('creates 13 agents', () => {
      expect(agents.size).toBe(13);
    });

    it('includes service-research agent', () => {
      expect(agents.has('service-research')).toBe(true);
    });

    it('includes crm-hygiene agent', () => {
      expect(agents.has('crm-hygiene')).toBe(true);
    });

    it('all agents have run method', () => {
      agents.forEach((agent) => {
        expect(typeof agent.run).toBe('function');
      });
    });

    it('all agents have correct properties', () => {
      agents.forEach((agent) => {
        expect(agent.id).toBeDefined();
        expect(agent.name).toBeDefined();
        expect(agent.description).toBeDefined();
      });
    });
  });

  describe('createAllAgents', () => {
    const agents = createAllAgents();

    it('returns a Map', () => {
      expect(agents).toBeInstanceOf(Map);
    });

    it('creates 13 agents total', () => {
      expect(agents.size).toBe(13);
    });

    it('includes LeadOS agents', () => {
      expect(agents.has('service-research')).toBe(true);
      expect(agents.has('crm-hygiene')).toBe(true);
    });
  });
});
