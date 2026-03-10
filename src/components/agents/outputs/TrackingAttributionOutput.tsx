'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Check,
  Target,
  TrendingUp,
  Sparkles,
  Eye,
  Tag,
  Globe,
  Link2,
  Users,
  ArrowRight,
  Copy,
  Shield,
  Clock,
  XCircle,
  Activity,
  Layers,
  Code,
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

export function TrackingAttributionOutput({ data }: Props) {
  const d = data?.data || data;
  const [expandedJourney, setExpandedJourney] = useState<number | null>(null);

  if (!d || (!d.trackingSetup && !d.channelAttribution)) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No tracking data yet. Run the Tracking & Attribution Agent to configure analytics.
      </div>
    );
  }

  const setup = d.trackingSetup || {};
  const gtm = setup.googleTagManager || {};
  const metaPixel = setup.metaPixel || {};
  const googleAds = setup.googleAdsConversion || {};
  const crmAttr = setup.crmAttribution || {};
  const channelAttr = d.channelAttribution || [];
  const journeys = d.leadJourneys || [];
  const validation = d.validationChecklist || [];
  const summary = d.summary || {};
  const utmStrategy = d.utmStrategy || {};
  const dataLayerEvents = d.dataLayerEvents || [];

  const passedChecks = validation.filter((v: any) => v.status === 'passed').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold">Tracking & Attribution</h3>
          <span className="px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-full">
            {summary.trackingCoverage || 0}% coverage
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
        <div className="p-2.5 sm:p-3 rounded-lg border bg-indigo-500/5 border-indigo-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] sm:text-xs text-indigo-400/80 font-medium uppercase tracking-wide">Events</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-indigo-400">{(summary.totalEventsTracked || 0).toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">tracked</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-green-500/5 border-green-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] sm:text-xs text-green-400/80 font-medium uppercase tracking-wide">Attributed</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-green-400">{summary.totalLeadsAttributed || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">leads</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-blue-500/5 border-blue-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] sm:text-xs text-blue-400/80 font-medium uppercase tracking-wide">Touchpoints</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-400">{summary.avgTouchpointsPerLead || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">avg per lead</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-orange-500/5 border-orange-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] sm:text-xs text-orange-400/80 font-medium uppercase tracking-wide">Days to Convert</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-orange-400">{summary.avgDaysToConvert || 0}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">average</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] sm:text-xs text-emerald-400/80 font-medium uppercase tracking-wide">ROAS</span>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400">{summary.overallROAS || 0}x</div>
          <div className="text-[10px] text-muted-foreground mt-0.5">overall</div>
        </div>
      </div>

      {/* Channel Attribution Table */}
      {channelAttr.length > 0 && (
        <Section
          title="Channel Attribution"
          icon={<Target className="w-4 h-4 text-green-400" />}
          badge={`${channelAttr.length} channels`}
          badgeColor="bg-green-500/20 text-green-400"
          defaultOpen
        >
          <div className="overflow-x-auto pt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border/50">
                  <th className="text-left py-2 pr-3 font-medium">Channel</th>
                  <th className="text-right py-2 px-2 font-medium">Leads</th>
                  <th className="text-right py-2 px-2 font-medium">Spend</th>
                  <th className="text-right py-2 px-2 font-medium">Revenue</th>
                  <th className="text-right py-2 px-2 font-medium">CPL</th>
                  <th className="text-right py-2 px-2 font-medium">ROAS</th>
                  <th className="text-right py-2 pl-2 font-medium">Assisted</th>
                </tr>
              </thead>
              <tbody>
                {channelAttr.map((ch: any, idx: number) => (
                  <tr key={idx} className="border-b border-border/30 hover:bg-accent/20">
                    <td className="py-2 pr-3 font-medium">{ch.channel}</td>
                    <td className="text-right py-2 px-2">{ch.leadsAttributed}</td>
                    <td className="text-right py-2 px-2">{ch.spend > 0 ? `$${ch.spend.toLocaleString()}` : '—'}</td>
                    <td className="text-right py-2 px-2 text-green-400">${ch.revenue.toLocaleString()}</td>
                    <td className="text-right py-2 px-2">{ch.costPerLead > 0 ? `$${ch.costPerLead}` : '—'}</td>
                    <td className="text-right py-2 px-2">
                      <span className={ch.roas >= 5 ? 'text-green-400 font-medium' : ch.roas >= 3 ? 'text-blue-400' : 'text-yellow-400'}>
                        {ch.roas === Infinity ? '∞' : `${ch.roas}x`}
                      </span>
                    </td>
                    <td className="text-right py-2 pl-2 text-muted-foreground">{ch.assistedConversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Lead Journeys */}
      {journeys.length > 0 && (
        <Section
          title="Lead Journeys"
          icon={<ArrowRight className="w-4 h-4 text-violet-400" />}
          badge={`${journeys.length} journeys`}
          badgeColor="bg-violet-500/20 text-violet-400"
        >
          <div className="space-y-2 pt-3">
            {journeys.map((journey: any, idx: number) => {
              const isExpanded = expandedJourney === idx;
              return (
                <div key={idx} className="rounded-lg border border-border/50 overflow-hidden">
                  <button
                    onClick={() => setExpandedJourney(isExpanded ? null : idx)}
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-accent/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{journey.leadName}</span>
                        <span className="text-[10px] text-muted-foreground">{journey.totalTouchpoints} touchpoints</span>
                        <span className="text-[10px] text-muted-foreground">{journey.daysToConvert}d</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        {journey.touchpoints?.map((tp: any, tIdx: number) => (
                          <React.Fragment key={tIdx}>
                            <span className="px-1.5 py-0.5 text-[9px] bg-muted rounded">{tp.channel}</span>
                            {tIdx < journey.touchpoints.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-muted-foreground" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {journey.attributedRevenue > 0 && (
                        <span className="text-xs font-medium text-green-400">${journey.attributedRevenue.toLocaleString()}</span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border/30 pt-3">
                      <div className="space-y-2">
                        {journey.touchpoints?.map((tp: any, tIdx: number) => (
                          <div key={tIdx} className="flex items-center gap-3 text-[10px]">
                            <div className="w-16 text-right text-muted-foreground">{tp.creditPercent}% credit</div>
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                            <div className="flex-1">
                              <span className="font-medium">{tp.channel}</span>
                              <span className="text-muted-foreground"> — {tp.action}</span>
                            </div>
                            <div className="text-muted-foreground">{new Date(tp.timestamp).toLocaleDateString()}</div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 p-2 bg-muted/30 rounded text-[10px]">
                        <span className="text-muted-foreground">Converted: </span>
                        <span className="font-medium">{journey.convertedAction}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* GTM Setup */}
      {gtm.containerId && (
        <Section
          title="Google Tag Manager"
          icon={<Code className="w-4 h-4 text-blue-400" />}
          badge={gtm.containerId}
          badgeColor="bg-blue-500/20 text-blue-400"
        >
          <div className="space-y-3 pt-3">
            {/* Tags */}
            <div>
              <div className="text-[10px] font-medium text-blue-400 uppercase tracking-wide mb-1.5">Tags ({gtm.tags?.length || 0})</div>
              <div className="space-y-1">
                {(gtm.tags || []).map((tag: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-1.5 bg-muted/20 rounded text-[10px]">
                    <Tag className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <span className="font-medium">{tag.name}</span>
                    <span className="text-muted-foreground">({tag.type})</span>
                    <span className="text-muted-foreground ml-auto">Trigger: {tag.trigger}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Triggers */}
            <div>
              <div className="text-[10px] font-medium text-orange-400 uppercase tracking-wide mb-1.5">Triggers ({gtm.triggers?.length || 0})</div>
              <div className="flex flex-wrap gap-1">
                {(gtm.triggers || []).map((trigger: any, idx: number) => (
                  <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-orange-500/10 text-orange-400 rounded">
                    {typeof trigger === 'string' ? trigger : trigger.name}
                  </span>
                ))}
              </div>
            </div>
            {/* Variables */}
            <div>
              <div className="text-[10px] font-medium text-green-400 uppercase tracking-wide mb-1.5">Variables ({gtm.variables?.length || 0})</div>
              <div className="flex flex-wrap gap-1">
                {(gtm.variables || []).map((v: any, idx: number) => (
                  <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-green-500/10 text-green-400 rounded">
                    {typeof v === 'string' ? v : v.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Meta Pixel + Google Ads */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {metaPixel.pixelId && (
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-xs font-medium">Meta Pixel</span>
              <span className="text-[10px] text-muted-foreground">{metaPixel.pixelId}</span>
            </div>
            <div className="space-y-1.5">
              <div className="text-[10px]">
                <span className="text-muted-foreground">Standard: </span>
                {(metaPixel.standardEvents || []).join(', ')}
              </div>
              <div className="text-[10px]">
                <span className="text-muted-foreground">Custom: </span>
                {(metaPixel.customEvents || []).map((e: any) => typeof e === 'string' ? e : e.name).join(', ')}
              </div>
              <div className="flex gap-2 text-[10px]">
                <span className={metaPixel.capiEnabled ? 'text-green-400' : 'text-red-400'}>
                  CAPI: {metaPixel.capiEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {metaPixel.customAudiences?.length > 0 && (
                <div className="text-[10px] text-muted-foreground">{metaPixel.customAudiences.length} custom audiences</div>
              )}
            </div>
          </div>
        )}
        {googleAds.conversionId && (
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-3.5 h-3.5 text-green-400" />
              <span className="text-xs font-medium">Google Ads Conversion</span>
              <span className="text-[10px] text-muted-foreground">{googleAds.conversionId}</span>
            </div>
            <div className="space-y-1">
              {(googleAds.conversionActions || []).map((action: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-[10px]">
                  <span>{action.name}</span>
                  <span className="text-green-400 font-medium">{action.value === 'dynamic' ? 'Dynamic' : `$${action.value}`}</span>
                </div>
              ))}
              <div className="flex gap-2 text-[10px] mt-1">
                <span className={googleAds.enhancedConversions ? 'text-green-400' : 'text-muted-foreground'}>
                  Enhanced: {googleAds.enhancedConversions ? 'On' : 'Off'}
                </span>
                <span className={googleAds.offlineImport ? 'text-green-400' : 'text-muted-foreground'}>
                  Offline Import: {googleAds.offlineImport ? 'On' : 'Off'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* UTM Strategy */}
      {utmStrategy.generatedLinks?.length > 0 && (
        <Section
          title="UTM Links"
          icon={<Link2 className="w-4 h-4 text-cyan-400" />}
          badge={`${utmStrategy.generatedLinks.length} links`}
          badgeColor="bg-cyan-500/20 text-cyan-400"
        >
          <div className="space-y-1.5 pt-3">
            {utmStrategy.generatedLinks.map((link: any, idx: number) => (
              <div key={idx} className="p-2 bg-muted/20 rounded border border-border/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{link.campaign}</span>
                  <CopyButton text={link.url} />
                </div>
                <div className="text-[10px] text-muted-foreground truncate font-mono">{link.url}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Validation Checklist */}
      {validation.length > 0 && (
        <Section
          title="Validation Checklist"
          icon={<Shield className="w-4 h-4 text-green-400" />}
          badge={`${passedChecks}/${validation.length} passed`}
          badgeColor={passedChecks === validation.length ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}
        >
          <div className="space-y-1 pt-3">
            {validation.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-[10px]">
                {item.status === 'passed' ? (
                  <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                ) : item.status === 'failed' ? (
                  <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                )}
                <span className={item.status === 'passed' ? '' : item.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}>
                  {item.check}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Attribution Model Info */}
      {crmAttr.model && (
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-xs font-medium">Attribution Model: {d.attributionModel || crmAttr.model}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
            <div className="p-2 bg-green-500/10 rounded">
              <div className="font-bold text-green-400 text-sm">{crmAttr.firstTouchWeight}%</div>
              <div className="text-muted-foreground">First Touch</div>
            </div>
            <div className="p-2 bg-blue-500/10 rounded">
              <div className="font-bold text-blue-400 text-sm">{crmAttr.middleTouchWeight}%</div>
              <div className="text-muted-foreground">Middle Touch</div>
            </div>
            <div className="p-2 bg-purple-500/10 rounded">
              <div className="font-bold text-purple-400 text-sm">{crmAttr.lastTouchWeight}%</div>
              <div className="text-muted-foreground">Last Touch</div>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-muted-foreground">
            Window: Click-through {d.attributionWindows?.clickThrough || '30 days'} | View-through {d.attributionWindows?.viewThrough || '7 days'}
          </div>
        </div>
      )}

      {/* Reasoning */}
      {d.reasoning && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 rounded-lg border border-indigo-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">Attribution Strategy</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{d.reasoning}</p>
        </div>
      )}
    </div>
  );
}

export default TrackingAttributionOutput;
