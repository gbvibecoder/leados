import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/agents/route';
import { GET as GET_AGENT } from '@/app/api/agents/[id]/route';
import { POST as RUN_AGENT } from '@/app/api/agents/[id]/run/route';

describe('GET /api/agents', () => {
  it('returns 200 with all 13 agents', async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveLength(13);
  });

  it('each agent has required fields', async () => {
    const res = await GET();
    const data = await res.json();
    data.forEach((agent: any) => {
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('pipeline');
      expect(agent).toHaveProperty('status');
      expect(agent).toHaveProperty('order');
    });
  });

  it('all agents are leados pipeline', async () => {
    const res = await GET();
    const data = await res.json();
    const leados = data.filter((a: any) => a.pipeline === 'leados');
    expect(leados).toHaveLength(13);
  });
});

describe('GET /api/agents/[id]', () => {
  it('returns agent details by id', async () => {
    const req = new Request('http://localhost:3000/api/agents/service-research');
    const res = await GET_AGENT(req, { params: Promise.resolve({ id: 'service-research' }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.id).toBe('service-research');
    expect(data.status).toBe('idle');
  });
});

describe('POST /api/agents/[id]/run', () => {
  it('returns a run result', async () => {
    const req = new Request('http://localhost:3000/api/agents/service-research/run', { method: 'POST' });
    const res = await RUN_AGENT(req, { params: Promise.resolve({ id: 'service-research' }) });
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.agentId).toBe('service-research');
    expect(data.status).toBe('done');
    expect(data.outputsJson).toHaveProperty('success', true);
    expect(data.outputsJson).toHaveProperty('confidence');
  });
});
