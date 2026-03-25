const API_BASE = '/api';

/** Low-level fetch wrapper that injects the auth Bearer token. */
export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('leados_token') : null;
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(url, { ...options, headers });
  // Auto-redirect on 401
  if (response.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('leados_token');
    localStorage.removeItem('leados_user');
    // Clear zustand store to prevent stale data leaking to next user
    const { useAppStore } = await import('@/lib/store');
    useAppStore.getState().logout();
    window.location.href = '/login';
  }
  return response;
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(`${API_BASE}${url}`, {
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
  create: (data: { type: string; config?: Record<string, unknown>; projectId?: string }) =>
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
  run: (id: string, data?: { pipelineId?: string; config?: Record<string, unknown>; previousOutputs?: Record<string, unknown> }, signal?: AbortSignal) =>
    fetchApi<any>(`/agents/${id}/run`, { method: 'POST', body: JSON.stringify(data || {}), signal }),
  runs: (id: string, projectId?: string | null) =>
    fetchApi<any[]>(`/agents/${id}/runs${projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''}`),
};

// Project endpoints
export const projects = {
  list: () => fetchApi<any[]>('/projects'),
  create: (data: { name: string; description?: string; type: 'internal' | 'external'; config?: Record<string, unknown> }) =>
    fetchApi<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
};

// LeadOS endpoints
export const leados = {
  getLeads: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<any[]>(`/leados/leads${query}`);
  },
  getLead: (id: string) => fetchApi<any>(`/leados/leads/${id}`),
  createLead: (data: Record<string, unknown>) =>
    fetchApi<any>('/leados/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id: string, data: Record<string, unknown>) =>
    fetchApi<any>(`/leados/leads/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  analytics: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<any>(`/leados/analytics${query}`);
  },
  activity: () => fetchApi<any[]>('/leados/activity'),
};

// Blacklist endpoints
export const blacklistApi = {
  list: () => fetchApi<any[]>('/leados/blacklist'),
  add: (data: { companyName: string; domain?: string; reason?: string }) =>
    fetchApi<any>('/leados/blacklist', { method: 'POST', body: JSON.stringify(data) }),
  remove: (id: string) =>
    fetchApi<any>(`/leados/blacklist?id=${encodeURIComponent(id)}`, { method: 'DELETE' }),
  check: (data: { company?: string; domain?: string }) =>
    fetchApi<{ blacklisted: boolean; match?: any }>('/leados/blacklist/check', { method: 'POST', body: JSON.stringify(data) }),
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('leados_token') : null;
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  const es = new EventSource(`${API_BASE}/events${tokenParam}`);

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
