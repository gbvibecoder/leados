import { create } from 'zustand';

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

// First 4 agents are skipped for internal projects
export const DISCOVERY_AGENT_IDS = [
  'service-research',
  'offer-engineering',
  'validation',
  'funnel-builder',
];

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
  createProject: (data: { name: string; description?: string; type: 'internal' | 'external' }) => Project;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  updateProjectConfig: (projectId: string, config: ProjectConfig) => void;
  removeProject: (projectId: string) => void;
  selectProject: (projectId: string | null) => void;
  loadProjects: () => void;

  // Blacklist
  blacklist: BlacklistEntry[];
  addToBlacklist: (entry: Omit<BlacklistEntry, 'id' | 'createdAt'>) => void;
  removeFromBlacklist: (id: string) => void;
  loadBlacklist: () => void;
  isBlacklisted: (company: string, domain?: string) => boolean;

  sidebarOpen: boolean;
  toggleSidebar: () => void;

  activityFeed: ActivityItem[];
  addActivity: (item: Omit<ActivityItem, 'id' | 'timestamp'>) => void;
  clearActivities: () => void;
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

  // For internal projects, skip discovery agents
  if (project?.type === 'internal') {
    agents = agents.filter((a) => !DISCOVERY_AGENT_IDS.includes(a.id));
  }

  // Per-project agent config takes priority when available
  if (project?.config?.enabledAgentIds) {
    const enabledSet = new Set(project.config.enabledAgentIds);
    agents = agents.filter((a) => enabledSet.has(a.id));
  } else {
    // Fallback to global disabled set
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

function saveDisabledAgents(ids: Set<string>) {
  try { localStorage.setItem('leados_disabled_agents', JSON.stringify([...ids])); } catch {}
}

function saveProjects(projects: Project[]) {
  try { localStorage.setItem('leados_projects', JSON.stringify(projects)); } catch {}
}

function saveBlacklist(entries: BlacklistEntry[]) {
  try { localStorage.setItem('leados_blacklist', JSON.stringify(entries)); } catch {}
}

export const useAppStore = create<AppState>((set, get) => ({
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
    // Rebuild pipeline only when no project is selected
    if (!state.selectedProjectId) {
      set({ pipeline: buildIdlePipeline(undefined, state.disabledAgentIds, agentId) });
    }
  },
  toggleAgent: (agentId) => {
    const state = get();
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
      set({ projects: updated, pipeline: buildIdlePipeline(updatedProject, state.disabledAgentIds, state.globalStartFromAgentId) });
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
    set({ disabledAgentIds: next, pipeline: buildIdlePipeline(undefined, next, get().globalStartFromAgentId) });
  },
  enableAllAgents: () => {
    const state = get();
    const selectedProject = state.projects.find((p) => p.id === state.selectedProjectId);

    if (selectedProject) {
      const allIds = LEADOS_AGENTS.map((a) => a.id);
      const newConfig: ProjectConfig = { ...selectedProject.config, enabledAgentIds: allIds };
      const updatedProject = { ...selectedProject, config: newConfig, updatedAt: new Date().toISOString() };
      const updated = state.projects.map((p) => p.id === selectedProject.id ? updatedProject : p);
      saveProjects(updated);
      set({ projects: updated, pipeline: buildIdlePipeline(updatedProject, state.disabledAgentIds, state.globalStartFromAgentId) });
      return;
    }

    const next = new Set<string>();
    saveDisabledAgents(next);
    set({ disabledAgentIds: next, pipeline: buildIdlePipeline(undefined, next, get().globalStartFromAgentId) });
  },
  disableAllAgents: () => {
    const state = get();
    const selectedProject = state.projects.find((p) => p.id === state.selectedProjectId);

    if (selectedProject) {
      const newConfig: ProjectConfig = { ...selectedProject.config, enabledAgentIds: [] };
      const updatedProject = { ...selectedProject, config: newConfig, updatedAt: new Date().toISOString() };
      const updated = state.projects.map((p) => p.id === selectedProject.id ? updatedProject : p);
      saveProjects(updated);
      set({ projects: updated, pipeline: buildIdlePipeline(updatedProject, state.disabledAgentIds, state.globalStartFromAgentId) });
      return;
    }

    const next = new Set(LEADOS_AGENTS.map((a) => a.id));
    saveDisabledAgents(next);
    set({ disabledAgentIds: next, pipeline: buildIdlePipeline(undefined, next, get().globalStartFromAgentId) });
  },
  loadAgentConfig: () => {
    try {
      const stored = localStorage.getItem('leados_disabled_agents');
      if (stored) {
        const ids = new Set<string>(JSON.parse(stored));
        const state = get();
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
    const project: Project = {
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      name: data.name,
      description: data.description,
      type: data.type,
      status: 'active',
      config: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
    // Rebuild pipeline if this is the selected project
    if (state.selectedProjectId === projectId) {
      const project = updated.find((p) => p.id === projectId);
      set({ pipeline: buildIdlePipeline(project, state.disabledAgentIds, state.globalStartFromAgentId) });
    }
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
    if (state.selectedProjectId === projectId) {
      set({ pipeline: buildIdlePipeline(updatedProject, state.disabledAgentIds, state.globalStartFromAgentId) });
    }
  },
  removeProject: (projectId) => {
    const state = get();
    const updated = state.projects.filter((p) => p.id !== projectId);
    const patches: any = { projects: updated };
    if (state.selectedProjectId === projectId) {
      patches.selectedProjectId = null;
      patches.pipeline = buildIdlePipeline(undefined, state.disabledAgentIds, state.globalStartFromAgentId);
    }
    set(patches);
    saveProjects(updated);
  },
  selectProject: (projectId) => {
    const state = get();
    const project = state.projects.find((p) => p.id === projectId);
    set({
      selectedProjectId: projectId,
      pipeline: buildIdlePipeline(project, state.disabledAgentIds, state.globalStartFromAgentId),
    });
    try { localStorage.setItem('leados_selected_project', projectId || ''); } catch {}
  },
  loadProjects: () => {
    try {
      const stored = localStorage.getItem('leados_projects');
      if (stored) {
        const projects = JSON.parse(stored);
        set({ projects });
        // Restore selected project
        const selectedId = localStorage.getItem('leados_selected_project');
        if (selectedId) {
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
    } catch {}
  },

  // Blacklist
  blacklist: [],
  addToBlacklist: (entry) => {
    const newEntry: BlacklistEntry = {
      ...entry,
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      createdAt: new Date().toISOString(),
    };
    const updated = [newEntry, ...get().blacklist];
    set({ blacklist: updated });
    saveBlacklist(updated);
  },
  removeFromBlacklist: (id) => {
    const updated = get().blacklist.filter((e) => e.id !== id);
    set({ blacklist: updated });
    saveBlacklist(updated);
  },
  loadBlacklist: () => {
    try {
      const stored = localStorage.getItem('leados_blacklist');
      if (stored) {
        set({ blacklist: JSON.parse(stored) });
      }
    } catch {}
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
}));
