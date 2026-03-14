'use client';

import { useState, useCallback } from 'react';
import type {
  CampaignStep,
  CampaignIds,
  CampaignFormData,
  CampaignInsights,
} from '@/types/meta';

interface UseCampaignState {
  step: CampaignStep;
  ids: Partial<CampaignIds>;
  error: string | null;
  isLoading: boolean;
  insights: CampaignInsights[] | null;
}

export function useMetaCampaign() {
  const [state, setState] = useState<UseCampaignState>({
    step: 'idle',
    ids: {},
    error: null,
    isLoading: false,
    insights: null,
  });

  const setStep = (step: CampaignStep, extra?: Partial<UseCampaignState>) => {
    setState((prev) => ({
      ...prev,
      step,
      isLoading: !['idle', 'ready_to_activate', 'live', 'failed'].includes(step),
      ...extra,
    }));
  };

  const fail = (error: string) => {
    setState((prev) => ({ ...prev, step: 'failed', error, isLoading: false }));
  };

  async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'API call failed');
    return data.data;
  }

  const startCampaign = useCallback(async (form: CampaignFormData) => {
    const ids: Partial<CampaignIds> = {};

    try {
      // Step 1: Validate token
      setStep('validating');
      await apiCall('/api/meta/validate');

      // Step 2: Create campaign
      setStep('creating_campaign');
      const campaignRes = await apiCall<{ campaign_id: string }>(
        '/api/meta/campaign',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.campaignName,
            objective: form.objective,
          }),
        }
      );
      ids.campaign_id = campaignRes.campaign_id;

      // Step 3: Create ad set
      setStep('creating_adset', { ids });
      const adsetRes = await apiCall<{ adset_id: string }>(
        '/api/meta/adset',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaign_id: ids.campaign_id,
            daily_budget: form.dailyBudget,
            age_min: form.ageMin,
            age_max: form.ageMax,
            country: form.country,
            objective: form.objective,
          }),
        }
      );
      ids.adset_id = adsetRes.adset_id;

      // Step 4: Create ad creative
      setStep('creating_creative', { ids });
      const creativeRes = await apiCall<{ creative_id: string }>(
        '/api/meta/creative',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `${form.adHeadline}\n\n${form.adBody}`,
            link: form.destinationUrl,
            cta_type: form.callToAction,
          }),
        }
      );
      ids.creative_id = creativeRes.creative_id;

      // Step 5: Create ad
      setStep('creating_ad', { ids });
      const adRes = await apiCall<{ ad_id: string }>('/api/meta/ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adset_id: ids.adset_id,
          creative_id: ids.creative_id,
        }),
      });
      ids.ad_id = adRes.ad_id;

      // Step 6: Ready for review — wait for user confirmation
      setStep('ready_to_activate', { ids, error: null });
    } catch (err: any) {
      fail(err.message || 'Campaign creation failed');
    }
  }, []);

  const activateCampaignAction = useCallback(async () => {
    const { ids } = state;
    if (!ids.campaign_id || !ids.adset_id || !ids.ad_id) {
      fail('Missing campaign IDs for activation');
      return;
    }

    try {
      setStep('activating');
      await apiCall('/api/meta/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: ids.campaign_id,
          adset_id: ids.adset_id,
          ad_id: ids.ad_id,
          creative_id: ids.creative_id,
        }),
      });

      setStep('live', { error: null });
    } catch (err: any) {
      fail(err.message || 'Activation failed');
    }
  }, [state.ids]);

  const fetchInsights = useCallback(async () => {
    if (!state.ids.campaign_id) return;
    try {
      const data = await apiCall<{ insights: CampaignInsights[] }>(
        `/api/meta/insights?campaign_id=${state.ids.campaign_id}`
      );
      setState((prev) => ({ ...prev, insights: data.insights || [] }));
    } catch {
      // Insights may not be available yet — silently fail
    }
  }, [state.ids.campaign_id]);

  const reset = useCallback(() => {
    setState({
      step: 'idle',
      ids: {},
      error: null,
      isLoading: false,
      insights: null,
    });
  }, []);

  return {
    ...state,
    startCampaign,
    activateCampaign: activateCampaignAction,
    fetchInsights,
    reset,
  };
}
