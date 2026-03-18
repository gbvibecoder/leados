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

/** Add leads to a campaign */
export async function addLeadsToCampaign(
  campaignId: string,
  leads: Array<{ email: string; firstName?: string; lastName?: string; company?: string; variables?: Record<string, string> }>
): Promise<{ added: number; campaignId: string }> {
  const result = await instantlyFetch(`/leads`, {
    method: 'POST',
    body: {
      campaign_id: campaignId,
      skip_if_in_workspace: true,
      leads: leads.map((l) => ({
        email: l.email,
        first_name: l.firstName || '',
        last_name: l.lastName || '',
        company_name: l.company || '',
        ...(l.variables || {}),
      })),
    },
  });

  return {
    added: result.leads_added || leads.length,
    campaignId,
  };
}

/** Get campaign analytics/stats */
export async function getCampaignStats(campaignId: string): Promise<InstantlyCampaignStats> {
  const result = await instantlyFetch(`/campaigns/${campaignId}/analytics`);

  return {
    campaign_id: campaignId,
    total_sent: result.total_sent || 0,
    total_opened: result.total_opened || 0,
    total_replied: result.total_replied || 0,
    total_bounced: result.total_bounced || 0,
    open_rate: result.open_rate || 0,
    reply_rate: result.reply_rate || 0,
    bounce_rate: result.bounce_rate || 0,
  };
}

/** List all campaigns */
export async function listCampaigns(): Promise<InstantlyCampaign[]> {
  const result = await instantlyFetch('/campaigns');
  const items = result.items || result || [];
  return (Array.isArray(items) ? items : []).map((c: any) => ({
    id: c.id || c.campaign_id,
    name: c.name,
    status: c.status || 'draft',
    createdAt: c.created_at || new Date().toISOString(),
  }));
}

/** Launch/activate a campaign */
export async function launchCampaign(campaignId: string): Promise<{ status: string }> {
  await instantlyFetch(`/campaigns/${campaignId}/activate`, {
    method: 'POST',
  });
  return { status: 'active' };
}

/** Check if Instantly API is available */
export function isInstantlyAvailable(): boolean {
  return !!getApiKey();
}
