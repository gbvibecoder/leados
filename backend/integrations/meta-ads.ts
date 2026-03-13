// Meta Marketing API client for campaign management and insights
// Docs: https://developers.facebook.com/docs/marketing-apis/

const META_BASE = 'https://graph.facebook.com/v21.0';

function getAccessToken(): string | null {
  return process.env.META_ACCESS_TOKEN || null;
}

function getAdAccountId(): string | null {
  return process.env.META_AD_ACCOUNT_ID || null;
}

export interface MetaCampaignInsights {
  campaignId: string;
  campaignName: string;
  status: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
  leads: number;
  costPerLead: number;
  reach: number;
  frequency: number;
}

export interface MetaCampaignConfig {
  name: string;
  objective: string;
  dailyBudget: number;
  status?: string;
}

async function metaFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const accessToken = getAccessToken();
  if (!accessToken) throw new Error('META_ACCESS_TOKEN not configured');

  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${META_BASE}${endpoint}${separator}access_token=${accessToken}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API error ${res.status}: ${text}`);
  }

  return res.json();
}

/** Get campaign insights (performance metrics) */
export async function getCampaignInsights(datePreset: string = 'last_30d'): Promise<MetaCampaignInsights[]> {
  const adAccountId = getAdAccountId();
  if (!adAccountId) throw new Error('META_AD_ACCOUNT_ID not configured');

  const fields = 'campaign_name,campaign_id,impressions,clicks,spend,ctr,cpc,reach,frequency,actions,cost_per_action_type';
  const data = await metaFetch(
    `/act_${adAccountId}/insights?fields=${fields}&level=campaign&date_preset=${datePreset}&limit=50`
  );

  return (data.data || []).map((row: any) => {
    const leads = (row.actions || []).find((a: any) => a.action_type === 'lead')?.value || 0;
    const costPerLead = (row.cost_per_action_type || []).find((a: any) => a.action_type === 'lead')?.value || 0;

    return {
      campaignId: row.campaign_id || '',
      campaignName: row.campaign_name || '',
      status: 'ACTIVE',
      impressions: Number(row.impressions || 0),
      clicks: Number(row.clicks || 0),
      spend: Number(row.spend || 0),
      ctr: Number(row.ctr || 0),
      cpc: Number(row.cpc || 0),
      leads: Number(leads),
      costPerLead: Number(costPerLead),
      reach: Number(row.reach || 0),
      frequency: Number(row.frequency || 0),
    };
  });
}

/** Get ad set level insights */
export async function getAdSetInsights(campaignId: string): Promise<any[]> {
  const adAccountId = getAdAccountId();
  if (!adAccountId) throw new Error('META_AD_ACCOUNT_ID not configured');

  const fields = 'adset_name,adset_id,impressions,clicks,spend,ctr,cpc,reach,frequency,actions';
  const data = await metaFetch(
    `/act_${adAccountId}/insights?fields=${fields}&level=adset&filtering=[{"field":"campaign.id","operator":"EQUAL","value":"${campaignId}"}]&date_preset=last_30d`
  );

  return data.data || [];
}

/** Create a new campaign — starts ACTIVE so it runs immediately */
export async function createCampaign(config: MetaCampaignConfig): Promise<{ campaignId: string }> {
  const adAccountId = getAdAccountId();
  if (!adAccountId) throw new Error('META_AD_ACCOUNT_ID not configured');

  if (process.env.ENABLE_AD_MUTATIONS !== 'true') {
    console.log(`[DRY RUN] Would create Meta campaign: ${config.name} ($${config.dailyBudget}/day)`);
    return { campaignId: 'dry-run-meta-campaign' };
  }

  const data = await metaFetch(`/act_${adAccountId}/campaigns`, {
    method: 'POST',
    body: JSON.stringify({
      name: config.name,
      objective: config.objective || 'OUTCOME_LEADS',
      status: config.status || 'ACTIVE',
      special_ad_categories: [],
    }),
  });

  return { campaignId: data.id || '' };
}

/** Create an ad set under a campaign */
export async function createAdSet(config: {
  campaignId: string;
  name: string;
  dailyBudget: number;
  targeting: {
    geoLocations?: { countries: string[] };
    interests?: { id: string; name: string }[];
    ageMin?: number;
    ageMax?: number;
  };
  optimizationGoal?: string;
  billingEvent?: string;
  bidAmount?: number;
}): Promise<{ adSetId: string }> {
  const adAccountId = getAdAccountId();
  if (!adAccountId) throw new Error('META_AD_ACCOUNT_ID not configured');

  if (process.env.ENABLE_AD_MUTATIONS !== 'true') {
    console.log(`[DRY RUN] Would create Meta ad set: ${config.name} ($${config.dailyBudget}/day)`);
    return { adSetId: 'dry-run-adset' };
  }

  const targeting: any = {
    geo_locations: config.targeting.geoLocations || { countries: ['US'] },
    age_min: config.targeting.ageMin || 25,
    age_max: config.targeting.ageMax || 55,
  };
  if (config.targeting.interests?.length) {
    targeting.flexible_spec = [{ interests: config.targeting.interests }];
  }

  const data = await metaFetch(`/act_${adAccountId}/adsets`, {
    method: 'POST',
    body: JSON.stringify({
      name: config.name,
      campaign_id: config.campaignId,
      daily_budget: Math.round(config.dailyBudget * 100), // Meta uses cents
      optimization_goal: config.optimizationGoal || 'LEAD_GENERATION',
      billing_event: config.billingEvent || 'IMPRESSIONS',
      bid_amount: config.bidAmount ? Math.round(config.bidAmount * 100) : undefined,
      targeting,
      status: 'ACTIVE',
    }),
  });

  return { adSetId: data.id || '' };
}

/** Create an ad under an ad set */
export async function createAd(config: {
  adSetId: string;
  name: string;
  creativeData: {
    title: string;
    body: string;
    linkUrl: string;
    callToAction?: string;
    imageUrl?: string;
  };
}): Promise<{ adId: string }> {
  const adAccountId = getAdAccountId();
  if (!adAccountId) throw new Error('META_AD_ACCOUNT_ID not configured');

  if (process.env.ENABLE_AD_MUTATIONS !== 'true') {
    console.log(`[DRY RUN] Would create Meta ad: ${config.name}`);
    return { adId: 'dry-run-ad' };
  }

  // Step 1: Create ad creative
  const creativePayload: any = {
    name: `${config.name} Creative`,
    object_story_spec: {
      link_data: {
        link: config.creativeData.linkUrl,
        message: config.creativeData.body,
        name: config.creativeData.title,
        call_to_action: {
          type: config.creativeData.callToAction || 'LEARN_MORE',
          value: { link: config.creativeData.linkUrl },
        },
      },
    },
  };
  if (config.creativeData.imageUrl) {
    creativePayload.object_story_spec.link_data.picture = config.creativeData.imageUrl;
  }

  const creativeData = await metaFetch(`/act_${adAccountId}/adcreatives`, {
    method: 'POST',
    body: JSON.stringify(creativePayload),
  });
  const creativeId = creativeData.id || '';

  // Step 2: Create ad linking to creative and ad set
  const adData = await metaFetch(`/act_${adAccountId}/ads`, {
    method: 'POST',
    body: JSON.stringify({
      name: config.name,
      adset_id: config.adSetId,
      creative: { creative_id: creativeId },
      status: 'ACTIVE',
    }),
  });

  return { adId: adData.id || '' };
}

/** Pause a campaign */
export async function pauseCampaign(campaignId: string): Promise<boolean> {
  if (process.env.ENABLE_AD_MUTATIONS !== 'true') {
    console.log(`[DRY RUN] Would pause Meta campaign: ${campaignId}`);
    return true;
  }

  try {
    await metaFetch(`/${campaignId}`, {
      method: 'POST',
      body: JSON.stringify({ status: 'PAUSED' }),
    });
    return true;
  } catch {
    return false;
  }
}

/** Update campaign daily budget */
export async function updateBudget(campaignId: string, dailyBudget: number): Promise<boolean> {
  if (process.env.ENABLE_AD_MUTATIONS !== 'true') {
    console.log(`[DRY RUN] Would update Meta campaign ${campaignId} budget to $${dailyBudget}/day`);
    return true;
  }

  try {
    await metaFetch(`/${campaignId}`, {
      method: 'POST',
      body: JSON.stringify({ daily_budget: Math.round(dailyBudget * 100) }), // Meta uses cents
    });
    return true;
  } catch {
    return false;
  }
}

/** Get custom audiences for retargeting */
export async function getCustomAudiences(): Promise<any[]> {
  const adAccountId = getAdAccountId();
  if (!adAccountId) throw new Error('META_AD_ACCOUNT_ID not configured');

  const data = await metaFetch(
    `/act_${adAccountId}/customaudiences?fields=name,approximate_count_lower_bound,approximate_count_upper_bound,subtype&limit=50`
  );

  return (data.data || []).map((audience: any) => ({
    id: audience.id,
    name: audience.name,
    approximateSize: audience.approximate_count_lower_bound || 0,
    subtype: audience.subtype,
  }));
}

/** Check if Meta Ads API is available */
export function isMetaAdsAvailable(): boolean {
  return !!(getAccessToken() && getAdAccountId());
}
