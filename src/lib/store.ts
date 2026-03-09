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

interface AppState {
  pipeline: PipelineState;
  updatePipelineStatus: (status: PipelineState['status']) => void;
  updateAgentStatus: (agentId: string, update: Partial<AgentState>) => void;
  setPipelineId: (id: string) => void;
  setCurrentAgentIndex: (index: number) => void;
  resetPipeline: () => void;

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

const LEADOS_AGENTS: AgentState[] = [
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

export const useAppStore = create<AppState>((set) => ({
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

  resetPipeline: () =>
    set(() => ({
      pipeline: {
        status: 'idle' as const,
        agents: LEADOS_AGENTS.map((a) => ({
          ...a,
          status: 'idle' as const,
          lastRunTime: undefined,
          outputPreview: undefined,
          progress: undefined,
          error: undefined,
        })),
        currentAgentIndex: 0,
      },
    })),

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
