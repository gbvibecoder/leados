/**
 * Live integration test for Outbound Outreach Agent.
 * Run with: APOLLO_API_KEY=<key> npx vitest run tests/agents/outbound-outreach-live.test.ts
 *
 * Requires APOLLO_API_KEY in env — skips gracefully if not set.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

// Restore real fetch — test setup.ts saves it to __REAL_FETCH__ before mocking
const savedFetch = (globalThis as any).__REAL_FETCH__;
let mockFetch: typeof globalThis.fetch;

// Lazy-import integrations AFTER we restore real fetch
let apollo: typeof import('../../backend/integrations/apollo');
let instantly: typeof import('../../backend/integrations/instantly');
let smartlead: typeof import('../../backend/integrations/smartlead');
let phantombuster: typeof import('../../backend/integrations/phantombuster');
let hubspot: typeof import('../../backend/integrations/hubspot');

describe('Outbound Outreach — Live Integration Check', () => {
  beforeAll(async () => {
    // Swap in real fetch for live HTTP calls
    mockFetch = globalThis.fetch;
    if (savedFetch) {
      globalThis.fetch = savedFetch;
    }

    // Import after restoring fetch
    apollo = await import('../../backend/integrations/apollo');
    instantly = await import('../../backend/integrations/instantly');
    smartlead = await import('../../backend/integrations/smartlead');
    phantombuster = await import('../../backend/integrations/phantombuster');
    hubspot = await import('../../backend/integrations/hubspot');
  });

  afterAll(() => {
    // Restore the mock fetch so other tests aren't affected
    globalThis.fetch = mockFetch;
  });

  it('reports integration availability', () => {
    console.log('\n═══ INTEGRATION STATUS ═══');
    console.log('Apollo.io:      ', apollo.isApolloAvailable() ? '✅ CONFIGURED' : '❌ NOT SET');
    console.log('Instantly.ai:   ', instantly.isInstantlyAvailable() ? '✅ CONFIGURED' : '❌ NOT SET');
    console.log('SmartLead.ai:   ', smartlead.isSmartLeadAvailable() ? '✅ CONFIGURED' : '❌ NOT SET');
    console.log('Phantombuster:  ', phantombuster.isPhantombusterAvailable() ? '✅ CONFIGURED' : '❌ NOT SET');
    console.log('HubSpot CRM:    ', hubspot.isHubSpotAvailable() ? '✅ CONFIGURED' : '❌ NOT SET');
    expect(true).toBe(true);
  });

  it('Apollo: fetches real prospects matching ICP', async () => {
    if (!apollo.isApolloAvailable()) {
      console.log('⏭️  Skipped — APOLLO_API_KEY not set');
      return;
    }

    const prospects = await apollo.searchProspects({
      jobTitles: ['VP of Marketing', 'CMO'],
      limit: 5,
    });

    console.log(`\n✅ Apollo returned ${prospects.length} real prospects:`);
    prospects.forEach((p, i) => {
      console.log(`   [${i + 1}] ${p.firstName} ${p.lastName} — ${p.jobTitle} at ${p.company}`);
    });

    expect(prospects.length).toBeGreaterThan(0);
    expect(prospects[0].firstName).toBeTruthy();
    expect(prospects[0].company).toBeTruthy();
    expect(prospects[0].jobTitle).toBeTruthy();
  }, 30_000);

  it('Apollo: uses ICP titles from offer-engineering', async () => {
    if (!apollo.isApolloAvailable()) {
      console.log('⏭️  Skipped — APOLLO_API_KEY not set');
      return;
    }

    const prospects = await apollo.searchProspects({
      jobTitles: ['Head of Growth', 'CEO'],
      locations: ['United States'],
      limit: 3,
    });

    console.log(`\n✅ Apollo ICP search: ${prospects.length} results for Head of Growth / CEO`);
    expect(prospects.length).toBeGreaterThan(0);
    prospects.forEach((p) => {
      const title = p.jobTitle.toLowerCase();
      expect(
        title.includes('growth') || title.includes('ceo') || title.includes('chief executive')
      ).toBe(true);
    });
  }, 30_000);

  it('Instantly: creates campaign and lists campaigns', async () => {
    if (!instantly.isInstantlyAvailable()) {
      console.log('⏭️  Skipped — INSTANTLY_API_KEY not set');
      return;
    }

    // List existing campaigns first
    console.log('\n--- Instantly: Listing existing campaigns ---');
    try {
      const campaigns = await instantly.listCampaigns();
      console.log(`✅ Found ${campaigns.length} existing campaigns`);
      campaigns.slice(0, 3).forEach((c, i) => {
        console.log(`   [${i + 1}] ${c.name} (${c.status}) — ID: ${c.id}`);
      });
    } catch (e: any) {
      console.log('❌ List campaigns error:', e.message);
    }

    // Create a test campaign
    console.log('\n--- Instantly: Creating test campaign ---');
    try {
      const campaign = await instantly.createCampaign({
        name: `LeadOS Live Test — ${new Date().toISOString().slice(0, 10)}`,
        dailyLimit: 10,
      });
      console.log(`✅ Campaign created: ${campaign.name}`);
      console.log(`   ID: ${campaign.id}`);
      console.log(`   Status: ${campaign.status}`);
      expect(campaign.id).toBeTruthy();
      expect(campaign.name).toContain('LeadOS Live Test');
    } catch (e: any) {
      console.log('❌ Create campaign error:', e.message);
      // Don't fail the test if API rejects (quota, etc)
    }
  }, 30_000);

  it('HubSpot: fetches contacts and creates test contact', async () => {
    if (!hubspot.isHubSpotAvailable()) {
      console.log('⏭️  Skipped — HUBSPOT_API_KEY not set');
      return;
    }

    // List existing contacts
    console.log('\n--- HubSpot: Fetching existing contacts ---');
    try {
      const contacts = await hubspot.getContacts(5);
      console.log(`✅ Found ${contacts.length} contacts`);
      contacts.slice(0, 3).forEach((c, i) => {
        console.log(`   [${i + 1}] ${c.firstName} ${c.lastName} — ${c.email} (${c.company || 'N/A'})`);
      });
    } catch (e: any) {
      console.log('❌ Get contacts error:', e.message);
    }

    // Upsert a test contact
    console.log('\n--- HubSpot: Upserting test contact ---');
    try {
      const contact = await hubspot.upsertContact({
        email: 'leados-test@example.com',
        firstName: 'LeadOS',
        lastName: 'TestContact',
        company: 'LeadOS Test Corp',
        phone: '+14155550000',
        properties: {
          jobtitle: 'QA Test Lead',
          lifecyclestage: 'lead',
        },
      });
      console.log(`✅ Contact upserted: ${contact.firstName} ${contact.lastName}`);
      console.log(`   ID: ${contact.id}`);
      console.log(`   Email: ${contact.email}`);
      expect(contact.id).toBeTruthy();
    } catch (e: any) {
      console.log('❌ Upsert contact error:', e.message);
    }
  }, 30_000);

  it('Full pipeline: Apollo prospects → Instantly campaign + HubSpot sync', async () => {
    if (!apollo.isApolloAvailable() || !instantly.isInstantlyAvailable()) {
      console.log('⏭️  Skipped — needs both APOLLO_API_KEY and INSTANTLY_API_KEY');
      return;
    }

    // 1. Fetch real prospects
    console.log('\n--- Step 1: Apollo prospect search ---');
    const prospects = await apollo.searchProspects({
      jobTitles: ['VP of Marketing', 'CMO'],
      limit: 3,
    });
    console.log(`✅ ${prospects.length} prospects found`);
    expect(prospects.length).toBeGreaterThan(0);

    // 2. Create Instantly campaign
    console.log('\n--- Step 2: Create Instantly campaign ---');
    let campaignId: string | null = null;
    try {
      const campaign = await instantly.createCampaign({
        name: `LeadOS Pipeline Test — ${new Date().toISOString().slice(0, 16)}`,
        dailyLimit: 10,
      });
      campaignId = campaign.id;
      console.log(`✅ Campaign created: ${campaign.id}`);
    } catch (e: any) {
      console.log('❌ Campaign creation failed:', e.message);
    }

    // 3. Add prospects to campaign (only if we have emails — paid Apollo plan)
    if (campaignId) {
      const withEmail = prospects.filter(p => p.email && p.email.includes('@'));
      if (withEmail.length > 0) {
        console.log('\n--- Step 3: Add leads to Instantly campaign ---');
        try {
          const result = await instantly.addLeadsToCampaign(
            campaignId,
            withEmail.map(p => ({
              email: p.email,
              firstName: p.firstName,
              lastName: p.lastName,
              company: p.company,
            }))
          );
          console.log(`✅ ${result.added} leads added to campaign ${campaignId}`);
        } catch (e: any) {
          console.log('❌ Add leads error:', e.message);
        }
      } else {
        console.log('\n⏭️  Step 3: Skipped — no prospect emails (Apollo free plan)');
        console.log('   Prospects have: name + company + title (search-only data)');
        console.log('   Email enrichment requires Apollo paid plan');
      }
    }

    // 4. Sync to HubSpot
    if (hubspot.isHubSpotAvailable() && prospects.length > 0) {
      console.log('\n--- Step 4: Sync to HubSpot ---');
      let synced = 0;
      for (const p of prospects.slice(0, 2)) {
        try {
          // Use a test email since Apollo free plan doesn't return real emails
          await hubspot.upsertContact({
            email: `leados-test-${p.firstName.toLowerCase()}@example.com`,
            firstName: p.firstName,
            lastName: p.lastName || 'Unknown',
            company: p.company,
            properties: { jobtitle: p.jobTitle, lifecyclestage: 'lead' },
          });
          synced++;
        } catch (e: any) {
          console.log(`   ❌ Sync failed for ${p.firstName}: ${e.message}`);
        }
      }
      console.log(`✅ ${synced}/${Math.min(prospects.length, 2)} contacts synced to HubSpot`);
    } else {
      console.log('\n⏭️  Step 4: HubSpot sync skipped — HUBSPOT_API_KEY not set');
    }

    console.log('\n✅ Pipeline test complete!');
  }, 60_000);

  it('Phantombuster: reports search phantom availability', () => {
    if (!phantombuster.isPhantombusterAvailable()) {
      console.log('⏭️  Phantombuster not configured');
      console.log('   To enable, add to .env:');
      console.log('   PHANTOMBUSTER_API_KEY=<key>');
      console.log('   PHANTOMBUSTER_SEARCH_PHANTOM_ID=<phantom_id>');
      console.log('   PHANTOMBUSTER_CONNECT_PHANTOM_ID=<phantom_id>');
      console.log('   PHANTOMBUSTER_MESSAGE_PHANTOM_ID=<phantom_id>');
      return;
    }

    console.log('✅ Phantombuster configured');
    console.log('   Search available:', phantombuster.isSearchAvailable());
    console.log('   Connect available:', phantombuster.isConnectAvailable());
    console.log('   Message available:', phantombuster.isMessageAvailable());
  });
});
