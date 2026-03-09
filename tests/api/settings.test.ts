import { describe, it, expect } from 'vitest';
import { GET, PUT } from '@/app/api/settings/route';
import { GET as GET_INTEGRATIONS } from '@/app/api/settings/integrations/route';

describe('GET /api/settings', () => {
  it('returns 200 with settings', async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toHaveProperty('integrations');
    expect(data).toHaveProperty('notifications');
    expect(data).toHaveProperty('agentDefaults');
  });

  it('has notification settings', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.notifications).toHaveProperty('email');
    expect(data.notifications).toHaveProperty('slack');
    expect(data.notifications).toHaveProperty('webhook');
  });

  it('has agent defaults', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.agentDefaults).toHaveProperty('maxRetries');
    expect(data.agentDefaults).toHaveProperty('timeoutSeconds');
    expect(data.agentDefaults).toHaveProperty('model');
  });

  it('has integration entries', async () => {
    const res = await GET();
    const data = await res.json();
    expect(data.integrations).toHaveProperty('anthropic');
    expect(data.integrations).toHaveProperty('hubspot');
    expect(data.integrations).toHaveProperty('meta');
  });
});

describe('PUT /api/settings', () => {
  it('updates settings successfully', async () => {
    const req = new Request('http://localhost:3000/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifications: { email: false, slack: true, webhook: false } }),
    });
    const res = await PUT(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe('GET /api/settings/integrations', () => {
  it('returns 200 with 12 integrations', async () => {
    const res = await GET_INTEGRATIONS();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.integrations).toHaveLength(12);
  });

  it('each integration has required fields', async () => {
    const res = await GET_INTEGRATIONS();
    const data = await res.json();
    data.integrations.forEach((i: any) => {
      expect(i).toHaveProperty('name');
      expect(i).toHaveProperty('key');
      expect(i).toHaveProperty('category');
      expect(i).toHaveProperty('status');
    });
  });

  it('has all expected categories', async () => {
    const res = await GET_INTEGRATIONS();
    const data = await res.json();
    const categories = [...new Set(data.integrations.map((i: any) => i.category))];
    expect(categories).toContain('AI');
    expect(categories).toContain('CRM');
    expect(categories).toContain('Ads');
  });
});
