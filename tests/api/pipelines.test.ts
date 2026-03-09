import { describe, it, expect } from 'vitest';
import { GET, POST } from '@/app/api/pipelines/route';

describe('GET /api/pipelines', () => {
  it('returns 200 with pipeline list', async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it('each pipeline has required fields', async () => {
    const res = await GET();
    const data = await res.json();
    data.forEach((p: any) => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('type');
      expect(p).toHaveProperty('status');
      expect(p).toHaveProperty('createdAt');
    });
  });

  it('all pipelines are leados type', async () => {
    const res = await GET();
    const data = await res.json();
    data.forEach((p: any) => {
      expect(p.type).toBe('leados');
    });
  });
});

describe('POST /api/pipelines', () => {
  it('creates a new pipeline', async () => {
    const req = new Request('http://localhost:3000/api/pipelines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'leados', config: { niche: 'SaaS' } }),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.id).toMatch(/^pipe_/);
    expect(data.type).toBe('leados');
    expect(data.status).toBe('idle');
  });

  it('defaults to leados type', async () => {
    const req = new Request('http://localhost:3000/api/pipelines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    const data = await res.json();
    expect(data.type).toBe('leados');
  });
});
