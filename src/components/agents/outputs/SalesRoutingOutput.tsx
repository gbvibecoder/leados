'use client';

import React, { useState } from 'react';
import {
  ShoppingCart,
  Calendar,
  Mail,
  XCircle,
  ChevronDown,
  ChevronUp,
  Check,
  Target,
  TrendingUp,
  Sparkles,
  Clock,
  Users,
  Bell,
  Zap,
  AlertTriangle,
  ArrowRight,
  Copy,
  Shield,
  User,
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

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 85 ? 'bg-green-500' : pct >= 70 ? 'bg-blue-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold w-6 text-right">{score}</span>
    </div>
  );
}

const ROUTE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bgColor: string; emoji: string }> = {
  checkout: { icon: <ShoppingCart className="w-3.5 h-3.5" />, label: 'Checkout', color: 'text-green-400', bgColor: 'bg-green-500/20 text-green-400 border-green-500/30', emoji: '🔥' },
  sales_call: { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Sales Call', color: 'text-blue-400', bgColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30', emoji: '🌡' },
  nurture: { icon: <Mail className="w-3.5 h-3.5" />, label: 'Nurture', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', emoji: '💧' },
  disqualify: { icon: <XCircle className="w-3.5 h-3.5" />, label: 'Disqualified', color: 'text-red-400', bgColor: 'bg-red-500/20 text-red-400 border-red-500/30', emoji: '❄' },
};

const SLA_CONFIG: Record<string, string> = {
  met: 'bg-green-500/20 text-green-400',
  breached: 'bg-red-500/20 text-red-400',
};

export function SalesRoutingOutput({ data }: Props) {
  const d = data?.data || data;
  const [expandedLead, setExpandedLead] = useState<number | null>(null);
  const [showAllLeads, setShowAllLeads] = useState(false);

  if (!d || (!d.routedLeads && !d.routingEngine)) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No routing data yet. Run the Sales Routing Agent to route qualified leads.
      </div>
    );
  }

  const routingEngine = d.routingEngine || {};
  const routedLeads = d.routedLeads || [];
  const notifications = d.notifications || [];
  const summary = d.summary || {};
  const rules = routingEngine.rules || [];
  const reps = routingEngine.roundRobinConfig?.reps || [];

  const displayLeads = showAllLeads ? routedLeads : routedLeads.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-500" />
          <h3 className="font-semibold">Sales Routing Engine</h3>
          <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
            {summary.totalRouted || routedLeads.length} routed
          </span>
        </div>
        {d.confidence && (
          <span className="text-xs text-muted-foreground">
            Confidence: <span className="font-semibold text-green-400">{d.confidence}%</span>
          </span>
        )}
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-3 rounded-lg border bg-green-500/5 border-green-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <ShoppingCart className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] sm:text-xs text-green-400/80 font-medium uppercase tracking-wide">Checkout</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-400">{summary.checkout || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">ready to buy</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-blue-500/5 border-blue-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] sm:text-xs text-blue-400/80 font-medium uppercase tracking-wide">Sales Call</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-400">{summary.salesCall || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">booked with rep</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-yellow-500/5 border-yellow-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Mail className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[10px] sm:text-xs text-yellow-400/80 font-medium uppercase tracking-wide">Nurture</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-yellow-400">{summary.nurture || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">in drip sequence</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-red-500/5 border-red-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <XCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] sm:text-xs text-red-400/80 font-medium uppercase tracking-wide">Disqualified</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-red-400">{summary.disqualified || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">archived</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] sm:text-xs text-emerald-400/80 font-medium uppercase tracking-wide">Conversion</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">{summary.conversionProjection || 0}%</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">projected rate</div>
        </div>
      </div>

      {/* Routing Distribution + Latency */}
      <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
        <div className="text-xs font-medium text-muted-foreground mb-2">Routing Distribution</div>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(ROUTE_CONFIG).map(([key, config]) => {
            const count = key === 'checkout' ? (summary.checkout || 0) :
                          key === 'sales_call' ? (summary.salesCall || 0) :
                          key === 'nurture' ? (summary.nurture || 0) :
                          (summary.disqualified || 0);
            const total = summary.totalRouted || routedLeads.length || 1;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={key} className={`p-2 rounded-lg border text-center ${config.bgColor}`}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  {config.icon}
                  <span className="text-[10px] font-medium">{config.label}</span>
                </div>
                <div className="text-lg font-bold">{count}</div>
                <div className="text-[9px] opacity-70">{pct}%</div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span><Clock className="w-3 h-3 inline mr-0.5" />Avg latency: <span className="text-foreground font-medium">{summary.avgRoutingLatency || '—'}</span></span>
          <span>
            <Shield className="w-3 h-3 inline mr-0.5" />SLA breaches:{' '}
            <span className={`font-medium ${(summary.slaBreaches || 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {summary.slaBreaches || 0}
            </span>
          </span>
        </div>
      </div>

      {/* Routed Leads */}
      {routedLeads.length > 0 && (
        <Section
          title="Routed Leads"
          icon={<Zap className="w-4 h-4 text-cyan-400" />}
          badge={`${routedLeads.length} leads`}
          badgeColor="bg-cyan-500/20 text-cyan-400"
          defaultOpen
        >
          <div className="space-y-2 pt-3">
            {displayLeads.map((lead: any, idx: number) => {
              const routeConfig = ROUTE_CONFIG[lead.route] || ROUTE_CONFIG.disqualify;
              const isExpanded = expandedLead === idx;

              return (
                <div key={idx} className="rounded-lg border border-border/50 overflow-hidden">
                  {/* Lead Header */}
                  <button
                    onClick={() => setExpandedLead(isExpanded ? null : idx)}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex-shrink-0 ${routeConfig.color}`}>{routeConfig.icon}</div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{lead.leadName}</span>
                          <span className="text-[10px] text-muted-foreground">{lead.company}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-1.5 py-0.5 text-[10px] rounded border ${routeConfig.bgColor}`}>
                            {routeConfig.label}
                          </span>
                          {lead.qualificationScore > 0 && (
                            <span className="text-[10px] font-medium">Score: {lead.qualificationScore}/100</span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            <Clock className="w-2.5 h-2.5 inline mr-0.5" />{lead.latency}
                          </span>
                          {lead.slaStatus && (
                            <span className={`px-1 py-0.5 text-[9px] rounded ${SLA_CONFIG[lead.slaStatus] || ''}`}>
                              SLA {lead.slaStatus}
                            </span>
                          )}
                          {lead.assignedRep && (
                            <span className="text-[10px] text-blue-400">
                              <User className="w-2.5 h-2.5 inline mr-0.5" />{lead.assignedRep}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border/30 space-y-3">
                      {/* BANT Breakdown */}
                      {lead.bantBreakdown && lead.qualificationScore > 0 && (
                        <div className="pt-3">
                          <div className="text-[10px] font-medium text-violet-400 uppercase tracking-wide mb-2">BANT Score</div>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { label: 'Budget', value: lead.bantBreakdown.budget, max: 30, color: 'bg-green-500' },
                              { label: 'Authority', value: lead.bantBreakdown.authority, max: 25, color: 'bg-blue-500' },
                              { label: 'Need', value: lead.bantBreakdown.need, max: 25, color: 'bg-purple-500' },
                              { label: 'Timeline', value: lead.bantBreakdown.timeline, max: 20, color: 'bg-orange-500' },
                            ].map(({ label, value, max, color }) => (
                              <div key={label} className="text-center">
                                <div className="text-[9px] text-muted-foreground mb-1">{label}</div>
                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.round((value / max) * 100)}%` }} />
                                </div>
                                <div className="text-[10px] font-medium mt-0.5">{value}/{max}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Routing Reason */}
                      <div className="p-2 bg-muted/30 rounded text-xs">
                        <span className="text-muted-foreground">Reason: </span>
                        <span className="font-medium">{lead.reason}</span>
                      </div>

                      {/* Destination */}
                      {lead.destination && (
                        <div className="p-2 bg-muted/30 rounded text-xs flex items-center gap-2">
                          <ArrowRight className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                          <span className="text-muted-foreground">Destination: </span>
                          <span className="font-medium truncate">{lead.destination}</span>
                          <CopyButton text={lead.destination} />
                        </div>
                      )}

                      {/* Actions Taken */}
                      {lead.actions?.length > 0 && (
                        <div>
                          <div className="text-[10px] font-medium text-cyan-400 uppercase tracking-wide mb-1">Actions Triggered</div>
                          <div className="space-y-1">
                            {lead.actions.map((action: string, aIdx: number) => (
                              <div key={aIdx} className="flex items-center gap-2 text-[10px]">
                                <Check className="w-3 h-3 text-green-400 flex-shrink-0" />
                                <span>{action}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {routedLeads.length > 6 && (
              <button
                onClick={() => setShowAllLeads(!showAllLeads)}
                className="w-full p-2 text-xs text-cyan-400 hover:text-cyan-300 border border-dashed border-border rounded-lg"
              >
                {showAllLeads ? 'Show fewer' : `Show all ${routedLeads.length} leads`}
              </button>
            )}
          </div>
        </Section>
      )}

      {/* Routing Rules */}
      {rules.length > 0 && (
        <Section
          title="Routing Rules"
          icon={<Shield className="w-4 h-4 text-violet-400" />}
          badge={`${rules.length} rules`}
          badgeColor="bg-violet-500/20 text-violet-400"
        >
          <div className="space-y-2 pt-3">
            {rules.map((rule: any, idx: number) => {
              const routeConfig = ROUTE_CONFIG[rule.action] || ROUTE_CONFIG.disqualify;
              return (
                <div key={idx} className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg border border-border/50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${routeConfig.bgColor}`}>
                    {routeConfig.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{rule.name}</span>
                      <span className="text-[10px] text-muted-foreground">Priority {rule.priority}</span>
                      {rule.sla && (
                        <span className="px-1.5 py-0.5 text-[9px] bg-muted rounded">SLA: {rule.sla}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span>Score: {rule.condition?.scoreRange || '—'}</span>
                      <ArrowRight className="w-2.5 h-2.5" />
                      <span className="font-medium text-foreground">{rule.destination}</span>
                    </div>
                    {rule.condition?.additionalSignals?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rule.condition.additionalSignals.map((signal: string, sIdx: number) => (
                          <span key={sIdx} className="px-1 py-0.5 text-[9px] bg-muted/50 rounded">{signal}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Sales Reps (Round Robin) */}
      {reps.length > 0 && (
        <Section
          title="Sales Team Capacity"
          icon={<Users className="w-4 h-4 text-blue-400" />}
          badge={`${reps.length} reps`}
          badgeColor="bg-blue-500/20 text-blue-400"
        >
          <div className="space-y-2 pt-3">
            {reps.map((rep: any, idx: number) => {
              const loadPct = Math.round((rep.currentLoad / rep.capacity) * 100);
              const loadColor = loadPct >= 80 ? 'bg-red-500' : loadPct >= 60 ? 'bg-yellow-500' : 'bg-green-500';
              return (
                <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-sm font-medium">{rep.name}</span>
                      <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded">{rep.specialization}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{rep.currentLoad}/{rep.capacity} deals</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${loadColor} rounded-full transition-all`} style={{ width: `${loadPct}%` }} />
                  </div>
                  {rep.email && (
                    <div className="text-[10px] text-muted-foreground mt-1">{rep.email}</div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <Section
          title="Notifications Sent"
          icon={<Bell className="w-4 h-4 text-orange-400" />}
          badge={`${notifications.length} sent`}
          badgeColor="bg-orange-500/20 text-orange-400"
        >
          <div className="space-y-1.5 pt-3">
            {notifications.map((notif: any, idx: number) => {
              const typeIcons: Record<string, React.ReactNode> = {
                email: <Mail className="w-3 h-3 text-blue-400" />,
                sms: <Bell className="w-3 h-3 text-green-400" />,
                slack: <Zap className="w-3 h-3 text-purple-400" />,
                webhook: <ArrowRight className="w-3 h-3 text-cyan-400" />,
              };
              return (
                <div key={idx} className="flex items-start gap-2 p-2 bg-muted/20 rounded border border-border/30 text-[10px]">
                  {typeIcons[notif.type] || <Bell className="w-3 h-3" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium uppercase">{notif.type}</span>
                      <span className="text-muted-foreground">to {notif.recipient}</span>
                    </div>
                    <div className="text-muted-foreground mt-0.5 truncate">{notif.message}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Reasoning */}
      {d.reasoning && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">Routing Strategy</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{d.reasoning}</p>
        </div>
      )}
    </div>
  );
}

export default SalesRoutingOutput;
