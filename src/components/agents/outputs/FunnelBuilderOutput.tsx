'use client';

import React, { useState } from 'react';
import {
  Globe,
  FileText,
  Calendar,
  Database,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Layers,
  FormInput,
  Zap,
  ArrowRight,
  Copy,
  Check,
  Loader2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LandingPageSection {
  type: string;
  content: any;
}

interface FormField {
  name: string;
  type: string;
  label?: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

interface Automation {
  trigger: string;
  action: string;
}

interface FunnelData {
  landingPage: {
    url: string;
    deployTarget?: string;
    headline: string;
    subheadline: string;
    sections: LandingPageSection[];
    cta: string;
    seoMeta?: { title: string; description: string; ogImage?: string };
  };
  leadForm: {
    fields: FormField[];
    submitButtonText?: string;
    submitAction: string;
    successMessage?: string;
    webhookUrl?: string;
  };
  bookingCalendar: {
    provider: string;
    url: string;
    meetingType?: string;
    meetingDuration: number;
    bufferTime: number;
    availability: string;
    preCallQuestions?: string[];
    confirmationRedirect?: string;
  };
  crmIntegration: {
    provider: string;
    pipeline: string;
    stages: string[];
    contactProperties?: string[];
    lifecycleStages?: string[];
    automations?: Automation[];
  };
  tracking: {
    gtmContainerId: string;
    metaPixelId: string;
    googleAdsConversionId: string;
    events: string[];
    utmParams?: string[];
  };
  pages?: { type: string; name: string; url: string; description?: string }[];
  reasoning: string;
  confidence: number;
}

interface Props {
  data: FunnelData | { data: FunnelData } | any;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function FunnelBuilderOutput({ data }: Props) {
  const funnelData: FunnelData = data?.data || data;

  // Normalize meeting duration to 30 minutes
  if (funnelData?.bookingCalendar) {
    funnelData.bookingCalendar.meetingDuration = 30;
  }

  if (!funnelData || !funnelData.landingPage) {
    return <div className="p-4 text-muted-foreground">No funnel data available</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Status Banner */}
      <div className="p-4 sm:p-6 rounded-xl border-2 bg-green-500/10 border-green-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="text-green-400 shrink-0">
              <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">Funnel Status</div>
              <div className="text-xl sm:text-2xl font-bold text-green-400">BUILD COMPLETE</div>
              <div className="text-xs sm:text-sm text-muted-foreground">All infrastructure ready for deployment</div>
            </div>
          </div>
          <div className="text-left sm:text-right pl-9 sm:pl-0">
            <div className="text-xs text-muted-foreground mb-0.5">Confidence</div>
            <div className="text-2xl sm:text-3xl font-bold">{funnelData.confidence || data?.confidence || 0}%</div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <QuickStat
          icon={<Layers className="w-4 h-4" />}
          label="Pages"
          value={String(funnelData.pages?.length || funnelData.landingPage.sections?.length || 0)}
        />
        <QuickStat
          icon={<FormInput className="w-4 h-4" />}
          label="Form Fields"
          value={String(funnelData.leadForm?.fields?.length || 0)}
        />
        <QuickStat
          icon={<Database className="w-4 h-4" />}
          label="CRM Stages"
          value={String(funnelData.crmIntegration?.stages?.length || 0)}
        />
        <QuickStat
          icon={<BarChart3 className="w-4 h-4" />}
          label="Events Tracked"
          value={String(funnelData.tracking?.events?.length || 0)}
        />
      </div>

      {/* Landing Page Sections */}
      <CollapsibleSection
        icon={<FileText className="w-4 h-4 text-orange-400" />}
        title="Landing Page Copy"
        subtitle={funnelData.landingPage.headline}
        defaultOpen
      >
        <div className="space-y-3">
          {/* Landing Page Link — uses deployed URL (Vercel/Netlify) */}
          {(() => {
            const landingPage = funnelData.pages?.find(p => p.type === 'landing');
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
            const funnelUrl = `${baseUrl}/funnel`;
            return (
              <a
                href={funnelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 sm:p-4 bg-blue-500/5 rounded-lg border border-blue-500/20 hover:bg-blue-500/10 hover:border-blue-500/30 cursor-pointer transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{landingPage?.name || 'Landing Page'}</div>
                  <div className="text-xs text-muted-foreground truncate">{funnelUrl}</div>
                  {landingPage?.description && (
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{landingPage.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-blue-400 font-medium hidden sm:inline group-hover:underline">View Landing Page</span>
                  <ExternalLink className="w-4 h-4 text-blue-400" />
                </div>
              </a>
            );
          })()}

          {/* Hero Preview */}
          <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg border border-blue-500/20">
            <div className="text-xs uppercase tracking-wider text-blue-400 mb-1">Hero Headline</div>
            <div className="text-base sm:text-lg font-bold mb-1 break-words">{funnelData.landingPage.headline}</div>
            <div className="text-xs sm:text-sm text-muted-foreground break-words">{funnelData.landingPage.subheadline}</div>
            <div className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm rounded-lg font-medium">
              {funnelData.landingPage.cta}
            </div>
          </div>

          {/* SEO Meta */}
          {funnelData.landingPage.seoMeta && (
            <div className="p-2.5 sm:p-3 bg-muted/20 rounded-lg border border-border/50">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">SEO Meta</div>
              <div className="text-sm font-medium break-words">{funnelData.landingPage.seoMeta.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5 break-words">{funnelData.landingPage.seoMeta.description}</div>
            </div>
          )}

          {/* Section Breakdown */}
          {funnelData.landingPage.sections?.map((section, idx) => (
            <LandingPageSectionCard key={idx} section={section} index={idx} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Lead Form */}
      <LeadCaptureForm fields={funnelData.leadForm.fields} />

      {/* Booking Calendar — Strategy Call */}
      <CollapsibleSection
        icon={<Calendar className="w-4 h-4 text-purple-400" />}
        title="Strategy Call Booking"
        subtitle={`${funnelData.bookingCalendar.meetingDuration}min · ${funnelData.bookingCalendar.provider}`}
      >
        <div className="space-y-3">
          {/* Book a Call CTA — links directly to Calendly */}
          <a
            href={funnelData.bookingCalendar.url || 'https://calendly.com/codervibe60/30min'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 sm:p-4 bg-gradient-to-r from-purple-500/5 to-blue-500/5 rounded-lg border border-purple-500/20 hover:from-purple-500/10 hover:to-blue-500/10 hover:border-purple-500/30 cursor-pointer transition-all group"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">
                {funnelData.bookingCalendar.meetingType || 'Strategy Call'}
              </div>
              <div className="text-xs text-muted-foreground">
                {funnelData.bookingCalendar.meetingDuration} min · Free · No commitment
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-purple-400 font-medium hidden sm:inline group-hover:underline">Book Now</span>
              <ExternalLink className="w-4 h-4 text-purple-400" />
            </div>
          </a>

          {/* Call Details Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <InfoCard label="Provider" value={funnelData.bookingCalendar.provider} />
            <InfoCard label="Duration" value={`${funnelData.bookingCalendar.meetingDuration} minutes`} />
            <InfoCard label="Buffer Time" value={`${funnelData.bookingCalendar.bufferTime} min between calls`} />
            <InfoCard label="Availability" value={funnelData.bookingCalendar.availability} />
          </div>

          {/* Calendly / Provider URL */}
          {funnelData.bookingCalendar.url && (
            <div className="p-2.5 bg-purple-500/5 rounded-lg border border-purple-500/20">
              <div className="text-xs text-muted-foreground mb-1">Calendar Provider URL</div>
              <div className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <a
                  href={funnelData.bookingCalendar.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm text-purple-300 hover:text-purple-200 truncate transition-colors"
                >
                  {funnelData.bookingCalendar.url}
                </a>
              </div>
            </div>
          )}

          {/* Confirmation Redirect */}
          {funnelData.bookingCalendar.confirmationRedirect && (
            <div className="p-2.5 bg-muted/10 rounded-lg border border-border/50">
              <div className="text-xs text-muted-foreground mb-1">After Booking Redirect</div>
              <div className="text-xs sm:text-sm break-words">{funnelData.bookingCalendar.confirmationRedirect}</div>
            </div>
          )}

          {/* Pre-Call Questions */}
          {funnelData.bookingCalendar.preCallQuestions && funnelData.bookingCalendar.preCallQuestions.length > 0 && (
            <div className="p-2.5 sm:p-3 bg-muted/10 rounded-lg border border-border/50">
              <div className="text-xs text-muted-foreground mb-2">What We&apos;ll Cover on the Call</div>
              <ul className="space-y-1.5">
                {funnelData.bookingCalendar.preCallQuestions.map((q, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                    <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* CRM Integration */}
      <CollapsibleSection
        icon={<Database className="w-4 h-4 text-cyan-400" />}
        title="CRM Integration"
        subtitle={`${funnelData.crmIntegration.provider} — ${funnelData.crmIntegration.stages?.length || 0} stages`}
      >
        <div className="space-y-3">
          <div className="p-2.5 bg-muted/10 rounded-lg border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Pipeline</div>
            <div className="text-sm font-medium break-words">{funnelData.crmIntegration.pipeline}</div>
          </div>

          {/* Pipeline Stages Visual */}
          <div className="p-3 sm:p-4 bg-muted/20 rounded-lg border border-border/50">
            <div className="text-xs text-muted-foreground mb-2">Deal Stages</div>
            <div className="flex flex-wrap gap-1.5">
              {funnelData.crmIntegration.stages?.map((stage, idx) => (
                <React.Fragment key={idx}>
                  <span className={`text-xs px-2.5 py-1 rounded-full border ${
                    stage.includes('Won') ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                    stage.includes('Lost') ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                    'bg-muted/30 text-foreground border-border/50'
                  }`}>
                    {stage}
                  </span>
                  {idx < (funnelData.crmIntegration.stages?.length || 0) - 1 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground self-center shrink-0 hidden sm:block" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Contact Properties */}
          {funnelData.crmIntegration.contactProperties && funnelData.crmIntegration.contactProperties.length > 0 && (
            <div className="p-2.5 bg-muted/10 rounded-lg border border-border/50">
              <div className="text-xs text-muted-foreground mb-1.5">Custom Contact Properties</div>
              <div className="flex flex-wrap gap-1">
                {funnelData.crmIntegration.contactProperties.map((prop, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    {prop}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Automations */}
          {funnelData.crmIntegration.automations && funnelData.crmIntegration.automations.length > 0 && (
            <div className="p-2.5 bg-muted/10 rounded-lg border border-border/50">
              <div className="text-xs text-muted-foreground mb-1.5">Automations</div>
              <div className="space-y-1.5">
                {funnelData.crmIntegration.automations.map((auto, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <Zap className="w-3 h-3 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-yellow-400">{auto.trigger}</span>
                      <span className="text-muted-foreground"> → </span>
                      <span>{auto.action}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Tracking & Analytics */}
      <CollapsibleSection
        icon={<BarChart3 className="w-4 h-4 text-yellow-400" />}
        title="Tracking & Analytics"
        subtitle={`${funnelData.tracking.events?.length || 0} events configured`}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <TrackingTag label="GTM" value={funnelData.tracking.gtmContainerId} color="blue" />
            <TrackingTag label="Meta Pixel" value={funnelData.tracking.metaPixelId} color="indigo" />
            <TrackingTag label="Google Ads" value={funnelData.tracking.googleAdsConversionId} color="green" />
          </div>

          <div className="p-2.5 bg-muted/10 rounded-lg border border-border/50">
            <div className="text-xs text-muted-foreground mb-1.5">Conversion Events</div>
            <div className="flex flex-wrap gap-1">
              {funnelData.tracking.events?.map((event, idx) => (
                <span key={idx} className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-mono">
                  {event}
                </span>
              ))}
            </div>
          </div>

          {funnelData.tracking.utmParams && funnelData.tracking.utmParams.length > 0 && (
            <div className="p-2.5 bg-muted/10 rounded-lg border border-border/50">
              <div className="text-xs text-muted-foreground mb-1.5">UTM Parameters</div>
              <div className="flex flex-wrap gap-1">
                {funnelData.tracking.utmParams.map((param, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 rounded bg-muted/30 text-muted-foreground font-mono">
                    {param}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Reasoning */}
      <div className="p-3 sm:p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
        <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-blue-400">Build Reasoning</span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed break-words">
          {funnelData.reasoning || data?.reasoning || ''}
        </p>
      </div>
    </div>
  );
}

// ─── Sub-Components ─────────────────────────────────────────────────────────

function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-2.5 sm:p-3 bg-muted/20 rounded-lg border border-border text-center">
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-lg sm:text-xl font-bold">{value}</div>
    </div>
  );
}

function LeadCaptureForm({ fields }: { fields: FormField[] }) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/webhooks/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (res.ok && result.success) {
        setSubmitted(true);
      } else {
        setError(result.error || 'Failed to submit. Please try again.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="p-3 sm:p-4 bg-muted/30 flex items-center gap-2">
        <FormInput className="w-4 h-4 text-green-400 shrink-0" />
        <span className="font-medium text-sm sm:text-base">Lead Capture Form</span>
        <span className="text-xs text-muted-foreground ml-auto">{fields?.length || 0} fields</span>
      </div>
      <div className="p-3 sm:p-4">
        {submitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6 text-green-400" />
            </div>
            <p className="text-green-400 font-semibold">Lead added successfully!</p>
            <p className="text-xs text-muted-foreground">The lead has been added to your CRM table.</p>
            <button
              onClick={() => { setSubmitted(false); setFormData({}); }}
              className="text-xs text-blue-400 hover:text-blue-300 underline"
            >
              Submit another lead
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {fields?.map((field, idx) => (
              <div key={idx}>
                <label className="text-sm font-medium mb-1 block">
                  {field.label || field.name}
                  {field.required && <span className="text-red-400 ml-1">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    required={field.required}
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="w-full bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/30"
                  >
                    <option value="">{field.placeholder || `Select ${field.label || field.name}`}</option>
                    {field.options?.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    required={field.required}
                    placeholder={field.placeholder || ''}
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    rows={3}
                    className="w-full bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/30"
                  />
                ) : (
                  <input
                    type={field.type === 'phone' ? 'tel' : field.type === 'email' ? 'email' : 'text'}
                    required={field.required}
                    placeholder={field.placeholder || ''}
                    value={formData[field.name] || ''}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    className="w-full bg-muted/30 border border-border/50 rounded-lg px-3 py-2 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/30"
                  />
                )}
              </div>
            ))}

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-green-600/50 text-white py-2.5 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function CollapsibleSection({
  icon,
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 sm:p-4 bg-muted/30 flex items-center gap-2 hover:bg-muted/40 transition-colors text-left"
      >
        {icon}
        <span className="font-medium text-sm sm:text-base flex-1">{title}</span>
        {subtitle && (
          <span className="text-xs text-muted-foreground mr-2 hidden sm:inline">{subtitle}</span>
        )}
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {isOpen && <div className="p-3 sm:p-4">{children}</div>}
    </div>
  );
}

function LandingPageSectionCard({ section, index }: { section: LandingPageSection; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const content = section.content;

  const sectionLabels: Record<string, { label: string; color: string }> = {
    hero: { label: 'Hero', color: 'text-blue-400' },
    painPoints: { label: 'Pain Points', color: 'text-red-400' },
    solution: { label: 'Solution', color: 'text-green-400' },
    socialProof: { label: 'Social Proof', color: 'text-yellow-400' },
    pricing: { label: 'Pricing', color: 'text-purple-400' },
    faq: { label: 'FAQ', color: 'text-orange-400' },
    cta: { label: 'CTA', color: 'text-cyan-400' },
  };

  const config = sectionLabels[section.type] || { label: section.type, color: 'text-muted-foreground' };

  const getSummary = (): string => {
    if (typeof content === 'string') return content.substring(0, 80);
    if (content?.sectionTitle) return content.sectionTitle;
    if (content?.headline) return content.headline;
    return section.type;
  };

  return (
    <div className="bg-muted/10 rounded-lg border border-border/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-2.5 flex items-center gap-2 hover:bg-muted/20 transition-colors text-left"
      >
        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${config.color} bg-muted/30`}>
          {index + 1}
        </span>
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        <span className="text-xs text-muted-foreground flex-1 truncate">{getSummary()}</span>
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="p-2.5 border-t border-border/30">
          {renderSectionContent(section.type, content)}
        </div>
      )}
    </div>
  );
}

function renderSectionContent(type: string, content: any): React.ReactNode {
  if (typeof content === 'string') {
    return <p className="text-xs sm:text-sm text-muted-foreground">{content}</p>;
  }

  switch (type) {
    case 'hero':
      return (
        <div className="space-y-2">
          <div className="text-sm font-bold">{content.headline}</div>
          <div className="text-xs text-muted-foreground">{content.subheadline}</div>
          {content.cta && <div className="text-xs text-blue-400">{content.cta}</div>}
          {content.ctaSubtext && <div className="text-xs text-muted-foreground italic">{content.ctaSubtext}</div>}
          {content.socialProofBar && <div className="text-xs text-yellow-400/70 mt-1">{content.socialProofBar}</div>}
        </div>
      );

    case 'painPoints':
      return (
        <div className="space-y-1.5">
          {content.points?.map((point: any, i: number) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-red-400 shrink-0 font-bold">{i + 1}.</span>
              <div>
                <span className="font-medium">{point.title}</span>
                {point.description && <span className="text-muted-foreground"> — {point.description}</span>}
              </div>
            </div>
          ))}
        </div>
      );

    case 'solution':
      return (
        <div className="space-y-2">
          <div className="text-xs sm:text-sm font-medium text-green-400">{content.transformationPromise}</div>
          <div className="text-xs text-muted-foreground">{content.uniqueMechanism}</div>
          {content.features?.map((f: string, i: number) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      );

    case 'socialProof':
      return (
        <div className="space-y-2">
          {content.testimonials?.map((t: any, i: number) => (
            <div key={i} className="p-2 bg-muted/20 rounded-lg border border-border/30">
              <div className="text-xs italic text-muted-foreground">"{t.quote}"</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-medium">{t.name}, {t.title}</span>
                {t.metric && <span className="text-xs text-green-400 font-bold">{t.metric}</span>}
              </div>
            </div>
          ))}
          {content.logos && (
            <div className="flex flex-wrap gap-1 mt-1">
              {content.logos.map((logo: string, i: number) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-muted/20 rounded text-muted-foreground">{logo}</span>
              ))}
            </div>
          )}
        </div>
      );

    case 'pricing':
      return (
        <div className="space-y-2">
          {content.tiers?.map((tier: any, i: number) => (
            <div key={i} className={`p-2.5 rounded-lg border ${tier.highlight ? 'border-purple-500/30 bg-purple-500/5' : 'border-border/50 bg-muted/10'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold">{tier.name}</span>
                <span className="text-sm text-purple-400 font-bold">{tier.price}</span>
                {tier.badge && <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400">{tier.badge}</span>}
              </div>
              <div className="flex flex-wrap gap-1">
                {tier.features?.map((f: string, fi: number) => (
                  <span key={fi} className="text-xs text-muted-foreground">
                    {fi > 0 && ' · '}{f}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {content.guarantee && (
            <div className="text-xs text-green-400 font-medium mt-1">{content.guarantee}</div>
          )}
        </div>
      );

    case 'faq':
      return (
        <div className="space-y-1.5">
          {content.questions?.map((qa: any, i: number) => (
            <div key={i} className="text-xs">
              <div className="font-medium">{qa.q}</div>
              <div className="text-muted-foreground mt-0.5">{qa.a}</div>
            </div>
          ))}
        </div>
      );

    case 'cta':
      return (
        <div className="space-y-1">
          <div className="text-sm font-bold">{content.headline}</div>
          <div className="text-xs text-muted-foreground">{content.subheadline}</div>
          {content.ctaButton && <div className="text-xs text-blue-400 font-medium mt-1">{content.ctaButton}</div>}
          {content.ctaSubtext && <div className="text-xs text-muted-foreground italic">{content.ctaSubtext}</div>}
        </div>
      );

    default:
      return (
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto">
          {JSON.stringify(content, null, 2)}
        </pre>
      );
  }
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 bg-muted/20 rounded-lg border border-border/50">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="text-xs sm:text-sm font-medium break-words">{value}</div>
    </div>
  );
}

function TrackingTag({ label, value, color }: { label: string; value: string; color: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className={`p-2.5 bg-${color}-500/5 rounded-lg border border-${color}-500/20`}>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="flex items-center gap-1.5">
        <code className="text-xs font-mono flex-1 truncate">{value}</code>
        <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground shrink-0">
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>
    </div>
  );
}

export default FunnelBuilderOutput;
