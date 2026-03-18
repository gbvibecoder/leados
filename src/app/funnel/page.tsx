'use client';

import { Suspense, useEffect, useState, useRef, useMemo } from 'react';
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
  Sparkles,
  Phone,
  Zap,
  Target,
  BarChart3,
  X,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

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

// ─── Scroll Reveal Hook ─────────────────────────────────────────────────────

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ─── Animated Counter ───────────────────────────────────────────────────────

function AnimatedCounter({ value, suffix = '' }: { value: string; suffix?: string }) {
  return (
    <span className="tabular-nums font-bold text-white">{value}{suffix}</span>
  );
}

// ─── Pain Point Icons ───────────────────────────────────────────────────────

const PAIN_ICONS: Record<string, any> = {
  'chart-down': TrendingDown,
  'money-burn': DollarSign,
  'clock': Clock,
  'blind': Eye,
  'bottleneck': Users,
  'target': Target,
  'analytics': BarChart3,
  'zap': Zap,
};

function getPainIcon(iconName: string, index: number) {
  if (PAIN_ICONS[iconName]) return PAIN_ICONS[iconName];
  const fallbacks = [TrendingDown, DollarSign, Clock, Eye, Users, Target];
  return fallbacks[index % fallbacks.length];
}

// ─── Floating CTA ───────────────────────────────────────────────────────────

function FloatingCTA({ text, visible }: { text: string; visible: boolean }) {
  return (
    <div className={cn(
      'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-500',
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
    )}>
      <a
        href="#lead-form"
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all hover:scale-105"
      >
        <Sparkles className="w-4 h-4" />
        {text}
      </a>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function FunnelPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020205] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
          <p className="text-gray-500 text-sm animate-pulse">Loading your experience...</p>
        </div>
      </div>
    }>
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
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const heroRef = useRef<HTMLDivElement>(null);

  // Ensure phone field exists
  const formFields = useMemo(() => {
    const fields = [...(funnelData?.leadForm?.fields || [])];
    const hasPhone = fields.some(f =>
      f.type === 'phone' || f.name?.toLowerCase().includes('phone') || f.name?.toLowerCase().includes('mobile')
    );
    if (!hasPhone) {
      const emailIdx = fields.findIndex(f => f.type === 'email' || f.name?.toLowerCase().includes('email'));
      fields.splice(emailIdx >= 0 ? emailIdx + 1 : fields.length, 0, {
        name: 'phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: false,
      });
    }
    return fields;
  }, [funnelData]);

  useEffect(() => {
    fetchLatestFunnel();
  }, []);

  // Show floating CTA after scrolling past hero
  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingCTA(window.scrollY > 600);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function fetchLatestFunnel() {
    try {
      const res = await apiFetch('/api/agents/funnel-builder/runs');
      const runs = await res.json();
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

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = typeof window !== 'undefined' ? localStorage.getItem('leados_token') : null;
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/webhooks/lead-capture', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.success) {
        setSubmitted(true);
        setTimeout(() => {
          router.push('/funnel/thank-you');
        }, 2000);
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
      <div className="min-h-screen bg-[#020205] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <p className="text-gray-500 text-sm">Preparing your experience...</p>
        </div>
      </div>
    );
  }

  if (error || !funnelData) {
    return (
      <div className="min-h-screen bg-[#020205] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <X className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-red-400 text-lg font-medium">{error}</p>
          <a href="/leados" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
            <ArrowRight className="w-4 h-4 rotate-180" />
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
  const ctaText = heroSection?.cta || funnelData.landingPage.cta || 'Get Started';

  return (
    <div className="min-h-screen bg-[#020205] text-gray-100 overflow-x-hidden">
      {/* Floating CTA */}
      <FloatingCTA text={ctaText} visible={showFloatingCTA} />

      {/* ─── Navbar ──────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.03] bg-[#020205]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight hidden sm:block">
              {heroSection?.headline?.split(' ').slice(0, 3).join(' ') || 'LeadFlow'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#lead-form" className="group relative bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5">
              {ctaText}
              <ArrowRight className="w-4 h-4 inline ml-1.5 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </nav>

      {/* ─── Hero ──────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/40 via-indigo-950/20 to-zinc-950" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-28 text-center space-y-8">
          {heroSection?.guaranteeBadge && (
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium animate-fade-in">
              <Shield className="w-4 h-4" />
              {heroSection.guaranteeBadge}
            </div>
          )}

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1] animate-fade-in-up">
            {heroSection?.headline || funnelData.landingPage.headline}
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            {heroSection?.subheadline || funnelData.landingPage.subheadline}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <a
              href="#lead-form"
              className="group relative inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-1"
            >
              {ctaText}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            {funnelData.bookingCalendar?.url && (
              <a
                href={funnelData.bookingCalendar.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white px-6 py-4 rounded-xl text-lg font-medium transition-colors border border-white/[0.04] hover:border-cyan-500/15 hover:bg-[rgba(2,2,5,0.6)]"
              >
                <Phone className="w-5 h-5" />
                Book a Call
              </a>
            )}
          </div>

          {heroSection?.socialProofBar && (
            <p className="text-sm text-gray-500 pt-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              {heroSection.socialProofBar}
            </p>
          )}

          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-8 pt-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            {[
              { icon: Shield, text: 'Money-Back Guarantee' },
              { icon: Clock, text: 'Setup in 48h' },
              { icon: Users, text: 'Trusted by 500+' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm">
                <item.icon className="w-4 h-4 text-gray-600" />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-6 h-6 text-gray-600" />
        </div>
      </section>

      {/* ─── Pain Points ───────────────────────────────────────────── */}
      {painSection && <PainPointsSection content={painSection} />}

      {/* ─── Solution ──────────────────────────────────────────────── */}
      {solutionSection && <SolutionSection content={solutionSection} ctaText={ctaText} />}

      {/* ─── Social Proof ──────────────────────────────────────────── */}
      {socialProofSection && <SocialProofSection content={socialProofSection} />}

      {/* ─── Pricing ───────────────────────────────────────────────── */}
      {pricingSection && <PricingSection content={pricingSection} />}

      {/* ─── FAQ ───────────────────────────────────────────────────── */}
      {faqSection && <FAQSection content={faqSection} />}

      {/* ─── Lead Capture Form ─────────────────────────────────────── */}
      <section id="lead-form" className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-blue-950/10 to-zinc-950" />
        <div className="relative max-w-lg mx-auto px-4 sm:px-6 py-24">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              Limited Spots Available
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Ready to Transform Your Pipeline?
            </h2>
            <p className="text-gray-400 text-lg">
              Fill out the form below and get your custom growth plan.
            </p>
          </div>

          <div className="bg-zinc-900/80 backdrop-blur-sm border border-white/[0.04] rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/20">
            {submitted ? (
              <div className="text-center space-y-4 py-8">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto animate-scale-in">
                  <Check className="w-10 h-10 text-emerald-400" />
                </div>
                <p className="text-emerald-400 font-bold text-xl">
                  {funnelData.leadForm?.successMessage || 'Thank you!'}
                </p>
                <p className="text-gray-500 text-sm">Redirecting you to the next step...</p>
                <div className="w-32 h-1 bg-white/5 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full animate-progress" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {formFields.map((field, idx) => (
                  <div key={field.name} className="space-y-1.5" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                      {field.label}
                      {field.required && <span className="text-red-400">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        className="w-full bg-white/[0.03] border border-white/[0.08]/50 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:border-cyan-500/20"
                      >
                        <option value="" className="bg-zinc-900">{field.placeholder}</option>
                        {field.options?.map((opt) => (
                          <option key={opt} value={opt} className="bg-zinc-900">{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type === 'phone' ? 'tel' : field.type}
                        required={field.required}
                        placeholder={field.placeholder}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        className="w-full bg-white/[0.03] border border-white/[0.08]/50 rounded-xl px-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:border-cyan-500/20"
                      />
                    )}
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-blue-600/50 disabled:to-indigo-600/50 text-white py-4 rounded-xl font-bold text-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      {funnelData.leadForm?.submitButtonText || 'Get Started Now'}
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-4 pt-2">
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <Shield className="w-3.5 h-3.5" />
                    <span>256-bit SSL</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-zinc-700" />
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <Check className="w-3.5 h-3.5" />
                    <span>No spam, ever</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-zinc-700" />
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>2-min setup</span>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.03]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-gray-500 text-sm">Powered by LeadOS</span>
          </div>
          <p className="text-gray-600 text-xs">&copy; {new Date().getFullYear()} All rights reserved.</p>
        </div>
      </footer>

      {/* ─── CSS Animations ──────────────────────────────────────── */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes progress {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out both; }
        .animate-fade-in-up { animation: fade-in-up 0.7s ease-out both; }
        .animate-scale-in { animation: scale-in 0.5s ease-out both; }
        .animate-progress { animation: progress 1.8s ease-in-out both; }
        .animate-reveal-up { animation: reveal-up 0.6s ease-out both; }
      `}</style>
    </div>
  );
}

// ─── Section Components ─────────────────────────────────────────────────────

function PainPointsSection({ content }: { content: any }) {
  const { ref, visible } = useScrollReveal();

  return (
    <section ref={ref} className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
      <div className={cn('transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <div className="text-center mb-14">
          <span className="text-red-400 text-sm font-semibold uppercase tracking-wider">The Problem</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3">
            {content.sectionTitle || 'Sound Familiar?'}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.points?.map((point: any, i: number) => {
            const Icon = getPainIcon(point.icon, i);
            const colors = ['from-red-500/10 to-red-600/5 border-red-500/20', 'from-orange-500/10 to-orange-600/5 border-orange-500/20', 'from-amber-500/10 to-amber-600/5 border-amber-500/20', 'from-rose-500/10 to-rose-600/5 border-rose-500/20', 'from-pink-500/10 to-pink-600/5 border-pink-500/20'];
            const iconColors = ['text-red-400 bg-red-500/10', 'text-orange-400 bg-orange-500/10', 'text-amber-400 bg-amber-500/10', 'text-rose-400 bg-rose-500/10', 'text-pink-400 bg-pink-500/10'];

            return (
              <div
                key={i}
                className={cn(
                  'group bg-gradient-to-br border rounded-2xl p-6 space-y-4 hover:scale-[1.02] transition-all duration-300 cursor-default',
                  colors[i % colors.length]
                )}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', iconColors[i % iconColors.length])}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white group-hover:text-red-300 transition-colors">{point.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{point.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function SolutionSection({ content, ctaText }: { content: any; ctaText: string }) {
  const { ref, visible } = useScrollReveal();

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-blue-950/10 to-zinc-950" />
      <div className={cn('relative max-w-5xl mx-auto px-4 sm:px-6 py-24 transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <div className="text-center mb-14">
          <span className="text-emerald-400 text-sm font-semibold uppercase tracking-wider">The Solution</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3">{content.sectionTitle || 'How We Help'}</h2>
          {content.transformationPromise && (
            <p className="text-xl text-blue-400 font-semibold mt-4 max-w-2xl mx-auto">
              {content.transformationPromise}
            </p>
          )}
        </div>
        <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {content.features?.map((feature: any, i: number) => {
            const text = typeof feature === 'string' ? feature : (feature?.title || feature?.body || JSON.stringify(feature));
            return (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-[rgba(2,2,5,0.6)] border border-white/[0.04]/50 hover:border-emerald-500/20 transition-colors">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-gray-300 text-sm leading-relaxed">{text}</span>
              </div>
            );
          })}
        </div>
        <div className="text-center mt-12">
          <a href="#lead-form" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl text-lg font-bold transition-all hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-1">
            {ctaText}
            <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  );
}

function SocialProofSection({ content }: { content: any }) {
  const { ref, visible } = useScrollReveal();

  return (
    <section ref={ref} className="max-w-6xl mx-auto px-4 sm:px-6 py-24">
      <div className={cn('transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <div className="text-center mb-14">
          <span className="text-yellow-400 text-sm font-semibold uppercase tracking-wider">Social Proof</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3">
            {content.sectionTitle || 'What Our Clients Say'}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.testimonials?.map((t: any, i: number) => (
            <div
              key={i}
              className="group bg-[rgba(2,2,5,0.6)] border border-white/[0.04]/50 rounded-2xl p-6 space-y-4 hover:border-yellow-500/20 hover:bg-zinc-900 transition-all duration-300"
            >
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 text-sm italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.03]">
                <div>
                  <p className="text-white font-semibold text-sm">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.title}</p>
                </div>
                {t.metric && (
                  <span className="text-emerald-400 text-sm font-bold bg-emerald-500/10 px-3 py-1.5 rounded-lg">
                    {t.metric}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection({ content }: { content: any }) {
  const { ref, visible } = useScrollReveal();

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-indigo-950/10 to-zinc-950" />
      <div className={cn('relative max-w-6xl mx-auto px-4 sm:px-6 py-24 transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <div className="text-center mb-4">
          <span className="text-cyan-400 text-sm font-semibold uppercase tracking-wider">Pricing</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3">
            {content.sectionTitle || 'Choose Your Plan'}
          </h2>
        </div>
        {content.guarantee && (
          <p className="text-center text-emerald-400 text-sm font-medium mb-14 flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            {content.guarantee}
          </p>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {content.tiers?.map((tier: any, i: number) => (
            <div
              key={i}
              className={cn(
                'relative bg-zinc-900/80 border rounded-2xl p-7 space-y-6 transition-all duration-300 hover:scale-[1.02]',
                tier.highlight
                  ? 'border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/20'
                  : 'border-white/[0.04] hover:border-cyan-500/15'
              )}
            >
              {tier.badge && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                  {tier.badge}
                </span>
              )}
              <div>
                <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                <p className="text-4xl font-extrabold text-white mt-3">{tier.price}</p>
              </div>
              <ul className="space-y-3">
                {tier.features?.map((f: any, j: number) => {
                  const featureText = typeof f === 'string' ? f : (f?.title || f?.body || JSON.stringify(f));
                  return (
                    <li key={j} className="flex items-start gap-2.5 text-sm text-gray-400">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {featureText}
                    </li>
                  );
                })}
              </ul>
              <a
                href="#lead-form"
                className={cn(
                  'block text-center py-3.5 rounded-xl font-semibold text-sm transition-all hover:-translate-y-0.5',
                  tier.highlight
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-white/5 hover:bg-zinc-700 text-gray-300'
                )}
              >
                {tier.cta || 'Get Started'}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection({ content }: { content: any }) {
  const { ref, visible } = useScrollReveal();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section ref={ref} className="max-w-3xl mx-auto px-4 sm:px-6 py-24">
      <div className={cn('transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <div className="text-center mb-14">
          <span className="text-purple-400 text-sm font-semibold uppercase tracking-wider">FAQ</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3">
            {content.sectionTitle || 'Common Questions'}
          </h2>
        </div>
        <div className="space-y-3">
          {content.questions?.map((faq: any, i: number) => {
            const isOpen = openIdx === i;
            const question = typeof faq.q === 'string' ? faq.q : (faq.q?.title || JSON.stringify(faq.q));
            const answer = typeof faq.a === 'string' ? faq.a : (faq.a?.body || faq.a?.title || JSON.stringify(faq.a));

            return (
              <div
                key={i}
                className={cn(
                  'border rounded-xl overflow-hidden transition-all duration-300',
                  isOpen ? 'border-purple-500/30 bg-purple-500/5' : 'border-white/[0.04] bg-[rgba(2,2,5,0.6)]/50 hover:border-cyan-500/15'
                )}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className={cn('font-semibold text-sm sm:text-base transition-colors', isOpen ? 'text-purple-300' : 'text-white')}>
                    {question}
                  </span>
                  <ChevronDown className={cn('w-5 h-5 shrink-0 ml-4 transition-all duration-300', isOpen ? 'rotate-180 text-purple-400' : 'text-gray-500')} />
                </button>
                <div className={cn('overflow-hidden transition-all duration-300', isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0')}>
                  <div className="px-5 pb-5 text-gray-400 text-sm leading-relaxed">
                    {answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
