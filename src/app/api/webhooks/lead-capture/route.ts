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
    const monthlyMarketingBudget = body.monthlyMarketingBudget || body.monthly_marketing_budget || body.budget || body.monthlyBudget || findField(body, /budget/i) || '';
    const currentMonthlyLeads = body.currentMonthlyLeads || body.current_monthly_leads || body.monthlyLeads || body.leadVolume || findField(body, /lead.*(volume|count|month)/i) || '';
    const annualRevenue = body.annualRevenue || body.annual_revenue || body.arr || body.currentAnnualRevenue || body.revenue || findField(body, /revenue|arr/i) || '';
    const role = body.role || body.yourRole || body.jobTitle || body.job_title || findField(body, /role|title|position/i) || '';
    const challenge = body.challenge || body.pipelineChallenge || body.biggestChallenge || body.primaryChallenge || findField(body, /challenge|problem|pain|struggle/i) || '';
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
      where: { email: workEmail, ...(userId ? { userId } : {}) },
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
        score: calculateLeadScore(body, { monthlyMarketingBudget, currentMonthlyLeads, annualRevenue, role, challenge }),
        segment: getSegment(monthlyMarketingBudget, annualRevenue),
        utmSource: utmSource || null,
        utmMedium: utmMedium || null,
        utmCampaign: utmCampaign || null,
        pipelineId: pipelineId || null,
        ...(userId && { userId }),
        notes: buildNotes({ monthlyMarketingBudget, currentMonthlyLeads, annualRevenue, role, challenge }),
        enrichmentData: JSON.stringify({
          monthlyMarketingBudget,
          currentMonthlyLeads,
          annualRevenue,
          role,
          challenge,
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

/** Score lead based on all available form fields (LLM-generated forms vary) */
function calculateLeadScore(
  rawBody: Record<string, any>,
  extracted: { monthlyMarketingBudget?: string; currentMonthlyLeads?: string; annualRevenue?: string; role?: string; challenge?: string },
): number {
  let score = 20; // base score for filling out a form

  // ── Budget scoring ─────────────────────────────────────────────
  score += matchTier(extracted.monthlyMarketingBudget, [
    [/under.*5k|<.*5/i, 10],
    [/5k.*10k|5,?000.*10/i, 25],
    [/10k.*25k|10,?000.*25/i, 40],
    [/25k.*50k|25,?000.*50/i, 55],
    [/50k|\$50|over.*50|100k|above/i, 70],
  ]);

  // ── Current lead volume scoring ────────────────────────────────
  score += matchTier(extracted.currentMonthlyLeads, [
    [/^0|none|0.*50|under.*50|fewer/i, 5],
    [/50.*200|100.*200/i, 10],
    [/200.*500|300|400/i, 8],
    [/500\+|500.*1|1,?000|over.*500/i, 3],
  ]);

  // ── ARR scoring (maps revenue to lead quality) ─────────────────
  score += matchTier(extracted.annualRevenue, [
    [/pre.*revenue|<.*1m|under.*1m|0.*1m|startup|early/i, 5],
    [/1m.*5m|1,?000,?000.*5|1M.*5M/i, 15],
    [/5m.*10m|5,?000,?000.*10|5M.*10M/i, 25],
    [/10m.*50m|10,?000,?000.*50|10M.*50M/i, 35],
    [/50m|100m|\$50M|over.*50m|above.*50m/i, 45],
  ]);

  // ── Role scoring (decision-makers score higher) ────────────────
  score += matchTier(extracted.role, [
    [/ceo|founder|owner|president|coo|managing.*director/i, 20],
    [/cmo|cro|vp.*market|vp.*sale|vp.*growth|head.*of/i, 18],
    [/director|head/i, 15],
    [/manager|lead|senior/i, 10],
    [/coordinator|specialist|analyst|associate/i, 5],
  ]);

  // ── Challenge scoring (high-intent challenges score more) ──────
  score += matchTier(extracted.challenge, [
    [/not.*enough.*lead|need.*more.*lead|lead.*gen|pipeline.*empty|no.*pipeline/i, 15],
    [/convert|conversion|close.*rate|closing/i, 12],
    [/cost.*per.*lead|cpl|expensive.*lead|roi|roas/i, 12],
    [/scale|scaling|growth|grow/i, 10],
    [/quality|unqualified|bad.*lead/i, 10],
    [/attribution|tracking|analytics/i, 5],
  ]);

  return Math.min(score, 100);
}

/** Match a value against tiered regex patterns, return first match score */
function matchTier(value: string | undefined, tiers: [RegExp, number][]): number {
  if (!value) return 0;
  for (const [pattern, points] of tiers) {
    if (pattern.test(value)) return points;
  }
  return 0;
}

/** Segment leads by budget or ARR tier */
function getSegment(budget?: string, annualRevenue?: string): string {
  const val = budget || annualRevenue || '';
  if (!val) return 'unknown';
  if (/50k\+|50K|25k.*50k|50m|100m|10m.*50m|enterprise/i.test(val)) return 'enterprise';
  if (/10k.*25k|5m.*10m|1m.*5m|growth|mid/i.test(val)) return 'growth';
  return 'starter';
}

/** Build notes string from all available form fields */
function buildNotes(fields: Record<string, string | undefined>): string {
  const parts: string[] = [];
  if (fields.monthlyMarketingBudget) parts.push(`Budget: ${fields.monthlyMarketingBudget}`);
  if (fields.annualRevenue) parts.push(`ARR: ${fields.annualRevenue}`);
  if (fields.role) parts.push(`Role: ${fields.role}`);
  if (fields.challenge) parts.push(`Challenge: ${fields.challenge}`);
  if (fields.currentMonthlyLeads) parts.push(`Current leads: ${fields.currentMonthlyLeads}`);
  return parts.length > 0 ? parts.join(', ') : 'N/A';
}

/** Find the first body field whose key matches a pattern (for LLM-generated form field names) */
function findField(body: Record<string, any>, pattern: RegExp): string | undefined {
  const skipKeys = new Set(['firstName', 'first_name', 'lastName', 'last_name', 'fullName', 'name', 'email', 'workEmail', 'work_email', 'businessEmail', 'company', 'companyName', 'company_name', 'organization', 'phone', 'phoneNumber', 'phone_number', 'mobile', 'utmSource', 'utm_source', 'utmMedium', 'utm_medium', 'utmCampaign', 'utm_campaign', 'pipelineId', 'pipeline_id']);
  for (const [key, value] of Object.entries(body)) {
    if (skipKeys.has(key)) continue;
    if (pattern.test(key) && typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
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
