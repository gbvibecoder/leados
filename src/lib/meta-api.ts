// ── Meta Marketing API Service ──────────────────────────────────────────────
// Server-side only — never import this in client components.

import type {
  CampaignObjective,
  OptimizationGoal,
  MetaApiResponse,
  CampaignInsights,
} from '@/types/meta';
import { promises as fs } from 'fs';
import path from 'path';

const META_BASE = `https://graph.facebook.com/${process.env.META_API_VERSION || 'v21.0'}`;
const ACCESS_TOKEN = () => process.env.META_ACCESS_TOKEN || '';
const AD_ACCOUNT_ID = () => process.env.META_AD_ACCOUNT_ID || '';
const PAGE_ID = () => process.env.META_PAGE_ID || '';

// ── Rate-limit delay ────────────────────────────────────────────────────────
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Error code → user-friendly message ──────────────────────────────────────
function friendlyError(code: number, message: string): string {
  switch (code) {
    case 190:
      return 'Your access token is invalid or has expired. Please refresh it.';
    case 100:
      return 'One of your campaign settings is invalid. Check the parameters.';
    case 200:
      return "Your app doesn't have permission. Enable ads_management in your Meta app.";
    case 17:
    case 613:
      return 'Meta rate limit hit. Retrying in 60 seconds...';
    case 1487390:
      return 'Ad account not found. Check your META_AD_ACCOUNT_ID.';
    default:
      return `Meta API error (${code}): ${message}`;
  }
}

// ── Base fetch wrapper ──────────────────────────────────────────────────────
async function metaFetch<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, any>,
  retryCount = 0
): Promise<MetaApiResponse<T>> {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${META_BASE}${endpoint}${separator}access_token=${ACCESS_TOKEN()}`;

  const timestamp = new Date().toISOString();
  console.log(`[META-API ${timestamp}] ${method} ${endpoint}`);

  try {
    const options: RequestInit = { method };
    if (body && method === 'POST') {
      // Meta prefers form-encoded for mutations
      const formBody = new URLSearchParams();
      for (const [key, val] of Object.entries(body)) {
        if (val === undefined || val === null) continue;
        if (typeof val === 'object') {
          formBody.append(key, JSON.stringify(val));
        } else {
          formBody.append(key, String(val));
        }
      }
      options.body = formBody.toString();
      options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    }

    const res = await fetch(url, options);
    const data = await res.json();

    console.log(`[META-API ${timestamp}] Response ${res.status}:`, JSON.stringify(data).slice(0, 300));

    if (data.error) {
      const errorCode = data.error.code || 0;
      const errorMsg = data.error.message || 'Unknown error';
      const errorSubcode = data.error.error_subcode || 0;
      const errorUserMsg = data.error.error_user_msg || '';
      const errorUserTitle = data.error.error_user_title || '';

      console.error(`[META-API ERROR] Code: ${errorCode}, Subcode: ${errorSubcode}, Message: ${errorMsg}, UserMsg: ${errorUserMsg}, UserTitle: ${errorUserTitle}`);

      // Auto-retry on rate limit (codes 17, 613)
      if ((errorCode === 17 || errorCode === 613) && retryCount < 2) {
        console.log(`[META-API] Rate limited — retrying in 60s (attempt ${retryCount + 1})`);
        await delay(60_000);
        return metaFetch<T>(endpoint, method, body, retryCount + 1);
      }

      // Return the raw Meta error so the user can see exactly what went wrong
      const rawDetail = errorUserMsg || errorMsg;
      return {
        success: false,
        error: `${friendlyError(errorCode, errorMsg)} — Raw: ${rawDetail}`,
        code: errorCode,
      };
    }

    // 1s delay between calls to respect rate limits
    await delay(1000);

    return { success: true, data };
  } catch (err: any) {
    console.error(`[META-API ${timestamp}] Network error:`, err.message);
    return { success: false, error: `Network error: ${err.message}` };
  }
}

// ── Objective → Optimization Goal mapping ───────────────────────────────────
export function mapObjectiveToGoal(objective: CampaignObjective): OptimizationGoal {
  const map: Record<CampaignObjective, OptimizationGoal> = {
    OUTCOME_LEADS: 'LEAD_GENERATION',
    OUTCOME_TRAFFIC: 'LINK_CLICKS',
    OUTCOME_SALES: 'OFFSITE_CONVERSIONS',
    OUTCOME_AWARENESS: 'REACH',
  };
  return map[objective];
}

// ── API Functions ───────────────────────────────────────────────────────────

/** Fetch the first Facebook Page linked to this user/token */
export async function getLinkedPageId(): Promise<string | null> {
  const result = await metaFetch<{ data: { id: string; name: string }[] }>(
    '/me/accounts?fields=id,name&limit=1'
  );
  if (result.success && result.data?.data?.[0]?.id) {
    const pageId = result.data.data[0].id;
    console.log(`[META-API] Found linked page: ${pageId} (${result.data.data[0].name})`);
    return pageId;
  }
  return null;
}

export async function validateToken(): Promise<MetaApiResponse<{ id: string; name: string; page_id?: string }>> {
  const result = await metaFetch<{ id: string; name: string }>('/me?fields=id,name');
  if (result.success) {
    // Also resolve the linked page ID and include it in the response
    const pageId = await getLinkedPageId();
    if (result.data) {
      (result.data as any).page_id = pageId;
    }
    console.log(`[META-API] Token valid for: ${result.data?.name} (${result.data?.id}), Page: ${pageId}`);
  }
  return result;
}

export async function createCampaign(params: {
  name: string;
  objective: CampaignObjective;
}): Promise<MetaApiResponse<{ id: string }>> {
  // Use raw fetch to control exact form encoding for campaign creation
  const token = ACCESS_TOKEN();
  const accountId = AD_ACCOUNT_ID();
  const url = `${META_BASE}/act_${accountId}/campaigns`;

  const formBody = new URLSearchParams();
  formBody.append('name', params.name);
  formBody.append('objective', params.objective);
  formBody.append('status', 'PAUSED');
  formBody.append('special_ad_categories', '["NONE"]');
  formBody.append('buying_type', 'AUCTION');
  formBody.append('is_adset_budget_sharing_enabled', 'false');
  formBody.append('access_token', token);

  const timestamp = new Date().toISOString();
  console.log(`[META-API ${timestamp}] POST /act_${accountId}/campaigns`);
  console.log(`[META-API ${timestamp}] Body: ${formBody.toString()}`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    });
    const data = await res.json();
    console.log(`[META-API ${timestamp}] Response ${res.status}:`, JSON.stringify(data).slice(0, 500));

    if (data.error) {
      const errorCode = data.error.code || 0;
      const errorMsg = data.error.message || 'Unknown error';
      const errorUserMsg = data.error.error_user_msg || '';
      console.error(`[META-API ERROR] Code: ${errorCode}, Message: ${errorMsg}, UserMsg: ${errorUserMsg}`);
      return {
        success: false,
        error: `${friendlyError(errorCode, errorMsg)} — Raw: ${errorUserMsg || errorMsg}`,
        code: errorCode,
      };
    }

    await delay(1000);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}

// ── Placement mapping ────────────────────────────────────────────────────────
function buildPublisherPlatforms(placements: string[]): Record<string, any> | null {
  if (!placements || placements.length === 0) return null;

  const platformMap: Record<string, { publisher: string; position: string }> = {
    facebook_feed: { publisher: 'facebook', position: 'feed' },
    facebook_stories: { publisher: 'facebook', position: 'story' },
    facebook_reels: { publisher: 'facebook', position: 'facebook_reels' },
    instagram_feed: { publisher: 'instagram', position: 'stream' },
    instagram_stories: { publisher: 'instagram', position: 'story' },
    instagram_reels: { publisher: 'instagram', position: 'reels' },
    instagram_explore: { publisher: 'instagram', position: 'explore' },
    audience_network: { publisher: 'audience_network', position: 'classic' },
    messenger_inbox: { publisher: 'messenger', position: 'messenger_home' },
  };

  const publishers = new Set<string>();
  const positions: Record<string, string[]> = {};

  for (const p of placements) {
    const mapped = platformMap[p];
    if (!mapped) continue;
    publishers.add(mapped.publisher);
    if (!positions[mapped.publisher]) positions[mapped.publisher] = [];
    positions[mapped.publisher].push(mapped.position);
  }

  return {
    publisher_platforms: Array.from(publishers),
    ...Object.fromEntries(
      Object.entries(positions).map(([pub, pos]) => [`${pub}_positions`, pos])
    ),
  };
}

export async function createAdSet(params: {
  campaign_id: string;
  daily_budget: number;
  age_min: number;
  age_max: number;
  country: string;
  objective: CampaignObjective;
  gender?: number; // 0=all, 1=male, 2=female
  placements?: string[];
  interests?: string;
  billing_event?: string;
  schedule_start?: string;
  schedule_end?: string;
  cities?: { key: string; name: string; radius: number }[];
}): Promise<MetaApiResponse<{ id: string }>> {
  const optimizationGoal = mapObjectiveToGoal(params.objective);

  // Start time: use provided or default to 5 min from now
  const startTime = params.schedule_start
    ? new Date(params.schedule_start).toISOString()
    : new Date(Date.now() + 5 * 60 * 1000).toISOString();

  // Build geo_locations — cities override country-wide targeting
  const geoLocations: Record<string, any> = { countries: [params.country] };
  if (params.cities && params.cities.length > 0) {
    geoLocations.cities = params.cities.map((c) => ({
      key: c.key,
      radius: c.radius,
      distance_unit: 'kilometer',
    }));
    // When cities are specified, remove country-wide targeting to avoid overlap
    delete geoLocations.countries;
  }

  const targeting: Record<string, any> = {
    geo_locations: geoLocations,
    age_min: params.age_min,
    age_max: params.age_max,
    targeting_automation: { advantage_audience: 0 },
  };

  // Gender filter (0 = all, skip; 1 = male, 2 = female)
  if (params.gender && params.gender > 0) {
    targeting.genders = [params.gender];
  }

  // Interest targeting
  if (params.interests) {
    const interestList = params.interests.split(',').map((s) => s.trim()).filter(Boolean);
    if (interestList.length > 0) {
      targeting.flexible_spec = [
        { interests: interestList.map((name) => ({ name })) },
      ];
    }
  }

  // Placement targeting
  const placementSpec = buildPublisherPlatforms(params.placements || []);
  if (placementSpec) {
    Object.assign(targeting, placementSpec);
  }

  const body: Record<string, any> = {
    name: `${params.campaign_id} — Ad Set`,
    campaign_id: params.campaign_id,
    daily_budget: String(params.daily_budget),
    billing_event: params.billing_event || 'IMPRESSIONS',
    optimization_goal: optimizationGoal,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
    targeting,
    start_time: startTime,
    status: 'PAUSED',
  };

  // End time
  if (params.schedule_end) {
    body.end_time = new Date(params.schedule_end).toISOString();
  }

  // OUTCOME_LEADS requires promoted_object with page_id
  if (params.objective === 'OUTCOME_LEADS') {
    const pageId = await getLinkedPageId() || PAGE_ID();
    body.promoted_object = { page_id: pageId };
    console.log(`[META-API] Using page_id for promoted_object: ${pageId}`);
  }

  return metaFetch(`/act_${AD_ACCOUNT_ID()}/adsets`, 'POST', body);
}

export async function updateAdSet(
  adsetId: string,
  updates: Record<string, any>
): Promise<MetaApiResponse<{ success: boolean }>> {
  const body: Record<string, any> = {};

  if (updates.daily_budget !== undefined) {
    body.daily_budget = String(updates.daily_budget);
  }
  if (updates.billing_event !== undefined) {
    body.billing_event = updates.billing_event;
  }
  if (updates.schedule_end !== undefined) {
    body.end_time = updates.schedule_end ? new Date(updates.schedule_end).toISOString() : undefined;
  }

  // Targeting updates
  const targetingUpdates: Record<string, any> = {};
  if (updates.age_min !== undefined || updates.age_max !== undefined) {
    if (updates.age_min !== undefined) targetingUpdates.age_min = updates.age_min;
    if (updates.age_max !== undefined) targetingUpdates.age_max = updates.age_max;
  }
  if (updates.country !== undefined) {
    targetingUpdates.geo_locations = { countries: [updates.country] };
  }
  if (updates.gender !== undefined) {
    if (updates.gender > 0) {
      targetingUpdates.genders = [updates.gender];
    }
  }
  if (Object.keys(targetingUpdates).length > 0) {
    body.targeting = targetingUpdates;
  }

  return metaFetch(`/${adsetId}`, 'POST', body);
}

export async function pauseCampaignResources(ids: {
  campaign_id: string;
  adset_id?: string;
  ad_id?: string;
}): Promise<MetaApiResponse<{ campaign: boolean; adset: boolean; ad: boolean }>> {
  const results = await Promise.all([
    metaFetch(`/${ids.campaign_id}`, 'POST', { status: 'PAUSED' }),
    ids.adset_id ? metaFetch(`/${ids.adset_id}`, 'POST', { status: 'PAUSED' }) : Promise.resolve({ success: true }),
    ids.ad_id ? metaFetch(`/${ids.ad_id}`, 'POST', { status: 'PAUSED' }) : Promise.resolve({ success: true }),
  ]);

  if (!results[0].success) {
    return { success: false, error: `Failed to pause campaign: ${results[0].error}` };
  }

  return {
    success: true,
    data: {
      campaign: results[0].success,
      adset: results[1].success,
      ad: results[2].success,
    },
  };
}

export async function createAdCreative(params: {
  message: string;
  link: string;
  cta_type: string;
}): Promise<MetaApiResponse<{ id: string }>> {
  const pageId = await getLinkedPageId() || PAGE_ID();
  console.log(`[META-API] Using page_id for creative: ${pageId}`);

  // Step 1: Create a post directly on the Facebook Page
  // This bypasses the "app in development mode" restriction because
  // the post is created as a page post, not through the app's object_story_spec
  const postText = `${params.message}\n\n${params.link}`;
  const postResult = await metaFetch<{ id: string }>(`/${pageId}/feed`, 'POST', {
    message: postText,
    link: params.link,
    published: false, // unpublished "dark post" — only used as ad
  });

  if (!postResult.success || !postResult.data?.id) {
    // Fallback: try object_story_spec anyway (works if app is Live)
    console.log('[META-API] Page post failed, falling back to object_story_spec');
    return metaFetch(`/act_${AD_ACCOUNT_ID()}/adcreatives`, 'POST', {
      name: 'LeadOS Ad Creative',
      object_story_spec: {
        page_id: pageId,
        link_data: {
          message: params.message,
          link: params.link,
          call_to_action: {
            type: params.cta_type,
            value: { link: params.link },
          },
        },
      },
    });
  }

  const postId = postResult.data.id;
  console.log(`[META-API] Created page post: ${postId}, using as ad creative`);

  // Step 2: Create ad creative referencing the existing page post
  return metaFetch(`/act_${AD_ACCOUNT_ID()}/adcreatives`, 'POST', {
    name: 'LeadOS Ad Creative',
    object_story_id: postId,
  });
}

export async function createAd(params: {
  adset_id: string;
  creative_id: string;
}): Promise<MetaApiResponse<{ id: string }>> {
  return metaFetch(`/act_${AD_ACCOUNT_ID()}/ads`, 'POST', {
    name: 'LeadOS Ad',
    adset_id: params.adset_id,
    creative: { creative_id: params.creative_id },
    status: 'PAUSED',
  });
}

export async function activateCampaign(ids: {
  campaign_id: string;
  adset_id: string;
  ad_id: string;
}): Promise<
  MetaApiResponse<{ campaign: boolean; adset: boolean; ad: boolean }>
> {
  const [campaignRes, adsetRes, adRes] = await Promise.all([
    metaFetch(`/${ids.campaign_id}`, 'POST', { status: 'ACTIVE' }),
    metaFetch(`/${ids.adset_id}`, 'POST', { status: 'ACTIVE' }),
    metaFetch(`/${ids.ad_id}`, 'POST', { status: 'ACTIVE' }),
  ]);

  if (!campaignRes.success || !adsetRes.success || !adRes.success) {
    const failedParts = [];
    if (!campaignRes.success) failedParts.push(`Campaign: ${campaignRes.error}`);
    if (!adsetRes.success) failedParts.push(`Ad Set: ${adsetRes.error}`);
    if (!adRes.success) failedParts.push(`Ad: ${adRes.error}`);
    return { success: false, error: failedParts.join(' | ') };
  }

  return {
    success: true,
    data: {
      campaign: campaignRes.success,
      adset: adsetRes.success,
      ad: adRes.success,
    },
  };
}

export async function getInsights(
  campaignId: string
): Promise<MetaApiResponse<CampaignInsights[]>> {
  return metaFetch(
    `/${campaignId}/insights?fields=impressions,clicks,spend,reach,ctr,cpc&date_preset=today`
  );
}

// ── Save campaign IDs to disk ───────────────────────────────────────────────
export async function saveCampaignIds(ids: {
  campaign_id: string;
  adset_id: string;
  creative_id: string;
  ad_id: string;
}): Promise<void> {
  const dir = path.join(process.cwd(), 'data', 'campaigns');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${ids.campaign_id}.json`);
  await fs.writeFile(
    filePath,
    JSON.stringify({ ...ids, created_at: new Date().toISOString() }, null, 2)
  );
  console.log(`[META-API] Campaign IDs saved to ${filePath}`);
}
