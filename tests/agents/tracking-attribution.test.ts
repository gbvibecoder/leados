import { describe, it, expect } from 'vitest';
import { TrackingAttributionAgent } from '@backend/agents/leados/tracking-attribution';

describe('TrackingAttributionAgent', () => {
  const agent = new TrackingAttributionAgent();

  it('has correct agent metadata', () => {
    expect(agent.id).toBe('tracking-attribution');
    expect(agent.name).toBe('Tracking & Attribution Agent');
    expect(agent.description).toContain('GTM');
    expect(agent.description).toContain('attribution');
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

  // GTM Setup
  it('returns GTM container with tags, triggers, variables', async () => {
    const result = await agent.run({ pipelineId: 'test-002', config: {} });

    const gtm = result.data.trackingSetup?.googleTagManager;
    expect(gtm).toBeTruthy();
    expect(gtm.containerId).toBeTruthy();
    expect(gtm.tags).toBeInstanceOf(Array);
    expect(gtm.tags.length).toBeGreaterThanOrEqual(3);
    expect(gtm.triggers).toBeInstanceOf(Array);
    expect(gtm.triggers.length).toBeGreaterThanOrEqual(3);
    expect(gtm.variables).toBeInstanceOf(Array);
    expect(gtm.variables.length).toBeGreaterThanOrEqual(5);
  });

  it('GTM tags have name, type, and trigger', async () => {
    const result = await agent.run({ pipelineId: 'test-003', config: {} });

    for (const tag of result.data.trackingSetup.googleTagManager.tags) {
      expect(tag.name).toBeTruthy();
      expect(tag.type).toBeTruthy();
      expect(tag.trigger).toBeTruthy();
    }
  });

  // Meta Pixel
  it('returns Meta Pixel setup with events', async () => {
    const result = await agent.run({ pipelineId: 'test-004', config: {} });

    const pixel = result.data.trackingSetup?.metaPixel;
    expect(pixel).toBeTruthy();
    expect(pixel.pixelId).toBeTruthy();
    expect(pixel.standardEvents).toBeInstanceOf(Array);
    expect(pixel.standardEvents).toContain('PageView');
    expect(pixel.standardEvents).toContain('Lead');
    expect(pixel.customEvents).toBeInstanceOf(Array);
    expect(pixel.customEvents.length).toBeGreaterThan(0);
    expect(pixel.capiEnabled).toBe(true);
  });

  it('has custom audiences for retargeting', async () => {
    const result = await agent.run({ pipelineId: 'test-005', config: {} });

    const audiences = result.data.trackingSetup.metaPixel?.customAudiences;
    expect(audiences).toBeInstanceOf(Array);
    expect(audiences.length).toBeGreaterThanOrEqual(3);

    for (const audience of audiences) {
      expect(audience.name).toBeTruthy();
      expect(audience.basedOn).toBeTruthy();
      expect(typeof audience.lookbackDays).toBe('number');
    }
  });

  // Google Ads Conversion
  it('returns Google Ads conversion actions', async () => {
    const result = await agent.run({ pipelineId: 'test-006', config: {} });

    const gads = result.data.trackingSetup?.googleAdsConversion;
    expect(gads).toBeTruthy();
    expect(gads.conversionId).toBeTruthy();
    expect(gads.conversionActions).toBeInstanceOf(Array);
    expect(gads.conversionActions.length).toBeGreaterThanOrEqual(3);
    expect(gads.enhancedConversions).toBe(true);
  });

  it('conversion actions have value and window', async () => {
    const result = await agent.run({ pipelineId: 'test-007', config: {} });

    for (const action of result.data.trackingSetup.googleAdsConversion.conversionActions) {
      expect(action.name).toBeTruthy();
      expect(action.category).toBeTruthy();
      expect(action.value !== undefined).toBe(true);
      expect(action.clickThroughWindow).toBeTruthy();
    }
  });

  // CRM Attribution
  it('returns CRM attribution with position-based model', async () => {
    const result = await agent.run({ pipelineId: 'test-008', config: {} });

    const crm = result.data.trackingSetup?.crmAttribution;
    expect(crm).toBeTruthy();
    expect(crm.model).toBeTruthy();
    expect(typeof crm.firstTouchWeight).toBe('number');
    expect(typeof crm.lastTouchWeight).toBe('number');
    expect(typeof crm.middleTouchWeight).toBe('number');

    // Weights should sum to 100
    expect(crm.firstTouchWeight + crm.lastTouchWeight + crm.middleTouchWeight).toBe(100);
  });

  it('CRM tracks UTM parameters', async () => {
    const result = await agent.run({ pipelineId: 'test-009', config: {} });

    const fields = result.data.trackingSetup.crmAttribution.trackingFields;
    expect(fields).toBeInstanceOf(Array);
    expect(fields).toContain('utm_source');
    expect(fields).toContain('utm_campaign');
    expect(fields).toContain('gclid');
  });

  // Attribution Model
  it('has attribution model and windows', async () => {
    const result = await agent.run({ pipelineId: 'test-010', config: {} });

    expect(result.data.attributionModel).toBeTruthy();
    expect(result.data.attributionWindows).toBeTruthy();
    expect(result.data.attributionWindows.clickThrough).toBeTruthy();
    expect(result.data.attributionWindows.viewThrough).toBeTruthy();
  });

  // Channel Attribution
  it('returns channel attribution with ROAS', async () => {
    const result = await agent.run({ pipelineId: 'test-011', config: {} });

    const channels = result.data.channelAttribution;
    expect(channels).toBeInstanceOf(Array);
    expect(channels.length).toBeGreaterThanOrEqual(3);

    for (const ch of channels) {
      expect(ch.channel).toBeTruthy();
      expect(typeof ch.leadsAttributed).toBe('number');
      expect(typeof ch.spend).toBe('number');
      expect(typeof ch.revenue).toBe('number');
      expect(typeof ch.roas).toBe('number');
    }
  });

  // Lead Journeys
  it('returns lead journeys with touchpoints', async () => {
    const result = await agent.run({ pipelineId: 'test-012', config: {} });

    const journeys = result.data.leadJourneys;
    expect(journeys).toBeInstanceOf(Array);
    expect(journeys.length).toBeGreaterThan(0);

    for (const journey of journeys) {
      expect(journey.leadName).toBeTruthy();
      expect(journey.touchpoints).toBeInstanceOf(Array);
      expect(journey.touchpoints.length).toBeGreaterThan(0);
      expect(typeof journey.totalTouchpoints).toBe('number');
      expect(typeof journey.daysToConvert).toBe('number');
      expect(journey.convertedAction).toBeTruthy();
    }
  });

  it('touchpoints have credit that sums to 100', async () => {
    const result = await agent.run({ pipelineId: 'test-013', config: {} });

    for (const journey of result.data.leadJourneys) {
      const totalCredit = journey.touchpoints.reduce((s: number, tp: any) => s + tp.creditPercent, 0);
      expect(totalCredit).toBe(100);

      for (const tp of journey.touchpoints) {
        expect(tp.channel).toBeTruthy();
        expect(tp.action).toBeTruthy();
        expect(tp.timestamp).toBeTruthy();
        expect(typeof tp.creditPercent).toBe('number');
      }
    }
  });

  // Data Layer Events
  it('returns data layer events', async () => {
    const result = await agent.run({ pipelineId: 'test-014', config: {} });

    const events = result.data.dataLayerEvents;
    expect(events).toBeInstanceOf(Array);
    expect(events.length).toBeGreaterThanOrEqual(3);

    for (const event of events) {
      expect(event.event).toBeTruthy();
      expect(event.parameters).toBeInstanceOf(Array);
    }
  });

  // UTM Strategy
  it('returns UTM strategy with generated links', async () => {
    const result = await agent.run({ pipelineId: 'test-015', config: {} });

    const utm = result.data.utmStrategy;
    expect(utm).toBeTruthy();
    expect(utm.generatedLinks).toBeInstanceOf(Array);
    expect(utm.generatedLinks.length).toBeGreaterThanOrEqual(3);

    for (const link of utm.generatedLinks) {
      expect(link.campaign).toBeTruthy();
      expect(link.channel).toBeTruthy();
      expect(link.url).toContain('utm_source');
    }
  });

  // Validation Checklist
  it('returns validation checklist all passed', async () => {
    const result = await agent.run({ pipelineId: 'test-016', config: {} });

    const checks = result.data.validationChecklist;
    expect(checks).toBeInstanceOf(Array);
    expect(checks.length).toBeGreaterThanOrEqual(8);

    for (const check of checks) {
      expect(check.check).toBeTruthy();
      expect(['passed', 'failed', 'pending']).toContain(check.status);
    }

    const passedCount = checks.filter((c: any) => c.status === 'passed').length;
    expect(passedCount).toBe(checks.length);
  });

  // Summary
  it('returns summary with key metrics', async () => {
    const result = await agent.run({ pipelineId: 'test-017', config: {} });

    const summary = result.data.summary;
    expect(summary).toBeTruthy();
    expect(summary.totalEventsTracked).toBeGreaterThan(0);
    expect(summary.totalLeadsAttributed).toBeGreaterThan(0);
    expect(typeof summary.avgTouchpointsPerLead).toBe('number');
    expect(typeof summary.avgDaysToConvert).toBe('number');
    expect(summary.topChannel).toBeTruthy();
    expect(typeof summary.overallROAS).toBe('number');
    expect(summary.trackingCoverage).toBeGreaterThanOrEqual(90);
  });

  // NO-GO gate
  it('skips execution when validation returns NO-GO', async () => {
    const result = await agent.run({
      pipelineId: 'test-018',
      config: {},
      previousOutputs: {
        validation: { data: { decision: 'NO-GO' } },
      },
    });

    expect(result.success).toBe(false);
    expect(result.data.skipped).toBe(true);
    expect(result.reasoning).toContain('validation rejected');
  });
});
