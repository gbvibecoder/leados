'use client';

import React, { useState } from 'react';
import {
  Megaphone,
  Search,
  Target,
  DollarSign,
  TrendingUp,
  BarChart3,
  Users,
  ChevronDown,
  ChevronUp,
  Zap,
  Eye,
  Ban,
  ExternalLink,
  Layers,
  Sparkles,
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

function MetricCard({ label, value, subtext, color }: { label: string; value: string; subtext?: string; color: string }) {
  return (
    <div className={`p-2.5 sm:p-3 rounded-lg border overflow-hidden bg-${color}-500/5 border-${color}-500/20`}>
      <div className={`text-xl sm:text-2xl font-bold text-${color}-400`}>{value}</div>
      <div className="text-[10px] sm:text-xs text-muted-foreground">{label}</div>
      {subtext && <div className={`text-[10px] text-${color}-400/70 mt-0.5`}>{subtext}</div>}
    </div>
  );
}

export function PaidTrafficOutput({ data }: Props) {
  const d = data?.data || data;

  if (!d || (!d.googleAds && !d.metaAds)) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No campaign data yet. Run the Paid Traffic Agent to set up Google & Meta campaigns.
      </div>
    );
  }

  const googleAds = d.googleAds || {};
  const metaAds = d.metaAds || {};
  const budget = d.budgetAllocation || {};
  const projections = d.projections || {};

  const totalKeywords = googleAds.keywords?.length || 0;
  const totalAdGroups = googleAds.adGroups?.length || 0;
  const totalAudiences = metaAds.audiences?.length || 0;
  const totalAdSets = metaAds.adSets?.length || 0;
  const totalCreatives = metaAds.adSets?.reduce((sum: number, s: any) => sum + (s.creatives?.length || 0), 0) || 0;

  const googleLive = !!googleAds._createdInGoogleAds;
  const metaLive = !!metaAds._createdInMeta;
  const googleStatus = googleAds._status || (googleLive ? 'ENABLED' : 'PLANNED');
  const metaStatus = metaAds._status || (metaLive ? 'ACTIVE' : 'PLANNED');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-cyan-500" />
          <h3 className="font-semibold">Paid Traffic Campaigns</h3>
          <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">
            2 channels
          </span>
        </div>
        {d.confidence && (
          <span className="text-xs text-muted-foreground">
            Confidence: <span className="font-semibold text-green-400">{d.confidence}%</span>
          </span>
        )}
      </div>

      {/* Live Campaign Status Banner */}
      {(googleLive || metaLive) && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-sm font-semibold text-green-400">Live Campaigns Running</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {googleLive && (
              <div className="flex items-center gap-2 p-2 bg-green-500/5 rounded border border-green-500/10">
                <Search className="w-3.5 h-3.5 text-green-400" />
                <div>
                  <span className="font-medium text-green-400">Google Ads</span>
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">{googleStatus}</span>
                  {googleAds._campaignId && <div className="text-muted-foreground mt-0.5">ID: {googleAds._campaignId}</div>}
                  {googleAds._adGroups?.length > 0 && (
                    <div className="text-muted-foreground">{googleAds._adGroups.length} ad groups live</div>
                  )}
                </div>
              </div>
            )}
            {metaLive && (
              <div className="flex items-center gap-2 p-2 bg-blue-500/5 rounded border border-blue-500/10">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <div>
                  <span className="font-medium text-blue-400">Meta Ads</span>
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded">{metaStatus}</span>
                  {metaAds._campaignId && <div className="text-muted-foreground mt-0.5">ID: {metaAds._campaignId}</div>}
                  {metaAds._adSets?.length > 0 && (
                    <div className="text-muted-foreground">{metaAds._adSets.length} ad sets live</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Projections Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-3 rounded-lg border bg-green-500/5 border-green-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] sm:text-xs text-green-400/80 font-medium uppercase tracking-wide">Budget</span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl sm:text-2xl font-bold text-green-400">${(budget.totalMonthlyBudget || d.totalMonthlyBudget || 0).toLocaleString()}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">/month</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-blue-500/5 border-blue-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] sm:text-xs text-blue-400/80 font-medium uppercase tracking-wide">Est. CPL</span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl sm:text-2xl font-bold text-blue-400">${projections.estimatedCPL || d.estimatedCPL || '—'}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Cost Per Lead</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-purple-500/5 border-purple-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] sm:text-xs text-purple-400/80 font-medium uppercase tracking-wide">Est. Leads</span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl sm:text-2xl font-bold text-purple-400">{(projections.estimatedLeadsPerMonth || d.estimatedLeadsPerMonth || 0).toLocaleString()}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">/month</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-orange-500/5 border-orange-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] sm:text-xs text-orange-400/80 font-medium uppercase tracking-wide">Est. ROAS</span>
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl sm:text-2xl font-bold text-orange-400">{projections.estimatedROAS || 0}x</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">Return on Ad Spend</div>
        </div>
      </div>

      {/* Budget Split */}
      {budget.google && budget.meta && (
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="text-xs font-medium text-muted-foreground mb-2">Budget Allocation</div>
          <div className="flex items-center gap-2 h-3 rounded-full overflow-hidden bg-muted">
            <div className="h-full bg-green-500 rounded-l-full transition-all" style={{ width: `${budget.google}%` }} />
            <div className="h-full bg-blue-500 rounded-r-full transition-all" style={{ width: `${budget.meta}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
            <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Google Ads {budget.google}% (${Math.round((budget.totalMonthlyBudget || 0) * budget.google / 100).toLocaleString()}/mo)</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />Meta Ads {budget.meta}% (${Math.round((budget.totalMonthlyBudget || 0) * budget.meta / 100).toLocaleString()}/mo)</span>
          </div>
        </div>
      )}

      {/* Google Ads */}
      <Section
        title="Google Ads Campaign"
        icon={<Search className="w-4 h-4 text-green-400" />}
        badge={`${totalKeywords} keywords · ${totalAdGroups} ad groups`}
        badgeColor="bg-green-500/20 text-green-400"
        defaultOpen
      >
        <div className="space-y-4 pt-3">
          {/* Campaign Info */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded">{googleAds.campaignName}</span>
            <span className="text-muted-foreground">${googleAds.dailyBudget}/day</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{googleAds.biddingStrategy}</span>
          </div>

          {/* Keywords Table */}
          {googleAds.keywords?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-green-400 uppercase tracking-wide mb-2">Keywords ({googleAds.keywords.length})</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left py-1.5 pr-3">Keyword</th>
                      <th className="text-left py-1.5 pr-3">Match</th>
                      <th className="text-right py-1.5 pr-3">CPC</th>
                      <th className="text-right py-1.5 pr-3">Vol/mo</th>
                      <th className="text-left py-1.5">Intent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {googleAds.keywords.slice(0, 12).map((kw: any, idx: number) => (
                      <tr key={idx} className="border-b border-border/30">
                        <td className="py-1.5 pr-3 font-medium max-w-xs break-words">{kw.keyword}</td>
                        <td className="py-1.5 pr-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                            kw.matchType === 'exact' ? 'bg-green-500/20 text-green-400' :
                            kw.matchType === 'phrase' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-orange-500/20 text-orange-400'
                          }`}>{kw.matchType}</span>
                        </td>
                        <td className="py-1.5 pr-3 text-right text-green-400">${kw.estimatedCPC}</td>
                        <td className="py-1.5 pr-3 text-right">{kw.monthlySearchVolume?.toLocaleString()}</td>
                        <td className="py-1.5">
                          <span className={`text-[10px] ${
                            kw.intent === 'high' ? 'text-red-400' : kw.intent === 'medium' ? 'text-yellow-400' : 'text-muted-foreground'
                          }`}>{kw.intent || '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Ad Groups */}
          {googleAds.adGroups?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-green-400 uppercase tracking-wide mb-2">Ad Groups ({googleAds.adGroups.length})</div>
              <div className="space-y-2">
                {googleAds.adGroups.map((ag: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                    <div className="font-medium text-sm mb-1 break-words">{ag.name}</div>
                    {ag.theme && <div className="text-[10px] text-muted-foreground mb-2 break-words">{ag.theme}</div>}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {ag.keywords?.map((kw: string, kIdx: number) => (
                        <span key={kIdx} className="px-1.5 py-0.5 text-[10px] bg-green-500/10 text-green-400 rounded">{kw}</span>
                      ))}
                    </div>
                    {ag.adCopy && (
                      <div className="space-y-1 text-xs">
                        {ag.adCopy.headlines?.map((h: string, hIdx: number) => (
                          <div key={hIdx} className="text-blue-400 font-medium">{h}</div>
                        ))}
                        {ag.adCopy.descriptions?.map((d: string, dIdx: number) => (
                          <div key={dIdx} className="text-muted-foreground break-words">{d}</div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Negative Keywords */}
          {googleAds.negativeKeywords?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-red-400 uppercase tracking-wide mb-2">
                <Ban className="w-3 h-3" />
                Negative Keywords ({googleAds.negativeKeywords.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {googleAds.negativeKeywords.map((nk: string, idx: number) => (
                  <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-red-500/10 text-red-400 rounded">{nk}</span>
                ))}
              </div>
            </div>
          )}

          {/* Extensions */}
          {googleAds.extensions && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {googleAds.extensions.sitelinks?.length > 0 && (
                <div className="p-2 bg-muted/20 rounded border border-border/30">
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">Sitelinks</div>
                  {googleAds.extensions.sitelinks.map((sl: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1 text-xs text-blue-400">
                      <ExternalLink className="w-3 h-3" />
                      {sl.text}
                    </div>
                  ))}
                </div>
              )}
              {googleAds.extensions.callouts?.length > 0 && (
                <div className="p-2 bg-muted/20 rounded border border-border/30">
                  <div className="text-[10px] font-medium text-muted-foreground mb-1">Callouts</div>
                  <div className="flex flex-wrap gap-1">
                    {googleAds.extensions.callouts.map((c: string, idx: number) => (
                      <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-muted rounded">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conversion Tracking */}
          {googleAds.conversionTracking && (
            <div className="p-2 bg-green-500/5 rounded border border-green-500/10 text-xs">
              <div className="text-[10px] font-medium text-green-400 mb-1">Conversion Tracking</div>
              <div className="text-muted-foreground">{googleAds.conversionTracking.trackingMethod}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {googleAds.conversionTracking.conversionActions?.map((a: string, idx: number) => (
                  <span key={idx} className="px-1.5 py-0.5 text-[10px] bg-green-500/10 text-green-400 rounded">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Meta Ads */}
      <Section
        title="Meta Ads Campaign"
        icon={<Eye className="w-4 h-4 text-blue-400" />}
        badge={`${totalAudiences} audiences · ${totalCreatives} creatives`}
        badgeColor="bg-blue-500/20 text-blue-400"
      >
        <div className="space-y-4 pt-3">
          {/* Campaign Info */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">{metaAds.campaignName}</span>
            <span className="text-muted-foreground">${metaAds.dailyBudget}/day</span>
          </div>

          {/* Audiences */}
          {metaAds.audiences?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-2">Audiences ({metaAds.audiences.length})</div>
              <div className="space-y-2">
                {metaAds.audiences.map((aud: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                        aud.type === 'cold' ? 'bg-blue-500/20 text-blue-400' :
                        aud.type === 'warm' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{aud.type.toUpperCase()}</span>
                      <span className="font-medium text-sm">{aud.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground break-words">{aud.targeting}</p>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Est. size: <span className="text-foreground font-medium">{aud.estimatedSize?.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ad Sets with Creatives */}
          {metaAds.adSets?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-2">Ad Sets ({metaAds.adSets.length})</div>
              <div className="space-y-2">
                {metaAds.adSets.map((adSet: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{adSet.name}</span>
                      <span className="text-[10px] text-muted-foreground">${adSet.dailyBudget}/day</span>
                    </div>
                    <div className="space-y-1">
                      {adSet.creatives?.map((cr: any, cIdx: number) => (
                        <div key={cIdx} className="flex items-start gap-2 p-1.5 bg-background/50 rounded text-xs">
                          <span className={`px-1.5 py-0.5 text-[10px] rounded flex-shrink-0 ${
                            cr.format === 'video' ? 'bg-red-500/20 text-red-400' :
                            cr.format === 'carousel' ? 'bg-purple-500/20 text-purple-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>{cr.format}</span>
                          <div className="min-w-0">
                            <div className="font-medium text-[10px]">{cr.name}</div>
                            <p className="text-[10px] text-muted-foreground truncate">{cr.hook}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Placements & Pixel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {metaAds.placements?.length > 0 && (
              <div className="p-2 bg-muted/20 rounded border border-border/30">
                <div className="text-[10px] font-medium text-muted-foreground mb-1">Placements</div>
                <div className="flex flex-wrap gap-1">
                  {metaAds.placements.map((p: string, idx: number) => (
                    <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded">{p}</span>
                  ))}
                </div>
              </div>
            )}
            {metaAds.pixelEvents?.length > 0 && (
              <div className="p-2 bg-muted/20 rounded border border-border/30">
                <div className="text-[10px] font-medium text-muted-foreground mb-1">Pixel Events</div>
                <div className="flex flex-wrap gap-1">
                  {metaAds.pixelEvents.map((e: string, idx: number) => (
                    <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-purple-500/10 text-purple-400 rounded">{e}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* Reasoning */}
      {d.reasoning && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-xs sm:text-sm font-medium">Campaign Strategy</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">{typeof d.reasoning === 'string' ? d.reasoning : JSON.stringify(d.reasoning)}</p>
        </div>
      )}
    </div>
  );
}

export default PaidTrafficOutput;
