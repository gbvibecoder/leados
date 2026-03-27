// Phantombuster API client for LinkedIn automation
// Docs: https://hub.phantombuster.com/reference

const PHANTOMBUSTER_BASE = 'https://api.phantombuster.com/api/v2';

function getApiKey(): string | null {
  return process.env.PHANTOMBUSTER_API_KEY || null;
}

const PHANTOMBUSTER_TIMEOUT_MS = 30_000;

async function phantombusterFetch(endpoint: string, options: { method?: string; body?: any } = {}): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('PHANTOMBUSTER_API_KEY not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PHANTOMBUSTER_TIMEOUT_MS);
  const res = await fetch(`${PHANTOMBUSTER_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-Phantombuster-Key': apiKey,
    },
    signal: controller.signal,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Phantombuster API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ─── Pre-built Phantom IDs (set via env or use defaults) ────────────────────

function getPhantomId(type: 'search' | 'connect' | 'message'): string | null {
  switch (type) {
    case 'search': return process.env.PHANTOMBUSTER_SEARCH_PHANTOM_ID || null;
    case 'connect': return process.env.PHANTOMBUSTER_CONNECT_PHANTOM_ID || null;
    case 'message': return process.env.PHANTOMBUSTER_MESSAGE_PHANTOM_ID || null;
    default: return null;
  }
}

function getLinkedInCookie(): string | null {
  return process.env.PHANTOMBUSTER_LINKEDIN_COOKIE || null;
}

export interface LinkedInProfile {
  linkedInUrl: string;
  firstName: string;
  lastName: string;
  headline: string;
  company: string;
  jobTitle: string;
  location: string;
  connectionDegree: string;
}

export interface PhantomLaunchResult {
  containerId: string;
  phantomId: string;
  status: 'running' | 'queued';
}

export interface PhantomResult {
  containerId: string;
  status: 'finished' | 'running' | 'error';
  output: any;
  resultUrl?: string;
}

export interface ConnectionRequestResult {
  sent: number;
  failed: number;
  profiles: Array<{
    linkedInUrl: string;
    name: string;
    status: 'sent' | 'already_connected' | 'pending' | 'failed';
  }>;
}

export interface MessageResult {
  sent: number;
  failed: number;
  messages: Array<{
    linkedInUrl: string;
    name: string;
    status: 'sent' | 'failed' | 'not_connected';
  }>;
}

/** Search LinkedIn profiles matching criteria using LinkedIn Search Export phantom */
export async function searchProfiles(params: {
  searchUrl?: string;
  jobTitles?: string[];
  companySize?: string;
  industries?: string[];
  geography?: string;
  limit?: number;
}): Promise<LinkedInProfile[]> {
  const phantomId = getPhantomId('search');
  if (!phantomId) throw new Error('PHANTOMBUSTER_SEARCH_PHANTOM_ID not configured');

  const sessionCookie = getLinkedInCookie();
  if (!sessionCookie) throw new Error('PHANTOMBUSTER_LINKEDIN_COOKIE not configured — get your li_at cookie from LinkedIn');

  // Build search URL or use keyword query
  const searchUrl = params.searchUrl || buildSearchUrl(params);
  const searchKeyword = params.jobTitles?.join(' OR ') || '';

  const result = await launchPhantom(phantomId, {
    search: searchUrl,
    sessionCookie,
    numberOfProfiles: params.limit || 25,
    numberOfResultsPerSearch: params.limit || 25,
    ...(searchKeyword && { searchKeyword }),
  });

  // Wait for results (poll agent output, not container)
  const output = await waitForPhantom(phantomId);

  if (!output.output || !Array.isArray(output.output)) {
    return [];
  }

  return output.output.map((p: any) => ({
    linkedInUrl: p.profileUrl || p.linkedInUrl || '',
    firstName: p.firstName || p.first_name || '',
    lastName: p.lastName || p.last_name || '',
    headline: p.headline || '',
    company: p.companyName || p.company || '',
    jobTitle: p.title || p.jobTitle || '',
    location: p.location || '',
    connectionDegree: p.degree || p.connectionDegree || 'unknown',
  }));
}

/** Send personalized connection requests */
export async function sendConnectionRequests(
  profiles: Array<{ linkedInUrl: string; message: string }>
): Promise<ConnectionRequestResult> {
  const phantomId = getPhantomId('connect');
  if (!phantomId) throw new Error('PHANTOMBUSTER_CONNECT_PHANTOM_ID not configured');

  const sessionCookie = getLinkedInCookie();
  if (!sessionCookie) throw new Error('PHANTOMBUSTER_LINKEDIN_COOKIE not configured');

  const connectPhantomId = phantomId;
  const result = await launchPhantom(connectPhantomId, {
    sessionCookie,
    spreadsheetUrl: profiles.map((p) => p.linkedInUrl),
    message: profiles[0]?.message || '',
  });

  const output = await waitForPhantom(connectPhantomId);
  const results = Array.isArray(output.output) ? output.output : [];

  let sent = 0;
  let failed = 0;
  const profileResults = results.map((r: any) => {
    const status: 'sent' | 'already_connected' | 'pending' | 'failed' = r.error ? 'failed' : (r.alreadyConnected ? 'already_connected' : 'sent');
    if (status === 'sent') sent++;
    else if (status === 'failed') failed++;
    return {
      linkedInUrl: r.profileUrl || r.url || '' as string,
      name: (r.name || `${r.firstName || ''} ${r.lastName || ''}`.trim()) as string,
      status,
    };
  });

  return { sent, failed, profiles: profileResults };
}

/** Send DM messages to connected profiles */
export async function sendMessages(
  messages: Array<{ linkedInUrl: string; message: string }>
): Promise<MessageResult> {
  const msgPhantomId = getPhantomId('message');
  if (!msgPhantomId) throw new Error('PHANTOMBUSTER_MESSAGE_PHANTOM_ID not configured');

  const sessionCookie = getLinkedInCookie();
  if (!sessionCookie) throw new Error('PHANTOMBUSTER_LINKEDIN_COOKIE not configured');

  const result = await launchPhantom(msgPhantomId, {
    sessionCookie,
    spreadsheetUrl: messages.map((m) => m.linkedInUrl),
    message: messages[0]?.message || '',
  });

  const output = await waitForPhantom(msgPhantomId);
  const results = Array.isArray(output.output) ? output.output : [];

  let sent = 0;
  let failed = 0;
  const messageResults = results.map((r: any) => {
    const status: 'sent' | 'failed' | 'not_connected' = r.error
      ? (r.error.includes('not connected') ? 'not_connected' : 'failed')
      : 'sent';
    if (status === 'sent') sent++;
    else failed++;
    return {
      linkedInUrl: (r.profileUrl || r.url || '') as string,
      name: (r.name || '') as string,
      status,
    };
  });

  return { sent, failed, messages: messageResults };
}

/** Launch a phantom with arguments */
async function launchPhantom(phantomId: string, args: Record<string, any>): Promise<PhantomLaunchResult> {
  const result = await phantombusterFetch(`/agents/launch`, {
    method: 'POST',
    body: {
      id: phantomId,
      argument: args,
    },
  });

  return {
    containerId: result.containerId,
    phantomId,
    status: 'running',
  };
}

/** Get phantom execution result via agent output (includes S3 result URL) */
export async function getPhantomResult(phantomId: string): Promise<PhantomResult> {
  const result = await phantombusterFetch(`/agents/fetch-output?id=${phantomId}`);

  const isRunning = result.isAgentRunning === true;
  const status: 'finished' | 'running' | 'error' = isRunning ? 'running' : 'finished';

  let output: any = null;
  // Phantombuster stores results at an S3 URL — fetch and parse
  if (!isRunning && result.resultObject) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PHANTOMBUSTER_TIMEOUT_MS);
      const s3Res = await fetch(result.resultObject, { signal: controller.signal });
      clearTimeout(timeout);
      if (s3Res.ok) {
        const text = await s3Res.text();
        try { output = JSON.parse(text); } catch { output = text; }
      }
    } catch { /* S3 fetch failed — continue with null */ }
  }

  return {
    containerId: result.containerId || '',
    status,
    output,
    resultUrl: result.resultObject || undefined,
  };
}

/** Poll for phantom completion with exponential backoff */
async function waitForPhantom(phantomId: string, maxWaitMs = 120_000): Promise<PhantomResult> {
  const startTime = Date.now();
  let delay = 3000;

  while (Date.now() - startTime < maxWaitMs) {
    const result = await getPhantomResult(phantomId);
    if (result.status === 'finished' || result.status === 'error') {
      return result;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 1.5, 10_000);
  }

  return { containerId: '', status: 'error', output: null };
}

/** Build a regular LinkedIn people search URL from criteria */
function buildSearchUrl(params: {
  jobTitles?: string[];
  companySize?: string;
  industries?: string[];
  geography?: string;
}): string {
  // Use regular LinkedIn search (not Sales Navigator) — compatible with LinkedIn Search Export phantom
  const keywords = params.jobTitles?.join(' OR ') || '';
  const base = 'https://www.linkedin.com/search/results/people/';
  const queryParts: string[] = [];

  if (keywords) {
    queryParts.push(`keywords=${encodeURIComponent(keywords)}`);
  }

  return queryParts.length > 0 ? `${base}?${queryParts.join('&')}` : base;
}

/** Check if Phantombuster API is available */
export function isPhantombusterAvailable(): boolean {
  return !!getApiKey();
}

/** Check if LinkedIn search phantom is configured */
export function isSearchAvailable(): boolean {
  return isPhantombusterAvailable() && !!getPhantomId('search') && !!getLinkedInCookie();
}

/** Check if LinkedIn connect phantom is configured */
export function isConnectAvailable(): boolean {
  return isPhantombusterAvailable() && !!getPhantomId('connect') && !!getLinkedInCookie();
}

/** Check if LinkedIn message phantom is configured */
export function isMessageAvailable(): boolean {
  return isPhantombusterAvailable() && !!getPhantomId('message') && !!getLinkedInCookie();
}
