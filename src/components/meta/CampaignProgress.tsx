'use client';

import { CheckCircle2, XCircle, Loader2, Circle, Rocket } from 'lucide-react';
import type { CampaignStep, CampaignIds } from '@/types/meta';

interface StepDef {
  key: CampaignStep | CampaignStep[];
  label: string;
}

const STEPS: StepDef[] = [
  { key: 'validating', label: 'Validate Access Token' },
  { key: 'creating_campaign', label: 'Create Campaign' },
  { key: 'creating_adset', label: 'Create Ad Set' },
  { key: 'creating_creative', label: 'Create Ad Creative' },
  { key: 'creating_ad', label: 'Create Ad' },
  { key: ['ready_to_activate', 'activating'], label: 'Review & Confirm' },
  { key: 'live', label: 'Activate Campaign' },
];

const STEP_ORDER: CampaignStep[] = [
  'validating',
  'creating_campaign',
  'creating_adset',
  'creating_creative',
  'creating_ad',
  'ready_to_activate',
  'activating',
  'live',
];

function getStepIndex(step: CampaignStep): number {
  return STEP_ORDER.indexOf(step);
}

function getStatus(
  stepKeys: CampaignStep | CampaignStep[],
  currentStep: CampaignStep,
  failed: boolean
): 'pending' | 'loading' | 'success' | 'failed' {
  const keys = Array.isArray(stepKeys) ? stepKeys : [stepKeys];
  const currentIdx = getStepIndex(currentStep);

  if (failed && keys.some((k) => getStepIndex(k) === currentIdx)) return 'failed';

  const maxKeyIdx = Math.max(...keys.map((k) => getStepIndex(k)));
  const minKeyIdx = Math.min(...keys.map((k) => getStepIndex(k)));

  if (currentIdx > maxKeyIdx) return 'success';
  if (currentIdx >= minKeyIdx && currentIdx <= maxKeyIdx) return 'loading';
  return 'pending';
}

interface CampaignProgressProps {
  step: CampaignStep;
  ids: Partial<CampaignIds>;
  error: string | null;
  onActivate: () => void;
  onReset: () => void;
}

export default function CampaignProgress({
  step,
  ids,
  error,
  onActivate,
  onReset,
}: CampaignProgressProps) {
  const isFailed = step === 'failed';

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Campaign Setup Progress</h2>

      <div className="space-y-1">
        {STEPS.map((s, i) => {
          const status = getStatus(s.key, step, isFailed);

          return (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5/50 transition-colors">
              <div className="flex-shrink-0">
                {status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-400" />}
                {status === 'loading' && <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />}
                {status === 'failed' && <XCircle className="w-5 h-5 text-red-400" />}
                {status === 'pending' && <Circle className="w-5 h-5 text-gray-600" />}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  status === 'success' ? 'text-green-400' :
                  status === 'loading' ? 'text-blue-400' :
                  status === 'failed' ? 'text-red-400' :
                  'text-gray-500'
                }`}>
                  Step {i + 1}: {s.label}
                </p>
              </div>
              {/* Show IDs for completed steps */}
              {status === 'success' && i === 1 && ids.campaign_id && (
                <span className="text-[10px] text-gray-500 font-mono">{ids.campaign_id}</span>
              )}
              {status === 'success' && i === 2 && ids.adset_id && (
                <span className="text-[10px] text-gray-500 font-mono">{ids.adset_id}</span>
              )}
              {status === 'success' && i === 3 && ids.creative_id && (
                <span className="text-[10px] text-gray-500 font-mono">{ids.creative_id}</span>
              )}
              {status === 'success' && i === 4 && ids.ad_id && (
                <span className="text-[10px] text-gray-500 font-mono">{ids.ad_id}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={onReset}
            className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Start Over
          </button>
        </div>
      )}

      {/* Confirmation card */}
      {step === 'ready_to_activate' && (
        <div className="p-5 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-4">
          <h3 className="text-base font-semibold text-blue-400">Ready to Launch!</h3>
          <p className="text-sm text-gray-400">
            All campaign components have been created in PAUSED state. Review the IDs below and click
            Launch to set everything to ACTIVE.
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {ids.campaign_id && (
              <div className="p-2 bg-white/5 rounded-lg">
                <span className="text-gray-500">Campaign</span>
                <p className="font-mono text-white mt-0.5">{ids.campaign_id}</p>
              </div>
            )}
            {ids.adset_id && (
              <div className="p-2 bg-white/5 rounded-lg">
                <span className="text-gray-500">Ad Set</span>
                <p className="font-mono text-white mt-0.5">{ids.adset_id}</p>
              </div>
            )}
            {ids.creative_id && (
              <div className="p-2 bg-white/5 rounded-lg">
                <span className="text-gray-500">Creative</span>
                <p className="font-mono text-white mt-0.5">{ids.creative_id}</p>
              </div>
            )}
            {ids.ad_id && (
              <div className="p-2 bg-white/5 rounded-lg">
                <span className="text-gray-500">Ad</span>
                <p className="font-mono text-white mt-0.5">{ids.ad_id}</p>
              </div>
            )}
          </div>

          <button
            onClick={onActivate}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Rocket className="w-4 h-4" />
            Launch Campaign
          </button>
        </div>
      )}

      {/* Activating spinner */}
      {step === 'activating' && (
        <div className="flex items-center justify-center gap-3 p-4">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          <span className="text-sm text-blue-400">Activating all components...</span>
        </div>
      )}
    </div>
  );
}
