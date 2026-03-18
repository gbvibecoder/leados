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

const GOOGLE_ADS_TIMEOUT_MS = 30_000;

async function googleAdsFetch(gaql: string): Promise<any> {
  const customerId = getCustomerId();
  const developerToken = getDeveloperToken();
  if (!customerId || !developerToken) {
    throw new Error('GOOGLE_ADS_CUSTOMER_ID or GOOGLE_ADS_DEVELOPER_TOKEN not configured');
  }

  const accessToken = await getAccessToken();
  const url = `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${customerId}/googleAds:searchStream`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_ADS_TIMEOUT_MS);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
    },
    signal: controller.signal,
    body: JSON.stringify({ query: gaql }),
  });
  clearTimeout(timeout);

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

/** Helper for Google Ads REST mutations */
async function googleAdsMutate(endpoint: string, body: any): Promise<any> {
  const customerId = getCustomerId();
  const developerToken = getDeveloperToken();
  if (!customerId || !developerToken) throw new Error('Google Ads credentials not configured');

  const accessToken = await getAccessToken();
  const url = `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${customerId}/${endpoint}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_ADS_TIMEOUT_MS);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
    },
    signal: controller.signal,
    body: JSON.stringify(body),
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Ads mutation ${endpoint} failed ${res.status}: ${text}`);
  }

  return res.json();
}

/** Create a new campaign with a daily budget — starts ENABLED so it runs immediately */
export async function createCampaign(config: {
  name: string;
  dailyBudgetMicros: number;
  biddingStrategy?: string;
}): Promise<{ campaignId: string; budgetId: string; campaignResourceName: string }> {
  const customerId = getCustomerId();
  if (!customerId) throw new Error('Google Ads credentials not configured');

  if (process.env.ENABLE_AD_MUTATIONS !== 'true') {
    console.log(`[DRY RUN] Would create Google Ads campaign: ${config.name} ($${config.dailyBudgetMicros / 1_000_000}/day)`);
    return { campaignId: 'dry-run-campaign', budgetId: 'dry-run-budget', campaignResourceName: `customers/${customerId}/campaigns/dry-run-campaign` };
  }

  // Step 1: Create budget
  const budgetData = await googleAdsMutate('campaignBudgets:mutate', {
    operations: [{
      create: {
        name: `${config.name} Budget`,
        amountMicros: String(config.dailyBudgetMicros),
        deliveryMethod: 'STANDARD',
      },
    }],
  });
  const budgetResourceName = budgetData.results?.[0]?.resourceName || '';

  // Step 2: Create campaign with ENABLED status
  const campaignData = await googleAdsMutate('campaigns:mutate', {
    operations: [{
      create: {
        name: config.name,
        advertisingChannelType: 'SEARCH',
        status: 'ENABLED',
        campaignBudget: budgetResourceName,
        maximizeConversions: {},
        networkSettings: {
          targetGoogleSearch: true,
          targetSearchNetwork: true,
          targetContentNetwork: false,
        },
      },
    }],
  });
  const campaignResourceName = campaignData.results?.[0]?.resourceName || '';
  const campaignId = campaignResourceName.split('/').pop() || '';

  return { campaignId, budgetId: budgetResourceName.split('/').pop() || '', campaignResourceName };
}

/** Create an ad group under a campaign */
export async function createAdGroup(config: {
  campaignResourceName: string;
  name: string;
  cpcBidMicros?: number;
}): Promise<{ adGroupId: string; adGroupResourceName: string }> {
  const customerId = getCustomerId();
  if (!customerId) throw new Error('Google Ads credentials not configured');

  if (process.env.ENABLE_AD_MUTATIONS !== 'true') {
    const dryId = `dry-run-ag-${Date.now()}`;
    return { adGroupId: dryId, adGroupResourceName: `customers/${customerId}/adGroups/${dryId}` };
  }

  const data = await googleAdsMutate('adGroups:mutate', {
    operations: [{
      create: {
        name: config.name,
        campaign: config.campaignResourceName,
        status: 'ENABLED',
        type: 'SEARCH_STANDARD',
        cpcBidMicros: String(config.cpcBidMicros || 5_000_000),
      },
    }],
  });

  const resourceName = data.results?.[0]?.resourceName || '';
  return { adGroupId: resourceName.split('/').pop() || '', adGroupResourceName: resourceName };
}

/** Add keywords to an ad group */
export async function addKeywords(config: {
  adGroupResourceName: string;
  keywords: { text: string; matchType: 'EXACT' | 'PHRASE' | 'BROAD' }[];
}): Promise<{ count: number }> {
  if (process.env.ENABLE_AD_MUTATIONS !== 'true') {
    console.log(`[DRY RUN] Would add ${config.keywords.length} keywords`);
    return { count: config.keywords.length };
  }

  const operations = config.keywords.map(kw => ({
    create: {
      adGroup: config.adGroupResourceName,
      status: 'ENABLED',
      keywordInfo: {
        text: kw.text,
        matchType: kw.matchType,
      },
    },
  }));

  await googleAdsMutate('adGroupCriteria:mutate', { operations });
  return { count: operations.length };
}

/** Add negative keywords at campaign level */
export async function addNegativeKeywords(config: {
  campaignResourceName: string;
  keywords: string[];
}): Promise<{ count: number }> {
  if (process.env.ENABLE_AD_MUTATIONS !== 'true') {
    console.log(`[DRY RUN] Would add ${config.keywords.length} negative keywords`);
    return { count: config.keywords.length };
  }

  const operations = config.keywords.map(kw => ({
    create: {
      campaign: config.campaignResourceName,
      negative: true,
      keywordInfo: {
        text: kw,
        matchType: 'BROAD',
      },
    },
  }));

  await googleAdsMutate('campaignCriteria:mutate', { operations });
  return { count: operations.length };
}

/** Create a Responsive Search Ad in an ad group */
export async function createResponsiveSearchAd(config: {
  adGroupResourceName: string;
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
  path1?: string;
  path2?: string;
}): Promise<{ adId: string }> {
  if (process.env.ENABLE_AD_MUTATIONS !== 'true') {
    console.log(`[DRY RUN] Would create RSA with ${config.headlines.length} headlines`);
    return { adId: 'dry-run-ad' };
  }

  const data = await googleAdsMutate('adGroupAds:mutate', {
    operations: [{
      create: {
        adGroup: config.adGroupResourceName,
        status: 'ENABLED',
        ad: {
          responsiveSearchAd: {
            headlines: config.headlines.slice(0, 15).map((text, i) => ({
              text: text.substring(0, 30),
              pinnedField: i < 3 ? undefined : undefined,
            })),
            descriptions: config.descriptions.slice(0, 4).map(text => ({
              text: text.substring(0, 90),
            })),
            path1: config.path1?.substring(0, 15),
            path2: config.path2?.substring(0, 15),
          },
          finalUrls: [config.finalUrl],
        },
      },
    }],
  });

  const resourceName = data.results?.[0]?.resourceName || '';
  return { adId: resourceName.split('/').pop() || '' };
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_ADS_TIMEOUT_MS);
  const res = await fetch(
    `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${customerId}/campaigns:mutate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
      signal: controller.signal,
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
  clearTimeout(timeout);

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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_ADS_TIMEOUT_MS);
  const res = await fetch(
    `https://googleads.googleapis.com/${ADS_API_VERSION}/customers/${customerId}/campaignBudgets:mutate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
      signal: controller.signal,
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
  clearTimeout(timeout);

  return res.ok;
}

/** Check if Google Ads API is available */
export function isGoogleAdsAvailable(): boolean {
  return isGoogleOAuthAvailable() && !!getDeveloperToken() && !!getCustomerId();
}
