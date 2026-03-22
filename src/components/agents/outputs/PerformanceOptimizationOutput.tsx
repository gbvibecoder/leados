'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  Zap,
  DollarSign,
  Target,
  AlertTriangle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Pause,
  Play,
  BarChart3,
  RefreshCw,
  Lightbulb,
  Bell,
  Copy,
  Activity,
} from 'lucide-react';

interface Props {
  data?: any;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback */ }
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-accent transition-colors flex-shrink-0" title="Copy">
      {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
    </button>
  );
}

function Section({
  title, icon, badge, badgeColor = 'bg-blue-500/20 text-blue-400', children, defaultOpen = false,
}: {
  title: string; icon: React.ReactNode; badge?: string; badgeColor?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="font-medium text-sm sm:text-base">{title}</span>
          {badge && <span className={`px-2 py-0.5 text-[10px] sm:text-xs rounded-full ${badgeColor}`}>{badge}</span>}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-border/50">{children}</div>}
    </div>
  );
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bgColor: string }> = {
  scale: { icon: <ArrowUp className="w-3.5 h-3.5" />, label: 'SCALE', color: 'text-green-400', bgColor: 'bg-green-500/20 text-green-400 border-green-500/30' },
  optimize: { icon: <RefreshCw className="w-3.5 h-3.5" />, label: 'OPTIMIZE', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  kill: { icon: <Pause className="w-3.5 h-3.5" />, label: 'KILL', color: 'text-red-400', bgColor: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const SEVERITY_CONFIG: Record<string, { color: string; bgColor: string }> = {
  critical: { color: 'text-red-400', bgColor: 'bg-red-500/10 border-red-500/30' },
  warning: { color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' },
  info: { color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30' },
};

const FATIGUE_CONFIG: Record<string, string> = {
  low: 'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-red-500/20 text-red-400',
};

export function PerformanceOptimizationOutput({ data }: Props) {
  const d = data?.data || data;

  if (!d || (!d.currentMetrics && !d.campaignAnalysis)) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No optimization data yet. Run the Performance Optimization Agent to analyze campaigns.
      </div>
    );
  }

  const metrics = d.currentMetrics || {};
  const campaigns = d.campaignAnalysis || [];
  const budget = d.budgetReallocation || {};
  const fatigue = d.creativeFatigue || [];
  const refinements = d.offerRefinements || [];
  const report = d.weeklyReport || {};
  const alerts = d.alerts || [];
  const summary = d.summary || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold">Performance Optimization</h3>
          <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
            {campaigns.length} campaigns
          </span>
        </div>
        {!!d.confidence && (
          <span className="text-xs text-muted-foreground">
            Confidence: <span className="font-semibold text-green-400">{d.confidence}%</span>
          </span>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-3 rounded-lg border bg-green-500/5 border-green-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] sm:text-xs text-green-400/80 font-medium uppercase tracking-wide">ROAS</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-400">{metrics.roas || 0}x</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">return on ad spend</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] sm:text-xs text-blue-400/80 font-medium uppercase tracking-wide">CPL</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-400">${metrics.cpl || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">cost per lead</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-violet-500/5 border-violet-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[10px] sm:text-xs text-violet-400/80 font-medium uppercase tracking-wide">LTV/CAC</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-violet-400">{metrics.ltvCacRatio || 0}x</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">unit economics</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-orange-500/5 border-orange-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] sm:text-xs text-orange-400/80 font-medium uppercase tracking-wide">Qualification</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-orange-400">{metrics.qualificationRate || 0}%</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">lead → qualified</div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-1.5">
          {alerts.map((alert: any, idx: number) => {
            const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
            return (
              <div key={idx} className={`flex items-start gap-2 p-2.5 rounded-lg border ${sev.bgColor}`}>
                {alert.severity === 'critical' ? <XCircle className={`w-3.5 h-3.5 ${sev.color} flex-shrink-0 mt-0.5`} /> :
                 alert.severity === 'warning' ? <AlertTriangle className={`w-3.5 h-3.5 ${sev.color} flex-shrink-0 mt-0.5`} /> :
                 <Bell className={`w-3.5 h-3.5 ${sev.color} flex-shrink-0 mt-0.5`} />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase ${sev.color}`}>{alert.severity}</span>
                    <span className="text-xs font-medium break-words">{alert.message}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 break-words">{alert.action}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Campaign Analysis */}
      <Section
        title="Campaign Analysis"
        icon={<BarChart3 className="w-4 h-4 text-amber-400" />}
        badge={`${summary.campaignsScaled || 0} scaled, ${summary.campaignsKilled || 0} killed`}
        badgeColor="bg-amber-500/20 text-amber-400"
        defaultOpen
      >
        <div className="space-y-2 pt-3">
          {campaigns.map((campaign: any, idx: number) => {
            const statusConfig = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.optimize;
            const m = campaign.metrics || {};
            return (
              <div key={idx} className="p-3 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${statusConfig.bgColor}`}>
                      {statusConfig.label}
                    </span>
                    <span className="text-sm font-medium truncate">{campaign.campaign}</span>
                  </div>
                  {campaign.budgetChange && (
                    <span className={`text-[10px] font-medium flex-shrink-0 ${
                      campaign.budgetChange.startsWith('+') ? 'text-green-400' :
                      campaign.budgetChange.startsWith('-') ? 'text-red-400' : 'text-muted-foreground'
                    }`}>{campaign.budgetChange}</span>
                  )}
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 text-[10px] mb-2">
                  <div><span className="text-muted-foreground">Spend: </span><span className="font-medium">${m.spend?.toLocaleString()}</span></div>
                  <div><span className="text-muted-foreground">Leads: </span><span className="font-medium">{m.leads}</span></div>
                  <div><span className="text-muted-foreground">CPL: </span><span className="font-medium">${m.cpl}</span></div>
                  <div><span className="text-muted-foreground">ROAS: </span><span className={`font-medium ${m.roas >= 3 ? 'text-green-400' : m.roas >= 1 ? 'text-yellow-400' : 'text-red-400'}`}>{m.roas === Infinity ? '∞' : `${m.roas}x`}</span></div>
                  <div><span className="text-muted-foreground">CTR: </span><span className="font-medium">{m.ctr}%</span></div>
                  <div><span className="text-muted-foreground">Qualified: </span><span className="font-medium">{m.qualifiedLeads}</span></div>
                  <div><span className="text-muted-foreground">Meetings: </span><span className="font-medium">{m.meetings}</span></div>
                </div>
                <div className="text-[10px]">
                  <span className="font-medium text-foreground break-words">{campaign.action}</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 break-words">{campaign.reason}</div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Budget Reallocation */}
      {budget.before && budget.after && (
        <Section
          title="Budget Reallocation"
          icon={<DollarSign className="w-4 h-4 text-green-400" />}
          badge={`$${summary.budgetReallocated?.toLocaleString() || 0} moved`}
          badgeColor="bg-green-500/20 text-green-400"
        >
          <div className="pt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border/50">
                    <th className="text-left py-2 pr-3 font-medium">Campaign</th>
                    <th className="text-right py-2 px-2 font-medium">Before</th>
                    <th className="text-right py-2 px-2 font-medium">After</th>
                    <th className="text-right py-2 pl-2 font-medium">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(budget.before).map((key: string) => {
                    const before = budget.before[key] || 0;
                    const after = budget.after[key] || 0;
                    const diff = after - before;
                    return (
                      <tr key={key} className="border-b border-border/30">
                        <td className="py-2 pr-3">{key}</td>
                        <td className="text-right py-2 px-2">${before.toLocaleString()}</td>
                        <td className="text-right py-2 px-2 font-medium">${after.toLocaleString()}</td>
                        <td className={`text-right py-2 pl-2 font-medium ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
                          {diff > 0 ? `+$${diff.toLocaleString()}` : diff < 0 ? `-$${Math.abs(diff).toLocaleString()}` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {budget.rationale && (
              <div className="mt-2 p-2 bg-muted/20 rounded text-[10px] text-muted-foreground">{budget.rationale}</div>
            )}
          </div>
        </Section>
      )}

      {/* Creative Fatigue */}
      {fatigue.length > 0 && (
        <Section
          title="Creative Fatigue Monitor"
          icon={<RefreshCw className="w-4 h-4 text-orange-400" />}
          badge={`${fatigue.filter((f: any) => f.fatigueLevel === 'high').length} high`}
          badgeColor="bg-orange-500/20 text-orange-400"
        >
          <div className="space-y-2 pt-3">
            {fatigue.map((item: any, idx: number) => (
              <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium">{item.campaign}</span>
                  <span className={`px-1.5 py-0.5 text-[10px] rounded ${FATIGUE_CONFIG[item.fatigueLevel] || ''}`}>
                    {item.fatigueLevel} fatigue
                  </span>
                </div>
                <div className="flex gap-4 text-[10px] text-muted-foreground mb-1.5">
                  <span>CTR: {item.ctrTrend}</span>
                  <span>Frequency: {item.frequency}x/7d</span>
                </div>
                <div className="text-[10px] break-words">{item.recommendation}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recommendations */}
      {refinements.length > 0 && (
        <Section
          title="Optimization Recommendations"
          icon={<Lightbulb className="w-4 h-4 text-yellow-400" />}
          badge={`${refinements.filter((r: any) => r.priority === 'high').length} high priority`}
          badgeColor="bg-yellow-500/20 text-yellow-400"
        >
          <div className="space-y-2 pt-3">
            {refinements.map((rec: any, idx: number) => {
              const priorityColor = rec.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                    rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-blue-500/20 text-blue-400';
              return (
                <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${priorityColor}`}>{rec.priority}</span>
                    <span className="text-xs font-medium">{rec.area}</span>
                  </div>
                  {rec.currentState && <div className="text-[10px] text-muted-foreground mb-1">Current: {rec.currentState}</div>}
                  <div className="text-[10px] font-medium break-words">{rec.recommendation}</div>
                  {rec.expectedImpact && <div className="text-[10px] text-green-400 mt-1">Impact: {rec.expectedImpact}</div>}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Weekly Report */}
      {report.leadsGenerated && (
        <Section
          title="Weekly Performance Report"
          icon={<BarChart3 className="w-4 h-4 text-emerald-400" />}
          badge={report.period}
          badgeColor="bg-emerald-500/20 text-emerald-400"
        >
          <div className="pt-3 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-lg font-bold">{report.leadsGenerated}</div>
                <div className="text-[10px] text-muted-foreground">Leads</div>
                {report.weekOverWeek?.leads && <div className="text-[10px] text-green-400">{report.weekOverWeek.leads} WoW</div>}
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-lg font-bold">{report.qualifiedLeads}</div>
                <div className="text-[10px] text-muted-foreground">Qualified</div>
                {report.weekOverWeek?.qualified && <div className="text-[10px] text-green-400">{report.weekOverWeek.qualified} WoW</div>}
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-lg font-bold">{report.meetingsBooked}</div>
                <div className="text-[10px] text-muted-foreground">Meetings</div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-lg font-bold text-green-400">${report.revenue?.toLocaleString()}</div>
                <div className="text-[10px] text-muted-foreground">Revenue</div>
                {report.weekOverWeek?.revenue && <div className="text-[10px] text-green-400">{report.weekOverWeek.revenue} WoW</div>}
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <div className="text-lg font-bold text-emerald-400">{report.roasOverall}x</div>
                <div className="text-[10px] text-muted-foreground">Overall ROAS</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="p-2 bg-green-500/5 rounded border border-green-500/20">
                <div className="flex items-center gap-1 text-green-400 mb-0.5"><Play className="w-3 h-3" /> Top Performer</div>
                <div>{report.topPerformer}</div>
              </div>
              <div className="p-2 bg-red-500/5 rounded border border-red-500/20">
                <div className="flex items-center gap-1 text-red-400 mb-0.5"><Pause className="w-3 h-3" /> Bottom Performer</div>
                <div>{report.bottomPerformer}</div>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Optimization Summary */}
      <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="text-xs font-medium text-muted-foreground mb-2">Optimization Actions</div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 bg-green-500/10 rounded">
            <div className="flex items-center justify-center gap-1 text-green-400 mb-0.5"><ArrowUp className="w-3 h-3" /><span className="text-[10px] font-medium">Scaled</span></div>
            <div className="text-lg font-bold text-green-400">{summary.campaignsScaled || 0}</div>
          </div>
          <div className="p-2 bg-yellow-500/10 rounded">
            <div className="flex items-center justify-center gap-1 text-yellow-400 mb-0.5"><RefreshCw className="w-3 h-3" /><span className="text-[10px] font-medium">Optimized</span></div>
            <div className="text-lg font-bold text-yellow-400">{summary.campaignsOptimized || 0}</div>
          </div>
          <div className="p-2 bg-red-500/10 rounded">
            <div className="flex items-center justify-center gap-1 text-red-400 mb-0.5"><Pause className="w-3 h-3" /><span className="text-[10px] font-medium">Killed</span></div>
            <div className="text-lg font-bold text-red-400">{summary.campaignsKilled || 0}</div>
          </div>
          <div className="p-2 bg-emerald-500/10 rounded">
            <div className="flex items-center justify-center gap-1 text-emerald-400 mb-0.5"><TrendingUp className="w-3 h-3" /><span className="text-[10px] font-medium">ROAS Impact</span></div>
            <div className="text-xs font-bold text-emerald-400">{summary.projectedRoasImprovement || '—'}</div>
          </div>
        </div>
      </div>

      {/* Reasoning */}
      {d.reasoning && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-lg border border-amber-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">Optimization Strategy</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">{typeof d.reasoning === 'string' ? d.reasoning : JSON.stringify(d.reasoning)}</p>
        </div>
      )}
    </div>
  );
}

export default PerformanceOptimizationOutput;
