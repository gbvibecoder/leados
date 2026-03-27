// SmartLead.ai API client for cold email campaigns
// Docs: https://api.smartlead.ai/reference

const SMARTLEAD_BASE = 'https://server.smartlead.ai/api/v1';

function getApiKey(): string | null {
  return process.env.SMARTLEAD_API_KEY || null;
}

const SMARTLEAD_TIMEOUT_MS = 20_000;

async function smartleadFetch(endpoint: string, options: { method?: string; body?: any } = {}): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('SMARTLEAD_API_KEY not configured');

  const url = new URL(`${SMARTLEAD_BASE}${endpoint}`);
  url.searchParams.set('api_key', apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SMARTLEAD_TIMEOUT_MS);
  const res = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SmartLead API error ${res.status}: ${text}`);
  }

  return res.json();
}

export interface SmartLeadCampaign {
  id: number;
  name: string;
  status: string;
  createdAt: string;
}

export interface SmartLeadCampaignStats {
  campaignId: number;
  totalSent: number;
  totalOpened: number;
  totalReplied: number;
  totalBounced: number;
  openRate: number;
  replyRate: number;
  bounceRate: number;
}

/** Create a new email campaign */
export async function createCampaign(data: {
  name: string;
  clientId?: number;
}): Promise<SmartLeadCampaign> {
  const result = await smartleadFetch('/campaigns/create', {
    method: 'POST',
    body: {
      name: data.name,
      ...(data.clientId && { client_id: data.clientId }),
    },
  });

  return {
    id: result.id,
    name: data.name,
    status: 'draft',
    createdAt: new Date().toISOString(),
  };
}

/** Add leads to a campaign */
export async function addLeadsToCampaign(
  campaignId: number,
  leads: Array<{ email: string; firstName?: string; lastName?: string; company?: string; variables?: Record<string, string> }>
): Promise<{ added: number; campaignId: number }> {
  const leadList = leads.map((l) => ({
    email: l.email,
    first_name: l.firstName || '',
    last_name: l.lastName || '',
    company: l.company || '',
    ...(l.variables || {}),
  }));

  const result = await smartleadFetch(`/campaigns/${campaignId}/leads`, {
    method: 'POST',
    body: { lead_list: leadList },
  });

  return {
    added: result.upload_count || leads.length,
    campaignId,
  };
}

/** Add sequence steps (email templates) to a campaign */
export async function addSequenceSteps(
  campaignId: number,
  sequences: Array<{ subject: string; body: string; waitDays?: number }>
): Promise<{ stepsAdded: number }> {
  const seqBody = sequences.map((s, i) => ({
    seq_number: i + 1,
    seq_delay_details: { delay_in_days: s.waitDays || (i === 0 ? 0 : 2) },
    subject: i === 0 ? s.subject : null, // follow-ups use same thread
    email_body: s.body,
  }));

  await smartleadFetch(`/campaigns/${campaignId}/sequences`, {
    method: 'POST',
    body: { sequences: seqBody },
  });

  return { stepsAdded: sequences.length };
}

/** Set campaign schedule (sending days/times) */
export async function setCampaignSchedule(
  campaignId: number,
  schedule: {
    timezone: string;
    days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
    startHour: string;
    endHour: string;
    dailyLimit: number;
  }
): Promise<{ status: string }> {
  await smartleadFetch(`/campaigns/${campaignId}/schedule`, {
    method: 'POST',
    body: {
      timezone: schedule.timezone,
      days_of_the_week: schedule.days,
      start_hour: schedule.startHour,
      end_hour: schedule.endHour,
      min_time_btw_emails: 45,
      max_new_leads_per_day: schedule.dailyLimit,
    },
  });

  return { status: 'scheduled' };
}

/** Launch/start a campaign */
export async function launchCampaign(campaignId: number): Promise<{ status: string }> {
  await smartleadFetch(`/campaigns/${campaignId}/status`, {
    method: 'POST',
    body: { status: 'START' },
  });
  return { status: 'active' };
}

/** Pause a campaign */
export async function pauseCampaign(campaignId: number): Promise<{ status: string }> {
  await smartleadFetch(`/campaigns/${campaignId}/status`, {
    method: 'POST',
    body: { status: 'PAUSED' },
  });
  return { status: 'paused' };
}

/** Get campaign analytics/stats */
export async function getCampaignStats(campaignId: number): Promise<SmartLeadCampaignStats> {
  const result = await smartleadFetch(`/campaigns/${campaignId}/analytics`);

  return {
    campaignId,
    totalSent: result.sent_count || 0,
    totalOpened: result.open_count || 0,
    totalReplied: result.reply_count || 0,
    totalBounced: result.bounce_count || 0,
    openRate: result.open_rate || 0,
    replyRate: result.reply_rate || 0,
    bounceRate: result.bounce_rate || 0,
  };
}

/** List all campaigns */
export async function listCampaigns(): Promise<SmartLeadCampaign[]> {
  const result = await smartleadFetch('/campaigns');
  const items = Array.isArray(result) ? result : result.data || [];
  return items.map((c: any) => ({
    id: c.id,
    name: c.name,
    status: c.status || 'draft',
    createdAt: c.created_at || new Date().toISOString(),
  }));
}

/** Check if SmartLead API is available */
export function isSmartLeadAvailable(): boolean {
  return !!getApiKey();
}
