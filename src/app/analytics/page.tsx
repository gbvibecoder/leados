'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Users, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { leados } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { ProjectFilter } from '@/components/projects/project-filter';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import dynamic from 'next/dynamic';

const RechartsComponents = dynamic(() => import('@/components/dashboard/analytics-charts'), { ssr: false });

function AnalyticsPageInner() {
  const { selectedProjectId, projects, loadProjects } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState('30d');

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const params: Record<string, string> = { period };
    if (selectedProjectId) params.projectId = selectedProjectId;
    leados.analytics(params).then(setData).catch(() => {});
  }, [period, selectedProjectId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {selectedProject ? `${selectedProject.name} Analytics` : 'Analytics'}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            {selectedProject
              ? `Performance metrics for ${selectedProject.name}`
              : 'LeadOS performance metrics and insights'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProjectFilter />
          <div className="flex items-center gap-2">
            {['7d', '30d', '90d'].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  period === p ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPI title="Cost Per Lead" value={`$${data.cpl}`} icon={DollarSign} color="indigo" />
            <KPI title="CAC" value={`$${data.cac}`} icon={Target} color="amber" />
            <KPI title="Total Leads" value={data.totalLeads.toLocaleString()} icon={Users} color="blue" />
            <KPI title="Revenue" value={`$${data.revenue.toLocaleString()}`} icon={TrendingUp} color="emerald" />
          </div>

          <RechartsComponents data={data} type="leados" />

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-200">Channel Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-2 text-left text-xs text-zinc-400">Channel</th>
                    <th className="px-4 py-2 text-right text-xs text-zinc-400">Leads</th>
                    <th className="px-4 py-2 text-right text-xs text-zinc-400">Spend</th>
                    <th className="px-4 py-2 text-right text-xs text-zinc-400">CPL</th>
                    <th className="px-4 py-2 text-right text-xs text-zinc-400">Conv %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {data.channelBreakdown?.map((ch: any) => (
                    <tr key={ch.channel}>
                      <td className="px-4 py-2 font-medium text-zinc-200">{ch.channel}</td>
                      <td className="px-4 py-2 text-right text-zinc-300">{ch.leads}</td>
                      <td className="px-4 py-2 text-right text-zinc-300">${ch.spend.toLocaleString()}</td>
                      <td className="px-4 py-2 text-right text-zinc-300">${ch.cpl}</td>
                      <td className="px-4 py-2 text-right text-zinc-300">{ch.conversion}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KPI({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-900/30 text-indigo-400',
    emerald: 'bg-emerald-900/30 text-emerald-400',
    amber: 'bg-amber-900/30 text-amber-400',
    blue: 'bg-blue-900/30 text-blue-400',
  };
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">{title}</p>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', colorMap[color]?.split(' ')[0])}>
          <Icon className={cn('h-5 w-5', colorMap[color]?.split(' ')[1])} />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  return <ErrorBoundary><AnalyticsPageInner /></ErrorBoundary>;
}
