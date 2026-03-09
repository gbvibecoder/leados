const API_BASE = '/api';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API Error: ${res.status}`);
  }
  return res.json();
}

// Pipeline endpoints
export const pipelines = {
  create: (data: { type: string; config?: Record<string, unknown> }) =>
    fetchApi<any>('/pipelines', { method: 'POST', body: JSON.stringify(data) }),
  list: () => fetchApi<any[]>('/pipelines'),
  get: (id: string) => fetchApi<any>(`/pipelines/${id}`),
  start: (id: string) =>
    fetchApi<any>(`/pipelines/${id}/start`, { method: 'POST' }),
  pause: (id: string) =>
    fetchApi<any>(`/pipelines/${id}/pause`, { method: 'POST' }),
  delete: (id: string) =>
    fetchApi<void>(`/pipelines/${id}`, { method: 'DELETE' }),
};

// Agent endpoints
export const agents = {
  list: () => fetchApi<any[]>('/agents'),
  get: (id: string) => fetchApi<any>(`/agents/${id}`),
  run: (id: string, data?: { pipelineId?: string; config?: Record<string, unknown> }) =>
    fetchApi<any>(`/agents/${id}/run`, { method: 'POST', body: JSON.stringify(data || {}) }),
  runs: (id: string) => fetchApi<any[]>(`/agents/${id}/runs`),
};

// LeadOS endpoints
export const leados = {
  getLeads: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<any[]>(`/leados/leads${query}`);
  },
  getLead: (id: string) => fetchApi<any>(`/leados/leads/${id}`),
  updateLead: (id: string, data: Record<string, unknown>) =>
    fetchApi<any>(`/leados/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  analytics: () => fetchApi<any>('/leados/analytics'),
};

// Settings endpoints
export const settings = {
  get: () => fetchApi<any>('/settings'),
  update: (data: Record<string, unknown>) =>
    fetchApi<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  integrations: () => fetchApi<any>('/settings/integrations'),
};

// SSE connection for real-time updates
export function connectSSE(onEvent: (event: { type: string; data: any }) => void): EventSource {
  const es = new EventSource(`${API_BASE}/events`);

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent(data);
    } catch {
      // ignore parse errors
    }
  };

  es.onerror = () => {
    // EventSource will auto-reconnect
  };

  return es;
}
