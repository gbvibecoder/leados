/**
 * Trend Cache Service
 * Manages daily caching of trend data to avoid excessive API calls
 * Data refreshes automatically once per day
 */

export interface CachedTrendData {
  lastUpdated: string;
  expiresAt: string;
  data: any;
}

const CACHE_KEY_PREFIX = 'leados_trends_';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory cache for server-side
const memoryCache = new Map<string, CachedTrendData>();

export function getCacheKey(agentId: string, focus: string = 'default'): string {
  return `${CACHE_KEY_PREFIX}${agentId}_${focus}`;
}

export function isCacheValid(cached: CachedTrendData | null): boolean {
  if (!cached) return false;
  return new Date(cached.expiresAt) > new Date();
}

export function getCachedData(key: string): CachedTrendData | null {
  const cached = memoryCache.get(key);
  if (cached && isCacheValid(cached)) {
    return cached;
  }
  return null;
}

export function setCachedData(key: string, data: any): CachedTrendData {
  const now = new Date();
  const cached: CachedTrendData = {
    lastUpdated: now.toISOString(),
    expiresAt: new Date(now.getTime() + CACHE_DURATION_MS).toISOString(),
    data,
  };
  memoryCache.set(key, cached);
  return cached;
}

export function getNextRefreshTime(): string {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

export function formatLastUpdated(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return date.toLocaleDateString();
}
