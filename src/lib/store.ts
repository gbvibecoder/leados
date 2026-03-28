import { create } from 'zustand';
import { apiFetch } from '@/lib/api';

export type AgentStatus = 'idle' | 'running' | 'done' | 'error';

interface AgentState {
  id: string;
  name: string;
  status: AgentStatus;
  lastRunTime?: string;
  outputPreview?: string;
  progress?: number;
  error?: string;
}

interface PipelineState {
  id?: string;
  status: 'idle' | 'running' | 'completed' | 'error' | 'paused';
  agents: AgentState[];
  currentAgentIndex: number;
}

export interface ProjectConfig {
  enabledAgentIds?: string[];
  startFromAgentId?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  url?: string;
  language?: string;
  type: 'internal' | 'external';
  status: string;
  config?: ProjectConfig | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlacklistEntry {
  id: string;
  companyName: string;
  domain?: string;
  reason?: string;
  createdAt: string;
}

/** Supported output languages for agent content generation */
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'ru', label: 'Russian' },
  { code: 'tr', label: 'Turkish' },
  { code: 'pl', label: 'Polish' },
  { code: 'sv', label: 'Swedish' },
  { code: 'da', label: 'Danish' },
  { code: 'fi', label: 'Finnish' },
  { code: 'no', label: 'Norwegian' },
  { code: 'th', label: 'Thai' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'id', label: 'Indonesian' },
  { code: 'ms', label: 'Malay' },
  { code: 'he', label: 'Hebrew' },
  { code: 'cs', label: 'Czech' },
  { code: 'ro', label: 'Romanian' },
  { code: 'hu', label: 'Hungarian' },
  { code: 'uk', label: 'Ukrainian' },
  { code: 'el', label: 'Greek' },
  { code: 'bn', label: 'Bengali' },
] as const;

// First 4 agents are skipped for internal projects
export const DISCOVERY_AGENT_IDS = [
  'service-research',
  'offer-engineering',
  'validation',
  'funnel-builder',
];

/** Cache key for the "no project" default pipeline */
const NO_PROJECT_KEY = '__default__';

/** Cached pipeline + outputs for a project so we can restore after switching */
interface ProjectPipelineCache {
  pipeline: PipelineState;
  agentOutputs: Record<string, any>;
  elapsedTimes: Record<string, number>;
}

interface AppState {
  pipeline: PipelineState;
  updatePipelineStatus: (status: PipelineState['status']) => void;
  updateAgentStatus: (agentId: string, update: Partial<AgentState>) => void;
  setPipelineId: (id: string) => void;
  setCurrentAgentIndex: (index: number) => void;
  resetPipeline: () => void;

  // Agent customization (global fallback when no project selected)
  disabledAgentIds: Set<string>;
  globalStartFromAgentId: string | null;
  setGlobalStartFromAgentId: (agentId: string | null) => void;
  toggleAgent: (agentId: string) => void;
  enableAllAgents: () => void;
  disableAllAgents: () => void;
  loadAgentConfig: () => void;

  // Projects
  projects: Project[];
  selectedProjectId: string | null;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  createProject: (data: { name: string; description?: string; url?: string; language?: string; type: 'internal' | 'external'; enabledAgentIds?: string[] }) => Project;
  createProjectAsync: (data: { name: string; description?: string; url?: string; language?: string; type: 'internal' | 'external'; enabledAgentIds?: string[] }) => Promise<Project>;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  updateProjectConfig: (projectId: string, config: ProjectConfig) => void;
  removeProject: (projectId: string) => void;
  selectProject: (projectId: string | null) => void;
  loadProjects: () => void;

  // Per-project pipeline state cache (save/restore on switch)
  projectPipelineCache: Record<string, ProjectPipelineCache>;
  cacheProjectPipeline: (projectId: string, agentOutputs: Record<string, any>, elapsedTimes: Record<string, number>) => void;
  getProjectPipelineCache: (projectId: string) => ProjectPipelineCache | undefined;
  clearProjectPipelineCache: (projectId: string) => void;

  // Blacklist
  blacklist: BlacklistEntry[];
  addToBlacklist: (entry: Omit<BlacklistEntry, 'id' | 'createdAt'>) => Promise<void>;
  removeFromBlacklist: (id: string) => Promise<void>;
  loadBlacklist: () => void;
  isBlacklisted: (company: string, domain?: string) => boolean;

  sidebarOpen: boolean;
  toggleSidebar: () => void;

  activityFeed: ActivityItem[];
  addActivity: (item: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
  clearActivities: () => void;

  /** Clear all user-specific state on logout */
  logout: () => void;
}

export interface ActivityItem {
  id: string;
  type: 'agent_started' | 'agent_completed' | 'agent_error' | 'pipeline_completed' | 'info';
  agentId?: string;
  agentName?: string;
  message: string;
  timestamp: string;
}

export const LEADOS_AGENTS: AgentState[] = [
  { id: 'service-research', name: 'Service Research Agent', status: 'idle' },
  { id: 'offer-engineering', name: 'Offer Engineering Agent', status: 'idle' },
  { id: 'validation', name: 'Validation Agent', status: 'idle' },
  { id: 'funnel-builder', name: 'Funnel Builder Agent', status: 'idle' },
  { id: 'content-creative', name: 'Content & Creative Agent', status: 'idle' },
  { id: 'paid-traffic', name: 'Paid Traffic Agent', status: 'idle' },
  { id: 'outbound-outreach', name: 'Outbound Outreach Agent', status: 'idle' },
  { id: 'inbound-capture', name: 'Inbound Lead Capture Agent', status: 'idle' },
  { id: 'ai-qualification', name: 'AI Qualification Agent', status: 'idle' },
  { id: 'sales-routing', name: 'Sales Routing Agent', status: 'idle' },
  { id: 'tracking-attribution', name: 'Tracking & Attribution Agent', status: 'idle' },
  { id: 'performance-optimization', name: 'Performance Optimization Agent', status: 'idle' },
  { id: 'crm-hygiene', name: 'CRM & Data Hygiene Agent', status: 'idle' },
];

function getAgentsForProject(project: Project | undefined, disabledAgentIds: Set<string>, globalStartFromAgentId?: string | null): AgentState[] {
  let agents = LEADOS_AGENTS;

  // Per-project agent config takes priority when available
  if (project?.config?.enabledAgentIds) {
    // Explicit selection — respect exactly what the user chose
    const enabledSet = new Set(project.config.enabledAgentIds);
    agents = agents.filter((a) => enabledSet.has(a.id));
  } else if (project?.type === 'internal') {
    // Internal projects with no explicit config skip discovery agents
    agents = agents.filter((a) => !DISCOVERY_AGENT_IDS.includes(a.id));
  } else if (!project) {
    // No project — use global disabled set
    agents = agents.filter((a) => !disabledAgentIds.has(a.id));
  }

  // Start from specific agent — remove agents before the start point
  const startFrom = project?.config?.startFromAgentId || (!project ? globalStartFromAgentId : null);
  if (startFrom) {
    const startIdx = agents.findIndex((a) => a.id === startFrom);
    if (startIdx > 0) {
      agents = agents.slice(startIdx);
    }
  }

  return agents;
}

// ── Pipeline-active guard ─────────────────────────────────────────────────
// Returns true if the pipeline has progressed past idle and should NOT be
// silently replaced.  Only an explicit user action (resetPipeline) may reset.
function isPipelineActive(pipeline: PipelineState): boolean {
  if (pipeline.status === 'running' || pipeline.status === 'paused' || pipeline.status === 'completed') return true;
  // Even if overall status is idle/error, some agents may have completed
  if (pipeline.agents.some(a => a.status === 'running' || a.status === 'done')) return true;
  return false;
}

/** Deep-clone a pipeline so the cache holds an independent copy */
function clonePipeline(p: PipelineState): PipelineState {
  return {
    ...p,
    agents: p.agents.map(a => ({ ...a })),
  };
}

function buildIdlePipeline(project: Project | undefined, disabledAgentIds: Set<string>, globalStartFromAgentId?: string | null): PipelineState {
  const agents = getAgentsForProject(project, disabledAgentIds, globalStartFromAgentId);
  return {
    status: 'idle' as const,
    agents: agents.map((a) => ({
      ...a,
      status: 'idle' as const,
      lastRunTime: undefined,
      outputPreview: undefined,
      progress: undefined,
      error: undefined,
    })),
    currentAgentIndex: 0,
  };
}

/** Get user-scoped localStorage key to isolate data between accounts */
function userKey(key: string): string {
  try {
    const userStr = localStorage.getItem('leados_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user?.id) return `${key}_${user.id}`;
    }
  } catch {}
  return key;
}

function saveDisabledAgents(ids: Set<string>) {
  try { localStorage.setItem(userKey('leados_disabled_agents'), JSON.stringify([...ids])); } catch {}
}

function saveProjects(projects: Project[]) {
  try { localStorage.setItem(userKey('leados_projects'), JSON.stringify(projects)); } catch {}
}

function saveBlacklist(entries: BlacklistEntry[]) {
  try { localStorage.setItem(userKey('leados_blacklist'), JSON.stringify(entries)); } catch {}
}

export const useAppStore = create<AppState>()((set, get) => ({
  pipeline: {
    status: 'idle',
    agents: LEADOS_AGENTS,
    currentAgentIndex: 0,
  },

  updatePipelineStatus: (status) =>
    set((state) => ({
      pipeline: { ...state.pipeline, status },
    })),

  updateAgentStatus: (agentId, update) =>
    set((state) => ({
      pipeline: {
        ...state.pipeline,
        agents: state.pipeline.agents.map((a) =>
          a.id === agentId ? { ...a, ...update } : a
        ),
      },
    })),

  setPipelineId: (id) =>
    set((state) => ({
      pipeline: { ...state.pipeline, id },
    })),

  setCurrentAgentIndex: (index) =>
    set((state) => ({
      pipeline: { ...state.pipeline, currentAgentIndex: index },
    })),

  resetPipeline: () => {
    const state = get();
    const selectedProject = state.projects.find((p) => p.id === state.selectedProjectId);
    set({ pipeline: buildIdlePipeline(selectedProject, state.disabledAgentIds, state.globalStartFromAgentId) });
  },

  // Agent customization (global)
  disabledAgentIds: new Set<string>(),
  globalStartFromAgentId: null,
  setGlobalStartFromAgentId: (agentId) => {
    const state = get();
    set({ globalStartFromAgentId: agentId });
    if (!state.selectedProjectId && !isPipelineActive(state.pipeline)) {
      set({ pipeline: buildIdlePipeline(undefined, state.disabledAgentIds, agentId) });
    }
  },
  toggleAgent: (agentId) => {
    const state = get();
    const active = isPipelineActive(state.pipeline);
    const selectedProject = state.projects.find((p) => p.id === state.selectedProjectId);

    // If project has its own config, toggle within project config
    if (selectedProject) {
      const currentEnabled = selectedProject.config?.enabledAgentIds
        || LEADOS_AGENTS.filter((a) => !state.disabledAgentIds.has(a.id)).map((a) => a.id);
      let newEnabled: string[];
      if (currentEnabled.includes(agentId)) {
        newEnabled = currentEnabled.filter((id: string) => id !== agentId);
      } else {
        newEnabled = [...currentEnabled, agentId];
      }
      const newConfig: ProjectConfig = { ...selectedProject.config, enabledAgentIds: newEnabled };
      const updatedProject = { ...selectedProject, config: newConfig, updatedAt: new Date().toISOString() };
      const updated = state.projects.map((p) => p.id === selectedProject.id ? updatedProject : p);
      saveProjects(updated);
      set({ projects: updated, ...(active ? {} : { pipeline: buildIdlePipeline(updatedProject, state.disabledAgentIds, state.globalStartFromAgentId) }) });
      return;
    }

    // Global toggle
    const next = new Set(state.disabledAgentIds);
    if (next.has(agentId)) {
      next.delete(agentId);
    } else {
      next.add(agentId);
    }
    saveDisabledAgents(next);
    set({ disabledAgentIds: next, ...(active ? {} : { pipeline: buildIdlePipeline(undefined, next, get().globalStartFromAgentId) }) });
  },
  enableAllAgents: () => {
    const state = get();
    const active = isPipelineActive(state.pipeline);
    const selectedProject = state.projects.find((p) => p.id === state.selectedProjectId);

    if (selectedProject) {
      const allIds = selectedProject.type === 'internal'
        ? LEADOS_AGENTS.filter((a) => !DISCOVERY_AGENT_IDS.includes(a.id)).map((a) => a.id)
        : LEADOS_AGENTS.map((a) => a.id);
      const newConfig: ProjectConfig = { ...selectedProject.config, enabledAgentIds: allIds };
      const updatedProject = { ...selectedProject, config: newConfig, updatedAt: new Date().toISOString() };
      const updated = state.projects.map((p) => p.id === selectedProject.id ? updatedProject : p);
      saveProjects(updated);
      set({ projects: updated, ...(active ? {} : { pipeline: buildIdlePipeline(updatedProject, state.disabledAgentIds, state.globalStartFromAgentId) }) });
      return;
    }

    const next = new Set<string>();
    saveDisabledAgents(next);
    set({ disabledAgentIds: next, ...(active ? {} : { pipeline: buildIdlePipeline(undefined, next, get().globalStartFromAgentId) }) });
  },
  disableAllAgents: () => {
    const state = get();
    const active = isPipelineActive(state.pipeline);
    const selectedProject = state.projects.find((p) => p.id === state.selectedProjectId);

    if (selectedProject) {
      const newConfig: ProjectConfig = { ...selectedProject.config, enabledAgentIds: [] };
      const updatedProject = { ...selectedProject, config: newConfig, updatedAt: new Date().toISOString() };
      const updated = state.projects.map((p) => p.id === selectedProject.id ? updatedProject : p);
      saveProjects(updated);
      set({ projects: updated, ...(active ? {} : { pipeline: buildIdlePipeline(updatedProject, state.disabledAgentIds, state.globalStartFromAgentId) }) });
      return;
    }

    const next = new Set(LEADOS_AGENTS.map((a) => a.id));
    saveDisabledAgents(next);
    set({ disabledAgentIds: next, ...(active ? {} : { pipeline: buildIdlePipeline(undefined, next, get().globalStartFromAgentId) }) });
  },
  loadAgentConfig: () => {
    try {
      const stored = localStorage.getItem(userKey('leados_disabled_agents'));
      if (stored) {
        const ids = new Set<string>(JSON.parse(stored));
        const state = get();
        // Never rebuild pipeline if it's active (running/paused/completed/has progress)
        if (isPipelineActive(state.pipeline)) {
          set({ disabledAgentIds: ids });
          return;
        }
        const selectedProject = state.projects.find((p) => p.id === state.selectedProjectId);
        set({ disabledAgentIds: ids, pipeline: buildIdlePipeline(selectedProject, ids, get().globalStartFromAgentId) });
      }
    } catch {}
  },

  // Projects
  projects: [],
  selectedProjectId: null,
  setProjects: (projects) => {
    set({ projects });
    saveProjects(projects);
  },
  addProject: (project) => {
    const updated = [project, ...get().projects];
    set({ projects: updated });
    saveProjects(updated);
  },
  createProject: (data) => {
    // Synchronous version — adds to local state immediately with temp ID
    // Use createProjectAsync instead for DB-synced project creation
    const project: Project = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      name: data.name,
      description: data.description,
      url: data.url,
      language: data.language,
      type: data.type,
      status: 'active',
      config: data.enabledAgentIds ? { enabledAgentIds: data.enabledAgentIds } : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [project, ...get().projects];
    set({ projects: updated });
    saveProjects(updated);
    return project;
  },
  createProjectAsync: async (data) => {
    // Save to DB first — use the real DB-generated ID
    const res = await apiFetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        language: data.language,
        type: data.type,
        config: {
          ...(data.url ? { url: data.url } : {}),
          ...(data.enabledAgentIds ? { enabledAgentIds: data.enabledAgentIds } : {}),
        },
      }),
    });
    const dbProject = await res.json();
    if (!res.ok || !dbProject?.id) {
      throw new Error(dbProject?.error || 'Failed to create project');
    }

    const project: Project = {
      id: dbProject.id,
      name: dbProject.name,
      description: dbProject.description,
      url: data.url,
      language: data.language,
      type: dbProject.type,
      status: dbProject.status || 'active',
      config: (data.url || data.enabledAgentIds) ? {
        ...(data.url ? { url: data.url } : {}),
        ...(data.enabledAgentIds ? { enabledAgentIds: data.enabledAgentIds } : {}),
      } : null,
      createdAt: dbProject.createdAt,
      updatedAt: dbProject.updatedAt,
    };
    const updated = [project, ...get().projects];
    set({ projects: updated });
    saveProjects(updated);
    return project;
  },
  updateProject: (projectId, updates) => {
    const state = get();
    const updated = state.projects.map((p) =>
      p.id === projectId ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
    );
    set({ projects: updated });
    saveProjects(updated);
    // Rebuild pipeline if this is the selected project and pipeline is not active
    if (state.selectedProjectId === projectId && !isPipelineActive(state.pipeline)) {
      const project = updated.find((p) => p.id === projectId);
      set({ pipeline: buildIdlePipeline(project, state.disabledAgentIds, state.globalStartFromAgentId) });
    }

    // Sync to DB in background
    const { url, config: _cfg, ...dbUpdates } = updates as any;
    apiFetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbUpdates),
    }).catch(() => {});
  },
  updateProjectConfig: (projectId, config) => {
    const state = get();
    const project = state.projects.find((p) => p.id === projectId);
    if (!project) return;
    const newConfig = { ...project.config, ...config };
    const updatedProject = { ...project, config: newConfig, updatedAt: new Date().toISOString() };
    const updated = state.projects.map((p) => p.id === projectId ? updatedProject : p);
    set({ projects: updated });
    saveProjects(updated);
    if (state.selectedProjectId === projectId && !isPipelineActive(state.pipeline)) {
      set({ pipeline: buildIdlePipeline(updatedProject, state.disabledAgentIds, state.globalStartFromAgentId) });
    }

    // Sync config to DB in background
    apiFetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: newConfig }),
    }).catch(() => {});
  },
  removeProject: (projectId) => {
    const state = get();
    const updated = state.projects.filter((p) => p.id !== projectId);
    const patches: any = { projects: updated };
    if (state.selectedProjectId === projectId) {
      patches.selectedProjectId = null;
      // Always reset pipeline when removing the selected project — even if paused/active
      patches.pipeline = buildIdlePipeline(undefined, state.disabledAgentIds, state.globalStartFromAgentId);
      // Clear localStorage so loadProjects doesn't re-select a removed project
      try { localStorage.setItem(userKey('leados_selected_project'), ''); } catch {}
    }
    // Clean up cached pipeline state for the removed project
    const { [projectId]: _removed, ...remainingCache } = state.projectPipelineCache;
    patches.projectPipelineCache = remainingCache;
    set(patches);
    saveProjects(updated);

    // Delete from DB in background
    apiFetch(`/api/projects/${projectId}`, { method: 'DELETE' }).catch(() => {
      // ignore — localStorage already updated
    });
  },
  selectProject: (projectId) => {
    const state = get();

    // No-op if already on this project
    if (state.selectedProjectId === projectId) return;

    // BLOCK project switching entirely when pipeline is actively running
    if (state.pipeline.status === 'running') {
      return;
    }

    // Always cache the outgoing project/default pipeline state if it has activity
    const outgoingKey = state.selectedProjectId || NO_PROJECT_KEY;
    const hadActivity = state.pipeline.agents.some(a => a.status === 'done' || a.status === 'running');
    if (hadActivity || state.pipeline.status === 'paused' || state.pipeline.status === 'completed') {
      // Cache pipeline state (agentOutputs handled separately by the page)
      const existing = state.projectPipelineCache[outgoingKey];
      set({
        projectPipelineCache: {
          ...state.projectPipelineCache,
          [outgoingKey]: {
            pipeline: clonePipeline(state.pipeline),
            agentOutputs: existing?.agentOutputs || {},
            elapsedTimes: existing?.elapsedTimes || {},
          },
        },
      });
    }

    // Restore cached pipeline for the target project/default, or build idle
    const targetKey = projectId || NO_PROJECT_KEY;
    const cached = get().projectPipelineCache[targetKey];
    if (cached) {
      set({ selectedProjectId: projectId, pipeline: clonePipeline(cached.pipeline) });
    } else {
      const project = state.projects.find((p) => p.id === projectId);
      set({
        selectedProjectId: projectId,
        pipeline: buildIdlePipeline(project, state.disabledAgentIds, state.globalStartFromAgentId),
      });
    }
    try { localStorage.setItem(userKey('leados_selected_project'), projectId || ''); } catch {}
  },
  loadProjects: () => {
    const pipelineBusy = isPipelineActive(get().pipeline);

    // Load from localStorage first for instant UI
    try {
      const stored = localStorage.getItem(userKey('leados_projects'));
      if (stored) {
        const projects = JSON.parse(stored);
        set({ projects });
        const selectedId = localStorage.getItem(userKey('leados_selected_project'));
        if (selectedId) {
          if (pipelineBusy) {
            // Pipeline is busy — just restore the selected project ID without resetting pipeline
            set({ selectedProjectId: selectedId });
          } else {
            const project = projects.find((p: Project) => p.id === selectedId);
            if (project) {
              const state = get();
              set({
                selectedProjectId: selectedId,
                pipeline: buildIdlePipeline(project, state.disabledAgentIds, state.globalStartFromAgentId),
              });
            }
          }
        }
      }
    } catch {}

    // Then sync from DB — DB is the source of truth
    apiFetch('/api/projects')
      .then((res) => res.json())
      .then((dbProjects) => {
        if (!Array.isArray(dbProjects) || dbProjects.length === 0) return;
        const projects: Project[] = dbProjects.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          url: p.url,
          language: p.language,
          type: p.type,
          status: p.status || 'active',
          config: p.config,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        }));
        set({ projects });
        saveProjects(projects);
        // Re-apply selected project — but NEVER reset pipeline if it's active
        const selectedId = localStorage.getItem(userKey('leados_selected_project'));
        if (selectedId) {
          if (isPipelineActive(get().pipeline)) {
            set({ selectedProjectId: selectedId });
          } else {
            const state = get();
            const project = projects.find((p) => p.id === selectedId);
            if (project) {
              set({
                selectedProjectId: selectedId,
                pipeline: buildIdlePipeline(project, state.disabledAgentIds, state.globalStartFromAgentId),
              });
            }
          }
        }
      })
      .catch(() => { /* DB unavailable — use localStorage */ });
  },

  // Blacklist
  blacklist: [],
  addToBlacklist: async (entry) => {
    // Save to DB first, then update local state
    try {
      const res = await apiFetch('/api/leados/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
      const dbEntry = await res.json();
      if (res.ok && dbEntry?.id) {
        const newEntry: BlacklistEntry = {
          id: dbEntry.id,
          companyName: dbEntry.companyName,
          domain: dbEntry.domain || undefined,
          reason: dbEntry.reason || undefined,
          createdAt: dbEntry.createdAt,
        };
        const updated = [newEntry, ...get().blacklist];
        set({ blacklist: updated });
        saveBlacklist(updated);
        return;
      }
    } catch { /* fallback to local */ }

    // Fallback: save locally if DB fails
    const newEntry: BlacklistEntry = {
      ...entry,
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      createdAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...get().blacklist];
    set({ blacklist: updated });
    saveBlacklist(updated);
  },
  removeFromBlacklist: async (id) => {
    // Remove from local state immediately
    const updated = get().blacklist.filter((e) => e.id !== id);
    set({ blacklist: updated });
    saveBlacklist(updated);

    // Delete from DB in background
    apiFetch(`/api/leados/blacklist?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  },
  loadBlacklist: () => {
    // Load from localStorage first for instant UI
    try {
      const stored = localStorage.getItem(userKey('leados_blacklist'));
      if (stored) {
        set({ blacklist: JSON.parse(stored) });
      }
    } catch {}

    // Then sync from DB — DB is the source of truth
    apiFetch('/api/leados/blacklist')
      .then((res) => res.json())
      .then((dbEntries) => {
        if (!Array.isArray(dbEntries) || dbEntries.length === 0) {
          // If DB has no entries but localStorage does, push local to DB
          const local = get().blacklist;
          if (local.length > 0) {
            for (const entry of local) {
              apiFetch('/api/leados/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyName: entry.companyName, domain: entry.domain, reason: entry.reason }),
              }).catch(() => {});
            }
          }
          return;
        }
        const entries: BlacklistEntry[] = dbEntries.map((e: any) => ({
          id: e.id,
          companyName: e.companyName,
          domain: e.domain || undefined,
          reason: e.reason || undefined,
          createdAt: e.createdAt,
        }));
        set({ blacklist: entries });
        saveBlacklist(entries);
      })
      .catch(() => { /* DB unavailable — use localStorage */ });
  },
  isBlacklisted: (company, domain) => {
    const { blacklist } = get();
    const companyLower = company?.toLowerCase() || '';
    const domainLower = domain?.toLowerCase() || '';
    return blacklist.some((e) => {
      if (e.companyName && companyLower.includes(e.companyName.toLowerCase())) return true;
      if (e.domain && domainLower && domainLower.includes(e.domain.toLowerCase())) return true;
      return false;
    });
  },

  // Per-project pipeline state cache (plain object for reliable Zustand reactivity)
  projectPipelineCache: {},
  cacheProjectPipeline: (projectId, agentOutputs, elapsedTimes) => {
    const state = get();
    const existing = state.projectPipelineCache[projectId];
    set({
      projectPipelineCache: {
        ...state.projectPipelineCache,
        [projectId]: {
          pipeline: existing?.pipeline ? clonePipeline(existing.pipeline) : clonePipeline(state.pipeline),
          agentOutputs: { ...agentOutputs },
          elapsedTimes: { ...elapsedTimes },
        },
      },
    });
  },
  getProjectPipelineCache: (projectId) => {
    return get().projectPipelineCache[projectId];
  },
  clearProjectPipelineCache: (projectId) => {
    const state = get();
    const { [projectId]: _, ...rest } = state.projectPipelineCache;
    set({ projectPipelineCache: rest });
  },

  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  activityFeed: [],
  addActivity: (item) =>
    set((state) => ({
      activityFeed: [
        {
          ...item,
          id: Math.random().toString(36).slice(2),
          timestamp: new Date().toISOString(),
        },
        ...state.activityFeed,
      ].slice(0, 50),
    })),
  clearActivities: () => set({ activityFeed: [] }),

  logout: () => {
    set({
      projects: [],
      selectedProjectId: null,
      pipeline: buildIdlePipeline(undefined, new Set(), null),
      activityFeed: [],
      blacklist: [],
      disabledAgentIds: new Set(),
      globalStartFromAgentId: null,
    });
  },
}));
