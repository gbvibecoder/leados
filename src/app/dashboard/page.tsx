'use client';

import { useState, useEffect } from 'react';
import {
  Users, Target, DollarSign, TrendingUp, Zap, Play, Building2, Globe, ArrowRight,
  BarChart3, Loader2, RefreshCw, Workflow, Sparkles, Activity, Clock, Rocket,
} from 'lucide-react';
import { PipelineStatus } from '@/components/dashboard/pipeline-status';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { ProjectFilter } from '@/components/projects/project-filter';
import { leados } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { motion } from 'framer-motion';

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

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const KPI_CONFIG = [
  { key: 'totalLeads', title: 'Total Leads', icon: Users, accent: '#00f2ff', format: (d: AnalyticsData) => d.totalLeads.toLocaleString() },
  { key: 'qualifiedLeads', title: 'Qualified', icon: Target, accent: '#10b981', format: (d: AnalyticsData) => d.qualifiedLeads.toLocaleString() },
  { key: 'cac', title: 'Cost / Acquisition', icon: DollarSign, accent: '#f59e0b', format: (d: AnalyticsData) => d.cac > 0 ? `$${d.cac.toFixed(2)}` : '$0.00' },
  { key: 'conversion', title: 'Conversion', icon: TrendingUp, accent: '#8b5cf6', format: (d: AnalyticsData) => `${d.conversionRate}%` },
];

const CHANNEL_COLORS = ['#00f2ff', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

export default function DashboardPage() {
  const { projects, selectedProjectId, loadProjects } = useAppStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allProjectData, setAllProjectData] = useState<Record<string, AnalyticsData>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('');
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening');
    try {
      const stored = localStorage.getItem('leados_user');
      if (stored) { const u = JSON.parse(stored); setUserName(u.name || u.email?.split('@')[0] || ''); }
    } catch {}
  }, []);

  const fetchAnalytics = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { period: '30d' };
      const currentProjectId = useAppStore.getState().selectedProjectId;
      if (currentProjectId) params.projectId = currentProjectId;
      const result = await leados.analytics(params);
      setData(result);
    } catch {
      setError('Failed to load analytics data');
      setData(null);
    } finally { setLoading(false); setRefreshing(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAnalytics(); }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      projects.forEach((project) => {
        leados.analytics({ period: '30d', projectId: project.id })
          .then((d) => setAllProjectData((prev) => ({ ...prev, [project.id]: d })))
          .catch(() => {});
      });
    }
  }, [selectedProjectId, projects]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* ══════ HERO BANNER ══════ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative rounded-2xl overflow-hidden p-6 md:p-8"
        style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.04), rgba(139,92,246,0.03), rgba(2,2,5,0.8))', border: '1px solid rgba(0,242,255,0.08)' }}>
        {/* Decorative orbital */}
        <div className="absolute top-1/2 right-8 -translate-y-1/2 w-32 h-32 pointer-events-none hidden lg:block opacity-30">
          <div className="w-full h-full rounded-full border border-cyan-400/20 orbit-rotate flex items-center justify-center">
            <div className="w-3/4 h-3/4 rounded-full border border-violet-400/15 orbit-rotate-reverse" />
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400/60" style={{ boxShadow: '0 0 6px rgba(0,242,255,0.4)' }} />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mono-ui text-[9px] text-cyan-400/60 mb-2">
              {greeting}
            </motion.p>
            <h1 className="font-cinzel text-2xl md:text-3xl text-white mb-1">
              {selectedProject ? selectedProject.name : userName ? `Welcome, ${userName}` : 'Mission Control'}
            </h1>
            <p className="text-sm text-gray-500">
              {selectedProject
                ? `${selectedProject.type === 'internal' ? 'Internal' : 'External'} project overview`
                : 'Aggregated metrics across all projects'}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => fetchAnalytics(true)} disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs text-gray-400 transition-all hover:text-cyan-400 hover:border-cyan-500/20 disabled:opacity-50"
              style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} /> Refresh
            </button>
            <ProjectFilter />
          </div>
        </div>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 orbit-rotate">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 8px #00f2ff' }} />
              </div>
              <div className="absolute inset-2 rounded-full border border-violet-400/15 orbit-rotate-reverse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap className="h-5 w-5 text-cyan-400/60" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mono-ui text-[9px]">Syncing Telemetry...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="rounded-xl p-6 text-center" style={{ background: 'rgba(239,68,68,0.03)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => fetchAnalytics()}
            className="mt-3 rounded-lg px-4 py-2 text-xs text-red-400 transition-colors hover:bg-red-500/10"
            style={{ border: '1px solid rgba(239,68,68,0.2)' }}>
            Try Again
          </button>
        </div>
      )}

      {/* ══════ DASHBOARD CONTENT ══════ */}
      {!loading && !error && (
        <>
          {/* ══════ ARTISTIC KPI CARDS ══════ */}
          <motion.div initial="hidden" animate="visible" variants={stagger}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {KPI_CONFIG.map((kpi, i) => {
              const Icon = kpi.icon;
              const value = data ? kpi.format(data) : '0';
              const delays = [0, 0.5, 1, 1.5];
              return (
                <motion.div key={kpi.key} variants={fadeUp}
                  whileHover={{ y: -8, rotateX: 2, rotateY: -2, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } }}
                  className="relative overflow-hidden group cursor-default"
                  style={{ perspective: '1000px' }}>

                  {/* ── Animated SVG border ── */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" style={{ zIndex: 2 }}>
                    <rect x="0.5" y="0.5" width="calc(100% - 1px)" height="calc(100% - 1px)" rx="20" ry="20"
                      fill="none" stroke={`${kpi.accent}25`} strokeWidth="1"
                      strokeDasharray="8 6" className="border-flow-animate" />
                  </svg>

                  <div className="relative rounded-[20px] p-6 overflow-hidden transition-all duration-700"
                    style={{ background: 'rgba(2,2,5,0.5)', border: '1px solid rgba(255,255,255,0.03)' }}>

                    {/* ── Morphing blob background ── */}
                    <div className="absolute -top-8 -right-8 w-32 h-32 blob-morph opacity-30 group-hover:opacity-60 transition-opacity duration-1000"
                      style={{ background: `radial-gradient(circle, ${kpi.accent}20, transparent 70%)`, animationDelay: `${delays[i]}s` }} />

                    {/* ── Wavy bottom SVG ── */}
                    <svg className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity duration-700" preserveAspectRatio="none" viewBox="0 0 100 40">
                      <path fill={`${kpi.accent}15`} d="M0,25 Q15,10 30,22 T60,18 T100,25 V40 H0 Z">
                        <animate attributeName="d" dur="6s" repeatCount="indefinite"
                          values="M0,25 Q15,10 30,22 T60,18 T100,25 V40 H0 Z;M0,20 Q20,30 40,18 T70,25 T100,20 V40 H0 Z;M0,25 Q15,10 30,22 T60,18 T100,25 V40 H0 Z" />
                      </path>
                    </svg>

                    {/* ── Aurora shimmer line ── */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] aurora-bg"
                      style={{ background: `linear-gradient(90deg, transparent, ${kpi.accent}00, ${kpi.accent}40, ${kpi.accent}00, transparent)`, backgroundSize: '300% 100%' }} />

                    {/* ── Content ── */}
                    <div className="relative" style={{ zIndex: 3 }}>
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <p className="mono-ui text-[8px] text-gray-600 mb-1">KPI / {String(i + 1).padStart(2, '0')}</p>
                          <p className="text-xs font-medium text-gray-400">{kpi.title}</p>
                        </div>

                        {/* ── Orbital icon ── */}
                        <div className="relative w-12 h-12">
                          <div className="absolute inset-0 rounded-full orbit-rotate opacity-40 group-hover:opacity-80 transition-opacity"
                            style={{ border: `1.5px solid ${kpi.accent}30` }}>
                            <div className="absolute -top-[3px] left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                              style={{ background: kpi.accent, boxShadow: `0 0 6px ${kpi.accent}` }} />
                          </div>
                          {/* Pulse ring on hover */}
                          <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100"
                            style={{ border: `1px solid ${kpi.accent}20`, animation: 'pulse-ring 2s ease-out infinite' }} />
                          <div className="absolute inset-2 rounded-full flex items-center justify-center"
                            style={{ background: `${kpi.accent}10` }}>
                            <Icon className="h-4.5 w-4.5" style={{ color: kpi.accent, filter: `drop-shadow(0 0 4px ${kpi.accent}60)` }} />
                          </div>
                        </div>
                      </div>

                      <p className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-1"
                        style={{ textShadow: `0 0 30px ${kpi.accent}15` }}>
                        {value}
                      </p>

                      {/* ── Animated wave progress ── */}
                      <div className="mt-4 relative h-[6px] rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(35 + i * 18, 95)}%` }}
                          transition={{ duration: 2, delay: 0.3 + i * 0.15, ease: [0.23, 1, 0.32, 1] }}
                          className="absolute inset-y-0 left-0 rounded-full"
                          style={{ background: `linear-gradient(90deg, ${kpi.accent}60, ${kpi.accent})`, boxShadow: `0 0 12px ${kpi.accent}30` }}>
                          {/* Moving shimmer on progress bar */}
                          <div className="absolute inset-0 aurora-bg rounded-full"
                            style={{ background: `linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%)`, backgroundSize: '200% 100%' }} />
                        </motion.div>
                      </div>

                      <div className="flex justify-between mt-2">
                        <span className="mono-ui text-[7px]" style={{ color: `${kpi.accent}50` }}>30d trend</span>
                        <span className="mono-ui text-[7px]" style={{ color: `${kpi.accent}80` }}>active</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* ══════ MISSION CONTROL — Pipeline Quick Status ══════ */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <Link href="/leados" className="group block rounded-2xl p-6 relative overflow-hidden transition-all duration-500"
              style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.03), rgba(0,242,255,0.02), rgba(2,2,5,0.7))', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.05), rgba(0,242,255,0.03), transparent)' }} />
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(0,242,255,0.08)', border: '1px solid rgba(0,242,255,0.15)' }}>
                      <Workflow className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">Mission Control</h3>
                      <p className="mono-ui text-[8px] text-gray-600">13-Agent Pipeline</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <PipelineStatusBadge />
                    <ArrowRight className="h-4 w-4 text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
                {/* Mini pipeline flow */}
                <div className="flex items-center gap-1">
                  {['Research', 'Offer', 'Validate', 'Funnel', 'Content', 'Ads', 'Outreach', 'Capture', 'Qualify', 'Route', 'Track', 'Optimize', 'CRM'].map((name, i) => {
                    const agentState = useAppStore.getState().pipeline.agents[i];
                    const status = agentState?.status || 'idle';
                    const colors: Record<string, string> = {
                      idle: 'rgba(255,255,255,0.06)',
                      running: 'rgba(0,242,255,0.4)',
                      done: 'rgba(16,185,129,0.5)',
                      error: 'rgba(239,68,68,0.5)',
                    };
                    return (
                      <div key={name} className="flex-1 group/step relative" title={name}>
                        <div className="h-2 rounded-full transition-all duration-500"
                          style={{
                            background: colors[status] || colors.idle,
                            boxShadow: status === 'running' ? '0 0 8px rgba(0,242,255,0.3)' : status === 'done' ? '0 0 4px rgba(16,185,129,0.2)' : undefined,
                          }} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="mono-ui text-[7px] text-gray-600">Discovery</span>
                  <span className="mono-ui text-[7px] text-gray-600">Optimization</span>
                </div>
              </div>
            </Link>
          </motion.div>

          {/* ══════ CHANNELS + FUNNEL ══════ */}
          {data && (data.channelBreakdown.length > 0 || data.funnelData.some(f => f.count > 0)) && (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid gap-4 lg:grid-cols-2">
              {/* Channel Performance */}
              {data.channelBreakdown.length > 0 && (
                <motion.div variants={fadeUp} className="relative rounded-[20px] p-6 overflow-hidden"
                  style={{ background: 'rgba(2,2,5,0.5)', border: '1px solid rgba(255,255,255,0.03)' }}>
                  {/* Wavy background decoration */}
                  <svg className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none opacity-10" preserveAspectRatio="none" viewBox="0 0 100 40">
                    <path fill="rgba(0,242,255,0.3)" d="M0,30 Q20,15 40,28 T80,22 T100,30 V40 H0 Z">
                      <animate attributeName="d" dur="8s" repeatCount="indefinite"
                        values="M0,30 Q20,15 40,28 T80,22 T100,30 V40 H0 Z;M0,25 Q25,35 50,20 T85,28 T100,25 V40 H0 Z;M0,30 Q20,15 40,28 T80,22 T100,30 V40 H0 Z" />
                    </path>
                  </svg>
                  <div className="relative" style={{ zIndex: 1 }}>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-200">Channel Performance</h3>
                        <p className="mono-ui text-[7px] text-gray-600 mt-1">Lead sources</p>
                      </div>
                      <BarChart3 className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="space-y-4">
                      {data.channelBreakdown.map((ch, i) => {
                        const maxLeads = Math.max(...data.channelBreakdown.map(c => c.leads), 1);
                        const width = (ch.leads / maxLeads) * 100;
                        const color = CHANNEL_COLORS[i % CHANNEL_COLORS.length];
                        return (
                          <div key={ch.channel} className="group/ch">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-2 h-2 rounded-full transition-transform duration-300 group-hover/ch:scale-150"
                                  style={{ background: color, boxShadow: `0 0 6px ${color}50` }} />
                                <span className="text-xs text-gray-300 group-hover/ch:text-white transition-colors">{ch.channel}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="mono-ui text-[8px] text-gray-400">{ch.leads} leads</span>
                                {ch.conversion > 0 && <span className="mono-ui text-[8px] text-emerald-400">{ch.conversion}%</span>}
                              </div>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                              <motion.div initial={{ width: 0 }} whileInView={{ width: `${Math.max(width, 3)}%` }}
                                viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.12, ease: [0.23, 1, 0.32, 1] }}
                                className="h-full rounded-full relative overflow-hidden"
                                style={{ background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 10px ${color}25` }}>
                                <div className="absolute inset-0 aurora-bg" style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`, backgroundSize: '200% 100%' }} />
                              </motion.div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Funnel */}
              {data.funnelData.some(f => f.count > 0) && (
                <motion.div variants={fadeUp} className="rounded-2xl p-6"
                  style={{ background: 'rgba(2,2,5,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-sm font-semibold text-gray-200">Lead Funnel</h3>
                    <Activity className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="space-y-3">
                    {data.funnelData.map((stage, i) => {
                      const maxCount = data.funnelData[0]?.count || 1;
                      const widthPercent = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
                      const color = ['#00f2ff', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'][i % 6];
                      return (
                        <div key={stage.stage} className="flex items-center gap-3">
                          <span className="text-xs text-gray-500 w-20 text-right shrink-0">{stage.stage}</span>
                          <div className="flex-1 h-7 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <motion.div initial={{ width: 0 }} whileInView={{ width: `${Math.max(widthPercent, 3)}%` }}
                              viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.08 }}
                              className="h-full rounded-lg flex items-center px-3"
                              style={{ background: `${color}15`, borderLeft: `2px solid ${color}` }}>
                              <span className="text-[10px] font-medium" style={{ color }}>{stage.count}</span>
                            </motion.div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ══════ REVENUE ══════ */}
          {data && data.revenue > 0 && (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="rounded-2xl p-6" style={{ background: 'rgba(2,2,5,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-sm font-semibold text-gray-200">Revenue Overview</h3>
                  <p className="mono-ui text-[8px] text-gray-600 mt-1">Last 30 days</p>
                </div>
                <span className="text-2xl font-bold text-emerald-400">${data.revenue.toLocaleString()}</span>
              </div>
              {data.trends.length > 0 && (
                <div className="flex items-end gap-1.5 h-28">
                  {data.trends.map((t, i) => {
                    const maxRevenue = Math.max(...data.trends.map(t => t.revenue), 1);
                    const height = (t.revenue / maxRevenue) * 100;
                    return (
                      <div key={t.date} className="flex-1 flex flex-col items-center gap-1 group/bar">
                        <motion.div initial={{ height: 0 }} whileInView={{ height: `${Math.max(height, 4)}%` }}
                          viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.03 }}
                          className="w-full rounded-t-sm transition-colors group-hover/bar:bg-cyan-400/30"
                          style={{ background: 'rgba(0,242,255,0.15)', boxShadow: '0 -2px 8px rgba(0,242,255,0.05)' }} />
                        <span className="text-[7px] text-gray-700 group-hover/bar:text-gray-500 transition-colors">
                          {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Pipeline Status (project selected) */}
          {selectedProject && <PipelineStatus />}

          {/* ══════ PROJECT PERFORMANCE ══════ */}
          {!selectedProjectId && projects.length > 0 && (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="rounded-2xl p-6" style={{ background: 'rgba(2,2,5,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FolderKanban className="h-4 w-4 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-200">Project Performance</h3>
                </div>
                <Link href="/projects" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">Manage</Link>
              </div>
              <div className="space-y-2">
                {projects.map((project) => {
                  const pd = allProjectData[project.id];
                  return (
                    <motion.div key={project.id} whileHover={{ x: 4 }} transition={{ duration: 0.2 }}
                      className="flex items-center justify-between rounded-xl p-4 transition-all duration-300 group"
                      style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ background: project.type === 'internal' ? 'rgba(245,158,11,0.1)' : 'rgba(0,242,255,0.08)' }}>
                          {project.type === 'internal'
                            ? <Building2 className="h-4 w-4 text-amber-400" />
                            : <Globe className="h-4 w-4 text-cyan-400" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{project.name}</p>
                          <p className="mono-ui text-[7px] text-gray-600">{project.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {[
                          { v: pd?.totalLeads ?? '—', l: 'Leads' },
                          { v: pd?.qualifiedLeads ?? '—', l: 'Qualified' },
                          { v: pd?.conversionRate != null ? `${pd.conversionRate}%` : '—', l: 'Conv.' },
                        ].map(m => (
                          <div key={m.l} className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-white">{m.v}</p>
                            <p className="mono-ui text-[7px] text-gray-600">{m.l}</p>
                          </div>
                        ))}
                        <button onClick={() => useAppStore.getState().selectProject(project.id)}
                          className="rounded-lg p-2 text-gray-600 group-hover:text-cyan-400 transition-colors"
                          style={{ border: '1px solid rgba(255,255,255,0.04)' }} title="View project">
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* No data state */}
          {data && data.totalLeads === 0 && !selectedProjectId && projects.length === 0 && (
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
              className="rounded-2xl p-12 text-center relative overflow-hidden"
              style={{ background: 'rgba(2,2,5,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(0,242,255,0.03), transparent 60%)' }} />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(0,242,255,0.05)', border: '1px solid rgba(0,242,255,0.1)' }}>
                  <Rocket className="h-7 w-7 text-cyan-400/60" />
                </div>
                <h3 className="font-cinzel text-lg text-white mb-2">Ready for Launch</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">Run your first pipeline to start generating leads. All 13 agents are standing by.</p>
                <Link href="/leados"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-medium text-cyan-400 transition-all hover:text-white group"
                  style={{ background: 'rgba(0,242,255,0.08)', border: '1px solid rgba(0,242,255,0.2)' }}>
                  <Zap className="h-4 w-4" /> Launch Pipeline
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </motion.div>
          )}

          {/* ══════ QUICK ACTIONS + ACTIVITY ══════ */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid gap-4 lg:grid-cols-3">
            {/* Quick Launch */}
            <motion.div variants={fadeUp} className="rounded-2xl p-6"
              style={{ background: 'rgba(2,2,5,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <h3 className="text-sm font-semibold text-gray-200 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {[
                  { href: '/leados', icon: Zap, label: 'Launch Pipeline', desc: selectedProject ? `${selectedProject.type === 'internal' ? '9' : '13'} agents` : '13 agents', accent: '#00f2ff' },
                  { href: '/projects', icon: FolderKanban, label: 'New Project', desc: 'Create a mission', accent: '#3b82f6' },
                  { href: '/leads', icon: Users, label: 'View Leads', desc: 'CRM overview', accent: '#10b981' },
                ].map(action => {
                  const Icon = action.icon;
                  return (
                    <Link key={action.href} href={action.href}
                      className="flex items-center gap-3 rounded-xl p-3 transition-all duration-300 group"
                      style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${action.accent}10`, border: `1px solid ${action.accent}15` }}>
                        <Icon className="h-4 w-4" style={{ color: action.accent }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{action.label}</p>
                        <p className="text-[10px] text-gray-600">{action.desc}</p>
                      </div>
                      <Play className="ml-auto h-3.5 w-3.5 text-gray-700 group-hover:text-cyan-400 transition-colors shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </motion.div>

            {/* Activity Feed — spans 2 cols */}
            <motion.div variants={fadeUp} className="lg:col-span-2">
              <ActivityFeed />
            </motion.div>
          </motion.div>
        </>
      )}
    </div>
  );
}

/* Inline helper — reads pipeline status from store */
function PipelineStatusBadge() {
  const status = useAppStore((s) => s.pipeline.status);
  const config: Record<string, { label: string; color: string }> = {
    idle: { label: 'Standby', color: 'rgba(255,255,255,0.3)' },
    running: { label: 'Active', color: '#00f2ff' },
    completed: { label: 'Complete', color: '#10b981' },
    error: { label: 'Error', color: '#ef4444' },
    paused: { label: 'Paused', color: '#f59e0b' },
  };
  const c = config[status] || config.idle;
  return (
    <span className="mono-ui text-[8px] rounded-full px-2.5 py-1" style={{ color: c.color, background: `${c.color}10`, border: `1px solid ${c.color}20` }}>
      {c.label}
    </span>
  );
}

/* Need this import for the quick actions */
import { FolderKanban } from 'lucide-react';
