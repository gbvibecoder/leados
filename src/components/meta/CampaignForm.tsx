'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Megaphone, IndianRupee, Globe, Users, Type, Link, MousePointerClick,
  Calendar, Target, LayoutGrid, CreditCard, MapPin, X, Search,
} from 'lucide-react';
import type { CampaignFormData, CampaignObjective, CallToAction, Gender, Placement, BillingEvent, CityTarget, AdCreativeData } from '@/types/meta';

const OBJECTIVES: { value: CampaignObjective; label: string; desc: string }[] = [
  { value: 'OUTCOME_LEADS', label: 'Lead Generation', desc: 'Collect leads via forms' },
  { value: 'OUTCOME_TRAFFIC', label: 'Website Traffic', desc: 'Drive clicks to your site' },
  { value: 'OUTCOME_SALES', label: 'Sales / Conversions', desc: 'Optimize for purchases' },
  { value: 'OUTCOME_AWARENESS', label: 'Brand Awareness', desc: 'Maximize reach & impressions' },
];

const CTA_OPTIONS: { value: CallToAction; label: string }[] = [
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 0, label: 'All Genders' },
  { value: 1, label: 'Male' },
  { value: 2, label: 'Female' },
];

const PLACEMENT_OPTIONS: { value: Placement; label: string; platform: string }[] = [
  { value: 'facebook_feed', label: 'Feed', platform: 'Facebook' },
  { value: 'facebook_stories', label: 'Stories', platform: 'Facebook' },
  { value: 'facebook_reels', label: 'Reels', platform: 'Facebook' },
  { value: 'instagram_feed', label: 'Feed', platform: 'Instagram' },
  { value: 'instagram_stories', label: 'Stories', platform: 'Instagram' },
  { value: 'instagram_reels', label: 'Reels', platform: 'Instagram' },
  { value: 'instagram_explore', label: 'Explore', platform: 'Instagram' },
  { value: 'messenger_inbox', label: 'Inbox', platform: 'Messenger' },
];

const BILLING_OPTIONS: { value: BillingEvent; label: string; desc: string }[] = [
  { value: 'IMPRESSIONS', label: 'Impressions (CPM)', desc: 'Pay per 1,000 views' },
  { value: 'LINK_CLICKS', label: 'Link Clicks (CPC)', desc: 'Pay per click' },
];

const COUNTRY_OPTIONS = [
  { value: 'IN', label: 'India' },
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'AE', label: 'UAE' },
  { value: 'SG', label: 'Singapore' },
  { value: 'BR', label: 'Brazil' },
];

// Default start = 10 min from now, no end
function defaultStart(): string {
  const d = new Date(Date.now() + 10 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

interface CampaignFormProps {
  onSubmit: (data: CampaignFormData) => void;
  isLoading: boolean;
  /** Pre-fill form fields from agent output or other sources */
  initialData?: Partial<CampaignFormData>;
  /** Custom label for the submit button */
  submitLabel?: string;
  /** Called when user cancels/goes back */
  onCancel?: () => void;
}

export default function CampaignForm({ onSubmit, isLoading, initialData, submitLabel, onCancel }: CampaignFormProps) {
  const [form, setForm] = useState<CampaignFormData>({
    campaignName: '',
    objective: 'OUTCOME_LEADS',
    dailyBudget: 10000,
    country: 'IN',
    cities: [],
    ageMin: 18,
    ageMax: 50,
    gender: 0,
    placements: ['facebook_feed', 'instagram_feed', 'instagram_stories'],
    interests: '',
    billingEvent: 'IMPRESSIONS',
    scheduleStart: defaultStart(),
    scheduleEnd: '',
    adHeadline: '',
    adBody: '',
    destinationUrl: '',
    callToAction: 'LEARN_MORE',
    ...initialData,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // City search state
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<{ key: string; name: string; region: string; country_name: string }[]>([]);
  const [cityLoading, setCityLoading] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [cityRadius, setCityRadius] = useState(25);
  const cityRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setShowCityDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchCities = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setCityResults([]);
      setShowCityDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setCityLoading(true);
      try {
        const res = await fetch(`/api/meta/cities?q=${encodeURIComponent(query)}&country=${form.country}`);
        const data = await res.json();
        if (data.success) {
          setCityResults(data.data);
          setShowCityDropdown(true);
        }
      } catch { /* ignore */ }
      setCityLoading(false);
    }, 300);
  }, [form.country]);

  const addCity = (city: { key: string; name: string; region: string; country_name: string }) => {
    if (form.cities.some((c) => c.key === city.key)) return;
    setForm((prev) => ({
      ...prev,
      cities: [...prev.cities, { key: city.key, name: `${city.name}, ${city.region || city.country_name}`, radius: cityRadius }],
    }));
    setCityQuery('');
    setShowCityDropdown(false);
  };

  const removeCity = (key: string) => {
    setForm((prev) => ({ ...prev, cities: prev.cities.filter((c) => c.key !== key) }));
  };

  const updateCityRadius = (key: string, radius: number) => {
    setForm((prev) => ({
      ...prev,
      cities: prev.cities.map((c) => (c.key === key ? { ...c, radius } : c)),
    }));
  };

  const set = (key: keyof CampaignFormData, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const togglePlacement = (p: Placement) => {
    setForm((prev) => {
      const has = prev.placements.includes(p);
      return {
        ...prev,
        placements: has ? prev.placements.filter((x) => x !== p) : [...prev.placements, p],
      };
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.campaignName.trim()) e.campaignName = 'Campaign name is required';
    if (!form.dailyBudget || form.dailyBudget < 100) e.dailyBudget = 'Minimum budget is 100 paise (₹1)';
    // Validate creatives — if multi-creative mode, check those; else check legacy fields
    if (form.adCreatives && form.adCreatives.length > 0) {
      const emptyCreative = form.adCreatives.find((c) => !c.headline.trim() || !c.body.trim());
      if (emptyCreative) e.adCreatives = 'All ad creatives need a headline and body';
    } else {
      if (!form.adHeadline.trim()) e.adHeadline = 'Headline is required';
      if (!form.adBody.trim()) e.adBody = 'Body text is required';
    }
    try {
      new URL(form.destinationUrl);
    } catch {
      e.destinationUrl = 'Enter a valid URL';
    }
    if (form.ageMin < 13 || form.ageMin > form.ageMax) e.ageMin = 'Invalid age range';
    if (form.placements.length === 0) e.placements = 'Select at least one placement';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  const inputCls =
    'w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors';
  const labelCls = 'block text-xs font-medium text-gray-400 mb-1.5';
  const errorCls = 'text-xs text-red-400 mt-1';
  const sectionCls = 'space-y-4 p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl';

  const fbPlacements = PLACEMENT_OPTIONS.filter((p) => p.platform === 'Facebook');
  const igPlacements = PLACEMENT_OPTIONS.filter((p) => p.platform === 'Instagram');
  const otherPlacements = PLACEMENT_OPTIONS.filter((p) => p.platform === 'Messenger');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-white/[0.04]">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Megaphone className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Create Meta Ad Campaign</h2>
          <p className="text-xs text-gray-500">Configure and launch your campaign on Facebook & Instagram</p>
        </div>
      </div>

      {/* ── Section 1: Campaign Basics ── */}
      <div className={sectionCls}>
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Megaphone className="w-3.5 h-3.5 text-blue-400" /> Campaign Basics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Campaign Name</label>
            <input
              className={inputCls}
              value={form.campaignName}
              onChange={(e) => set('campaignName', e.target.value)}
              placeholder="e.g., Summer Lead Gen 2026"
              disabled={isLoading}
            />
            {errors.campaignName && <p className={errorCls}>{errors.campaignName}</p>}
          </div>
          <div>
            <label className={labelCls}>Objective</label>
            <select
              className={inputCls}
              value={form.objective}
              onChange={(e) => set('objective', e.target.value)}
              disabled={isLoading}
            >
              {OBJECTIVES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-600 mt-1">
              {OBJECTIVES.find((o) => o.value === form.objective)?.desc}
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 2: Budget & Billing ── */}
      <div className={sectionCls}>
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5 text-green-400" /> Budget & Billing
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              <span className="flex items-center gap-1">
                <IndianRupee className="w-3 h-3" /> Daily Budget (in paise)
              </span>
            </label>
            <input
              type="number"
              className={inputCls}
              value={form.dailyBudget}
              onChange={(e) => set('dailyBudget', Number(e.target.value))}
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">
              = ₹{(form.dailyBudget / 100).toFixed(2)} / day &middot; ₹{((form.dailyBudget / 100) * 30).toFixed(0)} / month
            </p>
            {errors.dailyBudget && <p className={errorCls}>{errors.dailyBudget}</p>}
          </div>
          <div>
            <label className={labelCls}>Billing Event</label>
            <select
              className={inputCls}
              value={form.billingEvent}
              onChange={(e) => set('billingEvent', e.target.value)}
              disabled={isLoading}
            >
              {BILLING_OPTIONS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-gray-600 mt-1">
              {BILLING_OPTIONS.find((b) => b.value === form.billingEvent)?.desc}
            </p>
          </div>
        </div>
      </div>

      {/* ── Section 3: Targeting ── */}
      <div className={sectionCls}>
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Target className="w-3.5 h-3.5 text-orange-400" /> Audience Targeting
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>
              <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Country</span>
            </label>
            <select
              className={inputCls}
              value={form.country}
              onChange={(e) => set('country', e.target.value)}
              disabled={isLoading}
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Age Range</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className={`${inputCls} text-center`}
                value={form.ageMin}
                onChange={(e) => set('ageMin', Number(e.target.value))}
                min={13} max={65} disabled={isLoading}
              />
              <span className="text-gray-600 text-xs">to</span>
              <input
                type="number"
                className={`${inputCls} text-center`}
                value={form.ageMax}
                onChange={(e) => set('ageMax', Number(e.target.value))}
                min={13} max={65} disabled={isLoading}
              />
            </div>
            {errors.ageMin && <p className={errorCls}>{errors.ageMin}</p>}
          </div>
          <div>
            <label className={labelCls}>Gender</label>
            <select
              className={inputCls}
              value={form.gender}
              onChange={(e) => set('gender', Number(e.target.value))}
              disabled={isLoading}
            >
              {GENDER_OPTIONS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>
            <span className="flex items-center gap-1"><Target className="w-3 h-3" /> Interests (comma-separated)</span>
          </label>
          <input
            className={inputCls}
            value={form.interests}
            onChange={(e) => set('interests', e.target.value)}
            placeholder="e.g., Digital marketing, SaaS, Entrepreneurship"
            disabled={isLoading}
          />
          <p className="text-[10px] text-gray-600 mt-1">Leave empty for broad targeting</p>
        </div>

        {/* City targeting */}
        <div ref={cityRef} className="relative">
          <label className={labelCls}>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> City Targeting (optional)</span>
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input
              className={`${inputCls} pl-9`}
              value={cityQuery}
              onChange={(e) => { setCityQuery(e.target.value); searchCities(e.target.value); }}
              onFocus={() => cityResults.length > 0 && setShowCityDropdown(true)}
              placeholder="Search cities (e.g., Mumbai, Delhi, Bangalore...)"
              disabled={isLoading}
            />
            {cityLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-3.5 h-3.5 border-2 border-gray-600 border-t-cyan-400 rounded-full animate-spin" />
              </div>
            )}
          </div>

          {showCityDropdown && cityResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-h-[200px] overflow-y-auto rounded-lg shadow-2xl"
              style={{ background: 'rgba(15,15,20,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {cityResults.map((city) => {
                const alreadyAdded = form.cities.some((c) => c.key === city.key);
                return (
                  <button
                    key={city.key}
                    type="button"
                    onClick={() => addCity(city)}
                    disabled={alreadyAdded}
                    className={`flex items-center justify-between w-full px-3 py-2 text-left text-sm transition-colors ${
                      alreadyAdded ? 'text-gray-600 cursor-not-allowed' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-cyan-500 shrink-0" />
                      <span>{city.name}</span>
                      {city.region && <span className="text-gray-600 text-xs">{city.region}</span>}
                    </span>
                    <span className="text-[10px] text-gray-600">{city.country_name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Default radius for new cities */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-gray-600">Default radius:</span>
            <select
              className="bg-zinc-900 border border-white/[0.08] rounded px-2 py-1 text-[10px] text-white"
              value={cityRadius}
              onChange={(e) => setCityRadius(Number(e.target.value))}
            >
              {[10, 15, 25, 40, 50, 80].map((r) => (
                <option key={r} value={r}>{r} km</option>
              ))}
            </select>
          </div>

          {/* Selected cities */}
          {form.cities.length > 0 && (
            <div className="mt-3 space-y-2">
              {form.cities.map((city) => (
                <div key={city.key} className="flex items-center justify-between p-2 bg-cyan-500/5 border border-cyan-500/15 rounded-lg">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="text-xs text-white">{city.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="bg-zinc-900 border border-white/[0.08] rounded px-1.5 py-0.5 text-[10px] text-white"
                      value={city.radius}
                      onChange={(e) => updateCityRadius(city.key, Number(e.target.value))}
                    >
                      {[10, 15, 25, 40, 50, 80].map((r) => (
                        <option key={r} value={r}>{r} km</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => removeCity(city.key)} className="p-0.5 text-gray-500 hover:text-red-400 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-gray-600 mt-1">
            {form.cities.length === 0
              ? 'Leave empty to target the entire country'
              : `${form.cities.length} city/cities selected — ads will show within the specified radius`}
          </p>
        </div>
      </div>

      {/* ── Section 4: Placements ── */}
      <div className={sectionCls}>
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <LayoutGrid className="w-3.5 h-3.5 text-purple-400" /> Ad Placements
        </h3>
        <p className="text-[10px] text-gray-500">Choose where your ads will appear</p>
        {errors.placements && <p className={errorCls}>{errors.placements}</p>}

        {[
          { label: 'Facebook', items: fbPlacements, color: 'blue' },
          { label: 'Instagram', items: igPlacements, color: 'pink' },
          { label: 'Messenger', items: otherPlacements, color: 'cyan' },
        ].map((group) => (
          <div key={group.label}>
            <p className="text-[10px] font-medium text-gray-500 uppercase mb-1.5">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {group.items.map((p) => {
                const active = form.placements.includes(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlacement(p.value)}
                    disabled={isLoading}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      active
                        ? `bg-${group.color}-500/15 border-${group.color}-500/40 text-${group.color}-400`
                        : 'bg-white/[0.02] border-white/[0.06] text-gray-500 hover:border-white/[0.12]'
                    }`}
                    style={active ? {
                      background: `rgba(${group.color === 'blue' ? '59,130,246' : group.color === 'pink' ? '236,72,153' : '6,182,212'},0.12)`,
                      borderColor: `rgba(${group.color === 'blue' ? '59,130,246' : group.color === 'pink' ? '236,72,153' : '6,182,212'},0.35)`,
                      color: group.color === 'blue' ? '#60a5fa' : group.color === 'pink' ? '#f472b6' : '#22d3ee',
                    } : {}}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-[10px] text-gray-600">{form.placements.length} placement{form.placements.length !== 1 ? 's' : ''} selected</p>
      </div>

      {/* ── Section 5: Schedule ── */}
      <div className={sectionCls}>
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Schedule
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Start Date & Time</label>
            <input
              type="datetime-local"
              className={inputCls}
              value={form.scheduleStart}
              onChange={(e) => set('scheduleStart', e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <label className={labelCls}>End Date & Time (optional)</label>
            <input
              type="datetime-local"
              className={inputCls}
              value={form.scheduleEnd}
              onChange={(e) => set('scheduleEnd', e.target.value)}
              disabled={isLoading}
            />
            <p className="text-[10px] text-gray-600 mt-1">Leave empty to run continuously</p>
          </div>
        </div>
      </div>

      {/* ── Section 6: Ad Creatives (all 3 ads) ── */}
      <div className={sectionCls}>
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
          <Type className="w-3.5 h-3.5 text-yellow-400" /> Ad Creatives ({form.adCreatives?.length || 1})
        </h3>

        {/* Show all ad creatives with image previews */}
        {(form.adCreatives && form.adCreatives.length > 0) ? (
          <div className="space-y-4">
            {form.adCreatives.map((creative, idx) => (
              <div key={idx} className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 overflow-hidden">
                {/* Creative header */}
                <div className="px-3 py-2 border-b border-zinc-700/50 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-300">
                    Ad {idx + 1}{creative.audienceLabel ? ` — ${creative.audienceLabel}` : ''}
                  </span>
                </div>

                <div className="flex gap-3 p-3">
                  {/* Image preview */}
                  {creative.imageUrl && (
                    <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900">
                      <img src={creative.imageUrl} alt={`Ad ${idx + 1}`}
                        className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Editable fields */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <input
                      className="w-full px-2 py-1.5 bg-zinc-900/80 border border-zinc-700 rounded text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none"
                      value={creative.headline}
                      onChange={(e) => {
                        const updated = [...(form.adCreatives || [])];
                        updated[idx] = { ...updated[idx], headline: e.target.value };
                        setForm((prev) => ({ ...prev, adCreatives: updated }));
                      }}
                      placeholder="Headline"
                      disabled={isLoading}
                    />
                    <textarea
                      className="w-full px-2 py-1.5 bg-zinc-900/80 border border-zinc-700 rounded text-xs text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none resize-none min-h-[48px]"
                      value={creative.body}
                      onChange={(e) => {
                        const updated = [...(form.adCreatives || [])];
                        updated[idx] = { ...updated[idx], body: e.target.value };
                        setForm((prev) => ({ ...prev, adCreatives: updated }));
                      }}
                      placeholder="Body text"
                      disabled={isLoading}
                    />
                    <select
                      className="w-full px-2 py-1.5 bg-zinc-900/80 border border-zinc-700 rounded text-xs text-zinc-100 focus:border-blue-500 focus:outline-none"
                      value={creative.callToAction}
                      onChange={(e) => {
                        const updated = [...(form.adCreatives || [])];
                        updated[idx] = { ...updated[idx], callToAction: e.target.value as CallToAction };
                        setForm((prev) => ({ ...prev, adCreatives: updated }));
                      }}
                      disabled={isLoading}
                    >
                      {CTA_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Fallback: single creative (legacy) */
          <div className="space-y-4">
            <div>
              <label className={labelCls}>
                <span className="flex items-center gap-1"><Type className="w-3 h-3" /> Ad Headline</span>
              </label>
              <input
                className={inputCls}
                value={form.adHeadline}
                onChange={(e) => set('adHeadline', e.target.value)}
                placeholder="Your ad headline"
                disabled={isLoading}
              />
              {errors.adHeadline && <p className={errorCls}>{errors.adHeadline}</p>}
            </div>
            <div>
              <label className={labelCls}>Ad Body Text</label>
              <textarea
                className={`${inputCls} min-h-[80px] resize-none`}
                value={form.adBody}
                onChange={(e) => set('adBody', e.target.value)}
                placeholder="Describe your offer..."
                disabled={isLoading}
              />
              {errors.adBody && <p className={errorCls}>{errors.adBody}</p>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              <span className="flex items-center gap-1"><Link className="w-3 h-3" /> Destination URL</span>
            </label>
            <input
              className={inputCls}
              value={form.destinationUrl}
              onChange={(e) => set('destinationUrl', e.target.value)}
              placeholder="https://..."
              disabled={isLoading}
            />
            {errors.destinationUrl && <p className={errorCls}>{errors.destinationUrl}</p>}
          </div>
          <div>
            <label className={labelCls}>
              <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> Call to Action</span>
            </label>
            <select
              className={inputCls}
              value={form.callToAction}
              onChange={(e) => set('callToAction', e.target.value)}
              disabled={isLoading}
            >
              {CTA_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors text-sm"
      >
        {isLoading ? 'Launching...' : (submitLabel || 'Create Campaign')}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel}
          className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg transition-colors text-sm mt-2">
          Cancel
        </button>
      )}
    </form>
  );
}
