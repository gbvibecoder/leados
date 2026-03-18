'use client';

import { useMetaCampaign } from '@/hooks/useMetaCampaign';
import CampaignForm from '@/components/meta/CampaignForm';
import CampaignProgress from '@/components/meta/CampaignProgress';
import CampaignSummary from '@/components/meta/CampaignSummary';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MetaCampaignPage() {
  const {
    step,
    ids,
    error,
    isLoading,
    insights,
    startCampaign,
    activateCampaign,
    fetchInsights,
    reset,
  } = useMetaCampaign();

  const showForm = step === 'idle';
  const showProgress =
    step !== 'idle' && step !== 'live';
  const showSummary = step === 'live';

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Back nav */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>

        <div className="bg-[#020205] border border-white/[0.04] rounded-2xl p-6 shadow-2xl">
          {showForm && (
            <CampaignForm onSubmit={startCampaign} isLoading={isLoading} />
          )}

          {showProgress && (
            <CampaignProgress
              step={step}
              ids={ids}
              error={error}
              onActivate={activateCampaign}
              onReset={reset}
            />
          )}

          {showSummary && (
            <CampaignSummary
              ids={ids}
              insights={insights}
              onFetchInsights={fetchInsights}
              onReset={reset}
            />
          )}
        </div>
      </div>
    </div>
  );
}
