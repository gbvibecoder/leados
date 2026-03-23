'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Megaphone, Search, Target, DollarSign, TrendingUp, Users,
  ChevronDown, ChevronUp, Eye, Ban, ExternalLink, Sparkles,
  CheckCircle2, Rocket, ShieldCheck, AlertTriangle, Loader2,
  Copy, Check,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface Props {
  data?: any;
}

// ── Reusable UI Components ──────────────────────────────────────────────────

function Section({
  title, icon, badge, badgeColor = 'bg-blue-500/20 text-blue-400',
  children, defaultOpen = false,
}: {
  title: string; icon: React.ReactNode; badge?: string;
  badgeColor?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full p-3 sm:p-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors">
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="p-1 hover:bg-accent rounded transition-colors flex-shrink-0" title="Copy">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
    </button>
  );
}

// ── Google Search Ad Preview (realistic SERP style) ─────────────────────────

function GoogleAdPreview({ adGroup, landingUrl, index }: { adGroup: any; landingUrl?: string; index: number }) {
  const headlines = adGroup.adCopy?.headlines || [];
  const descriptions = adGroup.adCopy?.descriptions || [];
  const url = landingUrl || 'leados.com';
  const displayUrl = url.replace(/^https?:\/\//, '').replace(/\/$/, '');

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Sponsored label + URL */}
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Search className="w-3 h-3 text-gray-400" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] text-gray-800 font-medium truncate">{displayUrl}</div>
        </div>
        <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded ml-auto flex-shrink-0">Sponsored</span>
      </div>

      {/* Headline (clickable blue link) */}
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="text-[#1a0dab] text-[15px] font-medium hover:underline cursor-pointer leading-snug block mb-1">
        {headlines.slice(0, 3).join(' | ')}
      </a>

      {/* Description */}
      <p className="text-[12px] text-gray-600 leading-relaxed mb-2">
        {descriptions.slice(0, 2).join(' ')}
      </p>

      {/* Sitelink extensions (if available in ad group keywords) */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {adGroup.keywords?.slice(0, 4).map((kw: string, i: number) => (
          <span key={i} className="text-[11px] text-[#1a0dab] hover:underline cursor-pointer">{kw}</span>
        ))}
      </div>

      {/* Ad group label */}
      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[9px] text-gray-400 uppercase tracking-wider">Ad Group {index + 1}: {adGroup.theme || adGroup.name}</span>
        <CopyButton text={`${headlines.join(' | ')}\n${descriptions.join(' ')}`} />
      </div>
    </div>
  );
}

// ── Module-level image cache — persists across re-renders ────────────────────
const imageCache = new Map<string, string>();

function buildImageUrl(prompt: string): string {
  const seed = Math.abs(prompt.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 100000);
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;
}

// ── Meta/Instagram Ad Preview (realistic feed style with AI image) ──────────

function MetaAdPreview({ adSet, campaignName, productName, productDescription, landingUrl, index }: {
  adSet: any; campaignName?: string; productName?: string; productDescription?: string; landingUrl?: string; index: number;
}) {
  const creative = adSet.creatives?.[0];
  if (!creative) return null;

  const brand = productName || campaignName || 'Brand';
  const displayUrl = (landingUrl || '').replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
  const ctaLabel = creative.callToAction?.replace(/_/g, ' ') || 'Learn More';

  // Build image prompt from creative data + product context (no LLM needed)
  const audienceType = adSet.audience || adSet.name || '';
  const adAngle = creative.hook || creative.primaryText?.split('.')[0] || '';
  const desc = productDescription || creative.description || '';
  const imagePrompt = creative.imagePrompt
    || `Professional paid social media advertisement for ${brand}. ${desc}. Modern SaaS product dashboard mockup on laptop and mobile screens. Clean corporate design, dark blue and orange brand colors, professional photography style. Text overlay: "${creative.headline || brand}". High-end marketing creative, photorealistic, 4k quality. ${audienceType}. ${adAngle}`.trim();
  const cacheKey = imagePrompt.slice(0, 200);

  const [imageUrl, setImageUrl] = useState<string | null>(() => imageCache.get(cacheKey) || null);
  const [imageLoading, setImageLoading] = useState(!imageCache.has(cacheKey));
  const [imageError, setImageError] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (imageCache.has(cacheKey)) {
      setImageUrl(imageCache.get(cacheKey)!);
      setImageLoading(false);
      return;
    }

    const url = buildImageUrl(imagePrompt);
    // Pre-load the image
    const img = new Image();
    img.onload = () => {
      if (mountedRef.current) {
        imageCache.set(cacheKey, url);
        setImageUrl(url);
        setImageLoading(false);
      }
    };
    img.onerror = () => {
      if (mountedRef.current) {
        setImageLoading(false);
        setImageError(true);
      }
    };
    img.src = url;
  }, [cacheKey, imagePrompt]);

  return (
    <div className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow max-w-sm">
      {/* Page header */}
      <div className="flex items-center gap-2.5 p-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {brand[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-semibold text-gray-900 truncate">{brand}</div>
          <div className="text-[11px] text-gray-500 flex items-center gap-1">
            Sponsored · <Eye className="w-3 h-3 inline" />
          </div>
        </div>
      </div>

      {/* Primary text */}
      <div className="px-3 pb-2.5">
        <p className="text-[13px] text-gray-800 leading-relaxed">
          {creative.primaryText || creative.hook || adSet.name}
        </p>
      </div>

      {/* Creative visual — AI generated image or loading state */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {imageUrl && !imageError ? (
          <img src={imageUrl} alt={creative.headline || creative.name}
            className="w-full h-full object-cover" loading="lazy" />
        ) : imageLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <Loader2 className="w-8 h-8 text-white/40 animate-spin mb-3" />
            <span className="text-white/50 text-xs">Generating ad image…</span>
          </div>
        ) : (
          /* Fallback: styled text creative */
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="text-center px-6 max-w-[85%]">
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white/80 text-[10px] font-medium mb-4">
                {creative.format === 'video' ? '▶' : creative.format === 'carousel' ? '⟩⟩' : '◻'} {(creative.format || 'image').toUpperCase()}
              </div>
              <h3 className="text-white font-bold text-lg leading-tight mb-2">
                {creative.headline || creative.name}
              </h3>
              {creative.description && (
                <p className="text-white/70 text-xs leading-relaxed">{creative.description}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CTA bar */}
      <div className="p-3 flex items-center justify-between bg-gray-50 border-t border-gray-100">
        <div className="min-w-0 mr-2">
          <div className="text-[10px] text-gray-500 truncate">{displayUrl}</div>
          <div className="text-[12px] font-semibold text-gray-900 truncate">{creative.headline || creative.name}</div>
        </div>
        <a href={landingUrl} target="_blank" rel="noopener noreferrer"
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-md flex-shrink-0 transition-colors cursor-pointer">
          {ctaLabel}
        </a>
      </div>

      {/* Creative label */}
      <div className="px-3 py-1.5 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[9px] text-gray-400 uppercase tracking-wider">Creative {index + 1}: {adSet.audience || adSet.name}</span>
        <CopyButton text={creative.primaryText || creative.hook || ''} />
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function PaidTrafficOutput({ data }: Props) {
  const d = data?.data || data;
  const [launching, setLaunching] = useState(false);
  const [launchResult, setLaunchResult] = useState<any>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

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

  const isApprovalPending = d._approvalRequired && d._approvalStatus === 'pending' && !launchResult;
  const isLaunched = launchResult?.success || d._approvalStatus === 'launched';
  const googleLive = launchResult?.results?.google?.launched || !!googleAds._createdInGoogleAds;
  const metaLive = launchResult?.results?.meta?.launched || !!metaAds._createdInMeta;

  const handleLaunch = async () => {
    setLaunching(true);
    setLaunchError(null);
    try {
      const res = await apiFetch('/api/agents/paid-traffic/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignPlan: d }),
      });
      const result = await res.json();
      if (result.success) {
        setLaunchResult(result);
      } else {
        setLaunchError(result.error || 'Launch failed');
      }
    } catch (err: any) {
      setLaunchError(err.message || 'Network error');
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-cyan-500" />
          <h3 className="font-semibold">Paid Traffic Campaigns</h3>
          <span className="px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full">2 channels</span>
        </div>
        {!!d.confidence && (
          <span className="text-xs text-muted-foreground">
            Confidence: <span className="font-semibold text-green-400">{d.confidence}%</span>
          </span>
        )}
      </div>

      {/* ═══ APPROVAL BANNER ═══ */}
      {isApprovalPending && (
        <div className="p-4 rounded-xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h4 className="font-semibold text-amber-300">Campaign Plan Ready — Review & Approve</h4>
          </div>
          <p className="text-xs text-amber-200/70 mb-4">
            Review the ad campaigns below. No ads will run until you approve. Once approved, campaigns will go live on Google Ads and Meta Ads.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={handleLaunch} disabled={launching}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/20">
              {launching ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Launching…</>
              ) : (
                <><Rocket className="w-4 h-4" /> Approve & Launch Campaigns</>
              )}
            </button>
          </div>
          {launchError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
              <AlertTriangle className="w-3.5 h-3.5" /> {launchError}
            </div>
          )}
        </div>
      )}

      {/* ═══ LAUNCHED SUCCESS BANNER ═══ */}
      {isLaunched && (
        <div className="p-4 bg-green-500/10 border-2 border-green-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <span className="text-sm font-semibold text-green-400">Campaigns Launched Successfully</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {(launchResult?.results?.google?.launched || googleLive) && (
              <div className="flex items-center gap-2 p-2 bg-green-500/5 rounded border border-green-500/10">
                <Search className="w-3.5 h-3.5 text-green-400" />
                <div>
                  <span className="font-medium text-green-400">Google Ads</span>
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-green-500/20 text-green-400 rounded">ENABLED</span>
                  {launchResult?.results?.google?.campaignId && (
                    <div className="text-muted-foreground mt-0.5">ID: {launchResult.results.google.campaignId}</div>
                  )}
                  {launchResult?.results?.google?.adGroups?.length > 0 && (
                    <div className="text-muted-foreground">{launchResult.results.google.adGroups.length} ad groups live</div>
                  )}
                </div>
              </div>
            )}
            {(launchResult?.results?.meta?.launched || metaLive) && (
              <div className="flex items-center gap-2 p-2 bg-blue-500/5 rounded border border-blue-500/10">
                <Eye className="w-3.5 h-3.5 text-blue-400" />
                <div>
                  <span className="font-medium text-blue-400">Meta Ads</span>
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-blue-500/20 text-blue-400 rounded">ACTIVE</span>
                  {launchResult?.results?.meta?.campaignId && (
                    <div className="text-muted-foreground mt-0.5">ID: {launchResult.results.meta.campaignId}</div>
                  )}
                  {launchResult?.results?.meta?.adSets?.length > 0 && (
                    <div className="text-muted-foreground">{launchResult.results.meta.adSets.length} ad sets live</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ AD PREVIEWS (always shown — highlighted when approval pending) ═══ */}
      {(googleAds.adGroups?.length > 0 || metaAds.adSets?.length > 0) && (
        <Section title={isApprovalPending ? 'Ad Previews — Review Before Launch' : 'Ad Previews'}
          icon={<Eye className="w-4 h-4 text-purple-400" />}
          badge={isApprovalPending ? 'Awaiting approval' : `${totalAdGroups + totalAdSets} ads`}
          badgeColor={isApprovalPending ? 'bg-amber-500/20 text-amber-400' : 'bg-purple-500/20 text-purple-400'}
          defaultOpen={isApprovalPending}>
          <div className="space-y-6 pt-3">
            {/* Google Search Ad Previews */}
            {googleAds.adGroups?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-green-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" /> Google Search Ads ({googleAds.adGroups.length})
                </div>
                <div className="space-y-3">
                  {googleAds.adGroups.map((ag: any, idx: number) => (
                    <GoogleAdPreview key={idx} adGroup={ag} landingUrl={d._landingUrl} index={idx} />
                  ))}
                </div>
              </div>
            )}

            {/* Meta / Instagram Ad Previews */}
            {metaAds.adSets?.length > 0 && (
              <div>
                <div className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-3 mt-2 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" /> Meta / Instagram Ads ({metaAds.adSets.reduce((s: number, as_: any) => s + (as_.creatives?.length || 0), 0)} creatives)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {metaAds.adSets.map((adSet: any, idx: number) => (
                    <MetaAdPreview key={idx} adSet={adSet} campaignName={metaAds.campaignName}
                      productName={d._productName} productDescription={d._productDescription} landingUrl={d._landingUrl} index={idx} />
                  ))}
                </div>
              </div>
            )}

            {/* Landing URL info */}
            {d._landingUrl && (
              <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg border border-border/50 text-xs">
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="text-muted-foreground">All ads redirect to:</span>
                <a href={d._landingUrl} target="_blank" rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline truncate">{d._landingUrl}</a>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Projections Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-2.5 sm:p-3 rounded-lg border bg-green-500/5 border-green-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-green-400" />
            <span className="text-[10px] sm:text-xs text-green-400/80 font-medium uppercase tracking-wide">Budget</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-green-400">${(budget.totalMonthlyBudget || d.totalMonthlyBudget || 0).toLocaleString()}</span>
          <div className="text-[10px] text-muted-foreground mt-0.5">/month</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-blue-500/5 border-blue-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Target className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] sm:text-xs text-blue-400/80 font-medium uppercase tracking-wide">Est. CPL</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-blue-400">${projections.estimatedCPL || d.estimatedCPL || '—'}</span>
          <div className="text-[10px] text-muted-foreground mt-0.5">Cost Per Lead</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-purple-500/5 border-purple-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] sm:text-xs text-purple-400/80 font-medium uppercase tracking-wide">Est. Leads</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-purple-400">{(projections.estimatedLeadsPerMonth || d.estimatedLeadsPerMonth || 0).toLocaleString()}</span>
          <div className="text-[10px] text-muted-foreground mt-0.5">/month</div>
        </div>
        <div className="p-2.5 sm:p-3 rounded-lg border bg-orange-500/5 border-orange-500/20 overflow-hidden">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] sm:text-xs text-orange-400/80 font-medium uppercase tracking-wide">Est. ROAS</span>
          </div>
          <span className="text-xl sm:text-2xl font-bold text-orange-400">{projections.estimatedROAS || 0}x</span>
          <div className="text-[10px] text-muted-foreground mt-0.5">Return on Ad Spend</div>
        </div>
      </div>

      {/* Budget Split */}
      {budget.google != null && budget.meta != null && (
        <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
          <div className="text-xs font-medium text-muted-foreground mb-2">Budget Allocation</div>
          <div className="flex items-center gap-0 h-3 rounded-full overflow-hidden bg-muted">
            <div className="h-full bg-green-500 rounded-l-full transition-all" style={{ width: `${budget.google}%` }} />
            <div className="h-full bg-blue-500 rounded-r-full transition-all" style={{ width: `${budget.meta}%` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] text-muted-foreground">
            <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Google {budget.google}% (${Math.round((budget.totalMonthlyBudget || 0) * budget.google / 100).toLocaleString()}/mo)</span>
            <span><span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" />Meta {budget.meta}% (${Math.round((budget.totalMonthlyBudget || 0) * budget.meta / 100).toLocaleString()}/mo)</span>
          </div>
        </div>
      )}

      {/* ═══ GOOGLE ADS DETAILS ═══ */}
      <Section title="Google Ads Campaign" icon={<Search className="w-4 h-4 text-green-400" />}
        badge={`${totalKeywords} keywords · ${totalAdGroups} ad groups`} badgeColor="bg-green-500/20 text-green-400" defaultOpen>
        <div className="space-y-4 pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-green-500/10 text-green-400 rounded">{googleAds.campaignName}</span>
            {googleAds.dailyBudget > 0 && <span className="text-muted-foreground">${googleAds.dailyBudget}/day</span>}
            {googleAds.biddingStrategy && <><span className="text-muted-foreground">·</span><span className="text-muted-foreground">{googleAds.biddingStrategy}</span></>}
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
                        <td className="py-1.5 pr-3 text-right text-green-400">{kw.estimatedCPC > 0 ? `$${kw.estimatedCPC}` : '—'}</td>
                        <td className="py-1.5 pr-3 text-right">{kw.monthlySearchVolume > 0 ? kw.monthlySearchVolume?.toLocaleString() : '—'}</td>
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
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-sm break-words">{ag.name}</div>
                      {ag.adCopy && <CopyButton text={`${ag.adCopy.headlines?.join(' | ')}\n${ag.adCopy.descriptions?.join('\n')}`} />}
                    </div>
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
                        {ag.adCopy.descriptions?.map((desc: string, dIdx: number) => (
                          <div key={dIdx} className="text-muted-foreground break-words">{desc}</div>
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
                <Ban className="w-3 h-3" /> Negative Keywords ({googleAds.negativeKeywords.length})
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
                      <ExternalLink className="w-3 h-3" /> {sl.text}
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

      {/* ═══ META ADS DETAILS ═══ */}
      <Section title="Meta Ads Campaign" icon={<Eye className="w-4 h-4 text-blue-400" />}
        badge={`${totalAudiences} audiences · ${totalCreatives} creatives`} badgeColor="bg-blue-500/20 text-blue-400">
        <div className="space-y-4 pt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">{metaAds.campaignName}</span>
            {metaAds.dailyBudget > 0 && <span className="text-muted-foreground">${metaAds.dailyBudget}/day</span>}
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
                      }`}>{(aud.type || '').toUpperCase()}</span>
                      <span className="font-medium text-sm">{aud.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground break-words">{aud.targeting}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ad Sets */}
          {metaAds.adSets?.length > 0 && (
            <div>
              <div className="text-xs font-medium text-blue-400 uppercase tracking-wide mb-2">Ad Sets ({metaAds.adSets.length})</div>
              <div className="space-y-2">
                {metaAds.adSets.map((adSet: any, idx: number) => (
                  <div key={idx} className="p-2.5 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{adSet.name}</span>
                      {adSet.dailyBudget > 0 && <span className="text-[10px] text-muted-foreground">${adSet.dailyBudget}/day</span>}
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
                            <p className="text-[10px] text-muted-foreground break-words">{cr.hook}</p>
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
