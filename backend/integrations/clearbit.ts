// Clearbit API client for company/person enrichment
// Docs: https://dashboard.clearbit.com/docs

const CLEARBIT_BASE = 'https://company.clearbit.com/v2';
const CLEARBIT_PERSON_BASE = 'https://person.clearbit.com/v2';

function getApiKey(): string | null {
  return process.env.CLEARBIT_API_KEY || null;
}

async function clearbitFetch(url: string): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('CLEARBIT_API_KEY not configured');

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Clearbit API error ${res.status}: ${text}`);
  }

  return res.json();
}

export interface ClearbitCompany {
  name: string;
  domain: string;
  industry: string;
  sector: string;
  employeeCount: number;
  annualRevenue: string;
  fundingTotal: string;
  techStack: string[];
  description: string;
  location: string;
  socialProfiles: Record<string, string>;
}

export interface ClearbitPerson {
  email: string;
  fullName: string;
  title: string;
  role: string;
  seniority: string;
  company: ClearbitCompany;
}

/** Enrich a company by domain */
export async function enrichCompany(domain: string): Promise<ClearbitCompany> {
  const data = await clearbitFetch(`${CLEARBIT_BASE}/companies/find?domain=${encodeURIComponent(domain)}`);

  return {
    name: data.name || '',
    domain: data.domain || domain,
    industry: data.category?.industry || '',
    sector: data.category?.sector || '',
    employeeCount: data.metrics?.employees || 0,
    annualRevenue: data.metrics?.estimatedAnnualRevenue || 'Unknown',
    fundingTotal: data.metrics?.raised ? `$${(data.metrics.raised / 1000000).toFixed(1)}M` : 'Unknown',
    techStack: (data.tech || []).map((t: any) => t),
    description: data.description || '',
    location: data.geo ? `${data.geo.city || ''}, ${data.geo.state || ''}, ${data.geo.country || ''}`.replace(/^, |, $/g, '') : '',
    socialProfiles: {
      linkedin: data.linkedin?.handle ? `linkedin.com/company/${data.linkedin.handle}` : '',
      twitter: data.twitter?.handle ? `twitter.com/${data.twitter.handle}` : '',
    },
  };
}

/** Enrich a person by email */
export async function enrichPerson(email: string): Promise<ClearbitPerson> {
  const data = await clearbitFetch(`${CLEARBIT_PERSON_BASE}/combined/find?email=${encodeURIComponent(email)}`);

  const person = data.person || {};
  const company = data.company || {};

  return {
    email: person.email || email,
    fullName: person.name?.fullName || '',
    title: person.employment?.title || '',
    role: person.employment?.role || '',
    seniority: person.employment?.seniority || '',
    company: {
      name: company.name || '',
      domain: company.domain || '',
      industry: company.category?.industry || '',
      sector: company.category?.sector || '',
      employeeCount: company.metrics?.employees || 0,
      annualRevenue: company.metrics?.estimatedAnnualRevenue || 'Unknown',
      fundingTotal: company.metrics?.raised ? `$${(company.metrics.raised / 1000000).toFixed(1)}M` : 'Unknown',
      techStack: (company.tech || []).map((t: any) => t),
      description: company.description || '',
      location: company.geo ? `${company.geo.city || ''}, ${company.geo.state || ''}`.replace(/^, |, $/g, '') : '',
      socialProfiles: {
        linkedin: company.linkedin?.handle ? `linkedin.com/company/${company.linkedin.handle}` : '',
        twitter: company.twitter?.handle ? `twitter.com/${company.twitter.handle}` : '',
      },
    },
  };
}

/** Check if Clearbit API is available */
export function isClearbitAvailable(): boolean {
  return !!getApiKey();
}
