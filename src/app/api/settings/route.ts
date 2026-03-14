import { NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth';

// Per-user settings store (in-memory; keyed by userId or 'anonymous')
const settingsStoreByUser: Record<string, any> = {};

function getDefaultSettings() {
  return {
    integrations: {
      anthropic: { key: '', status: 'disconnected' },
      hubspot: { key: '', status: 'disconnected' },
      ghl: { key: '', status: 'disconnected' },
      instantly: { key: '', status: 'disconnected' },
      smartlead: { key: '', status: 'disconnected' },
      phantombuster: { key: '', status: 'disconnected' },
      blandai: { key: '', status: 'disconnected' },
      vapi: { key: '', status: 'disconnected' },
      meta: { appId: '', appSecret: '', accessToken: '', status: 'disconnected' },
      googleAds: { clientId: '', clientSecret: '', developerToken: '', status: 'disconnected' },
    },
    notifications: { email: true, slack: false, webhook: false },
    agentDefaults: { maxRetries: 3, timeoutSeconds: 300, model: 'claude-sonnet-4-20250514' },
  };
}

function getUserSettings(userId: string | null): any {
  const key = userId || 'anonymous';
  if (!settingsStoreByUser[key]) {
    settingsStoreByUser[key] = getDefaultSettings();
  }
  return settingsStoreByUser[key];
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return key ? '****' : '';
  return '****' + key.slice(-4);
}

export async function GET(req?: Request) {
  const userId = getUserId(req || null);
  const settingsStore = getUserSettings(userId);

  const masked = JSON.parse(JSON.stringify(settingsStore));
  for (const [, integration] of Object.entries(masked.integrations) as any) {
    if (integration.key) integration.key = maskKey(integration.key);
    if (integration.appSecret) integration.appSecret = maskKey(integration.appSecret);
    if (integration.accessToken) integration.accessToken = maskKey(integration.accessToken);
    if (integration.clientSecret) integration.clientSecret = maskKey(integration.clientSecret);
  }
  return NextResponse.json(masked);
}

export async function PUT(req: Request) {
  const userId = getUserId(req);
  const body = await req.json();
  const key = userId || 'anonymous';
  settingsStoreByUser[key] = { ...getUserSettings(userId), ...body };
  return NextResponse.json({ success: true, message: 'Settings updated' });
}
