import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth';

/**
 * POST /api/webhooks/lead-capture
 * Receives lead form submissions from the rendered funnel landing page.
 * Creates a Lead + Interaction in the database, and optionally pushes to HubSpot.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Flexible field mapping — handle various naming conventions from AI-generated forms
    const firstName = body.firstName || body.first_name || body.fullName?.split(' ')[0] || body.name?.split(' ')[0] || '';
    const lastName = body.lastName || body.last_name || body.fullName?.split(' ').slice(1).join(' ') || body.name?.split(' ').slice(1).join(' ') || '';
    const workEmail = body.workEmail || body.work_email || body.email || body.businessEmail || body.business_email || '';
    const company = body.company || body.companyName || body.company_name || body.organization || '';
    const phone = body.phone || body.phoneNumber || body.phone_number || body.mobile || '';
    const monthlyMarketingBudget = body.monthlyMarketingBudget || body.monthly_marketing_budget || body.budget || body.monthlyBudget || '';
    const currentMonthlyLeads = body.currentMonthlyLeads || body.current_monthly_leads || body.monthlyLeads || body.leadVolume || '';
    const utmSource = body.utmSource || body.utm_source || '';
    const utmMedium = body.utmMedium || body.utm_medium || '';
    const utmCampaign = body.utmCampaign || body.utm_campaign || '';
    const pipelineId = body.pipelineId || body.pipeline_id || '';

    const name = `${firstName} ${lastName}`.trim();

    // Try to get userId from auth token (for logged-in users submitting forms)
    // Also try to get userId from the project if pipelineId is provided
    let userId: string | null = getUserId(req);
    if (!userId && pipelineId) {
      try {
        const pipeline = await prisma.pipeline.findUnique({ where: { id: pipelineId }, select: { userId: true } });
        if (pipeline?.userId) userId = pipeline.userId;
      } catch { /* ignore */ }
    }

    if (!name || !workEmail) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check for duplicate email (scoped to user if authenticated)
    const existingLead = await prisma.lead.findFirst({
      where: { email: workEmail, userId: userId ?? 'no-user' },
    });

    if (existingLead) {
      // Update existing lead with new interaction
      await prisma.interaction.create({
        data: {
          leadId: existingLead.id,
          type: 'form_resubmit',
          content: `Re-submitted funnel form. Budget: ${monthlyMarketingBudget || 'N/A'}`,
          metadata: JSON.stringify(body),
        },
      });

      return NextResponse.json({
        success: true,
        leadId: existingLead.id,
        message: 'Lead already exists — interaction logged',
        redirect: '/funnel/thank-you',
      });
    }

    // Create lead in database
    const lead = await prisma.lead.create({
      data: {
        name,
        email: workEmail,
        company: company || null,
        phone: phone || null,
        source: 'funnel',
        channel: 'landing-page',
        stage: 'new',
        score: calculateLeadScore(monthlyMarketingBudget, currentMonthlyLeads),
        segment: getSegment(monthlyMarketingBudget),
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        pipelineId: pipelineId || null,
        userId: userId || undefined,
        notes: `Budget: ${monthlyMarketingBudget || 'N/A'}, Current leads: ${currentMonthlyLeads || 'N/A'}`,
        enrichmentData: JSON.stringify({
          monthlyMarketingBudget,
          currentMonthlyLeads,
          submittedAt: new Date().toISOString(),
        }),
      },
    });

    // Log the form submission interaction
    await prisma.interaction.create({
      data: {
        leadId: lead.id,
        type: 'form_submit',
        content: `Submitted funnel lead form. Company: ${company || 'N/A'}, Budget: ${monthlyMarketingBudget || 'N/A'}`,
        metadata: JSON.stringify(body),
      },
    });

    // Push to HubSpot if configured
    const hubspotKey = process.env.HUBSPOT_API_KEY;
    if (hubspotKey) {
      pushToHubSpot(hubspotKey, {
        email: workEmail,
        firstname: firstName,
        lastname: lastName,
        company,
        phone,
        monthly_marketing_budget: monthlyMarketingBudget,
        current_monthly_leads: currentMonthlyLeads,
        lead_source: 'LeadOS Funnel',
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      }).catch(() => {
        // Non-blocking — don't fail the request if HubSpot errors
      });
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      redirect: '/funnel/thank-you',
    }, { status: 201 });
  } catch (error: any) {
    console.error('[lead-capture webhook] Error:', error.message);
    return NextResponse.json(
      { error: 'Failed to capture lead' },
      { status: 500 }
    );
  }
}

/** Score lead based on budget and current lead volume */
function calculateLeadScore(budget?: string, currentLeads?: string): number {
  let score = 20; // base score for filling out a form

  const budgetScores: Record<string, number> = {
    'Under $5K': 10,
    '$5K-$10K': 25,
    '$10K-$25K': 40,
    '$25K-$50K': 55,
    '$50K+': 70,
  };

  const leadScores: Record<string, number> = {
    '0-50': 5,
    '50-200': 10,
    '200-500': 8,
    '500+': 3, // already generating lots, may be harder to impress
  };

  if (budget && budgetScores[budget]) score += budgetScores[budget];
  if (currentLeads && leadScores[currentLeads]) score += leadScores[currentLeads];

  return Math.min(score, 100);
}

/** Segment leads by budget tier */
function getSegment(budget?: string): string {
  if (!budget) return 'unknown';
  if (budget === '$50K+' || budget === '$25K-$50K') return 'enterprise';
  if (budget === '$10K-$25K') return 'growth';
  return 'starter';
}

/** Push contact to HubSpot CRM (fire-and-forget) */
async function pushToHubSpot(apiKey: string, properties: Record<string, any>) {
  const cleanProps: Record<string, string> = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value != null && value !== '') {
      cleanProps[key] = String(value);
    }
  }

  await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ properties: cleanProps }),
  });
}
