// Shared Google OAuth 2.0 helper for Google Ads and GA4
// Both APIs use the same OAuth credentials for token refresh

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function getClientId(): string | null {
  return process.env.GOOGLE_ADS_CLIENT_ID || null;
}

function getClientSecret(): string | null {
  return process.env.GOOGLE_ADS_CLIENT_SECRET || null;
}

function getRefreshToken(): string | null {
  return process.env.GOOGLE_ADS_REFRESH_TOKEN || null;
}

/** Check if Google OAuth credentials are configured */
export function isGoogleOAuthAvailable(): boolean {
  return !!(getClientId() && getClientSecret() && getRefreshToken());
}

/** Get a valid access token, refreshing if needed */
export async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.accessToken;
  }

  const clientId = getClientId();
  const clientSecret = getClientSecret();
  const refreshToken = getRefreshToken();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google OAuth credentials not configured (CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN)');
  }

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google OAuth token refresh failed ${res.status}: ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  return cachedToken.accessToken;
}
