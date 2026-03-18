'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Users, Target, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { leados } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { ProjectFilter } from '@/components/projects/project-filter';
import { ErrorBoundary } from '@/components/layout/error-boundary';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

const RechartsComponents = dynamic(() => import('@/components/dashboard/analytics-charts'), { ssr: false });

const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const KPI_COLORS: Record<string, { accent: string }> = {
  indigo: { accent: '#00f2ff' },
  amber: { accent: '#f59e0b' },
  blue: { accent: '#3b82f6' },
  emerald: { accent: '#10b981' },
};

const CHANNEL_COLORS = ['#00f2ff', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'];

function AnalyticsPageInner() {
  const { selectedProjectId, projects, loadProjects } = useAppStore();
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState('30d');
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  useEffect(() => {
    const params: Record<string, string> = { period };
    if (selectedProjectId) params.projectId = selectedProjectId;
    leados.analytics(params).then(setData).catch(() => {});
  }, [period, selectedProjectId]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* ══════ HEADER ══════ */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden p-6"
        style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.03), rgba(139,92,246,0.02), rgba(2,2,5,0.8))', border: '1px solid rgba(0,242,255,0.08)' }}>
        <div className="absolute top-1/2 right-8 -translate-y-1/2 w-20 h-20 pointer-events-none hidden md:block opacity-20">
          <div className="w-full h-full rounded-full border border-cyan-400/20 orbit-rotate">
            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cyan-400" />
          </div>
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="mono-ui text-[8px] text-cyan-400/50 mb-1.5 flex items-center gap-2">
              <span className="w-3 h-px bg-cyan-500/30" />Performance Insights
            </div>
            <h1 className="font-cinzel text-2xl md:text-3xl text-white">
              {selectedProject ? `${selectedProject.name} Analytics` : 'Analytics'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {selectedProject ? `Metrics for ${selectedProject.name}` : 'LeadOS performance metrics and insights'}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <ProjectFilter />
            <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
              {['7d', '30d', '90d'].map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={cn('px-4 py-2 text-xs font-medium transition-all', period === p ? 'text-cyan-400' : 'text-gray-500 hover:text-gray-300')}
                  style={period === p ? { background: 'rgba(0,242,255,0.08)' } : { background: 'rgba(255,255,255,0.02)' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {data && (
        <>
          {/* ══════ KPI CARDS ══════ */}
          <motion.div initial="hidden" animate="visible" variants={stagger}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Cost Per Lead', value: `$${data.cpl}`, icon: DollarSign, color: 'indigo' },
              { title: 'CAC', value: `$${data.cac}`, icon: Target, color: 'amber' },
              { title: 'Total Leads', value: data.totalLeads.toLocaleString(), icon: Users, color: 'blue' },
              { title: 'Revenue', value: `$${data.revenue.toLocaleString()}`, icon: TrendingUp, color: 'emerald' },
            ].map((kpi, i) => {
              const c = KPI_COLORS[kpi.color];
              const Icon = kpi.icon;
              return (
                <motion.div key={kpi.title} variants={fadeUp}
                  whileHover={{ y: -4, transition: { duration: 0.3 } }}
                  className="relative rounded-2xl p-6 overflow-hidden group transition-all duration-500"
                  style={{ background: 'rgba(2,2,5,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="absolute -top-8 -right-8 w-28 h-28 blob-morph opacity-20 group-hover:opacity-40 transition-opacity duration-1000"
                    style={{ background: `radial-gradient(circle, ${c.accent}20, transparent 70%)`, animationDelay: `${i * 0.5}s` }} />
                  <svg className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none opacity-15 group-hover:opacity-30 transition-opacity" preserveAspectRatio="none" viewBox="0 0 100 40">
                    <path fill={`${c.accent}15`} d="M0,28 Q25,18 50,26 T100,28 V40 H0 Z">
                      <animate attributeName="d" dur="6s" repeatCount="indefinite" values="M0,28 Q25,18 50,26 T100,28 V40 H0 Z;M0,24 Q30,32 55,20 T100,24 V40 H0 Z;M0,28 Q25,18 50,26 T100,28 V40 H0 Z" />
                    </path>
                  </svg>
                  <div className="absolute top-0 left-[20%] right-[20%] h-px aurora-bg opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: `linear-gradient(90deg, transparent, ${c.accent}40, transparent)`, backgroundSize: '300% 100%' }} />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-gray-500">{kpi.title}</p>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${c.accent}10`, border: `1px solid ${c.accent}20` }}>
                        <Icon className="h-4 w-4" style={{ color: c.accent }} />
                      </div>
                    </div>
                    <p className="text-3xl font-bold text-white" style={{ textShadow: `0 0 30px ${c.accent}10` }}>{kpi.value}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* ══════ CHARTS ══════ */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="rounded-2xl p-5" style={{ background: 'rgba(2,2,5,0.5)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <RechartsComponents data={data} type="leados" />
          </motion.div>

          {/* ══════ CHANNEL TABLE ══════ */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="p-5 pb-3" style={{ background: 'rgba(2,2,5,0.5)' }}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-4 w-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-200">Channel Performance</h3>
              </div>
              <div className="space-y-4">
                {data.channelBreakdown?.map((ch: any, i: number) => {
                  const maxLeads = Math.max(...(data.channelBreakdown?.map((c: any) => c.leads) || [1]));
                  const width = (ch.leads / maxLeads) * 100;
                  const color = CHANNEL_COLORS[i % CHANNEL_COLORS.length];
                  return (
                    <div key={ch.channel} className="group/ch">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full transition-transform group-hover/ch:scale-150" style={{ background: color, boxShadow: `0 0 6px ${color}50` }} />
                          <span className="text-sm text-gray-300 group-hover/ch:text-white transition-colors">{ch.channel}</span>
                        </div>
                        <div className="flex items-center gap-4 mono-ui text-[8px]">
                          <span className="text-gray-400">{ch.leads} leads</span>
                          <span className="text-gray-500">${ch.spend.toLocaleString()}</span>
                          <span className="text-gray-500">${ch.cpl} CPL</span>
                          <span style={{ color }}>{ch.conversion}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${Math.max(width, 3)}%` }}
                          viewport={{ once: true }} transition={{ duration: 1, delay: i * 0.1 }}
                          className="h-full rounded-full relative overflow-hidden"
                          style={{ background: `linear-gradient(90deg, ${color}80, ${color})`, boxShadow: `0 0 8px ${color}25` }}>
                          <div className="absolute inset-0 aurora-bg" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', backgroundSize: '200% 100%' }} />
                        </motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  return <ErrorBoundary><AnalyticsPageInner /></ErrorBoundary>;
}
