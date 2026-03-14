'use client';

import { Suspense, useEffect, useState } from 'react';
import {
  ChevronDown,
  TrendingDown,
  DollarSign,
  Clock,
  Eye,
  Users,
  Check,
  Star,
  ArrowRight,
  Loader2,
  Shield,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface FunnelData {
  landingPage: {
    headline: string;
    subheadline: string;
    sections: Array<{ type: string; content: any }>;
    cta: string;
  };
  leadForm: {
    fields: Array<{
      name: string;
      type: string;
      label: string;
      placeholder: string;
      required: boolean;
      options?: string[];
    }>;
    submitButtonText: string;
    successMessage: string;
  };
  bookingCalendar: {
    provider: string;
    url: string;
    meetingDuration: number;
  };
  crmIntegration: {
    provider: string;
    pipeline: string;
    stages: string[];
  };
  reasoning?: string;
  confidence?: number;
}

// ─── Pain Point Icons ────────────────────────────────────────────────────────

const PAIN_ICONS: Record<string, any> = {
  'chart-down': TrendingDown,
  'money-burn': DollarSign,
  'clock': Clock,
  'blind': Eye,
  'bottleneck': Users,
};

function getPainIcon(iconName: string) {
  return PAIN_ICONS[iconName] || TrendingDown;
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function FunnelPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>}>
      <FunnelPage />
    </Suspense>
  );
}

function FunnelPage() {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    fetchLatestFunnel();
  }, []);

  async function fetchLatestFunnel() {
    try {
      // Fetch the latest funnel-builder agent run from the DB
      const res = await apiFetch('/api/agents/funnel-builder/runs');
      const runs = await res.json();

      // Find the latest successful run
      const latestRun = Array.isArray(runs)
        ? runs.find((r: any) => r.status === 'done' && r.outputsJson)
        : null;

      if (!latestRun) {
        setError('No funnel has been built yet. Run the Funnel Builder agent first.');
        setLoading(false);
        return;
      }

      const output = typeof latestRun.outputsJson === 'string'
        ? JSON.parse(latestRun.outputsJson)
        : latestRun.outputsJson;

      setFunnelData(output.data || output);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Failed to load funnel data');
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        utmSource: searchParams.get('utm_source') || undefined,
        utmMedium: searchParams.get('utm_medium') || undefined,
        utmCampaign: searchParams.get('utm_campaign') || undefined,
      };

      const res = await fetch('/api/webhooks/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.success) {
        setSubmitted(true);
        setTimeout(() => {
          router.push('/funnel/thank-you');
        }, 1500);
      } else {
        alert(result.error || 'Something went wrong');
      }
    } catch {
      alert('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (error || !funnelData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-red-400 text-lg">{error}</p>
          <a href="/leados" className="text-blue-400 hover:text-blue-300 underline">
            Go to LeadOS Dashboard
          </a>
        </div>
      </div>
    );
  }

  const sections = funnelData.landingPage?.sections || [];
  const heroSection = sections.find((s) => s.type === 'hero')?.content;
  const painSection = sections.find((s) => s.type === 'painPoints')?.content;
  const solutionSection = sections.find((s) => s.type === 'solution')?.content;
  const socialProofSection = sections.find((s) => s.type === 'socialProof')?.content;
  const pricingSection = sections.find((s) => s.type === 'pricing')?.content;
  const faqSection = sections.find((s) => s.type === 'faq')?.content;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* ─── Navbar ────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-lg">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">
              {heroSection?.headline?.split(' ').slice(0, 3).join(' ') || 'LeadFlow'}
            </span>
          </div>
          <a
            href="#lead-form"
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {heroSection?.cta || funnelData.landingPage.cta || 'Get Started'}
          </a>
        </div>
      </nav>

      {/* ─── Hero ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-zinc-950 to-zinc-950" />
        <div className="relative max-w-5xl mx-auto px-4 py-24 text-center space-y-6">
          {heroSection?.guaranteeBadge && (
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-sm font-medium">
              <Shield className="w-4 h-4" />
              {heroSection.guaranteeBadge}
            </div>
          )}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white leading-tight">
            {heroSection?.headline || funnelData.landingPage.headline}
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto">
            {heroSection?.subheadline || funnelData.landingPage.subheadline}
          </p>
          <a
            href="#lead-form"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
          >
            {heroSection?.cta || funnelData.landingPage.cta}
            <ArrowRight className="w-5 h-5" />
          </a>
          {heroSection?.socialProofBar && (
            <p className="text-sm text-zinc-500 pt-4">{heroSection.socialProofBar}</p>
          )}
        </div>
      </section>

      {/* ─── Pain Points ─────────────────────────────────────────── */}
      {painSection && (
        <section className="max-w-5xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            {painSection.sectionTitle}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {painSection.points?.map((point: any, i: number) => {
              const Icon = getPainIcon(point.icon);
              return (
                <div
                  key={i}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-3 hover:border-zinc-700 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{point.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{point.description}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Solution ────────────────────────────────────────────── */}
      {solutionSection && (
        <section className="bg-zinc-900/50 border-y border-zinc-800">
          <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-8">
            <h2 className="text-3xl font-bold text-white">{solutionSection.sectionTitle}</h2>
            <p className="text-xl text-blue-400 font-semibold">
              {solutionSection.transformationPromise}
            </p>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              {solutionSection.features?.map((feature: any, i: number) => {
                const text = typeof feature === 'string' ? feature : (feature?.title || feature?.body || JSON.stringify(feature));
                return (
                  <div key={i} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-zinc-300 text-sm">{text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── Social Proof ────────────────────────────────────────── */}
      {socialProofSection && (
        <section className="max-w-5xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            {socialProofSection.sectionTitle}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {socialProofSection.testimonials?.map((t: any, i: number) => (
              <div
                key={i}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4"
              >
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-zinc-300 text-sm italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{t.name}</p>
                    <p className="text-zinc-500 text-xs">{t.title}</p>
                  </div>
                  {t.metric && (
                    <span className="text-emerald-400 text-sm font-semibold bg-emerald-500/10 px-2 py-1 rounded">
                      {t.metric}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Pricing ─────────────────────────────────────────────── */}
      {pricingSection && (
        <section className="bg-zinc-900/50 border-y border-zinc-800">
          <div className="max-w-5xl mx-auto px-4 py-20">
            <h2 className="text-3xl font-bold text-center text-white mb-4">
              {pricingSection.sectionTitle}
            </h2>
            {pricingSection.guarantee && (
              <p className="text-center text-emerald-400 text-sm font-medium mb-12">
                <Shield className="w-4 h-4 inline mr-1" />
                {pricingSection.guarantee}
              </p>
            )}
            <div className="grid md:grid-cols-3 gap-6">
              {pricingSection.tiers?.map((tier: any, i: number) => (
                <div
                  key={i}
                  className={`relative bg-zinc-900 border rounded-xl p-6 space-y-6 ${
                    tier.highlight
                      ? 'border-blue-500 ring-1 ring-blue-500/20'
                      : 'border-zinc-800'
                  }`}
                >
                  {tier.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      {tier.badge}
                    </span>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                    <p className="text-3xl font-bold text-white mt-2">{tier.price}</p>
                  </div>
                  <ul className="space-y-2">
                    {tier.features?.map((f: any, j: number) => {
                      const featureText = typeof f === 'string' ? f : (f?.title || f?.body || JSON.stringify(f));
                      return (
                        <li key={j} className="flex items-start gap-2 text-sm text-zinc-400">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          {featureText}
                        </li>
                      );
                    })}
                  </ul>
                  <a
                    href="#lead-form"
                    className={`block text-center py-3 rounded-lg font-medium text-sm transition-colors ${
                      tier.highlight
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {tier.cta || 'Get Started'}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── FAQ ──────────────────────────────────────────────────── */}
      {faqSection && (
        <section className="max-w-3xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            {faqSection.sectionTitle}
          </h2>
          <div className="space-y-4">
            {faqSection.questions?.map((faq: any, i: number) => (
              <details
                key={i}
                className="group bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between p-5 cursor-pointer text-white font-medium hover:bg-zinc-800/50 transition-colors">
                  {typeof faq.q === 'string' ? faq.q : (faq.q?.title || JSON.stringify(faq.q))}
                  <ChevronDown className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="px-5 pb-5 text-zinc-400 text-sm leading-relaxed">
                  {typeof faq.a === 'string' ? faq.a : (faq.a?.body || faq.a?.title || JSON.stringify(faq.a))}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* ─── Lead Capture Form ────────────────────────────────────── */}
      <section id="lead-form" className="bg-zinc-900/50 border-y border-zinc-800">
        <div className="max-w-xl mx-auto px-4 py-20">
          <h2 className="text-3xl font-bold text-center text-white mb-3">
            Ready to Transform Your Pipeline?
          </h2>
          <p className="text-center text-zinc-400 mb-10">
            Fill out the form below and we&apos;ll prepare your custom growth plan.
          </p>

          {submitted ? (
            <div className="text-center space-y-4 py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-emerald-400" />
              </div>
              <p className="text-emerald-400 font-semibold text-lg">
                {funnelData.leadForm?.successMessage || 'Thanks! Redirecting...'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {funnelData.leadForm?.fields?.map((field) => (
                <div key={field.name} className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">
                    {field.label}
                    {field.required && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      required={field.required}
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">{field.placeholder}</option>
                      {field.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'phone' ? 'tel' : field.type}
                      required={field.required}
                      placeholder={field.placeholder}
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white py-4 rounded-lg font-semibold text-lg transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>

              <p className="text-center text-zinc-500 text-xs">
                No commitment. Your data is secure and never shared.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────── */}
      <footer className="max-w-5xl mx-auto px-4 py-8 text-center text-zinc-600 text-sm">
        Powered by LeadOS — The Service Acquisition Machine
      </footer>
    </div>
  );
}
