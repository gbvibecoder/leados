'use client';

import { useState } from 'react';
import { Megaphone, IndianRupee, Globe, Users, Type, Link, MousePointerClick } from 'lucide-react';
import type { CampaignFormData, CampaignObjective, CallToAction } from '@/types/meta';

const OBJECTIVES: { value: CampaignObjective; label: string }[] = [
  { value: 'OUTCOME_LEADS', label: 'Lead Generation' },
  { value: 'OUTCOME_TRAFFIC', label: 'Website Traffic' },
  { value: 'OUTCOME_SALES', label: 'Sales / Conversions' },
  { value: 'OUTCOME_AWARENESS', label: 'Brand Awareness' },
];

const CTA_OPTIONS: { value: CallToAction; label: string }[] = [
  { value: 'LEARN_MORE', label: 'Learn More' },
  { value: 'SIGN_UP', label: 'Sign Up' },
  { value: 'CONTACT_US', label: 'Contact Us' },
  { value: 'GET_QUOTE', label: 'Get Quote' },
];

interface CampaignFormProps {
  onSubmit: (data: CampaignFormData) => void;
  isLoading: boolean;
}

export default function CampaignForm({ onSubmit, isLoading }: CampaignFormProps) {
  const [form, setForm] = useState<CampaignFormData>({
    campaignName: 'LeadOS 13 agents',
    objective: 'OUTCOME_LEADS',
    dailyBudget: 10000,
    country: 'IN',
    ageMin: 18,
    ageMax: 50,
    adHeadline: 'LeadOS with 13 agents',
    adBody: 'Market your product and generate leads with 13 agents from LeadOS',
    destinationUrl: 'https://leados-delta.vercel.app/',
    callToAction: 'LEARN_MORE',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof CampaignFormData, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.campaignName.trim()) e.campaignName = 'Campaign name is required';
    if (!form.dailyBudget || form.dailyBudget < 100) e.dailyBudget = 'Minimum budget is 100 paise (₹1)';
    if (!form.adHeadline.trim()) e.adHeadline = 'Headline is required';
    if (!form.adBody.trim()) e.adBody = 'Body text is required';
    try {
      new URL(form.destinationUrl);
    } catch {
      e.destinationUrl = 'Enter a valid URL';
    }
    if (form.ageMin < 13 || form.ageMin > form.ageMax) e.ageMin = 'Invalid age range';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  const inputCls =
    'w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-colors';
  const labelCls = 'block text-xs font-medium text-zinc-400 mb-1.5';
  const errorCls = 'text-xs text-red-400 mt-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
        <div className="p-2 bg-blue-500/10 rounded-lg">
          <Megaphone className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Create Meta Ad Campaign</h2>
          <p className="text-xs text-zinc-500">Configure and launch your campaign on Facebook & Instagram</p>
        </div>
      </div>

      {/* Campaign Name & Objective */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Campaign Name</label>
          <input
            className={inputCls}
            value={form.campaignName}
            onChange={(e) => set('campaignName', e.target.value)}
            placeholder="My Campaign"
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
        </div>
      </div>

      {/* Budget */}
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
        <p className="text-xs text-zinc-500 mt-1">
          = ₹{(form.dailyBudget / 100).toFixed(2)} per day / ₹{((form.dailyBudget / 100) * 30).toFixed(0)} per month
        </p>
        {errors.dailyBudget && <p className={errorCls}>{errors.dailyBudget}</p>}
      </div>

      {/* Targeting */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelCls}>
            <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Country</span>
          </label>
          <input
            className={inputCls}
            value={form.country}
            onChange={(e) => set('country', e.target.value.toUpperCase())}
            placeholder="IN"
            maxLength={2}
            disabled={isLoading}
          />
        </div>
        <div>
          <label className={labelCls}>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Age Min</span>
          </label>
          <input
            type="number"
            className={inputCls}
            value={form.ageMin}
            onChange={(e) => set('ageMin', Number(e.target.value))}
            min={13}
            max={65}
            disabled={isLoading}
          />
          {errors.ageMin && <p className={errorCls}>{errors.ageMin}</p>}
        </div>
        <div>
          <label className={labelCls}>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Age Max</span>
          </label>
          <input
            type="number"
            className={inputCls}
            value={form.ageMax}
            onChange={(e) => set('ageMax', Number(e.target.value))}
            min={13}
            max={65}
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Ad Creative */}
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

      {/* URL & CTA */}
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

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-lg transition-colors text-sm"
      >
        {isLoading ? 'Creating Campaign...' : 'Create Campaign'}
      </button>
    </form>
  );
}
