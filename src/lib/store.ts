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

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: 'internal' | 'external';
  status: string;
  config?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
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

  // Agent customization
  disabledAgentIds: Set<string>;
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
  removeProject: (projectId: string) => void;
  selectProject: (projectId: string | null) => void;
  loadProjects: () => void;

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

function getAgentsForProject(project: Project | undefined, disabledAgentIds: Set<string>): AgentState[] {
  let agents = LEADOS_AGENTS;
  if (project?.type === 'internal') {
    agents = agents.filter((a) => !DISCOVERY_AGENT_IDS.includes(a.id));
  }
  return agents.filter((a) => !disabledAgentIds.has(a.id));
}

function buildIdlePipeline(project: Project | undefined, disabledAgentIds: Set<string>): PipelineState {
  const agents = getAgentsForProject(project, disabledAgentIds);
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
    set({ pipeline: buildIdlePipeline(selectedProject, state.disabledAgentIds) });
  },

  // Agent customization
  disabledAgentIds: new Set<string>(),
  toggleAgent: (agentId) => {
    const state = get();
    const next = new Set(state.disabledAgentIds);
    if (next.has(agentId)) {
      next.delete(agentId);
    } else {
      next.add(agentId);
    }
    const selectedProject = state.projects.find((p) => p.id === state.selectedProjectId);
    saveDisabledAgents(next);
    set({ disabledAgentIds: next, pipeline: buildIdlePipeline(selectedProject, next) });
  },
  enableAllAgents: () => {
    const state = get();
    const next = new Set<string>();
    const selectedProject = state.projects.find((p) => p.id === state.selectedProjectId);
    saveDisabledAgents(next);
    set({ disabledAgentIds: next, pipeline: buildIdlePipeline(selectedProject, next) });
  },
  disableAllAgents: () => {
    const state = get();
    const next = new Set(LEADOS_AGENTS.map((a) => a.id));
    const selectedProject = state.projects.find((p) => p.id === state.selectedProjectId);
    saveDisabledAgents(next);
    set({ disabledAgentIds: next, pipeline: buildIdlePipeline(selectedProject, next) });
  },
  loadAgentConfig: () => {
    try {
      const stored = localStorage.getItem('leados_disabled_agents');
      if (stored) {
        const ids = new Set<string>(JSON.parse(stored));
        const state = get();
        const selectedProject = state.projects.find((p) => p.id === state.selectedProjectId);
        set({ disabledAgentIds: ids, pipeline: buildIdlePipeline(selectedProject, ids) });
      }
    } catch {}
  },

  // Projects
  projects: [],
  selectedProjectId: null,
  setProjects: (projects) => {
    set({ projects });
    try { localStorage.setItem('leados_projects', JSON.stringify(projects)); } catch {}
  },
  addProject: (project) => {
    const updated = [project, ...get().projects];
    set({ projects: updated });
    try { localStorage.setItem('leados_projects', JSON.stringify(updated)); } catch {}
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
    try { localStorage.setItem('leados_projects', JSON.stringify(updated)); } catch {}
    return project;
  },
  removeProject: (projectId) => {
    const state = get();
    const updated = state.projects.filter((p) => p.id !== projectId);
    const patches: any = { projects: updated };
    if (state.selectedProjectId === projectId) {
      patches.selectedProjectId = null;
      patches.pipeline = buildIdlePipeline(undefined, state.disabledAgentIds);
    }
    set(patches);
    try { localStorage.setItem('leados_projects', JSON.stringify(updated)); } catch {}
  },
  selectProject: (projectId) => {
    const state = get();
    const project = state.projects.find((p) => p.id === projectId);
    set({
      selectedProjectId: projectId,
      pipeline: buildIdlePipeline(project, state.disabledAgentIds),
    });
  },
  loadProjects: () => {
    try {
      const stored = localStorage.getItem('leados_projects');
      if (stored) {
        set({ projects: JSON.parse(stored) });
      }
    } catch {}
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
