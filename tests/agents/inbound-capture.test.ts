import { describe, it, expect } from 'vitest';
import { InboundCaptureAgent } from '@backend/agents/leados/inbound-capture';

describe('InboundCaptureAgent', () => {
  const agent = new InboundCaptureAgent();

  it('has correct agent metadata', () => {
    expect(agent.id).toBe('inbound-capture');
    expect(agent.name).toBe('Inbound Lead Capture Agent');
    expect(agent.description).toContain('CRM');
    expect(agent.description).toContain('lead scoring');
  });

  it('starts in idle status', () => {
    expect(agent.getStatus()).toBe('idle');
  });

  it('runs successfully with mock fallback', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-001',
      config: { niche: 'B2B SaaS' },
      previousOutputs: {},
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeTruthy();
    expect(result.reasoning).toBeTruthy();
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  // CRM Setup
  it('returns CRM setup with pipeline stages', async () => {
    const result = await agent.run({
      pipelineId: 'test-002',
      config: {},
    });

    const crm = result.data.crmSetup;
    expect(crm).toBeTruthy();
    expect(crm.provider).toBeTruthy();
    expect(crm.pipelineStages).toBeInstanceOf(Array);
    expect(crm.pipelineStages.length).toBeGreaterThanOrEqual(4);
  });

  it('returns CRM custom properties', async () => {
    const result = await agent.run({
      pipelineId: 'test-003',
      config: {},
    });

    const props = result.data.crmSetup?.customProperties;
    expect(props).toBeInstanceOf(Array);
    expect(props.length).toBeGreaterThan(0);

    // Must include lead_score property
    const propNames = props.map((p: any) => typeof p === 'string' ? p : p.name);
    expect(propNames).toContain('lead_score');
  });

  it('returns webhook endpoints for all inbound sources', async () => {
    const result = await agent.run({
      pipelineId: 'test-004',
      config: {},
    });

    const webhooks = result.data.crmSetup?.webhookEndpoints;
    expect(webhooks).toBeInstanceOf(Array);
    expect(webhooks.length).toBeGreaterThanOrEqual(3);

    webhooks.forEach((wh: any) => {
      expect(wh.source).toBeTruthy();
      expect(wh.url).toBeTruthy();
      expect(wh.events).toBeInstanceOf(Array);
    });
  });

  // Scoring Model
  it('returns a 100-point scoring model', async () => {
    const result = await agent.run({
      pipelineId: 'test-005',
      config: {},
    });

    const model = result.data.scoringModel;
    expect(model).toBeTruthy();
    expect(model.maxScore).toBe(100);
    expect(model.factors).toBeInstanceOf(Array);
    expect(model.factors.length).toBeGreaterThanOrEqual(3);

    // Weights should sum to 100
    const totalWeight = model.factors.reduce((sum: number, f: any) => sum + f.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('each scoring factor has rules with points', async () => {
    const result = await agent.run({
      pipelineId: 'test-006',
      config: {},
    });

    result.data.scoringModel.factors.forEach((factor: any) => {
      expect(factor.name).toBeTruthy();
      expect(factor.weight).toBeGreaterThan(0);
      expect(factor.rules).toBeInstanceOf(Array);
      expect(factor.rules.length).toBeGreaterThan(0);

      factor.rules.forEach((rule: any) => {
        expect(rule.condition).toBeTruthy();
        expect(rule.points).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it('has a qualification threshold', async () => {
    const result = await agent.run({
      pipelineId: 'test-007',
      config: {},
    });

    expect(result.data.scoringModel.qualificationThreshold).toBeGreaterThan(0);
    expect(result.data.scoringModel.qualificationThreshold).toBeLessThanOrEqual(100);
  });

  // Enrichment
  it('returns enrichment sources with data points', async () => {
    const result = await agent.run({
      pipelineId: 'test-008',
      config: {},
    });

    const enrichment = result.data.enrichment;
    expect(enrichment).toBeTruthy();
    expect(enrichment.sources).toBeInstanceOf(Array);
    expect(enrichment.sources.length).toBeGreaterThan(0);

    enrichment.sources.forEach((src: any) => {
      expect(src.provider).toBeTruthy();
      expect(src.dataPoints).toBeInstanceOf(Array);
      expect(src.dataPoints.length).toBeGreaterThan(0);
    });
  });

  it('has enrichment completeness score', async () => {
    const result = await agent.run({
      pipelineId: 'test-009',
      config: {},
    });

    expect(result.data.enrichment.averageCompletenessScore).toBeGreaterThan(0);
    expect(result.data.enrichment.averageCompletenessScore).toBeLessThanOrEqual(100);
  });

  // Segmentation
  it('returns lead segments with routing actions', async () => {
    const result = await agent.run({
      pipelineId: 'test-010',
      config: {},
    });

    const segments = result.data.segmentation?.segments;
    expect(segments).toBeInstanceOf(Array);
    expect(segments.length).toBeGreaterThanOrEqual(3);

    segments.forEach((seg: any) => {
      expect(seg.name).toBeTruthy();
      expect(seg.action).toBeTruthy();
      expect(typeof seg.count).toBe('number');
    });
  });

  it('has a hot leads segment routed to qualification', async () => {
    const result = await agent.run({
      pipelineId: 'test-011',
      config: {},
    });

    const segments = result.data.segmentation?.segments || [];
    const hotSegment = segments.find((s: any) => s.name.toLowerCase().includes('hot'));
    expect(hotSegment).toBeTruthy();
    expect(hotSegment.action.toLowerCase()).toContain('qualification');
  });

  // Processed Leads
  it('returns processed leads with scores', async () => {
    const result = await agent.run({
      pipelineId: 'test-012',
      config: {},
    });

    const leads = result.data.leadsProcessed;
    expect(leads).toBeInstanceOf(Array);
    expect(leads.length).toBeGreaterThan(0);

    leads.forEach((lead: any) => {
      expect(lead.name).toBeTruthy();
      expect(lead.email).toBeTruthy();
      expect(lead.company).toBeTruthy();
      expect(typeof lead.score).toBe('number');
      expect(lead.score).toBeGreaterThanOrEqual(0);
      expect(lead.score).toBeLessThanOrEqual(100);
      expect(lead.segment).toBeTruthy();
    });
  });

  it('leads have enrichment status', async () => {
    const result = await agent.run({
      pipelineId: 'test-013',
      config: {},
    });

    result.data.leadsProcessed.forEach((lead: any) => {
      expect(['complete', 'partial', 'pending']).toContain(lead.enrichmentStatus);
    });
  });

  it('leads have score breakdowns', async () => {
    const result = await agent.run({
      pipelineId: 'test-014',
      config: {},
    });

    result.data.leadsProcessed.forEach((lead: any) => {
      const breakdown = lead.scoreBreakdown;
      expect(breakdown).toBeTruthy();
      expect(typeof breakdown.companyFit).toBe('number');
      expect(typeof breakdown.budgetSignal).toBe('number');
      expect(typeof breakdown.engagement).toBe('number');
      expect(typeof breakdown.industryMatch).toBe('number');
      expect(typeof breakdown.timeline).toBe('number');

      // Sum of breakdown should equal total score
      const sum = breakdown.companyFit + breakdown.budgetSignal + breakdown.engagement + breakdown.industryMatch + breakdown.timeline;
      expect(sum).toBe(lead.score);
    });
  });

  it('leads have enriched data with company info', async () => {
    const result = await agent.run({
      pipelineId: 'test-015',
      config: {},
    });

    result.data.leadsProcessed.forEach((lead: any) => {
      const enriched = lead.enrichedData;
      expect(enriched).toBeTruthy();
      expect(enriched.companyRevenue).toBeTruthy();
      expect(typeof enriched.employeeCount).toBe('number');
      expect(enriched.techStack).toBeInstanceOf(Array);
    });
  });

  // Channel Breakdown
  it('returns channel breakdown', async () => {
    const result = await agent.run({
      pipelineId: 'test-016',
      config: {},
    });

    const channels = result.data.channelBreakdown;
    expect(channels).toBeInstanceOf(Array);
    expect(channels.length).toBeGreaterThan(0);

    channels.forEach((ch: any) => {
      expect(ch.channel).toBeTruthy();
      expect(ch.leadsCount).toBeGreaterThan(0);
      expect(typeof ch.avgScore).toBe('number');
    });
  });

  // Summary
  it('returns summary with key metrics', async () => {
    const result = await agent.run({
      pipelineId: 'test-017',
      config: {},
    });

    const summary = result.data.summary;
    expect(summary).toBeTruthy();
    expect(summary.totalLeadsProcessed).toBeGreaterThan(0);
    expect(typeof summary.avgLeadScore).toBe('number');
    expect(typeof summary.hotLeads).toBe('number');
    expect(typeof summary.warmLeads).toBe('number');
  });

  // Validation NO-GO gate
  it('skips execution when validation returns NO-GO', async () => {
    const result = await agent.run({
      pipelineId: 'test-018',
      config: {},
      previousOutputs: {
        validation: { decision: 'NO-GO' },
      },
    });

    expect(result.success).toBe(false);
    expect(result.data.skipped).toBe(true);
    expect(result.reasoning).toContain('validation rejected');
  });

  it('segment counts add up to total leads', async () => {
    const result = await agent.run({
      pipelineId: 'test-019',
      config: {},
    });

    const segments = result.data.segmentation?.segments || [];
    const segmentTotal = segments.reduce((sum: number, s: any) => sum + (s.count || 0), 0);
    const totalLeads = result.data.leadsProcessed?.length || result.data.summary?.totalLeadsProcessed || 0;
    expect(segmentTotal).toBe(totalLeads);
  });
});
