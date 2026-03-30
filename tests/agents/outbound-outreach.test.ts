import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutboundOutreachAgent } from '@backend/agents/leados/outbound-outreach';

// ── Mock integrations for real data pipeline tests ──────────────────
vi.mock('../../backend/integrations/apollo', () => ({
  isApolloAvailable: vi.fn(() => false),
  searchProspects: vi.fn(),
}));
vi.mock('../../backend/integrations/instantly', () => ({
  isInstantlyAvailable: vi.fn(() => false),
  createCampaign: vi.fn(),
  addLeadsToCampaign: vi.fn(),
  launchCampaign: vi.fn(),
}));
vi.mock('../../backend/integrations/smartlead', () => ({
  isSmartLeadAvailable: vi.fn(() => false),
  createCampaign: vi.fn(),
  addLeadsToCampaign: vi.fn(),
  addSequenceSteps: vi.fn(),
  setCampaignSchedule: vi.fn(),
  launchCampaign: vi.fn(),
}));
vi.mock('../../backend/integrations/phantombuster', () => ({
  isPhantombusterAvailable: vi.fn(() => false),
  isSearchAvailable: vi.fn(() => false),
  isConnectAvailable: vi.fn(() => false),
  isMessageAvailable: vi.fn(() => false),
  searchProfiles: vi.fn(),
  sendConnectionRequests: vi.fn(),
  sendMessages: vi.fn(),
}));
vi.mock('../../backend/integrations/hubspot', () => ({
  isHubSpotAvailable: vi.fn(() => false),
  upsertContact: vi.fn(),
}));

const apolloMod = await import('../../backend/integrations/apollo');
const instantlyMod = await import('../../backend/integrations/instantly');
const smartleadMod = await import('../../backend/integrations/smartlead');
const phantombusterMod = await import('../../backend/integrations/phantombuster');
const hubspotMod = await import('../../backend/integrations/hubspot');

const MOCK_APOLLO_PROSPECTS = [
  { firstName: 'Alice', lastName: 'Chen', email: 'alice@acme.com', company: 'Acme Corp', jobTitle: 'VP of Marketing', industry: 'SaaS', companySize: '200 employees', linkedInUrl: 'https://linkedin.com/in/alicechen', phone: '+14155551234' },
  { firstName: 'Bob', lastName: 'Smith', email: 'bob@globex.com', company: 'Globex Inc', jobTitle: 'Head of Growth', industry: 'Fintech', companySize: '50 employees', linkedInUrl: 'https://linkedin.com/in/bobsmith', phone: '+14155555678' },
  { firstName: 'Carol', lastName: 'Lee', email: 'carol@initech.com', company: 'Initech', jobTitle: 'CMO', industry: 'Healthcare', companySize: '500 employees', linkedInUrl: 'https://linkedin.com/in/carollee', phone: '' },
];

const MOCK_LINKEDIN_PROFILES = [
  { linkedInUrl: 'https://linkedin.com/in/alicechen', firstName: 'Alice', lastName: 'Chen', headline: 'VP Marketing at Acme', company: 'Acme Corp', jobTitle: 'VP of Marketing', location: 'San Francisco', connectionDegree: '2nd' },
  { linkedInUrl: 'https://linkedin.com/in/bobsmith', firstName: 'Bob', lastName: 'Smith', headline: 'Head of Growth at Globex', company: 'Globex Inc', jobTitle: 'Head of Growth', location: 'New York', connectionDegree: '3rd' },
];

describe('OutboundOutreachAgent', () => {
  const agent = new OutboundOutreachAgent();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all integrations unavailable (fallback mode)
    vi.mocked(apolloMod.isApolloAvailable).mockReturnValue(false);
    vi.mocked(instantlyMod.isInstantlyAvailable).mockReturnValue(false);
    vi.mocked(smartleadMod.isSmartLeadAvailable).mockReturnValue(false);
    vi.mocked(phantombusterMod.isPhantombusterAvailable).mockReturnValue(false);
    vi.mocked(phantombusterMod.isSearchAvailable).mockReturnValue(false);
    vi.mocked(phantombusterMod.isConnectAvailable).mockReturnValue(false);
    vi.mocked(phantombusterMod.isMessageAvailable).mockReturnValue(false);
    vi.mocked(hubspotMod.isHubSpotAvailable).mockReturnValue(false);
  });

  // ═══════════════════════════════════════════════════════════════
  // BASIC AGENT TESTS
  // ═══════════════════════════════════════════════════════════════

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
    // prospectCount is 0 without Apollo API — only real prospects are counted
    expect(coldEmail.prospectCount).toBeDefined();

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
    // targetProfiles = icpTitles.length * 25 (default 4 titles × 25 = 100)
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

  it('returns projected metrics zeroed (data integrity — no campaigns sent yet)', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-008',
      config: {},
    });

    const metrics = result.data.projectedMetrics;
    expect(metrics).toBeTruthy();
    // All projected metrics must be 0 — no emails sent, no connections made yet
    expect(metrics.emailsSent).toBe(0);
    expect(metrics.expectedReplies).toBe(0);
    expect(metrics.expectedMeetings).toBe(0);
    expect(metrics.linkedInConnections).toBe(0);
    expect(metrics.totalMeetingsFromOutbound).toBe(0);
  });

  it('returns empty prospect list without Apollo API (data integrity — no fabricated prospects)', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-009',
      config: {},
    });

    const prospects = result.data.prospectList;
    expect(prospects).toBeInstanceOf(Array);
    // Without Apollo API key, prospect list must be empty — never fabricate people
    expect(prospects.length).toBe(0);
  });

  it('skips execution when validation returns NO-GO', async () => {
    const result = await agent.run({
      pipelineId: 'test-pipeline-010',
      config: {},
      previousOutputs: {
        validation: { decision: 'NO-GO' },
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
      expect(seq.template).toMatch(/\{[a-zA-Z_]+\}/);
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

  // ═══════════════════════════════════════════════════════════════
  // REAL DATA PIPELINE TESTS — Cold Email Sub-Agent
  // ═══════════════════════════════════════════════════════════════

  it('fetches real prospects from Apollo and populates prospectList', async () => {
    vi.mocked(apolloMod.isApolloAvailable).mockReturnValue(true);
    vi.mocked(apolloMod.searchProspects).mockResolvedValue(MOCK_APOLLO_PROSPECTS);

    const result = await agent.run({
      pipelineId: 'test-real-001',
      config: { niche: 'SaaS' },
    });

    expect(result.success).toBe(true);
    expect(apolloMod.searchProspects).toHaveBeenCalledWith(
      expect.objectContaining({ jobTitles: expect.any(Array), limit: 25 })
    );

    const prospects = result.data.prospectList;
    expect(prospects).toHaveLength(3);
    expect(prospects[0].firstName).toBe('Alice');
    expect(prospects[0].email).toBe('alice@acme.com');
    expect(prospects[0].company).toBe('Acme Corp');
    expect(prospects[0].jobTitle).toBe('VP of Marketing');

    expect(result.data.coldEmail.prospectCount).toBe(3);
    expect(result.data.dataSource.prospects).toBe('live_apollo');
    expect(result.data.dataSource.apolloProspectsCount).toBe(3);
  });

  it('creates Instantly campaign and adds real prospects to it', async () => {
    vi.mocked(apolloMod.isApolloAvailable).mockReturnValue(true);
    vi.mocked(apolloMod.searchProspects).mockResolvedValue(MOCK_APOLLO_PROSPECTS);
    vi.mocked(instantlyMod.isInstantlyAvailable).mockReturnValue(true);
    vi.mocked(instantlyMod.createCampaign).mockResolvedValue({ id: 'camp_123', name: 'Test', status: 'draft', createdAt: new Date().toISOString() });
    vi.mocked(instantlyMod.addLeadsToCampaign).mockResolvedValue({ added: 3, campaignId: 'camp_123' });
    vi.mocked(instantlyMod.launchCampaign).mockResolvedValue({ status: 'active' });

    const result = await agent.run({
      pipelineId: 'test-real-002',
      config: { niche: 'SaaS' },
    });

    expect(result.success).toBe(true);

    // Campaign was created
    expect(instantlyMod.createCampaign).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.stringContaining('SaaS') })
    );

    // Leads were added to campaign
    expect(instantlyMod.addLeadsToCampaign).toHaveBeenCalledWith(
      'camp_123',
      expect.arrayContaining([
        expect.objectContaining({ email: 'alice@acme.com', firstName: 'Alice' }),
      ])
    );

    // Campaign was launched
    expect(instantlyMod.launchCampaign).toHaveBeenCalledWith('camp_123');

    // Execution tracking
    expect(result.data.execution.coldEmail.leadsAdded).toBe(3);
    expect(result.data.execution.coldEmail.campaignLaunched).toBe(true);
    expect(result.data.coldEmail.campaignStatus).toBe('active');
    expect(result.data.dataSource.campaign).toBe('live_instantly');
  });

  it('creates SmartLead campaign with sequences when preferred', async () => {
    vi.mocked(apolloMod.isApolloAvailable).mockReturnValue(true);
    vi.mocked(apolloMod.searchProspects).mockResolvedValue(MOCK_APOLLO_PROSPECTS);
    vi.mocked(smartleadMod.isSmartLeadAvailable).mockReturnValue(true);
    vi.mocked(smartleadMod.createCampaign).mockResolvedValue({ id: 42, name: 'Test', status: 'draft', createdAt: new Date().toISOString() });
    vi.mocked(smartleadMod.addLeadsToCampaign).mockResolvedValue({ added: 3, campaignId: 42 });
    vi.mocked(smartleadMod.addSequenceSteps).mockResolvedValue({ stepsAdded: 5 });
    vi.mocked(smartleadMod.setCampaignSchedule).mockResolvedValue({ status: 'scheduled' });
    vi.mocked(smartleadMod.launchCampaign).mockResolvedValue({ status: 'active' });

    const result = await agent.run({
      pipelineId: 'test-real-003',
      config: { niche: 'SaaS', emailPlatform: 'smartlead' },
    });

    expect(result.success).toBe(true);

    // SmartLead was used
    expect(smartleadMod.createCampaign).toHaveBeenCalled();
    expect(smartleadMod.addLeadsToCampaign).toHaveBeenCalledWith(
      42,
      expect.arrayContaining([
        expect.objectContaining({ email: 'alice@acme.com' }),
      ])
    );

    // Sequences were configured
    expect(smartleadMod.addSequenceSteps).toHaveBeenCalledWith(
      42,
      expect.arrayContaining([
        expect.objectContaining({ subject: expect.any(String), body: expect.any(String) }),
      ])
    );

    // Schedule was set
    expect(smartleadMod.setCampaignSchedule).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ days: [1, 2, 3, 4], dailyLimit: 50 })
    );

    // Campaign was launched
    expect(smartleadMod.launchCampaign).toHaveBeenCalledWith(42);
    expect(result.data.execution.coldEmail.campaignLaunched).toBe(true);
    expect(result.data.coldEmail.platform).toBe('smartlead');
  });

  // ═══════════════════════════════════════════════════════════════
  // REAL DATA PIPELINE TESTS — LinkedIn Sub-Agent
  // ═══════════════════════════════════════════════════════════════

  it('searches LinkedIn profiles via Phantombuster and sends connection requests', async () => {
    vi.mocked(phantombusterMod.isSearchAvailable).mockReturnValue(true);
    vi.mocked(phantombusterMod.isConnectAvailable).mockReturnValue(true);
    vi.mocked(phantombusterMod.searchProfiles).mockResolvedValue(MOCK_LINKEDIN_PROFILES);
    vi.mocked(phantombusterMod.sendConnectionRequests).mockResolvedValue({
      sent: 2,
      failed: 0,
      profiles: [
        { linkedInUrl: 'https://linkedin.com/in/alicechen', name: 'Alice Chen', status: 'sent' },
        { linkedInUrl: 'https://linkedin.com/in/bobsmith', name: 'Bob Smith', status: 'sent' },
      ],
    });

    const result = await agent.run({
      pipelineId: 'test-real-004',
      config: { niche: 'SaaS' },
    });

    expect(result.success).toBe(true);

    // Profiles were searched
    expect(phantombusterMod.searchProfiles).toHaveBeenCalledWith(
      expect.objectContaining({ jobTitles: expect.any(Array), limit: 25 })
    );

    // Connection requests were sent
    expect(phantombusterMod.sendConnectionRequests).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ linkedInUrl: 'https://linkedin.com/in/alicechen' }),
      ])
    );

    // Execution tracking
    expect(result.data.execution.linkedIn.profilesFound).toBe(2);
    expect(result.data.execution.linkedIn.connectionsSent).toBe(2);
    expect(result.data.linkedIn.targetProfiles).toBe(2);
    expect(result.data.dataSource.linkedin).toBe('live_phantombuster');
  });

  it('sends DMs to already-connected LinkedIn profiles', async () => {
    vi.mocked(phantombusterMod.isSearchAvailable).mockReturnValue(true);
    vi.mocked(phantombusterMod.isConnectAvailable).mockReturnValue(true);
    vi.mocked(phantombusterMod.isMessageAvailable).mockReturnValue(true);
    vi.mocked(phantombusterMod.searchProfiles).mockResolvedValue(MOCK_LINKEDIN_PROFILES);
    vi.mocked(phantombusterMod.sendConnectionRequests).mockResolvedValue({
      sent: 0,
      failed: 0,
      profiles: [
        { linkedInUrl: 'https://linkedin.com/in/alicechen', name: 'Alice Chen', status: 'already_connected' },
        { linkedInUrl: 'https://linkedin.com/in/bobsmith', name: 'Bob Smith', status: 'already_connected' },
      ],
    });
    vi.mocked(phantombusterMod.sendMessages).mockResolvedValue({
      sent: 2,
      failed: 0,
      messages: [
        { linkedInUrl: 'https://linkedin.com/in/alicechen', name: 'Alice Chen', status: 'sent' },
        { linkedInUrl: 'https://linkedin.com/in/bobsmith', name: 'Bob Smith', status: 'sent' },
      ],
    });

    const result = await agent.run({
      pipelineId: 'test-real-005',
      config: { niche: 'SaaS' },
    });

    expect(result.success).toBe(true);

    // DMs were sent to already-connected profiles
    expect(phantombusterMod.sendMessages).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ linkedInUrl: 'https://linkedin.com/in/alicechen', message: expect.any(String) }),
      ])
    );

    expect(result.data.execution.linkedIn.messagesSent).toBe(2);
    expect(result.data.linkedInConversations.conversationsStarted).toBe(2);
  });

  // ═══════════════════════════════════════════════════════════════
  // CRM SYNC TESTS
  // ═══════════════════════════════════════════════════════════════

  it('syncs prospects to HubSpot CRM', async () => {
    vi.mocked(apolloMod.isApolloAvailable).mockReturnValue(true);
    vi.mocked(apolloMod.searchProspects).mockResolvedValue(MOCK_APOLLO_PROSPECTS);
    vi.mocked(hubspotMod.isHubSpotAvailable).mockReturnValue(true);
    vi.mocked(hubspotMod.upsertContact).mockResolvedValue({} as any);

    const result = await agent.run({
      pipelineId: 'test-real-006',
      config: { niche: 'SaaS' },
    });

    expect(result.success).toBe(true);

    // All 3 prospects synced to HubSpot
    expect(hubspotMod.upsertContact).toHaveBeenCalledTimes(3);
    expect(hubspotMod.upsertContact).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@acme.com',
        firstName: 'Alice',
        lastName: 'Chen',
        company: 'Acme Corp',
        properties: expect.objectContaining({ lifecyclestage: 'lead' }),
      })
    );

    expect(result.data.execution.crmSync.contactsSynced).toBe(3);
  });

  // ═══════════════════════════════════════════════════════════════
  // FULL PIPELINE END-TO-END
  // ═══════════════════════════════════════════════════════════════

  it('runs full pipeline: Apollo → Instantly + Phantombuster + HubSpot', async () => {
    // Enable all integrations
    vi.mocked(apolloMod.isApolloAvailable).mockReturnValue(true);
    vi.mocked(apolloMod.searchProspects).mockResolvedValue(MOCK_APOLLO_PROSPECTS);
    vi.mocked(instantlyMod.isInstantlyAvailable).mockReturnValue(true);
    vi.mocked(instantlyMod.createCampaign).mockResolvedValue({ id: 'camp_e2e', name: 'E2E', status: 'draft', createdAt: new Date().toISOString() });
    vi.mocked(instantlyMod.addLeadsToCampaign).mockResolvedValue({ added: 3, campaignId: 'camp_e2e' });
    vi.mocked(instantlyMod.launchCampaign).mockResolvedValue({ status: 'active' });
    vi.mocked(phantombusterMod.isSearchAvailable).mockReturnValue(true);
    vi.mocked(phantombusterMod.isConnectAvailable).mockReturnValue(true);
    vi.mocked(phantombusterMod.searchProfiles).mockResolvedValue(MOCK_LINKEDIN_PROFILES);
    vi.mocked(phantombusterMod.sendConnectionRequests).mockResolvedValue({
      sent: 2, failed: 0,
      profiles: [
        { linkedInUrl: 'https://linkedin.com/in/alicechen', name: 'Alice Chen', status: 'sent' },
        { linkedInUrl: 'https://linkedin.com/in/bobsmith', name: 'Bob Smith', status: 'sent' },
      ],
    });
    vi.mocked(hubspotMod.isHubSpotAvailable).mockReturnValue(true);
    vi.mocked(hubspotMod.upsertContact).mockResolvedValue({} as any);

    const result = await agent.run({
      pipelineId: 'test-e2e-001',
      config: { niche: 'SaaS' },
      previousOutputs: {
        'offer-engineering': {
          offer: {
            serviceName: 'SaaS Growth Engine',
            icp: { titles: ['VP of Marketing', 'CMO'], companySize: '50-500', industries: ['SaaS'] },
            painPoints: ['lead generation', 'pipeline velocity'],
          },
        },
        'content-creative': {
          emailSequence: [
            { step: 1, subject: 'Quick idea for {company}', body: 'Hi {firstName}...\n\n---\n{unsubscribe_link}', delay: 'Day 1', purpose: 'Intro' },
          ],
          linkedInScripts: { connectionRequest: 'Hi {firstName}, love what {company} is doing!' },
        },
        'validation': { decision: 'GO' },
      },
    });

    expect(result.success).toBe(true);

    // Cold email pipeline executed
    expect(result.data.execution.coldEmail.leadsAdded).toBe(3);
    expect(result.data.execution.coldEmail.campaignLaunched).toBe(true);

    // LinkedIn pipeline executed
    expect(result.data.execution.linkedIn.profilesFound).toBe(2);
    expect(result.data.execution.linkedIn.connectionsSent).toBe(2);

    // CRM synced
    expect(result.data.execution.crmSync.contactsSynced).toBe(3);

    // Total contacted
    expect(result.data.contactedProspects.total).toBe(5); // 3 email + 2 LinkedIn
    expect(result.data.contactedProspects.emailContacted).toBe(3);
    expect(result.data.contactedProspects.linkedInContacted).toBe(2);

    // Data sources tracked
    expect(result.data.dataSource.prospects).toBe('live_apollo');
    expect(result.data.dataSource.campaign).toBe('live_instantly');
    expect(result.data.dataSource.linkedin).toBe('live_phantombuster');
  });

  // ═══════════════════════════════════════════════════════════════
  // GRACEFUL DEGRADATION TESTS
  // ═══════════════════════════════════════════════════════════════

  it('handles Apollo failure gracefully', async () => {
    vi.mocked(apolloMod.isApolloAvailable).mockReturnValue(true);
    vi.mocked(apolloMod.searchProspects).mockRejectedValue(new Error('Apollo rate limited'));

    const result = await agent.run({
      pipelineId: 'test-fail-001',
      config: { niche: 'SaaS' },
    });

    // Agent succeeds even though Apollo failed
    expect(result.success).toBe(true);
    expect(result.data.prospectList).toHaveLength(0);
    expect(result.data.dataSource.prospects).toBe('none');
  });

  it('handles Instantly failure gracefully', async () => {
    vi.mocked(apolloMod.isApolloAvailable).mockReturnValue(true);
    vi.mocked(apolloMod.searchProspects).mockResolvedValue(MOCK_APOLLO_PROSPECTS);
    vi.mocked(instantlyMod.isInstantlyAvailable).mockReturnValue(true);
    vi.mocked(instantlyMod.createCampaign).mockRejectedValue(new Error('Instantly unavailable'));

    const result = await agent.run({
      pipelineId: 'test-fail-002',
      config: { niche: 'SaaS' },
    });

    // Agent succeeds — prospects fetched but campaign not created
    expect(result.success).toBe(true);
    expect(result.data.prospectList).toHaveLength(3);
    expect(result.data.execution.coldEmail.campaignLaunched).toBe(false);
  });

  it('returns execution tracking structure', async () => {
    const result = await agent.run({
      pipelineId: 'test-exec-001',
      config: {},
    });

    expect(result.data.execution).toBeTruthy();
    expect(result.data.execution.coldEmail).toEqual(
      expect.objectContaining({ leadsAdded: 0, sequencesConfigured: expect.any(Number), campaignLaunched: false })
    );
    expect(result.data.execution.linkedIn).toEqual(
      expect.objectContaining({ profilesFound: 0, connectionsSent: 0, messagesSent: 0 })
    );
    expect(result.data.execution.crmSync).toEqual(
      expect.objectContaining({ contactsSynced: 0 })
    );
  });
});
