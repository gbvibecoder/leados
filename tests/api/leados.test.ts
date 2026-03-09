import { describe, it, expect } from 'vitest';
import { GET as GET_LEADS } from '@/app/api/leados/leads/route';
import { GET as GET_ANALYTICS } from '@/app/api/leados/analytics/route';

describe('GET /api/leados/leads', () => {
  it('returns 200 with 15 mock leads', async () => {
    const req = new Request('http://localhost:3000/api/leados/leads');
    const res = await GET_LEADS(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveLength(15);
  });

  it('each lead has required fields', async () => {
    const req = new Request('http://localhost:3000/api/leados/leads');
    const res = await GET_LEADS(req);
    const data = await res.json();
    data.forEach((lead: any) => {
      expect(lead).toHaveProperty('id');
      expect(lead).toHaveProperty('name');
      expect(lead).toHaveProperty('email');
      expect(lead).toHaveProperty('company');
      expect(lead).toHaveProperty('source');
      expect(lead).toHaveProperty('score');
      expect(lead).toHaveProperty('stage');
    });
  });

  it('filters by stage', async () => {
    const req = new Request('http://localhost:3000/api/leados/leads?stage=qualified');
    const res = await GET_LEADS(req);
    const data = await res.json();
    expect(data.length).toBeGreaterThan(0);
    data.forEach((lead: any) => {
      expect(lead.stage).toBe('qualified');
    });
  });

  it('filters by source', async () => {
    const req = new Request('http://localhost:3000/api/leados/leads?source=google_ads');
    const res = await GET_LEADS(req);
    const data = await res.json();
    expect(data.length).toBeGreaterThan(0);
    data.forEach((lead: any) => {
      expect(lead.source).toBe('google_ads');
    });
  });

  it('filters by minScore', async () => {
    const req = new Request('http://localhost:3000/api/leados/leads?minScore=80');
    const res = await GET_LEADS(req);
    const data = await res.json();
    expect(data.length).toBeGreaterThan(0);
    data.forEach((lead: any) => {
      expect(lead.score).toBeGreaterThanOrEqual(80);
    });
  });

  it('combines filters', async () => {
    const req = new Request('http://localhost:3000/api/leados/leads?stage=qualified&minScore=70');
    const res = await GET_LEADS(req);
    const data = await res.json();
    data.forEach((lead: any) => {
      expect(lead.stage).toBe('qualified');
      expect(lead.score).toBeGreaterThanOrEqual(70);
    });
  });

  it('returns empty array for non-matching filter', async () => {
    const req = new Request('http://localhost:3000/api/leados/leads?minScore=999');
    const res = await GET_LEADS(req);
    const data = await res.json();
    expect(data).toHaveLength(0);
  });
});

describe('GET /api/leados/analytics', () => {
  it('returns 200 with analytics data', async () => {
    const res = await GET_ANALYTICS();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty('cpl');
    expect(data).toHaveProperty('cac');
    expect(data).toHaveProperty('conversionRate');
    expect(data).toHaveProperty('totalLeads');
    expect(data).toHaveProperty('qualifiedLeads');
    expect(data).toHaveProperty('revenue');
  });

  it('has channel breakdown', async () => {
    const res = await GET_ANALYTICS();
    const data = await res.json();
    expect(data.channelBreakdown).toHaveLength(5);
    data.channelBreakdown.forEach((ch: any) => {
      expect(ch).toHaveProperty('channel');
      expect(ch).toHaveProperty('leads');
      expect(ch).toHaveProperty('spend');
      expect(ch).toHaveProperty('cpl');
    });
  });

  it('has funnel data', async () => {
    const res = await GET_ANALYTICS();
    const data = await res.json();
    expect(data.funnelData).toHaveLength(5);
    expect(data.funnelData[0].stage).toBe('Visitors');
    expect(data.funnelData[4].stage).toBe('Won');
  });

  it('has trends data', async () => {
    const res = await GET_ANALYTICS();
    const data = await res.json();
    expect(data.trends.length).toBeGreaterThan(0);
    data.trends.forEach((t: any) => {
      expect(t).toHaveProperty('date');
      expect(t).toHaveProperty('leads');
      expect(t).toHaveProperty('revenue');
    });
  });
});
