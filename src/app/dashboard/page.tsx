'use client';

import { useState, useEffect } from 'react';
import { Users, Target, DollarSign, TrendingUp, Zap, Play, FolderKanban, Building2, Globe, ArrowRight } from 'lucide-react';
import { KPICard } from '@/components/dashboard/kpi-card';
import { PipelineStatus } from '@/components/dashboard/pipeline-status';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { ProjectFilter } from '@/components/projects/project-filter';
import { leados } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function DashboardPage() {
  const { projects, selectedProjectId, loadProjects } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [allProjectData, setAllProjectData] = useState<Record<string, any>>({});

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Fetch analytics for selected project (or all)
  useEffect(() => {
    const params: Record<string, string> = { period: '30d' };
    if (selectedProjectId) params.projectId = selectedProjectId;
    leados.analytics(params).then(setData).catch(() => {});
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {selectedProject ? `${selectedProject.name} Dashboard` : 'Dashboard'}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {selectedProject
              ? `${selectedProject.type === 'internal' ? 'Internal' : 'External'} project overview`
              : 'Command center for LeadOS — aggregated across all projects'}
          </p>
        </div>
        <ProjectFilter />
      </div>

      {/* KPI Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Leads"
          value={data ? data.totalLeads.toLocaleString() : '—'}
          icon={Users}
          color="indigo"
        />
        <KPICard
          title="Qualified Leads"
          value={data ? data.qualifiedLeads.toLocaleString() : '—'}
          icon={Target}
          color="emerald"
        />
        <KPICard
          title="CAC"
          value={data ? `$${data.cac}` : '—'}
          icon={DollarSign}
          color="amber"
        />
        <KPICard
          title="Conversion Rate"
          value={data ? `${data.conversionRate}%` : '—'}
          icon={TrendingUp}
          color="blue"
        />
      </div>

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
                  : '13 agents - B2B Lead Gen'}
              </p>
            </div>
            <Play className="ml-auto h-4 w-4 text-zinc-500" />
          </Link>
        </div>
        <ActivityFeed />
      </div>
    </div>
  );
}
