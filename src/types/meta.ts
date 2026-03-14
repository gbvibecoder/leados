// ── Meta Marketing API Types ────────────────────────────────────────────────

export type CampaignObjective =
  | 'OUTCOME_LEADS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_SALES'
  | 'OUTCOME_AWARENESS';

export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';

export type CallToAction =
  | 'LEARN_MORE'
  | 'SIGN_UP'
  | 'CONTACT_US'
  | 'GET_QUOTE';

export type OptimizationGoal =
  | 'LEAD_GENERATION'
  | 'LINK_CLICKS'
  | 'OFFSITE_CONVERSIONS'
  | 'REACH';

export type CampaignStep =
  | 'idle'
  | 'validating'
  | 'creating_campaign'
  | 'creating_adset'
  | 'creating_creative'
  | 'creating_ad'
  | 'ready_to_activate'
  | 'activating'
  | 'live'
  | 'failed';

// ── Request Params ──────────────────────────────────────────────────────────

export interface CreateCampaignParams {
  name: string;
  objective: CampaignObjective;
}

export interface CreateAdSetParams {
  campaign_id: string;
  daily_budget: number; // in paise (smallest currency unit)
  age_min: number;
  age_max: number;
  country: string;
  objective: CampaignObjective;
}

export interface CreateCreativeParams {
  message: string;
  link: string;
  cta_type: CallToAction;
}

export interface CreateAdParams {
  adset_id: string;
  creative_id: string;
}

export interface ActivateParams {
  campaign_id: string;
  adset_id: string;
  ad_id: string;
}

// ── Response Types ──────────────────────────────────────────────────────────

export interface MetaApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

export interface CampaignIds {
  campaign_id: string;
  adset_id: string;
  creative_id: string;
  ad_id: string;
}

export interface CampaignInsights {
  impressions: number;
  clicks: number;
  spend: string;
  reach: number;
  ctr: string;
  cpc: string;
  date_start: string;
  date_stop: string;
}

// ── Campaign Form Data (from UI) ────────────────────────────────────────────

export interface CampaignFormData {
  campaignName: string;
  objective: CampaignObjective;
  dailyBudget: number; // in paise
  country: string;
  ageMin: number;
  ageMax: number;
  adHeadline: string;
  adBody: string;
  destinationUrl: string;
  callToAction: CallToAction;
}

// ── Hook State ──────────────────────────────────────────────────────────────

export interface CampaignState {
  step: CampaignStep;
  ids: Partial<CampaignIds>;
  error: string | null;
  isLoading: boolean;
}
