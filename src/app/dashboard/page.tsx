'use client';

import { useState, useEffect } from 'react';
import { Users, Target, DollarSign, TrendingUp, Zap, Play } from 'lucide-react';
import { KPICard } from '@/components/dashboard/kpi-card';
import { PipelineStatus } from '@/components/dashboard/pipeline-status';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { leados } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    leados.analytics({ period: '30d' }).then(setData).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Command center for LeadOS — 13-agent autonomous lead generation system
        </p>
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

      {/* Pipeline Status */}
      <PipelineStatus />

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
              <p className="text-sm font-medium text-white">LeadOS Pipeline</p>
              <p className="text-xs text-zinc-400">13 agents - B2B Lead Gen</p>
            </div>
            <Play className="ml-auto h-4 w-4 text-zinc-500" />
          </Link>
        </div>
        <ActivityFeed />
      </div>
    </div>
  );
}
