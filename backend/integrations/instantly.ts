// Instantly.ai API client for cold email campaigns
// Docs: https://developer.instantly.ai/

const INSTANTLY_BASE = 'https://api.instantly.ai/api/v2';

function getApiKey(): string | null {
  return process.env.INSTANTLY_API_KEY || null;
}

const INSTANTLY_TIMEOUT_MS = 20_000;

async function instantlyFetch(endpoint: string, options: { method?: string; body?: any; query?: Record<string, string> } = {}): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('INSTANTLY_API_KEY not configured');

  const url = new URL(`${INSTANTLY_BASE}${endpoint}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      url.searchParams.set(k, v);
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INSTANTLY_TIMEOUT_MS);
  const res = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    signal: controller.signal,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Instantly API error ${res.status}: ${text}`);
  }

  return res.json();
}

export interface InstantlyCampaign {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface InstantlyLead {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  status: number;
}

export interface InstantlyCampaignStats {
  campaign_id: string;
  total_sent: number;
  total_opened: number;
  total_replied: number;
  total_bounced: number;
  open_rate: number;
  reply_rate: number;
  bounce_rate: number;
}

/** Create a new email campaign */
export async function createCampaign(data: {
  name: string;
  sendingAccount?: string;
  dailyLimit?: number;
}): Promise<InstantlyCampaign> {
  const result = await instantlyFetch('/campaigns', {
    method: 'POST',
    body: {
      name: data.name,
      campaign_schedule: {
        schedules: [
          {
            name: 'Default',
            days: { 1: true, 2: true, 3: true, 4: true, 5: false, 6: false, 0: false },
            timezone: 'America/Detroit',
            timing: { from: '08:00', to: '11:00' },
          },
        ],
      },
      ...(data.sendingAccount && { from_address: data.sendingAccount }),
      ...(data.dailyLimit && { daily_limit: data.dailyLimit }),
    },
  });

  return {
    id: result.id || result.campaign_id,
    name: data.name,
    status: 'draft',
    createdAt: new Date().toISOString(),
  };
}

/** Add leads to a campaign — v2 API uses single lead per request */
export async function addLeadsToCampaign(
  campaignId: string,
  leads: Array<{ email: string; firstName?: string; lastName?: string; company?: string; variables?: Record<string, string> }>
): Promise<{ added: number; campaignId: string }> {
  let added = 0;

  // v2 API: one lead per POST /leads request with email + campaign at top level
  const BATCH = 5;
  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((l) =>
        instantlyFetch('/leads', {
          method: 'POST',
          body: {
            campaign: campaignId,
            email: l.email,
            first_name: l.firstName || '',
            last_name: l.lastName || '',
            company_name: l.company || '',
            ...(l.variables || {}),
          },
        })
      )
    );

    for (const r of results) {
      if (r.status === 'fulfilled') added++;
    }
  }

  return { added, campaignId };
}

/** Get campaign analytics/stats */
export async function getCampaignStats(campaignId: string): Promise<InstantlyCampaignStats> {
  // v2 API: analytics via query param, not path param
  const results = await instantlyFetch('/campaigns/analytics', {
    query: { campaign_id: campaignId },
  });

  // v2 returns an array — take first entry or empty
  const result = Array.isArray(results) && results.length > 0 ? results[0] : {};

  return {
    campaign_id: campaignId,
    total_sent: result.sent || result.total_sent || 0,
    total_opened: result.opened || result.total_opened || 0,
    total_replied: result.replied || result.total_replied || 0,
    total_bounced: result.bounced || result.total_bounced || 0,
    open_rate: result.open_rate || 0,
    reply_rate: result.reply_rate || 0,
    bounce_rate: result.bounce_rate || 0,
  };
}

/** Get campaign details */
export async function getCampaign(campaignId: string): Promise<InstantlyCampaign> {
  const result = await instantlyFetch(`/campaigns/${campaignId}`);
  return {
    id: result.id || result.campaign_id,
    name: result.name,
    status: result.status === 1 ? 'active' : (result.status === 2 ? 'paused' : 'draft'),
    createdAt: result.timestamp_created || new Date().toISOString(),
  };
}

/** List all campaigns */
export async function listCampaigns(): Promise<InstantlyCampaign[]> {
  const result = await instantlyFetch('/campaigns');
  const items = result.items || result || [];
  return (Array.isArray(items) ? items : []).map((c: any) => ({
    id: c.id || c.campaign_id,
    name: c.name,
    status: c.status === 1 ? 'active' : (c.status === 2 ? 'paused' : 'draft'),
    createdAt: c.timestamp_created || new Date().toISOString(),
  }));
}

/** Launch/activate a campaign */
export async function launchCampaign(campaignId: string): Promise<{ status: string }> {
  await instantlyFetch(`/campaigns/${campaignId}/activate`, {
    method: 'POST',
  });
  return { status: 'active' };
}

/** Pause a campaign */
export async function pauseCampaign(campaignId: string): Promise<{ status: string }> {
  await instantlyFetch(`/campaigns/${campaignId}/pause`, {
    method: 'POST',
  });
  return { status: 'paused' };
}

/** Check if Instantly API is available */
export function isInstantlyAvailable(): boolean {
  return !!getApiKey();
}
