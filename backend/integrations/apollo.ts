// Apollo.io API client for prospect enrichment and lead scraping
// Docs: https://apolloio.github.io/apollo-api-docs/

const APOLLO_BASE = 'https://api.apollo.io/v1';

function getApiKey(): string | null {
  return process.env.APOLLO_API_KEY || null;
}

export interface ApolloPersonSearchParams {
  jobTitles?: string[];
  companySize?: string;
  industries?: string[];
  locations?: string[];
  limit?: number;
}

export interface ApolloPerson {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  industry: string;
  companySize: string;
  linkedInUrl: string;
  phone?: string;
}

export interface ApolloEnrichmentResult {
  email: string;
  firstName: string;
  lastName: string;
  title: string;
  companyName: string;
  companyRevenue: string;
  employeeCount: number;
  industry: string;
  techStack: string[];
  fundingStatus: string;
  linkedInUrl: string;
  phone: string;
  decisionMaker: boolean;
}

async function apolloFetch(endpoint: string, body: Record<string, any>): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('APOLLO_API_KEY not configured');

  const res = await fetch(`${APOLLO_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({ ...body, api_key: apiKey }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo API error ${res.status}: ${text}`);
  }

  return res.json();
}

/** Search for prospects matching ICP criteria */
export async function searchProspects(params: ApolloPersonSearchParams): Promise<ApolloPerson[]> {
  const body: Record<string, any> = {
    per_page: params.limit || 25,
    person_titles: params.jobTitles || [],
    person_locations: params.locations || ['United States'],
  };

  if (params.industries?.length) {
    body.organization_industry_tag_ids = params.industries;
  }

  const data = await apolloFetch('/mixed_people/search', body);

  return (data.people || []).map((p: any) => ({
    firstName: p.first_name || '',
    lastName: p.last_name || '',
    email: p.email || '',
    company: p.organization?.name || '',
    jobTitle: p.title || '',
    industry: p.organization?.industry || '',
    companySize: p.organization?.estimated_num_employees
      ? `${p.organization.estimated_num_employees} employees`
      : 'Unknown',
    linkedInUrl: p.linkedin_url || '',
    phone: p.phone_numbers?.[0]?.sanitized_number || '',
  }));
}

/** Enrich a single contact by email */
export async function enrichContact(email: string): Promise<ApolloEnrichmentResult> {
  const data = await apolloFetch('/people/match', { email });
  const p = data.person || {};
  const org = p.organization || {};

  return {
    email: p.email || email,
    firstName: p.first_name || '',
    lastName: p.last_name || '',
    title: p.title || '',
    companyName: org.name || '',
    companyRevenue: org.estimated_annual_revenue || 'Unknown',
    employeeCount: org.estimated_num_employees || 0,
    industry: org.industry || '',
    techStack: (org.current_technologies || []).map((t: any) => t.name || t),
    fundingStatus: org.latest_funding_stage || 'Unknown',
    linkedInUrl: p.linkedin_url || '',
    phone: p.phone_numbers?.[0]?.sanitized_number || '',
    decisionMaker: ['C-Suite', 'VP', 'Director', 'Head', 'Founder', 'Owner', 'Partner'].some(
      (t) => (p.title || '').includes(t)
    ),
  };
}

/** Bulk enrich multiple contacts */
export async function bulkEnrich(emails: string[]): Promise<ApolloEnrichmentResult[]> {
  const results: ApolloEnrichmentResult[] = [];
  for (const email of emails) {
    try {
      const enriched = await enrichContact(email);
      results.push(enriched);
    } catch {
      // Skip failed enrichments
    }
  }
  return results;
}

/** Check if Apollo API is available */
export function isApolloAvailable(): boolean {
  return !!getApiKey();
}
