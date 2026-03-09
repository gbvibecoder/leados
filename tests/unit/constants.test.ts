import { describe, it, expect } from 'vitest';
import { LEADOS_AGENTS, ALL_AGENTS, AGENT_STATUSES, PIPELINE_TYPES, PIPELINE_STATUSES, LEAD_STAGES } from '@shared/constants';

describe('Constants', () => {
  describe('LEADOS_AGENTS', () => {
    it('has 13 agents', () => {
      expect(LEADOS_AGENTS).toHaveLength(13);
    });

    it('all agents have required fields', () => {
      LEADOS_AGENTS.forEach((agent) => {
        expect(agent).toHaveProperty('id');
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('description');
        expect(agent).toHaveProperty('order');
        expect(agent).toHaveProperty('pipeline');
        expect(agent.pipeline).toBe('leados');
      });
    });

    it('agents are ordered 1-13', () => {
      LEADOS_AGENTS.forEach((agent, i) => {
        expect(agent.order).toBe(i + 1);
      });
    });

    it('first agent is service-research', () => {
      expect(LEADOS_AGENTS[0].id).toBe('service-research');
    });

    it('last agent is crm-hygiene', () => {
      expect(LEADOS_AGENTS[12].id).toBe('crm-hygiene');
    });
  });

  describe('ALL_AGENTS', () => {
    it('has 13 agents total', () => {
      expect(ALL_AGENTS).toHaveLength(13);
    });

    it('has unique IDs', () => {
      const ids = ALL_AGENTS.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('Enum constants', () => {
    it('AGENT_STATUSES has 4 values', () => {
      expect(AGENT_STATUSES).toEqual(['idle', 'running', 'done', 'error']);
    });

    it('PIPELINE_TYPES has 1 value', () => {
      expect(PIPELINE_TYPES).toEqual(['leados']);
    });

    it('PIPELINE_STATUSES has 5 values', () => {
      expect(PIPELINE_STATUSES).toEqual(['idle', 'running', 'completed', 'error', 'paused']);
    });

    it('LEAD_STAGES has 6 values', () => {
      expect(LEAD_STAGES).toEqual(['new', 'contacted', 'qualified', 'booked', 'won', 'lost']);
    });
  });
});
