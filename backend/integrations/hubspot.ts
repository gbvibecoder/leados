// HubSpot CRM API client
// Docs: https://developers.hubspot.com/docs/api/overview

const HUBSPOT_BASE = 'https://api.hubapi.com';

function getApiKey(): string | null {
  return process.env.HUBSPOT_API_KEY || null;
}

async function hubspotFetch(endpoint: string, options: { method?: string; body?: any } = {}): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('HUBSPOT_API_KEY not configured');

  const res = await fetch(`${HUBSPOT_BASE}${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot API error ${res.status}: ${text}`);
  }

  return res.json();
}

export interface HubSpotContact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  lifecycleStage: string;
  leadScore?: number;
  properties: Record<string, any>;
}

/** Create a new contact */
export async function createContact(data: {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  properties?: Record<string, any>;
}): Promise<HubSpotContact> {
  const properties: Record<string, string> = {
    email: data.email,
  };
  if (data.firstName) properties.firstname = data.firstName;
  if (data.lastName) properties.lastname = data.lastName;
  if (data.company) properties.company = data.company;
  if (data.phone) properties.phone = data.phone;
  if (data.properties) {
    for (const [k, v] of Object.entries(data.properties)) {
      properties[k] = String(v);
    }
  }

  const result = await hubspotFetch('/crm/v3/objects/contacts', {
    method: 'POST',
    body: { properties },
  });

  return mapContact(result);
}

/** Update an existing contact */
export async function updateContact(
  contactId: string,
  properties: Record<string, any>
): Promise<HubSpotContact> {
  const props: Record<string, string> = {};
  for (const [k, v] of Object.entries(properties)) {
    props[k] = String(v);
  }

  const result = await hubspotFetch(`/crm/v3/objects/contacts/${contactId}`, {
    method: 'PATCH',
    body: { properties: props },
  });

  return mapContact(result);
}

/** Get all contacts (paginated) */
export async function getContacts(limit = 100): Promise<HubSpotContact[]> {
  const result = await hubspotFetch(
    `/crm/v3/objects/contacts?limit=${limit}&properties=email,firstname,lastname,company,phone,lifecyclestage,hs_lead_status`
  );

  return (result.results || []).map(mapContact);
}

/** Search contacts by email */
export async function searchContactByEmail(email: string): Promise<HubSpotContact | null> {
  try {
    const result = await hubspotFetch('/crm/v3/objects/contacts/search', {
      method: 'POST',
      body: {
        filterGroups: [
          {
            filters: [{ propertyName: 'email', operator: 'EQ', value: email }],
          },
        ],
      },
    });
    if (result.results?.length > 0) {
      return mapContact(result.results[0]);
    }
    return null;
  } catch {
    return null;
  }
}

/** Create or update contact (upsert by email) */
export async function upsertContact(data: {
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  properties?: Record<string, any>;
}): Promise<HubSpotContact> {
  const existing = await searchContactByEmail(data.email);
  if (existing) {
    const props: Record<string, any> = {};
    if (data.firstName) props.firstname = data.firstName;
    if (data.lastName) props.lastname = data.lastName;
    if (data.company) props.company = data.company;
    if (data.phone) props.phone = data.phone;
    if (data.properties) Object.assign(props, data.properties);
    return updateContact(existing.id, props);
  }
  return createContact(data);
}

/** Create a custom property */
export async function createProperty(
  name: string,
  label: string,
  type: string,
  groupName = 'contactinformation'
): Promise<any> {
  return hubspotFetch('/crm/v3/properties/contacts', {
    method: 'POST',
    body: {
      name,
      label,
      type,
      fieldType: type === 'number' ? 'number' : 'text',
      groupName,
    },
  });
}

function mapContact(raw: any): HubSpotContact {
  const props = raw.properties || {};
  return {
    id: raw.id,
    email: props.email || '',
    firstName: props.firstname || '',
    lastName: props.lastname || '',
    company: props.company || '',
    phone: props.phone || '',
    lifecycleStage: props.lifecyclestage || 'subscriber',
    leadScore: props.hs_lead_status ? parseInt(props.hs_lead_status) : undefined,
    properties: props,
  };
}

/** Check if HubSpot API is available */
export function isHubSpotAvailable(): boolean {
  return !!getApiKey();
}
