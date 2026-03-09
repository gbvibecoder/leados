import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    integrations: [
      { name: 'Anthropic Claude', key: 'anthropic', category: 'AI', status: 'disconnected' },
      { name: 'HubSpot', key: 'hubspot', category: 'CRM', status: 'disconnected' },
      { name: 'GoHighLevel', key: 'ghl', category: 'CRM', status: 'disconnected' },
      { name: 'Instantly', key: 'instantly', category: 'Email Outreach', status: 'disconnected' },
      { name: 'Smartlead', key: 'smartlead', category: 'Email Outreach', status: 'disconnected' },
      { name: 'PhantomBuster', key: 'phantombuster', category: 'LinkedIn', status: 'disconnected' },
      { name: 'Bland.ai', key: 'blandai', category: 'Voice AI', status: 'disconnected' },
      { name: 'VAPI', key: 'vapi', category: 'Voice AI', status: 'disconnected' },
      { name: 'Meta Ads', key: 'meta', category: 'Ads', status: 'disconnected' },
      { name: 'Google Ads', key: 'googleAds', category: 'Ads', status: 'disconnected' },
      { name: 'Apollo.io', key: 'apollo', category: 'Enrichment', status: 'disconnected' },
      { name: 'Clearbit', key: 'clearbit', category: 'Enrichment', status: 'disconnected' },
    ],
  });
}
