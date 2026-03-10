import { describe, it, expect } from 'vitest';
import { CRMHygieneAgent } from '@backend/agents/leados/crm-hygiene';

describe('CRMHygieneAgent', () => {
  const agent = new CRMHygieneAgent();

  it('has correct agent metadata', () => {
    expect(agent.id).toBe('crm-hygiene');
    expect(agent.name).toBe('CRM & Data Hygiene Agent');
    expect(agent.description).toContain('Deduplication');
    expect(agent.description).toContain('normalization');
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

  // Deduplication
  it('returns deduplication with accuracy > 99%', async () => {
    const result = await agent.run({ pipelineId: 'test-002', config: {} });

    const dedup = result.data.deduplication;
    expect(dedup).toBeTruthy();
    expect(typeof dedup.totalRecords).toBe('number');
    expect(typeof dedup.duplicatesFound).toBe('number');
    expect(typeof dedup.duplicatesRemoved).toBe('number');
    expect(dedup.accuracy).toBeGreaterThan(99);
    expect(dedup.mergeStrategy).toBeTruthy();
  });

  it('has matching criteria with weights', async () => {
    const result = await agent.run({ pipelineId: 'test-003', config: {} });

    const criteria = result.data.deduplication.matchingCriteria;
    expect(criteria).toBeInstanceOf(Array);
    expect(criteria.length).toBeGreaterThanOrEqual(3);

    for (const mc of criteria) {
      expect(mc.field).toBeTruthy();
      expect(mc.type).toBeTruthy();
      expect(typeof mc.weight).toBe('number');
      expect(mc.weight).toBeGreaterThan(0);
      expect(mc.weight).toBeLessThanOrEqual(1);
    }
  });

  it('has duplicate examples with confidence scores', async () => {
    const result = await agent.run({ pipelineId: 'test-004', config: {} });

    const examples = result.data.deduplication.duplicateExamples;
    expect(examples).toBeInstanceOf(Array);
    expect(examples.length).toBeGreaterThan(0);

    for (const ex of examples) {
      expect(ex.kept).toBeTruthy();
      expect(ex.removed).toBeTruthy();
      expect(ex.matchType).toBeTruthy();
      expect(typeof ex.confidence).toBe('number');
      expect(ex.confidence).toBeGreaterThan(80);
    }
  });

  // Normalization
  it('returns normalization with field changes', async () => {
    const result = await agent.run({ pipelineId: 'test-005', config: {} });

    const norm = result.data.normalization;
    expect(norm).toBeTruthy();
    expect(typeof norm.recordsNormalized).toBe('number');
    expect(norm.fieldsStandardized).toBeInstanceOf(Array);
    expect(norm.fieldsStandardized.length).toBeGreaterThanOrEqual(4);
  });

  it('has normalization examples with before/after', async () => {
    const result = await agent.run({ pipelineId: 'test-006', config: {} });

    const examples = result.data.normalization.examples;
    expect(examples).toBeInstanceOf(Array);
    expect(examples.length).toBeGreaterThanOrEqual(4);

    for (const ex of examples) {
      expect(ex.field).toBeTruthy();
      expect(ex.before).toBeTruthy();
      expect(ex.after).toBeTruthy();
      expect(ex.before).not.toBe(ex.after);
    }
  });

  // Validation
  it('returns validation with pass rate > 95%', async () => {
    const result = await agent.run({ pipelineId: 'test-007', config: {} });

    const val = result.data.validation;
    expect(val).toBeTruthy();
    expect(typeof val.totalValidated).toBe('number');
    expect(typeof val.validRecords).toBe('number');
    expect(typeof val.invalidRecords).toBe('number');
    expect(val.validationRate).toBeGreaterThan(95);
  });

  it('lists invalid emails with reasons', async () => {
    const result = await agent.run({ pipelineId: 'test-008', config: {} });

    const invalidEmails = result.data.validation.invalidEmails;
    expect(invalidEmails).toBeInstanceOf(Array);
    expect(invalidEmails.length).toBeGreaterThan(0);

    for (const e of invalidEmails) {
      expect(e.email).toBeTruthy();
      expect(e.reason).toBeTruthy();
    }
  });

  it('lists invalid phones with reasons', async () => {
    const result = await agent.run({ pipelineId: 'test-009', config: {} });

    const invalidPhones = result.data.validation.invalidPhones;
    expect(invalidPhones).toBeInstanceOf(Array);
    expect(invalidPhones.length).toBeGreaterThan(0);

    for (const p of invalidPhones) {
      expect(p.phone).toBeTruthy();
      expect(p.reason).toBeTruthy();
    }
  });

  it('tracks missing required fields', async () => {
    const result = await agent.run({ pipelineId: 'test-010', config: {} });

    const missing = result.data.validation.missingRequiredFields;
    expect(missing).toBeTruthy();
    expect(typeof missing.company).toBe('number');
    expect(typeof missing.phone).toBe('number');
    expect(typeof missing.email).toBe('number');
    expect(typeof missing.name).toBe('number');
  });

  // Enrichment
  it('returns enrichment with sources and coverage', async () => {
    const result = await agent.run({ pipelineId: 'test-011', config: {} });

    const enrich = result.data.enrichment;
    expect(enrich).toBeTruthy();
    expect(typeof enrich.recordsEnriched).toBe('number');
    expect(typeof enrich.enrichmentRate).toBe('number');
    expect(enrich.sources).toBeInstanceOf(Array);
    expect(enrich.sources.length).toBeGreaterThanOrEqual(2);
    expect(enrich.fieldsAdded).toBeInstanceOf(Array);
    expect(enrich.fieldsAdded.length).toBeGreaterThanOrEqual(5);
  });

  it('has enrichment breakdown per field', async () => {
    const result = await agent.run({ pipelineId: 'test-012', config: {} });

    const breakdown = result.data.enrichment.breakdown;
    expect(breakdown).toBeTruthy();
    expect(breakdown.employee_count).toBeTruthy();
    expect(typeof breakdown.employee_count.enriched).toBe('number');
    expect(breakdown.employee_count.source).toBeTruthy();
    expect(breakdown.employee_count.coverage).toBeTruthy();
  });

  // Lifecycle Updates
  it('returns lifecycle updates with valid stages', async () => {
    const result = await agent.run({ pipelineId: 'test-013', config: {} });

    const lifecycle = result.data.lifecycleUpdates;
    expect(lifecycle).toBeInstanceOf(Array);
    expect(lifecycle.length).toBeGreaterThanOrEqual(5);

    const validStages = result.data.validStages || ['new', 'contacted', 'engaged', 'qualified', 'booked', 'won', 'churned'];

    for (const update of lifecycle) {
      expect(update.leadId).toBeTruthy();
      expect(validStages).toContain(update.from);
      expect(validStages).toContain(update.to);
      expect(update.reason).toBeTruthy();
      expect(update.timestamp).toBeTruthy();
    }
  });

  it('includes a won transition', async () => {
    const result = await agent.run({ pipelineId: 'test-014', config: {} });

    const won = result.data.lifecycleUpdates.filter((u: any) => u.to === 'won');
    expect(won.length).toBeGreaterThan(0);
  });

  it('includes a churned transition', async () => {
    const result = await agent.run({ pipelineId: 'test-015', config: {} });

    const churned = result.data.lifecycleUpdates.filter((u: any) => u.to === 'churned');
    expect(churned.length).toBeGreaterThan(0);
  });

  // Interactions
  it('returns interactions with types and channels', async () => {
    const result = await agent.run({ pipelineId: 'test-016', config: {} });

    const interactions = result.data.interactions;
    expect(interactions).toBeInstanceOf(Array);
    expect(interactions.length).toBeGreaterThanOrEqual(5);

    for (const item of interactions) {
      expect(item.type).toBeTruthy();
      expect(item.leadId).toBeTruthy();
      expect(item.channel).toBeTruthy();
      expect(item.summary).toBeTruthy();
      expect(item.timestamp).toBeTruthy();
    }
  });

  it('has interaction counts by type', async () => {
    const result = await agent.run({ pipelineId: 'test-017', config: {} });

    const byType = result.data.interactionsByType;
    expect(byType).toBeTruthy();
    expect(typeof byType.email_sent).toBe('number');
    expect(typeof byType.email_opened).toBe('number');
    expect(typeof byType.page_visit).toBe('number');

    expect(typeof result.data.totalInteractions).toBe('number');
    expect(result.data.totalInteractions).toBeGreaterThan(0);
  });

  // Compliance
  it('returns GDPR compliance status', async () => {
    const result = await agent.run({ pipelineId: 'test-018', config: {} });

    const gdpr = result.data.compliance?.gdpr;
    expect(gdpr).toBeTruthy();
    expect(gdpr.compliant).toBe(true);
    expect(typeof gdpr.consentRecordsTracked).toBe('number');
    expect(typeof gdpr.erasureRequestsProcessed).toBe('number');
    expect(gdpr.erasureRequestsPending).toBe(0);
  });

  it('returns CAN-SPAM compliance with zero pending unsubscribes', async () => {
    const result = await agent.run({ pipelineId: 'test-019', config: {} });

    const canSpam = result.data.compliance?.canSpam;
    expect(canSpam).toBeTruthy();
    expect(canSpam.compliant).toBe(true);
    expect(canSpam.unsubscribesPending).toBe(0);
  });

  it('returns TCPA compliance with DNC check', async () => {
    const result = await agent.run({ pipelineId: 'test-020', config: {} });

    const tcpa = result.data.compliance?.tcpa;
    expect(tcpa).toBeTruthy();
    expect(tcpa.compliant).toBe(true);
    expect(tcpa.dncListChecked).toBe(true);
  });

  it('has audit trail enabled', async () => {
    const result = await agent.run({ pipelineId: 'test-021', config: {} });

    const audit = result.data.compliance?.auditTrail;
    expect(audit).toBeTruthy();
    expect(audit.enabled).toBe(true);
    expect(typeof audit.totalEntries).toBe('number');
    expect(audit.totalEntries).toBeGreaterThan(0);
  });

  // Data Quality
  it('returns data quality score > 90', async () => {
    const result = await agent.run({ pipelineId: 'test-022', config: {} });

    expect(typeof result.data.dataQualityScore).toBe('number');
    expect(result.data.dataQualityScore).toBeGreaterThan(90);
  });

  it('has data quality breakdown dimensions', async () => {
    const result = await agent.run({ pipelineId: 'test-023', config: {} });

    const breakdown = result.data.dataQualityBreakdown;
    expect(breakdown).toBeTruthy();
    expect(typeof breakdown.completeness).toBe('number');
    expect(typeof breakdown.accuracy).toBe('number');
    expect(typeof breakdown.consistency).toBe('number');
    expect(typeof breakdown.timeliness).toBe('number');
    expect(typeof breakdown.uniqueness).toBe('number');
  });

  // Summary
  it('returns summary with all metrics', async () => {
    const result = await agent.run({ pipelineId: 'test-024', config: {} });

    const summary = result.data.summary;
    expect(summary).toBeTruthy();
    expect(typeof summary.totalRecords).toBe('number');
    expect(typeof summary.duplicatesRemoved).toBe('number');
    expect(typeof summary.fieldsNormalized).toBe('number');
    expect(typeof summary.recordsEnriched).toBe('number');
    expect(typeof summary.lifecycleTransitions).toBe('number');
    expect(typeof summary.interactionsLogged).toBe('number');
    expect(typeof summary.dataQualityScore).toBe('number');
    expect(summary.complianceStatus).toBeTruthy();
  });

  it('summary lifecycle transitions matches lifecycle updates length', async () => {
    const result = await agent.run({ pipelineId: 'test-025', config: {} });

    expect(result.data.summary.lifecycleTransitions).toBe(result.data.lifecycleUpdates.length);
  });

  // NO-GO gate
  it('skips execution when validation returns NO-GO', async () => {
    const result = await agent.run({
      pipelineId: 'test-026',
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
