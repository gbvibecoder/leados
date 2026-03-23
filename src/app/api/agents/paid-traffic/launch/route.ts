import { NextResponse } from 'next/server';
import * as googleAds from '@backend/integrations/google-ads';
import * as metaAds from '@backend/integrations/meta-ads';

export const maxDuration = 120;

/**
 * POST /api/agents/paid-traffic/launch
 *
 * Launches approved ad campaigns on Google Ads and Meta Ads.
 * Called after the user reviews and approves the campaign plan.
 *
 * Body: { campaignPlan: <the cleanOutput from paid-traffic agent> }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const plan = body.campaignPlan;

  if (!plan) {
    return NextResponse.json({ error: 'Missing campaign plan' }, { status: 400 });
  }

  const landingUrl = plan._landingUrl || 'https://leados.com';
  const results: any = {
    google: { launched: false },
    meta: { launched: false },
  };

  // ── Launch Google Ads ──
  if (googleAds.isGoogleAdsAvailable() && plan.googleAds) {
    try {
      const dailyBudget = plan.googleAds.dailyBudget || 100;
      const campaign = await googleAds.createCampaign({
        name: plan.googleAds.campaignName || 'LeadOS Google Campaign',
        dailyBudgetMicros: dailyBudget * 1_000_000,
      });

      results.google = {
        launched: true,
        campaignId: campaign.campaignId,
        budgetId: campaign.budgetId,
        status: 'ENABLED',
        adGroups: [],
      };

      const adGroups = plan.googleAds.adGroups || [];

      // Negative keywords + ad groups in parallel
      const negativePromise = plan.googleAds.negativeKeywords?.length > 0
        ? googleAds.addNegativeKeywords({
            campaignResourceName: campaign.campaignResourceName,
            keywords: plan.googleAds.negativeKeywords,
          }).catch(() => {})
        : Promise.resolve();

      const adGroupPromises = adGroups.map(async (ag: any) => {
        try {
          const agResult = await googleAds.createAdGroup({
            campaignResourceName: campaign.campaignResourceName,
            name: ag.name,
          });

          const agKeywords = (ag.keywords || []).map((kw: string) => ({ text: kw, matchType: 'PHRASE' as const }));
          const exactKeywords = (ag.keywords || []).map((kw: string) => ({ text: kw, matchType: 'EXACT' as const }));

          await Promise.all([
            agKeywords.length > 0
              ? googleAds.addKeywords({ adGroupResourceName: agResult.adGroupResourceName, keywords: [...agKeywords, ...exactKeywords] })
              : Promise.resolve(),
            ag.adCopy
              ? googleAds.createResponsiveSearchAd({
                  adGroupResourceName: agResult.adGroupResourceName,
                  headlines: ag.adCopy.headlines || [],
                  descriptions: ag.adCopy.descriptions || [],
                  finalUrl: landingUrl,
                })
              : Promise.resolve(),
          ]);

          results.google.adGroups.push({
            name: ag.name,
            adGroupId: agResult.adGroupId,
            keywordsCount: agKeywords.length + exactKeywords.length,
            status: 'ENABLED',
          });
        } catch (err: any) {
          console.error(`[launch] Google ad group failed: ${ag.name}`, err.message);
        }
      });

      await Promise.all([negativePromise, ...adGroupPromises]);
    } catch (err: any) {
      console.error('[launch] Google Ads campaign creation failed:', err.message);
      results.google.error = err.message;
    }
  }

  // ── Launch Meta Ads ──
  if (metaAds.isMetaAdsAvailable() && plan.metaAds) {
    try {
      const campaign = await metaAds.createCampaign({
        name: plan.metaAds.campaignName || 'LeadOS Meta Campaign',
        objective: 'OUTCOME_LEADS',
        dailyBudget: plan.metaAds.dailyBudget || 50,
        status: 'ACTIVE',
      });

      results.meta = {
        launched: true,
        campaignId: campaign.campaignId,
        status: 'ACTIVE',
        adSets: [],
      };

      const adSets = plan.metaAds.adSets || [];

      await Promise.all(adSets.map(async (adSet: any) => {
        try {
          const adSetResult = await metaAds.createAdSet({
            campaignId: campaign.campaignId,
            name: adSet.name,
            dailyBudget: adSet.dailyBudget || 20,
            targeting: {
              geoLocations: { countries: ['US'] },
              ageMin: 25,
              ageMax: 55,
            },
          });

          const creatives = adSet.creatives || [];
          const adResults = await Promise.all(creatives.map(async (creative: any) => {
            try {
              const adResult = await metaAds.createAd({
                adSetId: adSetResult.adSetId,
                name: creative.name,
                creativeData: {
                  title: creative.hook?.substring(0, 100) || adSet.name,
                  body: creative.hook || `Discover ${plan.metaAds.campaignName}`,
                  linkUrl: landingUrl,
                  callToAction: 'LEARN_MORE',
                },
              });
              return adResult.adId;
            } catch {
              return null;
            }
          }));

          results.meta.adSets.push({
            name: adSet.name,
            adSetId: adSetResult.adSetId,
            adsCount: adResults.filter(Boolean).length,
            status: 'ACTIVE',
          });
        } catch (err: any) {
          console.error(`[launch] Meta ad set failed: ${adSet.name}`, err.message);
        }
      }));
    } catch (err: any) {
      console.error('[launch] Meta Ads campaign creation failed:', err.message);
      results.meta.error = err.message;
    }
  }

  return NextResponse.json({
    success: results.google.launched || results.meta.launched,
    results,
  });
}
