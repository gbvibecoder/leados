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

export type Gender = 0 | 1 | 2; // 0 = All, 1 = Male, 2 = Female

export type Placement =
  | 'facebook_feed'
  | 'facebook_stories'
  | 'facebook_reels'
  | 'instagram_feed'
  | 'instagram_stories'
  | 'instagram_reels'
  | 'instagram_explore'
  | 'audience_network'
  | 'messenger_inbox';

export type BillingEvent = 'IMPRESSIONS' | 'LINK_CLICKS';

export interface CityTarget {
  key: string; // Meta city key (e.g., "2420605")
  name: string; // Display name (e.g., "Mumbai")
  radius: number; // Radius in km
}

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

// ── Ad Creative (one per ad set) ───────────────────────────────────────────

export interface AdCreativeData {
  headline: string;
  body: string;
  callToAction: CallToAction;
  imageUrl?: string; // FAL/DALL-E generated image URL
  audienceLabel?: string; // e.g. "Cold — Developers Germany"
}

// ── Campaign Form Data (from UI) ────────────────────────────────────────────

export interface CampaignFormData {
  campaignName: string;
  objective: CampaignObjective;
  dailyBudget: number; // in paise
  country: string;
  cities: CityTarget[];
  ageMin: number;
  ageMax: number;
  gender: Gender;
  placements: Placement[];
  interests: string; // comma-separated interest keywords
  billingEvent: BillingEvent;
  scheduleStart: string; // ISO date string
  scheduleEnd: string; // ISO date string, empty = no end date
  adHeadline: string;
  adBody: string;
  destinationUrl: string;
  callToAction: CallToAction;
  /** Multiple ad creatives — one per ad set (up to 3) */
  adCreatives?: AdCreativeData[];
}

// ── Hook State ──────────────────────────────────────────────────────────────

export interface CampaignState {
  step: CampaignStep;
  ids: Partial<CampaignIds>;
  error: string | null;
  isLoading: boolean;
}
