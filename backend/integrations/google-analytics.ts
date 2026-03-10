// Google Analytics 4 Data API client for traffic and conversion reports
// Docs: https://developers.google.com/analytics/devguides/reporting/data/v1

import { getAccessToken, isGoogleOAuthAvailable } from './google-oauth';

const GA4_BASE = 'https://analyticsdata.googleapis.com/v1beta';

function getPropertyId(): string | null {
  return process.env.GA4_PROPERTY_ID || null;
}

export interface GA4TrafficRow {
  source: string;
  medium: string;
  sessions: number;
  conversions: number;
  totalUsers: number;
  bounceRate: number;
  engagementRate: number;
}

export interface GA4ConversionRow {
  eventName: string;
  campaignName: string;
  eventCount: number;
  eventValue: number;
}

export interface GA4PageRow {
  pagePath: string;
  pageViews: number;
  engagementRate: number;
  avgSessionDuration: number;
}

async function ga4Fetch(body: Record<string, any>): Promise<any> {
  const propertyId = getPropertyId();
  if (!propertyId) throw new Error('GA4_PROPERTY_ID not configured');

  const accessToken = await getAccessToken();

  const res = await fetch(`${GA4_BASE}/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 API error ${res.status}: ${text}`);
  }

  return res.json();
}

/** Get traffic report by source/medium for the last 30 days */
export async function getTrafficReport(startDate: string = '30daysAgo', endDate: string = 'today'): Promise<GA4TrafficRow[]> {
  const data = await ga4Fetch({
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: 'sessionSource' },
      { name: 'sessionMedium' },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'conversions' },
      { name: 'totalUsers' },
      { name: 'bounceRate' },
      { name: 'engagementRate' },
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20,
  });

  return (data.rows || []).map((row: any) => ({
    source: row.dimensionValues?.[0]?.value || '(direct)',
    medium: row.dimensionValues?.[1]?.value || '(none)',
    sessions: Number(row.metricValues?.[0]?.value || 0),
    conversions: Number(row.metricValues?.[1]?.value || 0),
    totalUsers: Number(row.metricValues?.[2]?.value || 0),
    bounceRate: Number(row.metricValues?.[3]?.value || 0),
    engagementRate: Number(row.metricValues?.[4]?.value || 0),
  }));
}

/** Get conversion report by event name and campaign */
export async function getConversionReport(startDate: string = '30daysAgo', endDate: string = 'today'): Promise<GA4ConversionRow[]> {
  const data = await ga4Fetch({
    dateRanges: [{ startDate, endDate }],
    dimensions: [
      { name: 'eventName' },
      { name: 'sessionCampaignName' },
    ],
    metrics: [
      { name: 'eventCount' },
      { name: 'eventValue' },
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: {
          values: ['generate_lead', 'purchase', 'meeting_booked', 'qualification_complete', 'form_submit'],
        },
      },
    },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 50,
  });

  return (data.rows || []).map((row: any) => ({
    eventName: row.dimensionValues?.[0]?.value || '',
    campaignName: row.dimensionValues?.[1]?.value || '(organic)',
    eventCount: Number(row.metricValues?.[0]?.value || 0),
    eventValue: Number(row.metricValues?.[1]?.value || 0),
  }));
}

/** Get page performance report */
export async function getPageReport(startDate: string = '30daysAgo', endDate: string = 'today'): Promise<GA4PageRow[]> {
  const data = await ga4Fetch({
    dateRanges: [{ startDate, endDate }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' },
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 20,
  });

  return (data.rows || []).map((row: any) => ({
    pagePath: row.dimensionValues?.[0]?.value || '/',
    pageViews: Number(row.metricValues?.[0]?.value || 0),
    engagementRate: Number(row.metricValues?.[1]?.value || 0),
    avgSessionDuration: Number(row.metricValues?.[2]?.value || 0),
  }));
}

/** Get real-time active users */
export async function getRealTimeUsers(): Promise<number> {
  const propertyId = getPropertyId();
  if (!propertyId) return 0;

  const accessToken = await getAccessToken();
  const res = await fetch(`${GA4_BASE}/properties/${propertyId}:runRealtimeReport`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      metrics: [{ name: 'activeUsers' }],
    }),
  });

  if (!res.ok) return 0;
  const data = await res.json();
  return Number(data.rows?.[0]?.metricValues?.[0]?.value || 0);
}

/** Check if GA4 API is available */
export function isGoogleAnalyticsAvailable(): boolean {
  return isGoogleOAuthAvailable() && !!getPropertyId();
}
