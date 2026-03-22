'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2, Copy, Check, BarChart3, RefreshCw,
  Globe, Users, Target, LayoutGrid, Calendar, CreditCard,
  Pencil, X, Save, Pause, IndianRupee, MapPin,
} from 'lucide-react';
import type { CampaignIds, CampaignInsights, CampaignFormData } from '@/types/meta';

const PLACEMENT_LABELS: Record<string, { label: string; platform: string }> = {
  facebook_feed: { label: 'Feed', platform: 'Facebook' },
  facebook_stories: { label: 'Stories', platform: 'Facebook' },
  facebook_reels: { label: 'Reels', platform: 'Facebook' },
  instagram_feed: { label: 'Feed', platform: 'Instagram' },
  instagram_stories: { label: 'Stories', platform: 'Instagram' },
  instagram_reels: { label: 'Reels', platform: 'Instagram' },
  instagram_explore: { label: 'Explore', platform: 'Instagram' },
  audience_network: { label: 'Classic', platform: 'Audience Network' },
  messenger_inbox: { label: 'Inbox', platform: 'Messenger' },
};

const GENDER_LABELS: Record<number, string> = { 0: 'All Genders', 1: 'Male', 2: 'Female' };
const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_LEADS: 'Lead Generation',
  OUTCOME_TRAFFIC: 'Website Traffic',
  OUTCOME_SALES: 'Sales / Conversions',
  OUTCOME_AWARENESS: 'Brand Awareness',
};
const CTA_LABELS: Record<string, string> = {
  LEARN_MORE: 'Learn More',
  SIGN_UP: 'Sign Up',
  CONTACT_US: 'Contact Us',
  GET_QUOTE: 'Get Quote',
};
const COUNTRY_LABELS: Record<string, string> = {
  IN: 'India', US: 'United States', GB: 'United Kingdom', CA: 'Canada',
  AU: 'Australia', DE: 'Germany', FR: 'France', AE: 'UAE', SG: 'Singapore', BR: 'Brazil',
};

interface CampaignSummaryProps {
  ids: Partial<CampaignIds>;
  insights: CampaignInsights[] | null;
  formData: CampaignFormData | null;
  onFetchInsights: () => void;
  onUpdateAdSet: (updates: Record<string, any>) => Promise<true | string>;
  onPauseCampaign: () => Promise<true | string>;
  onReset: () => void;
}

export default function CampaignSummary({
  ids,
  insights,
  formData,
  onFetchInsights,
  onUpdateAdSet,
  onPauseCampaign,
  onReset,
}: CampaignSummaryProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onFetchInsights();
    intervalRef.current = setInterval(onFetchInsights, 30_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onFetchInsights]);

  const showSnackbar = (msg: string) => {
    setSnackbar(msg);
    setTimeout(() => setSnackbar(null), 3000);
  };

  const copyToClipboard = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const startEdit = (field: string, currentValue: any) => {
    setEditing(field);
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue(null);
  };

  const saveEdit = async (field: string) => {
    setSaving(true);
    const updates: Record<string, any> = { [field]: editValue };
    const result = await onUpdateAdSet(updates);
    setSaving(false);
    if (result === true) {
      showSnackbar(`${field.replace(/_/g, ' ')} updated successfully`);
      cancelEdit();
    } else {
      showSnackbar(`Failed: ${result}`);
    }
  };

  const handlePause = async () => {
    setPausing(true);
    const result = await onPauseCampaign();
    setPausing(false);
    if (result === true) {
      setIsPaused(true);
      showSnackbar('Campaign paused successfully');
    } else {
      showSnackbar(`Failed to pause: ${result}`);
    }
  };

  const idEntries = [
    { label: 'Campaign ID', value: ids.campaign_id },
    { label: 'Ad Set ID', value: ids.adset_id },
    { label: 'Creative ID', value: ids.creative_id },
    { label: 'Ad ID', value: ids.ad_id },
  ].filter((e) => e.value);

  const latestInsight = insights?.[0];

  const inputCls =
    'w-full bg-zinc-800 border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors';
  const cardCls = 'p-4 bg-zinc-900 border border-white/[0.04] rounded-xl space-y-3';

  const EditableRow = ({ label, field, value, display }: { label: string; field: string; value: any; display: string }) => (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      {editing === field ? (
        <div className="flex items-center gap-2">
          {typeof value === 'number' ? (
            <input type="number" className={`${inputCls} w-32 text-right`} value={editValue} onChange={(e) => setEditValue(Number(e.target.value))} />
          ) : (
            <input className={`${inputCls} w-48 text-right`} value={editValue} onChange={(e) => setEditValue(e.target.value)} />
          )}
          <button onClick={() => saveEdit(field)} disabled={saving} className="p-1 text-green-400 hover:text-green-300">
            <Save className="w-3.5 h-3.5" />
          </button>
          <button onClick={cancelEdit} className="p-1 text-gray-500 hover:text-gray-300">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm text-white">{display}</span>
          <button onClick={() => startEdit(field, value)} className="p-1 text-gray-600 hover:text-gray-400 transition-colors">
            <Pencil className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Snackbar */}
      {snackbar && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2.5 bg-zinc-800 border border-white/[0.1] rounded-lg shadow-xl text-sm text-white animate-in fade-in slide-in-from-top-2">
          {snackbar}
        </div>
      )}

      {/* Status banner */}
      <div className={`flex items-center justify-between p-4 rounded-xl border ${isPaused ? 'bg-amber-500/10 border-amber-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            {!isPaused && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isPaused ? 'bg-amber-500' : 'bg-green-500'}`} />
          </span>
          <div>
            <h2 className={`text-lg font-bold flex items-center gap-2 ${isPaused ? 'text-amber-400' : 'text-green-400'}`}>
              <CheckCircle2 className="w-5 h-5" />
              {isPaused ? 'Campaign PAUSED' : 'Campaign is LIVE'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isPaused ? 'Your campaign is paused. Edit settings and reactivate.' : 'Your Meta ad campaign is now active and serving ads.'}
            </p>
          </div>
        </div>
        {!isPaused && (
          <button
            onClick={handlePause}
            disabled={pausing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/80 hover:bg-amber-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <Pause className="w-3.5 h-3.5" />
            {pausing ? 'Pausing...' : 'Pause'}
          </button>
        )}
      </div>

      {/* Campaign IDs */}
      <div className={cardCls}>
        <h3 className="text-sm font-semibold text-white">Campaign IDs</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {idEntries.map((entry) => (
            <div key={entry.label} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div>
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">{entry.label}</span>
                <p className="font-mono text-sm text-white">{entry.value}</p>
              </div>
              <button
                onClick={() => copyToClipboard(entry.label, entry.value!)}
                className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                title="Copy"
              >
                {copied === entry.label ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-500" />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className={cardCls}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" /> Campaign Insights
          </h3>
          <button onClick={onFetchInsights} className="p-1.5 hover:bg-white/5 rounded transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>

        {latestInsight ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Impressions', value: Number(latestInsight.impressions).toLocaleString() },
              { label: 'Clicks', value: Number(latestInsight.clicks).toLocaleString() },
              { label: 'Reach', value: Number(latestInsight.reach).toLocaleString() },
              { label: 'Spend', value: `₹${Number(latestInsight.spend).toFixed(2)}` },
            ].map((m) => (
              <div key={m.label} className="p-3 bg-white/5 rounded-lg text-center">
                <p className="text-xl font-bold text-white">{m.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">No insights yet</p>
            <p className="text-xs text-gray-600 mt-1">Stats may take a few hours to populate after campaign launch.</p>
          </div>
        )}

        {latestInsight && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <p className="text-lg font-bold text-white">{latestInsight.ctr || '0.00'}%</p>
              <p className="text-[10px] text-gray-500 mt-0.5">CTR</p>
            </div>
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <p className="text-lg font-bold text-white">₹{latestInsight.cpc || '0.00'}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">CPC</p>
            </div>
          </div>
        )}
      </div>

      {/* Campaign Configuration */}
      {formData && (
        <>
          {/* Targeting */}
          <div className={cardCls}>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-400" /> Audience Targeting
            </h3>
            <EditableRow label="Country" field="country" value={formData.country} display={COUNTRY_LABELS[formData.country] || formData.country} />
            <EditableRow label="Age Range" field="age_min" value={formData.ageMin} display={`${formData.ageMin} – ${formData.ageMax}`} />
            <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
              <span className="text-xs text-gray-500">Gender</span>
              <span className="text-sm text-white">{GENDER_LABELS[formData.gender] || 'All'}</span>
            </div>
            {formData.interests && (
              <div className="flex items-start justify-between py-2 border-b border-white/[0.03]">
                <span className="text-xs text-gray-500">Interests</span>
                <span className="text-sm text-white text-right max-w-[200px]">{formData.interests}</span>
              </div>
            )}
            {formData.cities && formData.cities.length > 0 && (
              <div className="py-2">
                <span className="text-xs text-gray-500 flex items-center gap-1 mb-2"><MapPin className="w-3 h-3" /> City Targeting</span>
                <div className="flex flex-wrap gap-1.5">
                  {formData.cities.map((city) => (
                    <span key={city.key} className="px-2 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300">
                      {city.name} ({city.radius}km)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Budget & Billing */}
          <div className={cardCls}>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-green-400" /> Budget & Billing
            </h3>
            <EditableRow
              label="Daily Budget"
              field="daily_budget"
              value={formData.dailyBudget}
              display={`₹${(formData.dailyBudget / 100).toFixed(2)} / day`}
            />
            <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
              <span className="text-xs text-gray-500">Monthly Estimate</span>
              <span className="text-sm text-white">₹{((formData.dailyBudget / 100) * 30).toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
              <span className="text-xs text-gray-500">Billing Event</span>
              <span className="text-sm text-white">{formData.billingEvent === 'IMPRESSIONS' ? 'CPM (Impressions)' : 'CPC (Link Clicks)'}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-gray-500">Objective</span>
              <span className="text-sm text-white">{OBJECTIVE_LABELS[formData.objective] || formData.objective}</span>
            </div>
          </div>

          {/* Placements */}
          <div className={cardCls}>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-purple-400" /> Ad Placements
            </h3>
            <div className="flex flex-wrap gap-2">
              {formData.placements.map((p) => {
                const info = PLACEMENT_LABELS[p];
                return (
                  <span key={p} className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300">
                    {info ? `${info.platform} ${info.label}` : p}
                  </span>
                );
              })}
            </div>
            <p className="text-[10px] text-gray-600">{formData.placements.length} active placement{formData.placements.length !== 1 ? 's' : ''}</p>
          </div>

          {/* Schedule */}
          <div className={cardCls}>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" /> Schedule
            </h3>
            <div className="flex items-center justify-between py-2 border-b border-white/[0.03]">
              <span className="text-xs text-gray-500">Start</span>
              <span className="text-sm text-white">
                {formData.scheduleStart ? new Date(formData.scheduleStart).toLocaleString() : 'Immediately'}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-gray-500">End</span>
              <span className="text-sm text-white">
                {formData.scheduleEnd ? new Date(formData.scheduleEnd).toLocaleString() : 'No end date (continuous)'}
              </span>
            </div>
          </div>

          {/* Ad Creative */}
          <div className={cardCls}>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-yellow-400" /> Ad Creative
            </h3>
            <div className="p-3 bg-white/5 rounded-lg space-y-2">
              <p className="text-sm font-medium text-white">{formData.adHeadline}</p>
              <p className="text-xs text-gray-400">{formData.adBody}</p>
              <div className="flex items-center gap-4 pt-1">
                <span className="text-[10px] text-gray-600">URL: <span className="text-cyan-400">{formData.destinationUrl}</span></span>
              </div>
              <div className="flex items-center gap-4 pt-1">
                <span className="text-[10px] text-gray-600">CTA: <span className="text-white">{CTA_LABELS[formData.callToAction] || formData.callToAction}</span></span>
              </div>
            </div>
          </div>
        </>
      )}

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
