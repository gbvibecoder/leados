// Webflow CMS API v2 client for landing page deployment
// Docs: https://developers.webflow.com/data/reference

const WEBFLOW_BASE = 'https://api.webflow.com/v2';

function getApiToken(): string | null {
  return process.env.WEBFLOW_API_TOKEN || null;
}

function getSiteId(): string | null {
  return process.env.WEBFLOW_SITE_ID || null;
}

export interface WebflowSite {
  id: string;
  displayName: string;
  shortName: string;
  previewUrl: string;
  customDomains: string[];
}

export interface WebflowCollection {
  id: string;
  displayName: string;
  slug: string;
  fields: any[];
}

export interface WebflowPageConfig {
  title: string;
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
}

async function webflowFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const apiToken = getApiToken();
  if (!apiToken) throw new Error('WEBFLOW_API_TOKEN not configured');

  const res = await fetch(`${WEBFLOW_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webflow API error ${res.status}: ${text}`);
  }

  return res.json();
}

/** Get all sites accessible with this API token */
export async function getSites(): Promise<WebflowSite[]> {
  const data = await webflowFetch('/sites');

  return (data.sites || []).map((site: any) => ({
    id: site.id,
    displayName: site.displayName || site.name || '',
    shortName: site.shortName || '',
    previewUrl: site.previewUrl || '',
    customDomains: (site.customDomains || []).map((d: any) => d.url || d),
  }));
}

/** Get site details including the primary domain */
export async function getSiteDetails(siteId?: string): Promise<WebflowSite | null> {
  const id = siteId || getSiteId();
  if (!id) return null;

  try {
    const data = await webflowFetch(`/sites/${id}`);
    return {
      id: data.id,
      displayName: data.displayName || data.name || '',
      shortName: data.shortName || '',
      previewUrl: data.previewUrl || '',
      customDomains: (data.customDomains || []).map((d: any) => d.url || d),
    };
  } catch {
    return null;
  }
}

/** Get collections (CMS databases) for a site */
export async function getCollections(siteId?: string): Promise<WebflowCollection[]> {
  const id = siteId || getSiteId();
  if (!id) throw new Error('WEBFLOW_SITE_ID not configured');

  const data = await webflowFetch(`/sites/${id}/collections`);

  return (data.collections || []).map((col: any) => ({
    id: col.id,
    displayName: col.displayName || col.name || '',
    slug: col.slug || '',
    fields: col.fields || [],
  }));
}

/** Create a CMS collection item (e.g., a landing page entry) */
export async function createCollectionItem(
  collectionId: string,
  fields: Record<string, any>
): Promise<{ itemId: string; slug: string }> {
  const data = await webflowFetch(`/collections/${collectionId}/items`, {
    method: 'POST',
    body: JSON.stringify({
      isArchived: false,
      isDraft: false,
      fieldData: fields,
    }),
  });

  return {
    itemId: data.id || '',
    slug: data.fieldData?.slug || fields.slug || '',
  };
}

/** Create a static page on a site */
export async function createPage(config: WebflowPageConfig, siteId?: string): Promise<{ pageId: string; url: string }> {
  const id = siteId || getSiteId();
  if (!id) throw new Error('WEBFLOW_SITE_ID not configured');

  const data = await webflowFetch(`/sites/${id}/pages`, {
    method: 'POST',
    body: JSON.stringify({
      title: config.title,
      slug: config.slug,
      seo: {
        title: config.seoTitle || config.title,
        description: config.seoDescription || '',
      },
    }),
  });

  // Get site domain for full URL
  const site = await getSiteDetails(id);
  const domain = site?.customDomains?.[0] || site?.previewUrl || `https://${site?.shortName}.webflow.io`;
  const cleanDomain = domain.replace(/\/+$/, '');

  return {
    pageId: data.id || '',
    url: `${cleanDomain}/${config.slug}`,
  };
}

/** Publish a site to make changes live */
export async function publishSite(siteId?: string): Promise<boolean> {
  const id = siteId || getSiteId();
  if (!id) return false;

  try {
    await webflowFetch(`/sites/${id}/publish`, { method: 'POST' });
    return true;
  } catch {
    return false;
  }
}

/** Get all pages for a site */
export async function getPages(siteId?: string): Promise<any[]> {
  const id = siteId || getSiteId();
  if (!id) return [];

  try {
    const data = await webflowFetch(`/sites/${id}/pages`);
    return (data.pages || []).map((page: any) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      url: page.url,
    }));
  } catch {
    return [];
  }
}

/** Check if Webflow API is available */
export function isWebflowAvailable(): boolean {
  return !!(getApiToken() && getSiteId());
}
