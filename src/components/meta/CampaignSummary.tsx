'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Copy, Check, BarChart3, RefreshCw } from 'lucide-react';
import type { CampaignIds, CampaignInsights } from '@/types/meta';

interface CampaignSummaryProps {
  ids: Partial<CampaignIds>;
  insights: CampaignInsights[] | null;
  onFetchInsights: () => void;
  onReset: () => void;
}

export default function CampaignSummary({
  ids,
  insights,
  onFetchInsights,
  onReset,
}: CampaignSummaryProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-refresh insights every 30 seconds
  useEffect(() => {
    onFetchInsights();
    intervalRef.current = setInterval(onFetchInsights, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onFetchInsights]);

  const copyToClipboard = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const idEntries = [
    { label: 'Campaign ID', value: ids.campaign_id },
    { label: 'Ad Set ID', value: ids.adset_id },
    { label: 'Creative ID', value: ids.creative_id },
    { label: 'Ad ID', value: ids.ad_id },
  ].filter((e) => e.value);

  const latestInsight = insights?.[0];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-green-400 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" /> Campaign is LIVE
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Your Meta ad campaign is now active and serving ads.
          </p>
        </div>
      </div>

      {/* Campaign IDs */}
      <div className="p-4 bg-zinc-900 border border-white/[0.04] rounded-xl space-y-3">
        <h3 className="text-sm font-semibold text-white">Campaign IDs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {idEntries.map((entry) => (
            <div
              key={entry.label}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
            >
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">{entry.label}</span>
                <p className="font-mono text-sm text-white">{entry.value}</p>
              </div>
              <button
                onClick={() => copyToClipboard(entry.label, entry.value!)}
                className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                title="Copy"
              >
                {copied === entry.label ? (
                  <Check className="w-3.5 h-3.5 text-green-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="p-4 bg-zinc-900 border border-white/[0.04] rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" /> Campaign Insights
          </h3>
          <button
            onClick={onFetchInsights}
            className="p-1.5 hover:bg-white/5 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        {latestInsight ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <p className="text-xl font-bold text-white">{Number(latestInsight.impressions).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Impressions</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <p className="text-xl font-bold text-white">{Number(latestInsight.clicks).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Clicks</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <p className="text-xl font-bold text-white">{Number(latestInsight.reach).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Reach</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <p className="text-xl font-bold text-white">₹{Number(latestInsight.spend).toFixed(2)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Spend</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">No insights yet</p>
            <p className="text-xs text-gray-600 mt-1">Stats may take a few hours to populate after campaign launch.</p>
          </div>
        )}
      </div>

      {/* New campaign */}
      <button
        onClick={onReset}
        className="w-full py-2.5 border border-white/[0.08] hover:border-cyan-500/20 text-gray-400 hover:text-white text-sm rounded-lg transition-colors"
      >
        Create Another Campaign
      </button>
    </div>
  );
}
