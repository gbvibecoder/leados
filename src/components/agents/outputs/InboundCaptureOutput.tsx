'use client';

import React, { useState } from 'react';
import {
  Inbox,
  Users,
  BarChart3,
  Database,
  Shield,
  ChevronDown,
  ChevronUp,
  Check,
  Target,
  TrendingUp,
  Sparkles,
  Webhook,
  Layers,
  Star,
  Gauge,
  Search,
  UserCheck,
  AlertCircle,
  Flame,
  Thermometer,
  Snowflake,
} from 'lucide-react';

interface Props {
  data?: any;
}

function Section({
  title,
  icon,
  badge,
  badgeColor = 'bg-blue-500/20 text-blue-400',
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="font-medium text-sm sm:text-base">{title}</span>
          {badge && (
            <span className={`px-2 py-0.5 text-[10px] sm:text-xs rounded-full ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-border/50">{children}</div>}
    </div>
  );
}

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 80 ? 'bg-red-500' : pct >= 60 ? 'bg-orange-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-blue-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-medium w-6 text-right">{score}</span>
    </div>
  );
}

function SegmentIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes('hot') || lower.includes('enterprise')) return <Flame className="w-3.5 h-3.5 text-red-400" />;
  if (lower.includes('warm') || lower.includes('mid')) return <Thermometer className="w-3.5 h-3.5 text-orange-400" />;
  if (lower.includes('interested') || lower.includes('smb')) return <Star className="w-3.5 h-3.5 text-yellow-400" />;
  return <Snowflake className="w-3.5 h-3.5 text-blue-400" />;
}

function segmentColor(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('hot') || lower.includes('enterprise')) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (lower.includes('warm') || lower.includes('mid')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (lower.includes('interested') || lower.includes('smb')) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
}

export function InboundCaptureOutput({ data }: Props) {
  const d = data?.data || data;
  const [showAllLeads, setShowAllLeads] = useState(false);

  if (!d || (!d.crmSetup && !d.scoringModel && !d.leadsProcessed)) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No capture data yet. Run the Inbound Lead Capture Agent to set up CRM, scoring, and enrichment.
      </div>
    );
  }

  const crmSetup = d.crmSetup || {};
  const scoringModel = d.scoringModel || {};
  const enrichment = d.enrichment || {};
  const segmentation = d.segmentation || {};
  const leads = d.leadsProcessed || [];
  const channels = d.channelBreakdown || [];
  const summary = d.summary || {};

  const totalLeads = summary.totalLeadsProcessed || leads.length || 0;
  const hotLeads = summary.hotLeads || 0;
  const warmLeads = summary.warmLeads || 0;
  const avgScore = summary.avgLeadScore || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-cyan-500" />
          <h3 className="font-semibold">Inbound Lead Capture</h3>
          <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
            {totalLeads} leads
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
        <div className="p-2.5 sm:p-3 rounded-lg border bg-cyan-500/5 border-cyan-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] sm:text-xs text-cyan-400/80 font-medium uppercase tracking-wide">Total</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-cyan-400">{totalLeads}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">leads processed</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-red-500/5 border-red-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] sm:text-xs text-red-400/80 font-medium uppercase tracking-wide">Hot</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-red-400">{hotLeads}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">ready for qualification</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-orange-500/5 border-orange-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Thermometer className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] sm:text-xs text-orange-400/80 font-medium uppercase tracking-wide">Warm</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-orange-400">{warmLeads}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">in nurture sequence</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-green-500/5 border-green-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Gauge className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] sm:text-xs text-green-400/80 font-medium uppercase tracking-wide">Avg Score</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-400">{avgScore}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">out of 100</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-purple-500/5 border-purple-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Search className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] sm:text-xs text-purple-400/80 font-medium uppercase tracking-wide">Enriched</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-400">{enrichment.averageCompletenessScore || summary.totalEnriched || 0}{enrichment.averageCompletenessScore ? '%' : ''}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">{enrichment.averageCompletenessScore ? 'completeness' : 'leads enriched'}</div>
        </div>
      </div>

      {/* Segmentation Overview */}
      {segmentation.segments?.length > 0 && (
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="text-xs font-medium text-muted-foreground mb-3">Lead Segmentation</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {segmentation.segments.map((seg: any, idx: number) => (
              <div key={idx} className={`p-2.5 rounded-lg border ${segmentColor(seg.name)}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <SegmentIcon name={seg.name} />
                  <span className="text-xs font-medium">{seg.name}</span>
                </div>
                <div className="text-lg font-bold">{seg.count}</div>
                <div className="text-[10px] opacity-70">Score: {seg.scoreRange}</div>
                <div className="text-[10px] mt-1 opacity-80">{seg.action?.split('—')[0]?.trim()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Channel Breakdown */}
      {channels.length > 0 && (
        <Section
          title="Channel Breakdown"
          icon={<BarChart3 className="w-4 h-4 text-cyan-400" />}
          badge={`${channels.length} channels`}
          badgeColor="bg-cyan-500/20 text-cyan-400"
          defaultOpen
        >
          <div className="pt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-1.5 pr-3">Channel</th>
                  <th className="text-right py-1.5 pr-3">Leads</th>
                  <th className="text-right py-1.5 pr-3">Avg Score</th>
                  <th className="text-left py-1.5">Top Segment</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((ch: any, idx: number) => (
                  <tr key={idx} className="border-b border-border/30">
                    <td className="py-1.5 pr-3 font-medium capitalize">{ch.channel.replace(/_/g, ' ')}</td>
                    <td className="py-1.5 pr-3 text-right">{ch.leadsCount}</td>
                    <td className="py-1.5 pr-3 text-right">
                      <span className={`font-medium ${ch.avgScore >= 80 ? 'text-red-400' : ch.avgScore >= 60 ? 'text-orange-400' : 'text-blue-400'}`}>
                        {ch.avgScore}
                      </span>
                    </td>
                    <td className="py-1.5">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded border ${segmentColor(ch.topSegment)}`}>
                        {ch.topSegment}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Lead Scoring Model */}
      {scoringModel.factors?.length > 0 && (
        <Section
          title="Lead Scoring Model"
          icon={<Target className="w-4 h-4 text-green-400" />}
          badge={`${scoringModel.maxScore || 100}-point scale`}
          badgeColor="bg-green-500/20 text-green-400"
        >
          <div className="space-y-3 pt-3">
            {scoringModel.qualificationThreshold && (
              <div className="p-2 bg-green-500/5 rounded border border-green-500/10 text-xs">
                <span className="text-green-400 font-medium">Qualification Threshold: </span>
                <span>{scoringModel.qualificationThreshold}+ points</span>
              </div>
            )}
            {scoringModel.factors.map((factor: any, idx: number) => (
              <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{factor.name}</span>
                  <span className="px-1.5 py-0.5 text-[10px] bg-green-500/10 text-green-400 rounded">
                    {factor.weight} pts max
                  </span>
                </div>
                <div className="space-y-1">
                  {factor.rules?.map((rule: any, rIdx: number) => (
                    <div key={rIdx} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{rule.condition}</span>
                      <span className="font-medium text-green-400">+{rule.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Processed Leads Table */}
      {leads.length > 0 && (
        <Section
          title="Processed Leads"
          icon={<UserCheck className="w-4 h-4 text-violet-400" />}
          badge={`${leads.length} contacts`}
          badgeColor="bg-violet-500/20 text-violet-400"
        >
          <div className="pt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-1.5 pr-3">Name</th>
                    <th className="text-left py-1.5 pr-3">Company</th>
                    <th className="text-left py-1.5 pr-3">Source</th>
                    <th className="text-center py-1.5 pr-3">Score</th>
                    <th className="text-left py-1.5 pr-3">Segment</th>
                    <th className="text-left py-1.5">Enriched</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAllLeads ? leads : leads.slice(0, 10)).map((lead: any, idx: number) => (
                    <tr key={idx} className="border-b border-border/30">
                      <td className="py-1.5 pr-3">
                        <div className="font-medium">{lead.name}</div>
                        <div className="text-[10px] text-muted-foreground">{lead.email}</div>
                      </td>
                      <td className="py-1.5 pr-3">{lead.company}</td>
                      <td className="py-1.5 pr-3">
                        <span className="px-1.5 py-0.5 text-[10px] bg-muted rounded capitalize">{(lead.source || '').replace(/_/g, ' ')}</span>
                      </td>
                      <td className="py-1.5 pr-3 w-24">
                        <ScoreBar score={lead.score} />
                      </td>
                      <td className="py-1.5 pr-3">
                        <span className={`px-1.5 py-0.5 text-[10px] rounded border ${segmentColor(lead.segment)}`}>
                          {lead.segment}
                        </span>
                      </td>
                      <td className="py-1.5">
                        <span className={`text-[10px] ${
                          lead.enrichmentStatus === 'complete' ? 'text-green-400' :
                          lead.enrichmentStatus === 'partial' ? 'text-yellow-400' :
                          'text-muted-foreground'
                        }`}>
                          {lead.enrichmentStatus === 'complete' ? <Check className="w-3 h-3 inline" /> : null}
                          {' '}{lead.enrichmentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {leads.length > 10 && (
              <button
                onClick={() => setShowAllLeads(!showAllLeads)}
                className="mt-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                {showAllLeads ? 'Show less' : `Show all ${leads.length} leads`}
              </button>
            )}
          </div>
        </Section>
      )}

      {/* Data Enrichment */}
      {enrichment.sources?.length > 0 && (
        <Section
          title="Data Enrichment"
          icon={<Database className="w-4 h-4 text-purple-400" />}
          badge={`${enrichment.sources.length} sources · ${enrichment.fieldsEnriched?.length || 0} fields`}
          badgeColor="bg-purple-500/20 text-purple-400"
        >
          <div className="space-y-3 pt-3">
            {/* Enrichment Sources */}
            <div className="space-y-2">
              {enrichment.sources.map((src: any, idx: number) => (
                <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{src.provider}</span>
                    <span className="text-[10px] text-muted-foreground">Priority #{src.priority}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {src.dataPoints?.map((dp: string, dpIdx: number) => (
                      <span key={dpIdx} className="px-1.5 py-0.5 text-[10px] bg-purple-500/10 text-purple-400 rounded">{dp.replace(/_/g, ' ')}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Completeness Score */}
            {enrichment.averageCompletenessScore && (
              <div className="p-2 bg-purple-500/5 rounded border border-purple-500/10">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Average Enrichment Completeness</span>
                  <span className="font-medium text-purple-400">{enrichment.averageCompletenessScore}%</span>
                </div>
                <div className="mt-1.5 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${enrichment.averageCompletenessScore}%` }} />
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* CRM Setup */}
      <Section
        title="CRM Configuration"
        icon={<Layers className="w-4 h-4 text-blue-400" />}
        badge={crmSetup.provider || 'HubSpot'}
        badgeColor="bg-blue-500/20 text-blue-400"
      >
        <div className="space-y-3 pt-3">
          {/* Pipeline Stages */}
          {crmSetup.pipelineStages?.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-blue-400 uppercase tracking-wide mb-2">Pipeline Stages</div>
              <div className="flex flex-wrap gap-1.5">
                {crmSetup.pipelineStages.map((stage: any, idx: number) => {
                  const name = typeof stage === 'string' ? stage : stage.name;
                  const order = typeof stage === 'string' ? idx + 1 : stage.order;
                  return (
                    <div key={idx} className="flex items-center gap-1">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                        {order}
                      </span>
                      <span className="text-xs">{name}</span>
                      {idx < (crmSetup.pipelineStages.length - 1) && (
                        <span className="text-muted-foreground mx-0.5">→</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Auto-actions for stages with them */}
              {crmSetup.pipelineStages.some((s: any) => s.autoActions?.length > 0) && (
                <div className="mt-2 space-y-1">
                  {crmSetup.pipelineStages.filter((s: any) => s.autoActions?.length > 0).map((stage: any, idx: number) => (
                    <div key={idx} className="text-[10px] text-muted-foreground">
                      <span className="text-foreground">{stage.name}:</span> {stage.autoActions.join(' · ')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Custom Properties */}
          {crmSetup.customProperties?.length > 0 && (
            <div>
              <div className="text-[10px] font-medium text-blue-400 uppercase tracking-wide mb-2">
                Custom Properties ({crmSetup.customProperties.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {crmSetup.customProperties.map((prop: any, idx: number) => {
                  const name = typeof prop === 'string' ? prop : prop.name;
                  const desc = typeof prop === 'string' ? null : prop.description;
                  const type = typeof prop === 'string' ? null : prop.type;
                  return (
                    <div key={idx} className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-blue-400 font-mono">{name}</span>
                      {type && <span className="text-muted-foreground">({type})</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Webhook Endpoints */}
          {crmSetup.webhookEndpoints?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-orange-400 uppercase tracking-wide mb-2">
                <Webhook className="w-3 h-3" />
                Webhook Endpoints ({crmSetup.webhookEndpoints.length})
              </div>
              <div className="space-y-1">
                {crmSetup.webhookEndpoints.map((wh: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-[10px] p-1.5 bg-muted/20 rounded">
                    <div>
                      <span className="font-medium">{wh.source}</span>
                      <span className="text-muted-foreground ml-2 font-mono">{wh.url}</span>
                    </div>
                    <div className="flex gap-1">
                      {wh.events?.map((ev: string, eIdx: number) => (
                        <span key={eIdx} className="px-1 py-0.5 text-[9px] bg-orange-500/10 text-orange-400 rounded">{ev}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Dedup Info */}
      {summary.duplicatesRemoved > 0 && (
        <div className="p-2 bg-yellow-500/5 rounded border border-yellow-500/10 flex items-center gap-2 text-xs">
          <AlertCircle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
          <span><span className="font-medium text-yellow-400">{summary.duplicatesRemoved}</span> duplicate contacts removed via email + company deduplication</span>
        </div>
      )}

      {/* Reasoning */}
      {d.reasoning && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-lg border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">Capture Strategy</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{d.reasoning}</p>
        </div>
      )}
    </div>
  );
}

export default InboundCaptureOutput;
