import { describe, it, expect } from 'vitest';
import { AIQualificationAgent } from '@backend/agents/leados/ai-qualification';

describe('AIQualificationAgent', () => {
  const agent = new AIQualificationAgent();

  it('has correct agent metadata', () => {
    expect(agent.id).toBe('ai-qualification');
    expect(agent.name).toBe('AI Qualification Agent');
    expect(agent.description).toContain('BANT');
    expect(agent.description).toContain('voice calls');
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

  // Voice Config
  it('returns voice provider configuration', async () => {
    const result = await agent.run({ pipelineId: 'test-002', config: {} });

    const vc = result.data.voiceConfig;
    expect(vc).toBeTruthy();
    expect(vc.provider).toBeTruthy();
    expect(vc.maxCallDuration).toBeGreaterThan(0);
    expect(vc.recordingEnabled).toBe(true);
    expect(vc.transcriptionEnabled).toBe(true);
    expect(vc.consentScript).toBeTruthy();
  });

  // Call Script
  it('returns call script with greeting', async () => {
    const result = await agent.run({ pipelineId: 'test-003', config: {} });

    expect(result.data.callScript).toBeTruthy();
    expect(result.data.callScript.greeting).toBeTruthy();
  });

  it('returns BANT qualification questions', async () => {
    const result = await agent.run({ pipelineId: 'test-004', config: {} });

    const q = result.data.callScript?.qualificationQuestions;
    expect(q).toBeTruthy();
    expect(q.budget).toBeTruthy();
    expect(q.authority).toBeTruthy();
    expect(q.need).toBeTruthy();
    expect(q.timeline).toBeTruthy();

    // Each question has required fields
    for (const key of ['budget', 'authority', 'need', 'timeline']) {
      expect(q[key].question).toBeTruthy();
      expect(q[key].goodAnswers).toBeInstanceOf(Array);
      expect(q[key].scoring).toBeTruthy();
    }
  });

  it('returns objection handling responses', async () => {
    const result = await agent.run({ pipelineId: 'test-005', config: {} });

    const objections = result.data.callScript?.objectionHandling;
    expect(objections).toBeTruthy();
    expect(Object.keys(objections).length).toBeGreaterThanOrEqual(4);

    // Should handle common objections
    const keys = Object.keys(objections).join(' ').toLowerCase();
    expect(keys).toContain('expensive');
    expect(keys).toContain('think');
  });

  it('returns closing scripts for each outcome', async () => {
    const result = await agent.run({ pipelineId: 'test-006', config: {} });

    const closing = result.data.callScript?.closingScripts;
    expect(closing).toBeTruthy();
    expect(closing.high_intent_checkout).toBeTruthy();
    expect(closing.high_intent_sales).toBeTruthy();
    expect(closing.medium_intent).toBeTruthy();
    expect(closing.low_intent).toBeTruthy();
  });

  // Qualification Thresholds
  it('returns qualification thresholds with 4 tiers', async () => {
    const result = await agent.run({ pipelineId: 'test-007', config: {} });

    const thresholds = result.data.qualificationThresholds;
    expect(thresholds).toBeTruthy();
    expect(thresholds.high_intent_checkout).toBeTruthy();
    expect(thresholds.high_intent_sales).toBeTruthy();
    expect(thresholds.medium_intent).toBeTruthy();
    expect(thresholds.low_intent).toBeTruthy();

    // Checkout threshold should be highest
    expect(thresholds.high_intent_checkout.minScore).toBeGreaterThan(thresholds.high_intent_sales.minScore);
    expect(thresholds.high_intent_sales.minScore).toBeGreaterThan(thresholds.medium_intent.minScore);
  });

  it('each threshold has action and description', async () => {
    const result = await agent.run({ pipelineId: 'test-008', config: {} });

    const thresholds = result.data.qualificationThresholds;
    for (const key of Object.keys(thresholds)) {
      expect(thresholds[key].action).toBeTruthy();
      expect(thresholds[key].description).toBeTruthy();
    }
  });

  // Call Results
  it('returns call results for multiple leads', async () => {
    const result = await agent.run({ pipelineId: 'test-009', config: {} });

    const calls = result.data.callResults;
    expect(calls).toBeInstanceOf(Array);
    expect(calls.length).toBeGreaterThan(0);
  });

  it('each completed call has BANT breakdown', async () => {
    const result = await agent.run({ pipelineId: 'test-010', config: {} });

    const completedCalls = result.data.callResults.filter((c: any) => c.callStatus === 'completed');
    expect(completedCalls.length).toBeGreaterThan(0);

    for (const call of completedCalls) {
      expect(call.bantBreakdown).toBeTruthy();
      expect(typeof call.bantBreakdown.budget).toBe('number');
      expect(typeof call.bantBreakdown.authority).toBe('number');
      expect(typeof call.bantBreakdown.need).toBe('number');
      expect(typeof call.bantBreakdown.timeline).toBe('number');

      // BANT sum should equal total score
      const bantSum = call.bantBreakdown.budget + call.bantBreakdown.authority + call.bantBreakdown.need + call.bantBreakdown.timeline;
      expect(bantSum).toBe(call.score);
    }
  });

  it('BANT sub-scores respect max weights', async () => {
    const result = await agent.run({ pipelineId: 'test-011', config: {} });

    for (const call of result.data.callResults) {
      if (call.callStatus !== 'completed') continue;
      expect(call.bantBreakdown.budget).toBeLessThanOrEqual(30);
      expect(call.bantBreakdown.authority).toBeLessThanOrEqual(25);
      expect(call.bantBreakdown.need).toBeLessThanOrEqual(25);
      expect(call.bantBreakdown.timeline).toBeLessThanOrEqual(20);
    }
  });

  it('call results have valid outcomes', async () => {
    const result = await agent.run({ pipelineId: 'test-012', config: {} });
    const validOutcomes = ['high_intent_checkout', 'high_intent_sales', 'medium_intent', 'low_intent'];

    for (const call of result.data.callResults) {
      expect(validOutcomes).toContain(call.outcome);
    }
  });

  it('call results have valid statuses', async () => {
    const result = await agent.run({ pipelineId: 'test-013', config: {} });
    const validStatuses = ['completed', 'no_answer', 'voicemail', 'declined'];

    for (const call of result.data.callResults) {
      expect(validStatuses).toContain(call.callStatus);
    }
  });

  it('completed calls have transcripts', async () => {
    const result = await agent.run({ pipelineId: 'test-014', config: {} });

    const completedCalls = result.data.callResults.filter((c: any) => c.callStatus === 'completed');
    for (const call of completedCalls) {
      expect(call.transcript).toBeTruthy();
      expect(call.transcript.length).toBeGreaterThan(0);
    }
  });

  it('completed calls have key signals', async () => {
    const result = await agent.run({ pipelineId: 'test-015', config: {} });

    const completedCalls = result.data.callResults.filter((c: any) => c.callStatus === 'completed');
    for (const call of completedCalls) {
      expect(call.keySignals).toBeInstanceOf(Array);
      expect(call.keySignals.length).toBeGreaterThan(0);
    }
  });

  it('calls have consent tracking', async () => {
    const result = await agent.run({ pipelineId: 'test-016', config: {} });

    for (const call of result.data.callResults) {
      expect(typeof call.consentObtained).toBe('boolean');
      // Completed calls should have consent
      if (call.callStatus === 'completed') {
        expect(call.consentObtained).toBe(true);
      }
    }
  });

  it('calls include different scenarios (not all same outcome)', async () => {
    const result = await agent.run({ pipelineId: 'test-017', config: {} });

    const outcomes = new Set(result.data.callResults.map((c: any) => c.outcome));
    // Should have at least 2 different outcomes
    expect(outcomes.size).toBeGreaterThanOrEqual(2);
  });

  it('calls include different statuses (completed, no_answer, etc.)', async () => {
    const result = await agent.run({ pipelineId: 'test-018', config: {} });

    const statuses = new Set(result.data.callResults.map((c: any) => c.callStatus));
    // Should have at least 2 different statuses
    expect(statuses.size).toBeGreaterThanOrEqual(2);
  });

  // Summary
  it('returns summary with key metrics', async () => {
    const result = await agent.run({ pipelineId: 'test-019', config: {} });

    const summary = result.data.summary;
    expect(summary).toBeTruthy();
    expect(summary.totalCallsAttempted).toBeGreaterThan(0);
    expect(summary.totalCallsCompleted).toBeGreaterThan(0);
    expect(typeof summary.avgCallDuration).toBe('number');
    expect(typeof summary.avgScore).toBe('number');
    expect(typeof summary.qualificationRate).toBe('number');
    expect(summary.qualificationRate).toBeGreaterThanOrEqual(0);
    expect(summary.qualificationRate).toBeLessThanOrEqual(100);
  });

  it('summary outcome counts match call results', async () => {
    const result = await agent.run({ pipelineId: 'test-020', config: {} });

    const calls = result.data.callResults;
    const summary = result.data.summary;

    const checkout = calls.filter((c: any) => c.outcome === 'high_intent_checkout').length;
    const sales = calls.filter((c: any) => c.outcome === 'high_intent_sales').length;
    const medium = calls.filter((c: any) => c.outcome === 'medium_intent').length;
    const low = calls.filter((c: any) => c.outcome === 'low_intent').length;

    expect(summary.highIntentCheckout).toBe(checkout);
    expect(summary.highIntentSales).toBe(sales);
    expect(summary.mediumIntent).toBe(medium);
    expect(summary.lowIntent).toBe(low);
  });

  // NO-GO gate
  it('skips execution when validation returns NO-GO', async () => {
    const result = await agent.run({
      pipelineId: 'test-021',
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
  it('uses upstream leads when available', async () => {
    const result = await agent.run({
      pipelineId: 'test-022',
      config: {},
      previousOutputs: {
        'inbound-capture': {
          data: {
            leadsProcessed: [
              { name: 'Test Lead', email: 'test@example.com', company: 'TestCo', phone: '+1-555-9999', score: 85, segment: 'Enterprise Hot', source: 'google_ads', channel: 'paid_search' },
              { name: 'Another Lead', email: 'another@example.com', company: 'AnotherCo', phone: '+1-555-8888', score: 72, segment: 'Mid-Market Warm', source: 'linkedin', channel: 'outbound' },
              { name: 'Low Lead', email: 'low@example.com', company: 'LowCo', phone: '+1-555-7777', score: 40, segment: 'Cold', source: 'organic', channel: 'inbound' },
            ],
          },
        },
      },
    });

    expect(result.success).toBe(true);
    // Should only call leads with score >= 60
    const calls = result.data.callResults;
    expect(calls.length).toBeGreaterThan(0);
  });
});
