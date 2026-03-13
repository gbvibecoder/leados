import { describe, it, expect } from 'vitest';
import { PerformanceOptimizationAgent } from '@backend/agents/leados/performance-optimization';

describe('PerformanceOptimizationAgent', () => {
  const agent = new PerformanceOptimizationAgent();

  it('has correct agent metadata', () => {
    expect(agent.id).toBe('performance-optimization');
    expect(agent.name).toBe('Performance Optimization Agent');
    expect(agent.description).toContain('ROAS');
    expect(agent.description).toContain('budget');
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

  // Current Metrics
  it('returns current metrics with all KPIs', async () => {
    const result = await agent.run({ pipelineId: 'test-002', config: {} });

    const m = result.data.currentMetrics;
    expect(m).toBeTruthy();
    expect(typeof m.cpl).toBe('number');
    expect(typeof m.cac).toBe('number');
    expect(typeof m.roas).toBe('number');
    expect(typeof m.ltv).toBe('number');
    expect(typeof m.ltvCacRatio).toBe('number');
    expect(typeof m.conversionRate).toBe('number');
    expect(typeof m.qualificationRate).toBe('number');
  });

  it('LTV/CAC ratio is healthy (> 3x)', async () => {
    const result = await agent.run({ pipelineId: 'test-003', config: {} });
    expect(result.data.currentMetrics.ltvCacRatio).toBeGreaterThan(3);
  });

  // Campaign Analysis
  it('returns campaign analysis with status', async () => {
    const result = await agent.run({ pipelineId: 'test-004', config: {} });

    const campaigns = result.data.campaignAnalysis;
    expect(campaigns).toBeInstanceOf(Array);
    expect(campaigns.length).toBeGreaterThanOrEqual(3);

    for (const c of campaigns) {
      expect(c.campaign).toBeTruthy();
      expect(['scale', 'optimize', 'kill']).toContain(c.status);
      expect(c.action).toBeTruthy();
      expect(c.reason).toBeTruthy();
    }
  });

  it('each campaign has metrics', async () => {
    const result = await agent.run({ pipelineId: 'test-005', config: {} });

    for (const c of result.data.campaignAnalysis) {
      const m = c.metrics;
      expect(m).toBeTruthy();
      expect(typeof m.spend).toBe('number');
      expect(typeof m.leads).toBe('number');
      expect(typeof m.cpl).toBe('number');
      expect(typeof m.roas).toBe('number');
    }
  });

  it('scale campaigns have ROAS >= 3x', async () => {
    const result = await agent.run({ pipelineId: 'test-006', config: {} });

    const scaled = result.data.campaignAnalysis.filter((c: any) => c.status === 'scale');
    expect(scaled.length).toBeGreaterThan(0);
    for (const c of scaled) {
      expect(c.metrics.roas).toBeGreaterThanOrEqual(3);
    }
  });

  it('kill campaigns have ROAS < 1x', async () => {
    const result = await agent.run({ pipelineId: 'test-007', config: {} });

    const killed = result.data.campaignAnalysis.filter((c: any) => c.status === 'kill');
    expect(killed.length).toBeGreaterThan(0);
    for (const c of killed) {
      expect(c.metrics.roas).toBeLessThan(1);
    }
  });

  it('has all three statuses represented', async () => {
    const result = await agent.run({ pipelineId: 'test-008', config: {} });

    const statuses = new Set(result.data.campaignAnalysis.map((c: any) => c.status));
    expect(statuses.has('scale')).toBe(true);
    expect(statuses.has('optimize')).toBe(true);
    expect(statuses.has('kill')).toBe(true);
  });

  // Budget Reallocation
  it('returns budget reallocation with before/after', async () => {
    const result = await agent.run({ pipelineId: 'test-009', config: {} });

    const budget = result.data.budgetReallocation;
    expect(budget).toBeTruthy();
    expect(budget.before).toBeTruthy();
    expect(budget.after).toBeTruthy();
    expect(typeof budget.totalBudget).toBe('number');
    expect(budget.rationale).toBeTruthy();
  });

  it('killed campaigns have $0 in after budget', async () => {
    const result = await agent.run({ pipelineId: 'test-010', config: {} });

    const budget = result.data.budgetReallocation;
    // Find a campaign with $0 after (killed)
    const zeroAfter = Object.values(budget.after).filter((v: any) => v === 0);
    expect(zeroAfter.length).toBeGreaterThan(0);
  });

  // Creative Fatigue
  it('returns creative fatigue analysis', async () => {
    const result = await agent.run({ pipelineId: 'test-011', config: {} });

    const fatigue = result.data.creativeFatigue;
    expect(fatigue).toBeInstanceOf(Array);
    expect(fatigue.length).toBeGreaterThan(0);

    for (const f of fatigue) {
      expect(f.campaign).toBeTruthy();
      expect(f.ctrTrend).toBeTruthy();
      expect(['low', 'medium', 'high']).toContain(f.fatigueLevel);
      expect(f.recommendation).toBeTruthy();
    }
  });

  it('has at least one high fatigue campaign', async () => {
    const result = await agent.run({ pipelineId: 'test-012', config: {} });

    const highFatigue = result.data.creativeFatigue.filter((f: any) => f.fatigueLevel === 'high');
    expect(highFatigue.length).toBeGreaterThan(0);
  });

  // Offer Refinements
  it('returns offer refinements with priorities', async () => {
    const result = await agent.run({ pipelineId: 'test-013', config: {} });

    const refs = result.data.offerRefinements;
    expect(refs).toBeInstanceOf(Array);
    expect(refs.length).toBeGreaterThanOrEqual(3);

    for (const r of refs) {
      expect(['high', 'medium', 'low']).toContain(r.priority);
      expect(r.area).toBeTruthy();
      expect(r.recommendation).toBeTruthy();
      expect(r.expectedImpact).toBeTruthy();
    }
  });

  // Weekly Report
  it('returns weekly report with WoW trends', async () => {
    const result = await agent.run({ pipelineId: 'test-014', config: {} });

    const report = result.data.weeklyReport;
    expect(report).toBeTruthy();
    expect(report.leadsGenerated).toBeGreaterThan(0);
    expect(report.qualifiedLeads).toBeGreaterThan(0);
    expect(report.meetingsBooked).toBeGreaterThan(0);
    expect(typeof report.revenue).toBe('number');
    expect(typeof report.roasOverall).toBe('number');
    expect(report.weekOverWeek).toBeTruthy();
    expect(report.topPerformer).toBeTruthy();
    expect(report.bottomPerformer).toBeTruthy();
  });

  // Alerts
  it('returns alerts with severities', async () => {
    const result = await agent.run({ pipelineId: 'test-015', config: {} });

    const alerts = result.data.alerts;
    expect(alerts).toBeInstanceOf(Array);
    expect(alerts.length).toBeGreaterThan(0);

    for (const alert of alerts) {
      expect(['critical', 'warning', 'info']).toContain(alert.severity);
      expect(alert.message).toBeTruthy();
      expect(alert.action).toBeTruthy();
    }
  });

  it('has at least one critical alert', async () => {
    const result = await agent.run({ pipelineId: 'test-016', config: {} });

    const critical = result.data.alerts.filter((a: any) => a.severity === 'critical');
    expect(critical.length).toBeGreaterThan(0);
  });

  // Summary
  it('returns summary with optimization counts', async () => {
    const result = await agent.run({ pipelineId: 'test-017', config: {} });

    const summary = result.data.summary;
    expect(summary).toBeTruthy();
    expect(typeof summary.campaignsScaled).toBe('number');
    expect(typeof summary.campaignsOptimized).toBe('number');
    expect(typeof summary.campaignsKilled).toBe('number');
    expect(typeof summary.budgetReallocated).toBe('number');
    expect(summary.projectedRoasImprovement).toBeTruthy();
  });

  it('summary counts match campaign analysis', async () => {
    const result = await agent.run({ pipelineId: 'test-018', config: {} });

    const campaigns = result.data.campaignAnalysis;
    const summary = result.data.summary;

    expect(summary.campaignsScaled).toBe(campaigns.filter((c: any) => c.status === 'scale').length);
    expect(summary.campaignsOptimized).toBe(campaigns.filter((c: any) => c.status === 'optimize').length);
    expect(summary.campaignsKilled).toBe(campaigns.filter((c: any) => c.status === 'kill').length);
  });

  // NO-GO gate
  it('skips execution when validation returns NO-GO', async () => {
    const result = await agent.run({
      pipelineId: 'test-019',
      config: {},
      previousOutputs: {
        validation: { decision: 'NO-GO' },
      },
    });

    expect(result.success).toBe(false);
    expect(result.data.skipped).toBe(true);
    expect(result.reasoning).toContain('validation rejected');
  });
});
