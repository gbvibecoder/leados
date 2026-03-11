'use client';

import { useState, useEffect } from 'react';
import { Users, Target, DollarSign, TrendingUp, Zap, Play, Building2, Globe, ArrowRight, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import { KPICard } from '@/components/dashboard/kpi-card';
import { PipelineStatus } from '@/components/dashboard/pipeline-status';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { ProjectFilter } from '@/components/projects/project-filter';
import { leados } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface AnalyticsData {
  totalLeads: number;
  qualifiedLeads: number;
  cac: number;
  cpl: number;
  conversionRate: number;
  revenue: number;
  channelBreakdown: { channel: string; leads: number; spend: number; cpl: number; conversion: number }[];
  funnelData: { stage: string; count: number }[];
  trends: { date: string; leads: number; qualified: number; revenue: number }[];
}

export default function DashboardPage() {
  const { projects, selectedProjectId, loadProjects } = useAppStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allProjectData, setAllProjectData] = useState<Record<string, AnalyticsData>>({});
  const [refreshing, setRefreshing] = useState(false);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const fetchAnalytics = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = { period: '30d' };
      const currentProjectId = useAppStore.getState().selectedProjectId;
      if (currentProjectId) params.projectId = currentProjectId;
      const result = await leados.analytics(params);
      setData(result);
    } catch (err: any) {
      setError('Failed to load analytics data');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch analytics for selected project (or all)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchAnalytics();
  }, [selectedProjectId]);

  // Fetch per-project analytics for global view
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      projects.forEach((project) => {
        leados.analytics({ period: '30d', projectId: project.id })
          .then((d) => {
            setAllProjectData((prev) => ({ ...prev, [project.id]: d }));
          })
          .catch(() => {});
      });
    }
  }, [selectedProjectId, projects]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {selectedProject ? `${selectedProject.name}` : 'Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {selectedProject
              ? `${selectedProject.type === 'internal' ? 'Internal' : 'External'} project overview`
              : 'Aggregated metrics across all projects'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh
          </button>
          <ProjectFilter />
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm text-zinc-500">Loading analytics...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-6 text-center">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => fetchAnalytics()}
            className="mt-3 rounded-lg bg-red-600/20 px-4 py-2 text-xs text-red-400 hover:bg-red-600/30 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Dashboard content */}
      {!loading && !error && (
        <>
          {/* KPI Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Total Leads"
              value={data ? data.totalLeads.toLocaleString() : '0'}
              icon={Users}
              color="indigo"
            />
            <KPICard
              title="Qualified Leads"
              value={data ? data.qualifiedLeads.toLocaleString() : '0'}
              icon={Target}
              color="emerald"
            />
            <KPICard
              title="Cost per Acquisition"
              value={data && data.cac > 0 ? `$${data.cac.toFixed(2)}` : '$0.00'}
              icon={DollarSign}
              color="amber"
            />
            <KPICard
              title="Conversion Rate"
              value={data ? `${data.conversionRate}%` : '0%'}
              icon={TrendingUp}
              color="blue"
            />
          </div>

          {/* Channel Breakdown + Funnel */}
          {data && (data.channelBreakdown.length > 0 || data.funnelData.some(f => f.count > 0)) && (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Channel Performance */}
              {data.channelBreakdown.length > 0 && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="mb-4 text-sm font-semibold text-zinc-200">Channel Performance</h3>
                  <div className="space-y-3">
                    {data.channelBreakdown.map((ch) => (
                      <div key={ch.channel} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                          <span className="text-xs text-zinc-300 truncate">{ch.channel}</span>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="text-xs text-zinc-400">{ch.leads} leads</span>
                          {ch.spend > 0 && <span className="text-xs text-zinc-500">${ch.spend.toFixed(0)}</span>}
                          {ch.conversion > 0 && (
                            <span className="text-xs text-emerald-400">{ch.conversion}%</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Funnel */}
              {data.funnelData.some(f => f.count > 0) && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                  <h3 className="mb-4 text-sm font-semibold text-zinc-200">Lead Funnel</h3>
                  <div className="space-y-2">
                    {data.funnelData.map((stage, i) => {
                      const maxCount = data.funnelData[0]?.count || 1;
                      const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
                      return (
                        <div key={stage.stage} className="flex items-center gap-3">
                          <span className="text-xs text-zinc-400 w-20 text-right">{stage.stage}</span>
                          <div className="flex-1 h-6 bg-zinc-800 rounded overflow-hidden">
                            <div
                              className="h-full bg-indigo-600/60 rounded flex items-center px-2 transition-all"
                              style={{ width: `${Math.max(widthPercent, 2)}%` }}
                            >
                              <span className="text-[10px] text-white font-medium">{stage.count}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Revenue + Trends */}
          {data && data.revenue > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-200">Revenue Overview</h3>
                <span className="text-lg font-bold text-emerald-400">${data.revenue.toLocaleString()}</span>
              </div>
              {data.trends.length > 0 && (
                <div className="flex items-end gap-1 h-24">
                  {data.trends.map((t, i) => {
                    const maxRevenue = Math.max(...data.trends.map(t => t.revenue), 1);
                    const height = (t.revenue / maxRevenue) * 100;
                    return (
                      <div key={t.date} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full rounded-t bg-indigo-600/40 transition-all" style={{ height: `${Math.max(height, 4)}%` }} />
                        <span className="text-[8px] text-zinc-600">{new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Project-specific: Pipeline Status */}
          {selectedProject && <PipelineStatus />}

          {/* Global view: Project Performance List */}
          {!selectedProjectId && projects.length > 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-200">Project Performance</h3>
                <Link href="/projects" className="text-xs text-indigo-400 hover:text-indigo-300">
                  Manage Projects
                </Link>
              </div>
              <div className="space-y-3">
                {projects.map((project) => {
                  const pd = allProjectData[project.id];
                  return (
                    <div
                      key={project.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 transition-colors hover:border-zinc-700"
                    >
                      <div className="flex items-center gap-3">
                        {project.type === 'internal' ? (
                          <Building2 className="h-5 w-5 text-amber-400" />
                        ) : (
                          <Globe className="h-5 w-5 text-indigo-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">{project.name}</p>
                          <p className="text-xs text-zinc-500">{project.type} project</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">{pd?.totalLeads ?? '—'}</p>
                          <p className="text-xs text-zinc-500">Leads</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">{pd?.qualifiedLeads ?? '—'}</p>
                          <p className="text-xs text-zinc-500">Qualified</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-white">{pd?.conversionRate != null ? `${pd.conversionRate}%` : '—'}</p>
                          <p className="text-xs text-zinc-500">Conv.</p>
                        </div>
                        <button
                          onClick={() => useAppStore.getState().selectProject(project.id)}
                          className="rounded-lg border border-zinc-700 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                          title="View project dashboard"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* No data state */}
          {data && data.totalLeads === 0 && !selectedProjectId && projects.length === 0 && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
              <BarChart3 className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
              <h3 className="text-sm font-semibold text-zinc-300 mb-1">No data yet</h3>
              <p className="text-xs text-zinc-500 mb-4">
                Run your first pipeline to start generating leads and analytics data.
              </p>
              <Link
                href="/leados"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                <Zap className="h-4 w-4" />
                Launch Pipeline
              </Link>
            </div>
          )}

          {/* Quick Launch + Activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
              <h3 className="mb-4 text-sm font-semibold text-zinc-200">Quick Launch</h3>
              <Link
                href="/leados"
                className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800/50 p-4 transition-all hover:border-indigo-500 hover:bg-indigo-950/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-900/30">
                  <Zap className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {selectedProject ? `${selectedProject.name} Pipeline` : 'LeadOS Pipeline'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {selectedProject
                      ? `${selectedProject.type === 'internal' ? '9' : '13'} agents`
                      : '13 agents — Full lead generation pipeline'}
                  </p>
                </div>
                <Play className="ml-auto h-4 w-4 text-zinc-500" />
              </Link>
            </div>
            <ActivityFeed />
          </div>
        </>
      )}
    </div>
  );
}
