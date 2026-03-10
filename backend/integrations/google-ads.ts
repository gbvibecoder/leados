// Google Ads API client for campaign management and metrics
// Docs: https://developers.google.com/google-ads/api/docs/start

import { getAccessToken, isGoogleOAuthAvailable } from './google-oauth';

const ADS_API_VERSION = 'v17';

function getDeveloperToken(): string | null {
  return process.env.GOOGLE_ADS_DEVELOPER_TOKEN || null;
}

function getCustomerId(): string | null {
  return process.env.GOOGLE_ADS_CUSTOMER_ID || null;
}

export interface GoogleAdsCampaignMetrics {
  campaignId: string;
  campaignName: string;
  status: string;
  impressions: number;
  clicks: number;
  costMicros: number;
  cost: number;
  conversions: number;
  ctr: number;
  averageCpc: number;
  conversionRate: number;
}

export interface GoogleAdsBudgetUpdate {
  campaignId: string;
  newDailyBudgetMicros: number;
}

async function googleAdsFetch(gaql: string): Promise<any> {
  const customerId = getCustomerId();
  const developerToken = getDeveloperToken();
  if (!customerId || !developerToken) {
    throw new Error('GOOGLE_ADS_CUSTOMER_ID or GOOGLE_ADS_DEVELOPER_TOKEN not configured');
  }

  const accessToken = await getAccessToken();
  const url = `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
    },
    body: JSON.stringify({ query: gaql }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Ads API error ${res.status}: ${text}`);
  }

  return res.json();
}

/** Get campaign performance metrics for the last 30 days */
export async function getCampaignMetrics(dateRange: string = 'LAST_30_DAYS'): Promise<GoogleAdsCampaignMetrics[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE campaign.status = 'ENABLED'
      AND segments.date DURING ${dateRange}
  `;

  const data = await googleAdsFetch(query);
  const results: GoogleAdsCampaignMetrics[] = [];

  for (const batch of data || []) {
    for (const row of batch.results || []) {
      const m = row.metrics || {};
      const costMicros = Number(m.costMicros || 0);
      const clicks = Number(m.clicks || 0);
      const impressions = Number(m.impressions || 0);
      const conversions = Number(m.conversions || 0);

      results.push({
        campaignId: row.campaign?.id || '',
        campaignName: row.campaign?.name || '',
        status: row.campaign?.status || '',
        impressions,
        clicks,
        costMicros,
        cost: costMicros / 1_000_000,
        conversions,
        ctr: Number(m.ctr || 0) * 100,
        averageCpc: Number(m.averageCpc || 0) / 1_000_000,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
      });
    }
  }

  return results;
}

/** Create a new campaign with a daily budget */
export async function createCampaign(config: {
  name: string;
  dailyBudgetMicros: number;
  biddingStrategy?: string;
}): Promise<{ campaignId: string; budgetId: string }> {
  const customerId = getCustomerId();
  const developerToken = getDeveloperToken();
  if (!customerId || !developerToken) throw new Error('Google Ads credentials not configured');

  // Safety gate: only create campaigns if explicitly enabled
  if (process.env.ENABLE_AD_MUTATIONS !== 'true') {
    console.log(`[DRY RUN] Would create Google Ads campaign: ${config.name} ($${config.dailyBudgetMicros / 1_000_000}/day)`);
    return { campaignId: 'dry-run-campaign', budgetId: 'dry-run-budget' };
  }

  const accessToken = await getAccessToken();

  // Step 1: Create budget
  const budgetRes = await fetch(
    `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${customerId}/campaignBudgets:mutate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
      body: JSON.stringify({
        operations: [{
          create: {
            name: `${config.name} Budget`,
            amountMicros: String(config.dailyBudgetMicros),
            deliveryMethod: 'STANDARD',
          },
        }],
      }),
    }
  );

  if (!budgetRes.ok) {
    const text = await budgetRes.text();
    throw new Error(`Failed to create budget: ${text}`);
  }

  const budgetData = await budgetRes.json();
  const budgetResourceName = budgetData.results?.[0]?.resourceName || '';

  // Step 2: Create campaign
  const campaignRes = await fetch(
    `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${customerId}/campaigns:mutate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
      body: JSON.stringify({
        operations: [{
          create: {
            name: config.name,
            advertisingChannelType: 'SEARCH',
            status: 'PAUSED', // Start paused for safety
            campaignBudget: budgetResourceName,
            maximizeConversions: {},
          },
        }],
      }),
    }
  );

  if (!campaignRes.ok) {
    const text = await campaignRes.text();
    throw new Error(`Failed to create campaign: ${text}`);
  }

  const campaignData = await campaignRes.json();
  const campaignResourceName = campaignData.results?.[0]?.resourceName || '';
  const campaignId = campaignResourceName.split('/').pop() || '';

  return { campaignId, budgetId: budgetResourceName.split('/').pop() || '' };
}

/** Pause a campaign */
export async function pauseCampaign(campaignId: string): Promise<boolean> {
  if (process.env.ENABLE_AD_MUTATIONS !== 'true') {
    console.log(`[DRY RUN] Would pause Google Ads campaign: ${campaignId}`);
    return true;
  }

  const customerId = getCustomerId();
  const developerToken = getDeveloperToken();
  if (!customerId || !developerToken) return false;

  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${customerId}/campaigns:mutate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
      body: JSON.stringify({
        operations: [{
          update: {
            resourceName: `customers/${customerId}/campaigns/${campaignId}`,
            status: 'PAUSED',
          },
          updateMask: 'status',
        }],
      }),
    }
  );

  return res.ok;
}

/** Update campaign daily budget */
export async function updateBudget(campaignId: string, newDailyBudgetMicros: number): Promise<boolean> {
  if (process.env.ENABLE_AD_MUTATIONS !== 'true') {
    console.log(`[DRY RUN] Would update Google Ads budget for campaign ${campaignId} to $${newDailyBudgetMicros / 1_000_000}/day`);
    return true;
  }

  // Need to query the campaign's budget resource name first
  const query = `SELECT campaign.campaign_budget FROM campaign WHERE campaign.id = ${campaignId}`;
  const data = await googleAdsFetch(query);
  const budgetResourceName = data?.[0]?.results?.[0]?.campaign?.campaignBudget;

  if (!budgetResourceName) return false;

  const customerId = getCustomerId();
  const developerToken = getDeveloperToken();
  if (!customerId || !developerToken) return false;

  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${customerId}/campaignBudgets:mutate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
      body: JSON.stringify({
        operations: [{
          update: {
            resourceName: budgetResourceName,
            amountMicros: String(newDailyBudgetMicros),
          },
          updateMask: 'amount_micros',
        }],
      }),
    }
  );

  return res.ok;
}

/** Check if Google Ads API is available */
export function isGoogleAdsAvailable(): boolean {
  return isGoogleOAuthAvailable() && !!getDeveloperToken() && !!getCustomerId();
}
