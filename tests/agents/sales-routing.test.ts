import { describe, it, expect } from 'vitest';
import { SalesRoutingAgent } from '@backend/agents/leados/sales-routing';

describe('SalesRoutingAgent', () => {
  const agent = new SalesRoutingAgent();

  it('has correct agent metadata', () => {
    expect(agent.id).toBe('sales-routing');
    expect(agent.name).toBe('Sales Routing Agent');
    expect(agent.description).toContain('checkout');
    expect(agent.description).toContain('sales call');
    expect(agent.description).toContain('disqualify');
  });

  it('starts in idle status', () => {
    expect(agent.getStatus()).toBe('idle');
  });

  it('runs successfully with mock fallback', async () => {
    const result = await agent.run({
      pipelineId: 'test-001',
      config: { niche: 'B2B SaaS' },
      previousOutputs: {},
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
    expect(result.reasoning).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  // Routing Engine
  it('returns routing engine with prioritized rules', async () => {
    const result = await agent.run({ pipelineId: 'test-002', config: {} });

    const rules = result.data.routingEngine?.rules;
    expect(rules).toBeInstanceOf(Array);
    expect(rules.length).toBeGreaterThanOrEqual(4);

    // Rules should be sorted by priority
    for (let i = 1; i < rules.length; i++) {
      expect(rules[i].priority).toBeGreaterThanOrEqual(rules[i - 1].priority);
    }
  });

  it('each rule has required fields', async () => {
    const result = await agent.run({ pipelineId: 'test-003', config: {} });

    for (const rule of result.data.routingEngine.rules) {
      expect(rule.name).toBeTruthy();
      expect(rule.condition).toBeTruthy();
      expect(['checkout', 'sales_call', 'nurture', 'disqualify']).toContain(rule.action);
      expect(rule.destination).toBeTruthy();
      expect(typeof rule.priority).toBe('number');
      expect(rule.sla).toBeTruthy();
    }
  });

  it('has checkout rule as highest priority', async () => {
    const result = await agent.run({ pipelineId: 'test-004', config: {} });

    const rules = result.data.routingEngine.rules;
    const checkoutRule = rules.find((r: any) => r.action === 'checkout');
    expect(checkoutRule).toBeTruthy();
    expect(checkoutRule.priority).toBe(1);
  });

  // Round Robin
  it('returns round-robin config with sales reps', async () => {
    const result = await agent.run({ pipelineId: 'test-005', config: {} });

    const rr = result.data.routingEngine?.roundRobinConfig;
    expect(rr).toBeTruthy();
    expect(rr.enabled).toBe(true);
    expect(rr.reps).toBeInstanceOf(Array);
    expect(rr.reps.length).toBeGreaterThanOrEqual(2);
  });

  it('each rep has capacity and specialization', async () => {
    const result = await agent.run({ pipelineId: 'test-006', config: {} });

    for (const rep of result.data.routingEngine.roundRobinConfig.reps) {
      expect(rep.name).toBeTruthy();
      expect(rep.specialization).toBeTruthy();
      expect(typeof rep.capacity).toBe('number');
      expect(typeof rep.currentLoad).toBe('number');
      expect(rep.currentLoad).toBeLessThanOrEqual(rep.capacity);
    }
  });

  // Routed Leads
  it('returns routed leads', async () => {
    const result = await agent.run({ pipelineId: 'test-007', config: {} });

    const leads = result.data.routedLeads;
    expect(leads).toBeInstanceOf(Array);
    expect(leads.length).toBeGreaterThan(0);
  });

  it('each routed lead has required fields', async () => {
    const result = await agent.run({ pipelineId: 'test-008', config: {} });

    const validRoutes = ['checkout', 'sales_call', 'nurture', 'disqualify'];

    for (const lead of result.data.routedLeads) {
      expect(lead.leadName).toBeTruthy();
      expect(lead.leadEmail).toBeTruthy();
      expect(validRoutes).toContain(lead.route);
      expect(lead.reason).toBeTruthy();
      expect(lead.destination).toBeTruthy();
      expect(lead.routedAt).toBeTruthy();
      expect(lead.latency).toBeTruthy();
    }
  });

  it('checkout leads have score >= 85', async () => {
    const result = await agent.run({ pipelineId: 'test-009', config: {} });

    const checkoutLeads = result.data.routedLeads.filter((l: any) => l.route === 'checkout');
    for (const lead of checkoutLeads) {
      expect(lead.qualificationScore).toBeGreaterThanOrEqual(85);
    }
  });

  it('sales_call leads are assigned to a rep', async () => {
    const result = await agent.run({ pipelineId: 'test-010', config: {} });

    const salesLeads = result.data.routedLeads.filter((l: any) => l.route === 'sales_call');
    for (const lead of salesLeads) {
      expect(lead.assignedRep).toBeTruthy();
    }
  });

  it('routed leads have actions taken', async () => {
    const result = await agent.run({ pipelineId: 'test-011', config: {} });

    for (const lead of result.data.routedLeads) {
      expect(lead.actions).toBeInstanceOf(Array);
      expect(lead.actions.length).toBeGreaterThan(0);
    }
  });

  it('has SLA status for each lead', async () => {
    const result = await agent.run({ pipelineId: 'test-012', config: {} });

    for (const lead of result.data.routedLeads) {
      expect(['met', 'breached']).toContain(lead.slaStatus);
    }
  });

  it('routed leads include different routes (not all same)', async () => {
    const result = await agent.run({ pipelineId: 'test-013', config: {} });

    const routes = new Set(result.data.routedLeads.map((l: any) => l.route));
    expect(routes.size).toBeGreaterThanOrEqual(2);
  });

  // BANT Breakdown
  it('checkout/sales leads have BANT breakdown', async () => {
    const result = await agent.run({ pipelineId: 'test-014', config: {} });

    const scoredLeads = result.data.routedLeads.filter((l: any) => l.qualificationScore > 0);
    expect(scoredLeads.length).toBeGreaterThan(0);

    for (const lead of scoredLeads) {
      expect(lead.bantBreakdown).toBeTruthy();
      expect(typeof lead.bantBreakdown.budget).toBe('number');
      expect(typeof lead.bantBreakdown.authority).toBe('number');
      expect(typeof lead.bantBreakdown.need).toBe('number');
      expect(typeof lead.bantBreakdown.timeline).toBe('number');
    }
  });

  // Notifications
  it('returns notifications for routed leads', async () => {
    const result = await agent.run({ pipelineId: 'test-015', config: {} });

    const notifications = result.data.notifications;
    expect(notifications).toBeInstanceOf(Array);
    expect(notifications.length).toBeGreaterThan(0);

    for (const notif of notifications) {
      expect(['email', 'sms', 'slack', 'webhook']).toContain(notif.type);
      expect(notif.recipient).toBeTruthy();
      expect(notif.message).toBeTruthy();
    }
  });

  // Summary
  it('returns summary with key metrics', async () => {
    const result = await agent.run({ pipelineId: 'test-016', config: {} });

    const summary = result.data.summary;
    expect(summary).toBeTruthy();
    expect(summary.totalRouted).toBeGreaterThan(0);
    expect(typeof summary.checkout).toBe('number');
    expect(typeof summary.salesCall).toBe('number');
    expect(typeof summary.nurture).toBe('number');
    expect(typeof summary.disqualified).toBe('number');
    expect(summary.avgRoutingLatency).toBeTruthy();
  });

  it('summary counts match routed leads', async () => {
    const result = await agent.run({ pipelineId: 'test-017', config: {} });

    const leads = result.data.routedLeads;
    const summary = result.data.summary;

    const checkout = leads.filter((l: any) => l.route === 'checkout').length;
    const salesCall = leads.filter((l: any) => l.route === 'sales_call').length;
    const nurture = leads.filter((l: any) => l.route === 'nurture').length;
    const disqualified = leads.filter((l: any) => l.route === 'disqualify').length;

    expect(summary.checkout).toBe(checkout);
    expect(summary.salesCall).toBe(salesCall);
    expect(summary.nurture).toBe(nurture);
    expect(summary.disqualified).toBe(disqualified);
    expect(summary.totalRouted).toBe(checkout + salesCall + nurture + disqualified);
  });

  it('has conversion projection', async () => {
    const result = await agent.run({ pipelineId: 'test-018', config: {} });

    expect(typeof result.data.summary.conversionProjection).toBe('number');
    expect(result.data.summary.conversionProjection).toBeGreaterThanOrEqual(0);
    expect(result.data.summary.conversionProjection).toBeLessThanOrEqual(100);
  });

  // NO-GO gate
  it('skips execution when validation returns NO-GO', async () => {
    const result = await agent.run({
      pipelineId: 'test-019',
      config: {},
      previousOutputs: {
        validation: { data: { decision: 'NO-GO' } },
      },
    });

    expect(result.success).toBe(false);
    expect(result.data.skipped).toBe(true);
    expect(result.reasoning).toContain('validation rejected');
  });

  // Upstream integration
  it('routes leads from upstream ai-qualification data', async () => {
    const result = await agent.run({
      pipelineId: 'test-020',
      config: {},
      previousOutputs: {
        'ai-qualification': {
          data: {
            callResults: [
              {
                leadName: 'Test Hot Lead',
                leadEmail: 'hot@example.com',
                company: 'HotCo',
                phone: '+1-555-0001',
                callStatus: 'completed',
                score: 90,
                bantBreakdown: { budget: 28, authority: 25, need: 22, timeline: 15 },
                outcome: 'high_intent_checkout',
                routingAction: 'Send checkout link',
              },
              {
                leadName: 'Test Warm Lead',
                leadEmail: 'warm@example.com',
                company: 'WarmCo',
                phone: '+1-555-0002',
                callStatus: 'completed',
                score: 75,
                bantBreakdown: { budget: 20, authority: 20, need: 20, timeline: 15 },
                outcome: 'high_intent_sales',
                routingAction: 'Book sales call',
              },
              {
                leadName: 'Test Cold Lead',
                leadEmail: 'cold@example.com',
                company: 'ColdCo',
                phone: '+1-555-0003',
                callStatus: 'completed',
                score: 30,
                bantBreakdown: { budget: 5, authority: 10, need: 10, timeline: 5 },
                outcome: 'low_intent',
                routingAction: 'Disqualify',
              },
            ],
          },
        },
      },
    });

    expect(result.success).toBe(true);
    const leads = result.data.routedLeads;
    expect(leads.length).toBe(3);

    // Hot lead should route to checkout
    const hot = leads.find((l: any) => l.leadEmail === 'hot@example.com');
    expect(hot.route).toBe('checkout');

    // Warm lead should route to sales call
    const warm = leads.find((l: any) => l.leadEmail === 'warm@example.com');
    expect(warm.route).toBe('sales_call');

    // Cold lead should be disqualified
    const cold = leads.find((l: any) => l.leadEmail === 'cold@example.com');
    expect(cold.route).toBe('disqualify');
  });
});
