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

const APOLLO_TIMEOUT_MS = 20_000;

async function apolloFetch(endpoint: string, body: Record<string, any>): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('APOLLO_API_KEY not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APOLLO_TIMEOUT_MS);
  const res = await fetch(`${APOLLO_BASE}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Api-Key': apiKey,
    },
    signal: controller.signal,
    body: JSON.stringify(body),
  });
  clearTimeout(timeout);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apollo API error ${res.status}: ${text}`);
  }

  return res.json();
}

/** Search for prospects matching ICP criteria, then enrich each to reveal contact details */
export async function searchProspects(params: ApolloPersonSearchParams): Promise<ApolloPerson[]> {
  const body: Record<string, any> = {
    per_page: params.limit || 25,
    person_titles: params.jobTitles || [],
    person_locations: params.locations || ['United States'],
  };

  if (params.industries?.length) {
    // Use keyword tags for text-based industry search (not tag IDs which require numeric values)
    body.q_organization_keyword_tags = params.industries;
  }

  const data = await apolloFetch('/mixed_people/api_search', body);
  const searchResults = data.people || [];

  if (searchResults.length === 0) return [];

  // ── Try enrichment on first person to check if plan supports it ──
  let enrichmentAvailable = false;
  try {
    const testMatch = await apolloFetch('/people/match', { id: searchResults[0].id });
    enrichmentAvailable = !!(testMatch.person?.email || testMatch.person?.last_name);
  } catch {
    // Enrichment not available on this plan (422 or 403) — use search data only
    enrichmentAvailable = false;
  }

  if (!enrichmentAvailable) {
    // Map search results directly — obfuscated last names, no emails
    return searchResults.map((person: any) => {
      const org = person.organization || {};
      const lastNameObf = person.last_name_obfuscated || person.last_name || '';
      return {
        firstName: person.first_name || '',
        lastName: lastNameObf,
        email: person.email || '',
        company: org.name || '',
        jobTitle: person.title || '',
        industry: org.industry || '',
        companySize: org.estimated_num_employees
          ? `${org.estimated_num_employees} employees`
          : (org.has_employee_count ? 'Available with enrichment' : 'Unknown'),
        linkedInUrl: person.linkedin_url || '',
        phone: '',
      } as ApolloPerson;
    });
  }

  // ── Enrichment available — reveal emails, phones, LinkedIn URLs ──
  const enriched: ApolloPerson[] = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < searchResults.length; i += BATCH_SIZE) {
    const batch = searchResults.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async (person: any) => {
        const match = await apolloFetch('/people/match', { id: person.id });
        const p = match.person || {};
        const org = p.organization || {};
        return {
          firstName: p.first_name || person.first_name || '',
          lastName: p.last_name || '',
          email: p.email || '',
          company: org.name || person.organization?.name || '',
          jobTitle: p.title || person.title || '',
          industry: org.industry || '',
          companySize: org.estimated_num_employees
            ? `${org.estimated_num_employees} employees`
            : 'Unknown',
          linkedInUrl: p.linkedin_url || '',
          phone: p.phone_numbers?.[0]?.sanitized_number || org.sanitized_phone || '',
        } as ApolloPerson;
      })
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      if (result.status === 'fulfilled') {
        enriched.push(result.value);
      } else {
        const person = batch[j];
        enriched.push({
          firstName: person.first_name || '',
          lastName: person.last_name_obfuscated || '',
          email: '',
          company: person.organization?.name || '',
          jobTitle: person.title || '',
          industry: '',
          companySize: 'Unknown',
          linkedInUrl: '',
          phone: '',
        });
      }
    }
  }

  return enriched;
}

/** Enrich a single contact by email, or by name + company */
export async function enrichContact(email: string, firstName?: string, lastName?: string, organizationName?: string): Promise<ApolloEnrichmentResult> {
  const matchBody: Record<string, any> = {};
  if (email) matchBody.email = email;
  if (firstName) matchBody.first_name = firstName;
  if (lastName) matchBody.last_name = lastName;
  if (organizationName) matchBody.organization_name = organizationName;
  const data = await apolloFetch('/people/match', matchBody);
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
