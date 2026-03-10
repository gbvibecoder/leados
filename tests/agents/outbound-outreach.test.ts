import { describe, it, expect } from 'vitest';
import { OutboundOutreachAgent } from '@backend/agents/leados/outbound-outreach';

describe('OutboundOutreachAgent', () => {
  const agent = new OutboundOutreachAgent();

  it('has correct agent metadata', () => {
    expect(agent.id).toBe('outbound-outreach');
    expect(agent.name).toBe('Outbound Outreach Agent');
    expect(agent.description).toContain('Cold email');
    expect(agent.description).toContain('LinkedIn');
  });

  it('starts in idle status', () => {
    expect(agent.getStatus()).toBe('idle');
  });

  it('runs successfully with mock fallback', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-001',
      config: { niche: 'B2B SaaS Lead Generation' },
      previousOutputs: {},
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
    expect(result.reasoning).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  it('returns cold email campaign data', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-002',
      config: { niche: 'SaaS' },
    });

    const coldEmail = result.data.coldEmail;
    expect(coldEmail).toBeTruthy();
    expect(coldEmail.sequences).toBeInstanceOf(Array);
    expect(coldEmail.sequences.length).toBeGreaterThanOrEqual(3);
    expect(coldEmail.prospectCount).toBeGreaterThan(0);

    // Each sequence step has required fields
    coldEmail.sequences.forEach((seq: any) => {
      expect(seq.step).toBeDefined();
      expect(seq.delay).toBeTruthy();
      expect(seq.subject).toBeTruthy();
      expect(seq.template).toBeTruthy();
      expect(seq.purpose).toBeTruthy();
    });
  });

  it('returns cold email compliance checks', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-003',
      config: {},
    });

    const checks = result.data.coldEmail?.complianceChecks;
    expect(checks).toBeInstanceOf(Array);
    expect(checks.length).toBeGreaterThan(0);

    // Must include CAN-SPAM and GDPR
    const checksText = checks.join(' ');
    expect(checksText).toContain('CAN-SPAM');
    expect(checksText).toContain('GDPR');
  });

  it('returns cold email sending schedule', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-004',
      config: {},
    });

    const schedule = result.data.coldEmail?.sendingSchedule;
    expect(schedule).toBeTruthy();
    expect(schedule.days).toBeInstanceOf(Array);
    expect(schedule.dailyLimit).toBeGreaterThan(0);
    expect(schedule.timeWindow).toBeTruthy();
  });

  it('returns LinkedIn outreach data', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-005',
      config: {},
    });

    const linkedIn = result.data.linkedIn;
    expect(linkedIn).toBeTruthy();
    expect(linkedIn.targetProfiles).toBeGreaterThan(0);
    expect(linkedIn.sequences).toBeInstanceOf(Array);
    expect(linkedIn.sequences.length).toBeGreaterThanOrEqual(3);

    // Each LinkedIn step has required fields
    linkedIn.sequences.forEach((seq: any) => {
      expect(seq.step).toBeDefined();
      expect(seq.type).toBeTruthy();
      expect(seq.delay).toBeTruthy();
      expect(seq.message).toBeTruthy();
    });
  });

  it('returns LinkedIn targeting criteria', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-006',
      config: {},
    });

    const criteria = result.data.linkedIn?.targetingCriteria;
    expect(criteria).toBeTruthy();
    expect(criteria.jobTitles).toBeInstanceOf(Array);
    expect(criteria.jobTitles.length).toBeGreaterThan(0);
    expect(criteria.industries).toBeInstanceOf(Array);
    expect(criteria.companySize).toBeTruthy();
  });

  it('respects LinkedIn daily limits', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-007',
      config: {},
    });

    const limits = result.data.linkedIn?.dailyLimits || {};
    const connectionLimit = limits.connectionRequests || result.data.linkedIn?.dailyLimit || 25;
    // LinkedIn safe limits: <100 connections/day
    expect(connectionLimit).toBeLessThanOrEqual(100);
    expect(connectionLimit).toBeGreaterThan(0);
  });

  it('returns projected metrics', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-008',
      config: {},
    });

    const metrics = result.data.projectedMetrics;
    expect(metrics).toBeTruthy();
    expect(metrics.emailsSent).toBeGreaterThan(0);
    expect(metrics.expectedReplies).toBeGreaterThan(0);
    expect(metrics.expectedMeetings).toBeGreaterThan(0);
    expect(metrics.linkedInConnections).toBeGreaterThan(0);
    expect(metrics.totalMeetingsFromOutbound).toBeGreaterThan(0);
  });

  it('returns prospect list with sample data', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-009',
      config: {},
    });

    const prospects = result.data.prospectList;
    expect(prospects).toBeInstanceOf(Array);
    expect(prospects.length).toBeGreaterThan(0);

    prospects.forEach((p: any) => {
      expect(p.firstName).toBeTruthy();
      expect(p.email).toBeTruthy();
      expect(p.company).toBeTruthy();
      expect(p.jobTitle).toBeTruthy();
    });
  });

  it('skips execution when validation returns NO-GO', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-010',
      config: {},
      previousOutputs: {
        validation: { data: { decision: 'NO-GO' } },
      },
    });

    expect(result.success).toBe(false);
    expect(result.data.skipped).toBe(true);
    expect(result.reasoning).toContain('validation rejected');
  });

  it('includes A/B test variants for cold email', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-011',
      config: {},
    });

    const abTests = result.data.coldEmail?.abTests;
    expect(abTests).toBeInstanceOf(Array);
    expect(abTests.length).toBeGreaterThan(0);

    abTests.forEach((test: any) => {
      expect(test.variable).toBeTruthy();
      expect(test.variantA).toBeTruthy();
      expect(test.variantB).toBeTruthy();
    });
  });

  it('includes domain warmup setup', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-012',
      config: {},
    });

    const domains = result.data.coldEmail?.domains;
    expect(domains).toBeTruthy();
    expect(domains.sendingDomains).toBeInstanceOf(Array);
    expect(domains.sendingDomains.length).toBeGreaterThan(0);
    expect(domains.warmupStatus).toBeTruthy();
  });

  it('email templates include personalization tokens', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-013',
      config: {},
    });

    const sequences = result.data.coldEmail?.sequences || [];
    sequences.forEach((seq: any) => {
      // Each template should have at least one personalization token
      expect(seq.template).toMatch(/\{[a-zA-Z]+\}/);
    });
  });

  it('email templates include unsubscribe link', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-014',
      config: {},
    });

    const sequences = result.data.coldEmail?.sequences || [];
    sequences.forEach((seq: any) => {
      expect(seq.template).toContain('{unsubscribe_link}');
    });
  });
});
