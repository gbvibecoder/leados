'use client';

import { Suspense, useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
  BadgeCheck,
  CheckCircle2,
  Play,
  ArrowUpRight,
  MousePointer2,
  Image as ImageIcon,
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
    seoMeta?: { title: string; description: string };
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

// ─── Hooks ──────────────────────────────────────────────────────────────────

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

/** Generates an AI hero image via Fal AI based on the funnel headline/service. */
function useHeroImage(funnelData: FunnelData | null) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const attempted = useRef(false);

  useEffect(() => {
    if (!funnelData || attempted.current) return;
    attempted.current = true;

    const headline = funnelData.landingPage?.headline || '';
    const subheadline = funnelData.landingPage?.subheadline || '';
    // Build a prompt that captures the service's essence
    const prompt = [
      'Modern premium SaaS product hero image.',
      'Abstract 3D visualization with glowing elements, floating geometric shapes,',
      'holographic UI dashboard mockup, dark background with blue and cyan accents,',
      `representing: ${headline}.`,
      subheadline ? `Context: ${subheadline.slice(0, 80)}.` : '',
      'Ultra-clean, minimal, professional. No text in image.',
      'Style: Futuristic tech, glass morphism, ambient lighting, depth of field.',
    ].filter(Boolean).join(' ').slice(0, 990);

    setLoading(true);
    fetch('/api/ads/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, width: 1024, height: 1024, style: 'digital_illustration' }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.imageUrl) setImageUrl(data.imageUrl);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [funnelData]);

  return { imageUrl, loading };
}

/** Animated number counter */
function AnimatedCounter({ target, duration = 2000, suffix = '' }: { target: string; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  // Extract numeric part
  const numericMatch = target.match(/[\d,]+/);
  const numericValue = numericMatch ? parseInt(numericMatch[0].replace(/,/g, ''), 10) : 0;
  const prefix = target.slice(0, target.indexOf(numericMatch?.[0] || ''));
  const postfix = numericMatch ? target.slice(target.indexOf(numericMatch[0]) + numericMatch[0].length) : '';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * numericValue));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [numericValue, duration]);

  if (!numericValue) return <span>{target}</span>;

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{postfix}{suffix}
    </span>
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
        className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-7 py-3.5 rounded-full text-sm font-bold shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all hover:scale-105 backdrop-blur-sm border border-white/10"
      >
        <Sparkles className="w-4 h-4" />
        {text}
      </a>
    </div>
  );
}

// ─── Dot Grid Background ────────────────────────────────────────────────────

function DotGridBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
}

// ─── Gradient Orbs ──────────────────────────────────────────────────────────

function GradientOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-blue-500/[0.07] rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute top-1/3 -right-20 w-[500px] h-[500px] bg-purple-500/[0.05] rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      <div className="absolute -bottom-20 left-1/3 w-[400px] h-[400px] bg-cyan-500/[0.06] rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function FunnelPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-6 h-6 text-blue-400" />
            </div>
          </div>
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

  // AI hero image
  const { imageUrl: heroImage, loading: heroImageLoading } = useHeroImage(funnelData);

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

  // Floating CTA + section tracking
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
      <div className="min-h-screen bg-[#030014] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-7 h-7 text-blue-400" />
            </div>
          </div>
          <p className="text-gray-500 text-sm">Preparing your experience...</p>
          <div className="flex gap-1.5 mt-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-blue-500/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !funnelData) {
    return (
      <div className="min-h-screen bg-[#030014] flex items-center justify-center px-4">
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
  const getSection = (type: string) => sections.find((s) => s.type === type)?.content;

  const heroSection = getSection('hero');

  const socialProofBar = getSection('socialProofBar');
  const problemSection = getSection('problem') || getSection('painPoints');
  const solutionSection = getSection('solution');
  const whatsIncluded = getSection('whatsIncluded');
  const comparisonTable = getSection('comparisonTable');
  const testimonialSection = getSection('testimonials') || getSection('socialProof');
  const mediaFeatures = getSection('mediaFeatures');
  const pricingSection = getSection('pricing');
  const faqSection = getSection('faq');
  const trustSignals = getSection('trustSignals');
  const finalCtaSection = getSection('finalCta') || getSection('cta');
  const ctaText = heroSection?.cta || funnelData.landingPage.cta || 'Get Started';

  return (
    <div className="min-h-screen bg-[#030014] text-gray-100 overflow-x-hidden">
      <FloatingCTA text={ctaText} visible={showFloatingCTA} />
      <DotGridBg />

      {/* Announcement bar removed for cleaner hero experience */}

      {/* ─── Navbar (glassmorphism) ──────────────────────────────── */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.04] bg-[#030014]/70 backdrop-blur-2xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight hidden sm:block">
              {(() => {
                const seoTitle = funnelData.landingPage.seoMeta?.title || '';
                const beforeDash = seoTitle.split(/\s*[—–-]\s*/)[0]?.trim();
                if (beforeDash && beforeDash.length <= 30) return beforeDash;
                const pipeline = funnelData.crmIntegration?.pipeline || '';
                const pipelineBrand = pipeline.split(/\s*[—–-]\s*/)[0]?.trim();
                if (pipelineBrand && pipelineBrand.length <= 30) return pipelineBrand;
                return 'LeadOS';
              })()}
            </span>
          </div>
          {/* Nav Links — right aligned */}
          <div className="hidden md:flex items-center gap-1">
            {[
              { label: 'How It Works', href: '#solution' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'Testimonials', href: '#testimonials' },
              { label: 'FAQ', href: '#faq' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/[0.04]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* ─── Hero (Split Layout with AI Image) ─────────────────── */}
      <section ref={heroRef} className="relative overflow-hidden">
        <GradientOrbs />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-transparent to-[#030014]" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-20 sm:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <div className="space-y-8 text-center lg:text-left">
              {heroSection?.guaranteeBadge && (
                <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium animate-fade-in">
                  <Shield className="w-4 h-4" />
                  {(() => {
                    const badge = heroSection.guaranteeBadge;
                    // Keep badge short — extract core promise (max ~8 words)
                    if (badge.length <= 50) return badge;
                    // Try to find a short phrase like "Performance Guarantee" or "Money-Back Guarantee"
                    const guaranteeMatch = badge.match(/(\w[\w\s-]*guarantee)/i);
                    if (guaranteeMatch) return guaranteeMatch[1].trim();
                    // Fallback: first sentence or first 6 words
                    const firstPart = badge.split(/[.!:—]/)[0]?.trim() || badge;
                    const words = firstPart.split(/\s+/);
                    return words.length > 8 ? words.slice(0, 6).join(' ') + '...' : firstPart;
                  })()}
                </div>
              )}

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] animate-fade-in-up">
                {(() => {
                  const raw = heroSection?.headline || funnelData.landingPage.headline || '';
                  const firstSentence = raw.split(/[.!?—]/)[0]?.trim() || raw;
                  const words = firstSentence.split(/\s+/);
                  return words.length > 12 ? words.slice(0, 10).join(' ') : firstSentence;
                })()}
              </h1>

              <p className="text-lg sm:text-xl text-gray-400 leading-relaxed animate-fade-in-up max-w-xl mx-auto lg:mx-0" style={{ animationDelay: '0.1s' }}>
                {heroSection?.subheadline || funnelData.landingPage.subheadline}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                <a
                  href="#lead-form"
                  className="group relative inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-base sm:text-lg font-bold transition-all hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1 border border-white/10 whitespace-nowrap"
                >
                  <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/20 to-cyan-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center gap-2">
                    {ctaText}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform shrink-0" />
                  </span>
                </a>
                {funnelData.bookingCalendar?.url && (
                  <a
                    href={funnelData.bookingCalendar.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl text-base sm:text-lg font-medium transition-all border border-white/[0.06] hover:border-cyan-500/20 hover:bg-white/[0.02] whitespace-nowrap"
                  >
                    <Play className="w-5 h-5 shrink-0" />
                    Book a Call
                  </a>
                )}
              </div>

              {/* Trust badges */}
              {heroSection?.ctaSubtext && (
                <p className="text-sm text-gray-500 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                  {heroSection.ctaSubtext}
                </p>
              )}

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 pt-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
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

            {/* Right: Interactive Hero Visual */}
            <HeroVisual
              heroImage={heroImage}
              heroImageLoading={heroImageLoading}
              stats={heroSection?.stats}
            />
          </div>

          {/* Stats bar (if not shown on image) */}
          {heroSection?.stats && heroSection.stats.length > 3 && (
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 pt-16 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              {heroSection.stats.map((stat: any, i: number) => (
                <div key={i} className="text-center">
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">
                    <AnimatedCounter target={stat.value} />
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <MousePointer2 className="w-4 h-4 text-gray-600 animate-bounce" />
          <div className="w-px h-8 bg-gradient-to-b from-gray-600 to-transparent" />
        </div>
      </section>

      {/* ─── Social Proof Bar (Marquee) ──────────────────────────── */}
      {socialProofBar && <SocialProofBarSection content={socialProofBar} />}

      {/* ─── Problem / Pain Points ────────────────────────────────── */}
      {problemSection && <ProblemSection content={problemSection} />}

      {/* ─── Solution ──────────────────────────────────────────────── */}
      <div id="solution">
        {solutionSection && <SolutionSection content={solutionSection} ctaText={ctaText} />}
      </div>

      {/* ─── What's Included ───────────────────────────────────────── */}
      {whatsIncluded && <WhatsIncludedSection content={whatsIncluded} />}

      {/* ─── Comparison Table ──────────────────────────────────────── */}
      {comparisonTable && <ComparisonTableSection content={comparisonTable} />}

      {/* ─── Testimonials ──────────────────────────────────────────── */}
      <div id="testimonials">
        {testimonialSection && <TestimonialsSection content={testimonialSection} />}
      </div>

      {/* ─── Media / As Seen In ────────────────────────────────────── */}
      {mediaFeatures && <MediaFeaturesSection content={mediaFeatures} />}

      {/* ─── Pricing ───────────────────────────────────────────────── */}
      <div id="pricing">
        {pricingSection && <PricingSection content={pricingSection} />}
      </div>

      {/* ─── FAQ ───────────────────────────────────────────────────── */}
      <div id="faq">
        {faqSection && <FAQSection content={faqSection} />}
      </div>

      {/* ─── Trust Signals ─────────────────────────────────────────── */}
      {trustSignals && <TrustSignalsSection content={trustSignals} />}

      {/* ─── Final CTA ─────────────────────────────────────────────── */}
      {finalCtaSection && <FinalCTASection content={finalCtaSection} />}

      {/* ─── Lead Capture Form ─────────────────────────────────────── */}
      <section id="lead-form" className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#030014] via-blue-950/10 to-[#030014]" />
        <GradientOrbs />
        <div className="relative max-w-lg mx-auto px-4 sm:px-6 py-24">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-pulse-slow">
              <Sparkles className="w-4 h-4" />
              Limited Spots Available
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Ready to Get Started?
            </h2>
            <p className="text-gray-400 text-lg">
              Fill out the form below and get your custom growth plan.
            </p>
          </div>

          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/30 ring-1 ring-white/[0.05]">
            {submitted ? (
              <div className="text-center space-y-4 py-8">
                <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto animate-scale-in ring-2 ring-emerald-500/20">
                  <Check className="w-10 h-10 text-emerald-400" />
                </div>
                <p className="text-emerald-400 font-bold text-xl">
                  {funnelData.leadForm?.successMessage || 'Thank you!'}
                </p>
                <p className="text-gray-500 text-sm">Redirecting you to the next step...</p>
                <div className="w-32 h-1 bg-white/5 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full animate-progress" />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {formFields.map((field, idx) => (
                  <div key={field.name} className="space-y-1.5 animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                      {field.label}
                      {field.required && <span className="text-red-400">*</span>}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        required={field.required}
                        value={formData[field.name] || ''}
                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all hover:border-cyan-500/20 hover:bg-white/[0.06]"
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
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all hover:border-cyan-500/20 hover:bg-white/[0.06]"
                      />
                    )}
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={submitting}
                  className="group w-full relative bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-blue-600/50 disabled:to-cyan-600/50 text-white py-4 rounded-xl font-bold text-lg transition-all hover:shadow-xl hover:shadow-blue-500/25 hover:-translate-y-0.5 flex items-center justify-center gap-2 border border-white/10"
                >
                  <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400/20 to-cyan-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative flex items-center gap-2">
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        {funnelData.leadForm?.submitButtonText || 'Get Started Now'}
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </button>

                <div className="flex items-center justify-center gap-4 pt-2">
                  {[
                    { icon: Shield, text: '256-bit SSL' },
                    { icon: Check, text: 'No spam, ever' },
                    { icon: Clock, text: '2-min setup' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-gray-500 text-xs">
                      <item.icon className="w-3.5 h-3.5" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ─── Footer ──────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] bg-black/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/10">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-gray-400 text-sm font-medium">Powered by LeadOS</span>
                <p className="text-gray-600 text-xs">AI-Driven Growth Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {funnelData.bookingCalendar?.url && (
                <a
                  href={funnelData.bookingCalendar.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-cyan-400 text-sm transition-colors flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Contact
                </a>
              )}
              <p className="text-gray-600 text-xs">&copy; {new Date().getFullYear()} All rights reserved.</p>
            </div>
          </div>
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
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out both; }
        .animate-fade-in-up { animation: fade-in-up 0.7s ease-out both; }
        .animate-scale-in { animation: scale-in 0.5s ease-out both; }
        .animate-progress { animation: progress 1.8s ease-in-out both; }
        .animate-reveal-up { animation: reveal-up 0.6s ease-out both; }
        .animate-shimmer { animation: shimmer 3s ease-in-out infinite; }
        .animate-marquee { animation: marquee 30s linear infinite; }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease-in-out infinite;
        }

        @keyframes grow-up {
          from { transform: scaleY(0); opacity: 0; }
          to { transform: scaleY(1); opacity: 1; }
        }
        .animate-grow-up {
          animation: grow-up 0.6s ease-out both;
          transform-origin: bottom;
        }

        @keyframes orbit {
          0% { transform: translate(0, 0) scale(1); opacity: 0.4; }
          25% { transform: translate(30px, -20px) scale(1.2); opacity: 0.8; }
          50% { transform: translate(60px, 0) scale(1); opacity: 0.4; }
          75% { transform: translate(30px, 20px) scale(0.8); opacity: 0.6; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
        }
        .animate-orbit { animation: orbit 8s ease-in-out infinite; }

        /* Smooth scroll */
        html { scroll-behavior: smooth; }

        /* Custom scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #030014; }
        ::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.5); }
      `}</style>
    </div>
  );
}

// ─── Interactive Hero Visual ────────────────────────────────────────────────

function HeroVisual({
  heroImage,
  heroImageLoading,
  stats,
}: {
  heroImage: string | null;
  heroImageLoading: boolean;
  stats?: any[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setMouse({ x, y });
  }, []);

  const tiltStyle = isHovered
    ? { transform: `perspective(1000px) rotateY(${mouse.x * 5}deg) rotateX(${-mouse.y * 5}deg)` }
    : { transform: 'perspective(1000px) rotateY(0deg) rotateX(0deg)' };

  return (
    <div
      ref={containerRef}
      className="relative animate-fade-in-up hidden lg:block"
      style={{ animationDelay: '0.3s' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setMouse({ x: 0, y: 0 }); }}
    >
      <div className="relative max-w-xl mx-auto">
        {/* Ambient glow */}
        <div className="absolute -inset-8 bg-gradient-to-br from-blue-500/15 via-cyan-500/10 to-purple-500/15 rounded-[40px] blur-3xl animate-pulse-slow" />

        {/* Main card with 3D tilt */}
        <div
          className="relative rounded-3xl overflow-hidden border border-white/[0.08] bg-gradient-to-br from-[#0a0a1a] via-[#0d1025] to-[#0a0a1a] shadow-2xl shadow-black/50 transition-transform duration-300 ease-out"
          style={tiltStyle}
        >
          {/* AI Image as background */}
          {heroImage && (
            <img
              src={heroImage}
              alt="AI-generated product visualization"
              className="w-full h-auto object-contain animate-fade-in"
              loading="eager"
            />
          )}

          {/* Loading state */}
          {!heroImage && heroImageLoading && (
            <div className="w-full aspect-square flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-blue-950/40 to-purple-950/40">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                <ImageIcon className="absolute inset-0 m-auto w-6 h-6 text-blue-400/60" />
              </div>
              <p className="text-gray-400 text-sm font-medium">Generating AI Visual...</p>
            </div>
          )}

          {/* Fallback interactive dashboard mockup */}
          {!heroImage && !heroImageLoading && (
            <div className="w-full aspect-[4/3] bg-gradient-to-br from-[#0a0a1a] via-[#0d1025] to-[#0a0a1a] p-6 relative overflow-hidden">
              {/* Grid background */}
              <div className="absolute inset-0 opacity-[0.04]" style={{
                backgroundImage: 'linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />

              {/* Mock dashboard header */}
              <div className="relative flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 bg-white/[0.04] rounded-lg h-6 mx-4 flex items-center px-3">
                  <span className="text-[10px] text-gray-600 font-mono">app.pipelineos.com/dashboard</span>
                </div>
              </div>

              {/* Mock dashboard content */}
              <div className="relative grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Leads', value: '2,847', change: '+23%', color: 'from-blue-500/20 to-cyan-500/10', accent: 'text-cyan-400' },
                  { label: 'Qualified', value: '1,204', change: '+18%', color: 'from-emerald-500/20 to-green-500/10', accent: 'text-emerald-400' },
                  { label: 'Booked', value: '342', change: '+31%', color: 'from-purple-500/20 to-violet-500/10', accent: 'text-purple-400' },
                ].map((card, i) => (
                  <div key={i} className={`bg-gradient-to-br ${card.color} rounded-xl p-3 border border-white/[0.06] animate-fade-in-up`} style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
                    <div className="text-[10px] text-gray-500 mb-1">{card.label}</div>
                    <div className="text-lg font-bold text-white">{card.value}</div>
                    <div className={`text-[10px] font-semibold ${card.accent}`}>{card.change}</div>
                  </div>
                ))}
              </div>

              {/* Mock chart */}
              <div className="relative bg-white/[0.02] rounded-xl border border-white/[0.05] p-3 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-400 font-medium">Pipeline Growth</span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full">Live</span>
                </div>
                <div className="flex items-end gap-1.5 h-20">
                  {[35, 45, 30, 55, 65, 50, 75, 85, 70, 90, 80, 95].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-sm animate-grow-up" style={{
                      height: `${h}%`,
                      background: `linear-gradient(to top, rgba(59,130,246,0.6), rgba(6,182,212,0.3))`,
                      animationDelay: `${0.8 + i * 0.05}s`,
                    }} />
                  ))}
                </div>
              </div>

              {/* Mock pipeline stages */}
              <div className="flex items-center gap-1.5">
                {['New Lead', 'Qualified', 'Meeting', 'Proposal', 'Closed'].map((_stage, i) => (
                  <div key={i} className="flex-1 flex items-center gap-1 animate-fade-in" style={{ animationDelay: `${1.2 + i * 0.1}s` }}>
                    <div className={cn(
                      'h-1.5 flex-1 rounded-full',
                      i < 3 ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-white/[0.06]'
                    )} />
                    {i < 4 && <ArrowRight className="w-2.5 h-2.5 text-gray-700 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats overlay at bottom */}
          {stats && stats.length > 0 && (
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-6 py-5">
              <div className="flex items-center justify-around">
                {stats.slice(0, 3).map((stat: any, i: number) => (
                  <div key={i} className="text-center">
                    <div className="text-xl sm:text-2xl font-extrabold text-white">
                      <AnimatedCounter target={stat.value} />
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floating cards around the main visual */}
        <div
          className="absolute -top-4 -right-4 bg-[#0d1025]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl px-4 py-3 shadow-xl animate-float z-10"
          style={{ transform: isHovered ? `translate(${mouse.x * 8}px, ${mouse.y * 6}px)` : undefined, transition: 'transform 0.3s ease-out' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Status</div>
              <div className="text-xs font-bold text-emerald-400">AI Powered</div>
            </div>
          </div>
        </div>

        <div
          className="absolute -bottom-3 -left-3 bg-[#0d1025]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl px-4 py-3 shadow-xl animate-float z-10"
          style={{ animationDelay: '2s', transform: isHovered ? `translate(${-mouse.x * 10}px, ${-mouse.y * 8}px)` : undefined, transition: 'transform 0.3s ease-out' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/30 to-indigo-500/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="text-[10px] text-gray-500">Pipeline</div>
              <div className="text-xs font-bold text-blue-400">Automated</div>
            </div>
          </div>
        </div>

        <div
          className="absolute top-1/2 -left-6 -translate-y-1/2 bg-[#0d1025]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl px-3 py-2.5 shadow-xl animate-float z-10"
          style={{ animationDelay: '3.5s', transform: isHovered ? `translate(${-mouse.x * 12}px, ${mouse.y * 4}px)` : undefined, transition: 'transform 0.3s ease-out' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-gray-400 font-medium">Live Leads</span>
            <span className="text-xs font-bold text-white">+12</span>
          </div>
        </div>

        {/* Orbiting particles */}
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400/40 animate-orbit"
            style={{
              top: `${20 + i * 15}%`,
              left: `${10 + i * 18}%`,
              animationDelay: `${i * 1.5}s`,
              animationDuration: `${8 + i * 2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Section Components ─────────────────────────────────────────────────────

function SocialProofBarSection({ content }: { content: any }) {
  const logos = content.logos || [];
  const tripled = [...logos, ...logos, ...logos];

  return (
    <section className="border-y border-white/[0.04] bg-white/[0.01] overflow-hidden">
      <div className="py-10">
        {content.label && (
          <p className="text-center text-gray-500 text-xs uppercase tracking-[0.25em] mb-8 font-medium">{content.label}</p>
        )}
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#030014] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#030014] to-transparent z-10" />
          <div className="flex items-center gap-16 animate-marquee whitespace-nowrap">
            {tripled.map((logo: string, i: number) => (
              <span key={i} className="group text-gray-500 text-base sm:text-lg font-bold opacity-40 hover:opacity-100 transition-all duration-500 flex-shrink-0 cursor-default hover:text-cyan-400 hover:scale-110">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemSection({ content }: { content: any }) {
  const { ref, visible } = useScrollReveal();
  const painPoints = content.painPoints || content.points || [];
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <section ref={ref} className="relative max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32">
      <DotGridBg />
      <div className={cn('relative transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            The Problem
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4">
            {content.sectionTitle || 'Sound Familiar?'}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {painPoints.map((point: any, i: number) => {
            const hasEmoji = point.emoji;
            const Icon = !hasEmoji ? getPainIcon(point.icon, i) : null;
            const isHovered = hoveredIdx === i;
            const colors = [
              { bg: 'from-red-500/10 to-red-600/5', border: 'border-red-500/10', hoverBorder: 'hover:border-red-500/30', glow: 'shadow-red-500/10', accent: 'text-red-400', iconBg: 'bg-red-500/15' },
              { bg: 'from-orange-500/10 to-orange-600/5', border: 'border-orange-500/10', hoverBorder: 'hover:border-orange-500/30', glow: 'shadow-orange-500/10', accent: 'text-orange-400', iconBg: 'bg-orange-500/15' },
              { bg: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-500/10', hoverBorder: 'hover:border-amber-500/30', glow: 'shadow-amber-500/10', accent: 'text-amber-400', iconBg: 'bg-amber-500/15' },
              { bg: 'from-rose-500/10 to-rose-600/5', border: 'border-rose-500/10', hoverBorder: 'hover:border-rose-500/30', glow: 'shadow-rose-500/10', accent: 'text-rose-400', iconBg: 'bg-rose-500/15' },
            ];
            const c = colors[i % colors.length];

            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={cn(
                  'group relative bg-gradient-to-br border rounded-2xl p-6 space-y-4 transition-all duration-500 cursor-default backdrop-blur-sm overflow-hidden',
                  c.bg, c.border, c.hoverBorder,
                  isHovered ? `scale-[1.05] -translate-y-3 shadow-2xl ${c.glow}` : 'hover:scale-[1.02] hover:-translate-y-1'
                )}
                style={{ transitionDelay: visible ? `${i * 100}ms` : '0ms' }}
              >
                {/* Animated border glow on hover */}
                <div className={cn('absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500', `bg-gradient-to-br ${c.bg}`)} style={{ filter: 'blur(20px)' }} />

                <div className="relative">
                  <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-2 transition-all duration-300', c.iconBg, isHovered ? 'scale-110' : '')}>
                    <span className="text-3xl">
                      {hasEmoji ? point.emoji : (Icon && <Icon className={cn('w-7 h-7', c.accent)} />)}
                    </span>
                  </div>
                  <h3 className={cn('text-base font-bold text-white transition-colors', isHovered ? c.accent.replace('text-', 'text-') : '')}>{point.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mt-2">{point.description}</p>
                </div>

                {/* Number indicator */}
                <div className="absolute top-4 right-4 text-[64px] font-black opacity-[0.03] group-hover:opacity-[0.08] transition-opacity leading-none">
                  {i + 1}
                </div>
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
  const steps = content.steps || content.features || [];
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#030014] via-blue-950/10 to-[#030014]" />
      <DotGridBg />
      <div className={cn('relative max-w-5xl mx-auto px-4 sm:px-6 py-24 sm:py-32 transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            The Solution
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4">{content.sectionTitle || 'How It Works'}</h2>
          <p className="text-gray-400 text-lg mt-4 max-w-2xl mx-auto">{content.transformationPromise || ''}</p>
        </div>

        <div className="relative max-w-3xl mx-auto">
          {/* Animated progress line */}
          <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-white/[0.04] hidden sm:block">
            <div
              className="w-full bg-gradient-to-b from-emerald-500 via-cyan-500 to-transparent rounded-full transition-all duration-1000"
              style={{ height: activeStep !== null ? `${((activeStep + 1) / steps.length) * 100}%` : visible ? '100%' : '0%' }}
            />
          </div>

          <div className="space-y-4">
            {steps.map((step: any, i: number) => {
              const text = typeof step === 'string' ? step : step.title;
              const desc = typeof step === 'string' ? '' : step.description;
              const icon = step.icon || step.emoji;
              const stepNum = step.stepNumber || i + 1;
              const isActive = activeStep === i;

              return (
                <div
                  key={i}
                  onMouseEnter={() => setActiveStep(i)}
                  onMouseLeave={() => setActiveStep(null)}
                  className={cn(
                    'group relative flex items-start gap-6 p-5 sm:p-6 rounded-2xl border transition-all duration-500',
                    isActive
                      ? 'bg-emerald-500/[0.06] border-emerald-500/25 shadow-xl shadow-emerald-500/5 -translate-y-1 scale-[1.01]'
                      : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.03]'
                  )}
                  style={{ transitionDelay: visible ? `${i * 80}ms` : '0ms' }}
                >
                  {/* Step number circle with pulse */}
                  <div className="relative shrink-0">
                    {isActive && (
                      <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                    )}
                    <div className={cn(
                      'relative w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-300',
                      isActive
                        ? 'bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border-emerald-500/40 scale-110'
                        : 'bg-gradient-to-br from-emerald-500/15 to-cyan-500/5 border-emerald-500/20'
                    )}>
                      {icon && /\p{Emoji}/u.test(icon) ? (
                        <span className="text-2xl">{icon}</span>
                      ) : (
                        <span className={cn('font-bold text-lg transition-colors', isActive ? 'text-emerald-300' : 'text-emerald-400')}>{stepNum}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5">
                      <h3 className={cn('font-bold text-lg transition-colors', isActive ? 'text-emerald-200' : 'text-white')}>{text}</h3>
                      <ArrowUpRight className={cn('w-4 h-4 transition-all shrink-0', isActive ? 'text-emerald-400 opacity-100 translate-x-0' : 'text-gray-700 opacity-0 -translate-x-2')} />
                    </div>
                    {desc && (
                      <p className={cn('text-sm leading-relaxed transition-colors', isActive ? 'text-gray-300' : 'text-gray-500')}>{desc}</p>
                    )}
                  </div>

                  {/* Step progress badge */}
                  <div className={cn('hidden sm:flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 transition-all', isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/[0.03] text-gray-600')}>
                    Step {stepNum}/{steps.length}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center mt-14">
          <a href="#lead-form" className="group relative inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white px-8 py-4 rounded-2xl text-lg font-bold transition-all hover:shadow-2xl hover:shadow-emerald-500/25 hover:-translate-y-1 border border-white/10 whitespace-nowrap">
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center gap-2">
              {ctaText}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}

function WhatsIncludedSection({ content }: { content: any }) {
  const { ref, visible } = useScrollReveal();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <section ref={ref} className="max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32">
      <div className={cn('transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <CheckCircle2 className="w-4 h-4" />
            What You Get
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4">
            {content.sectionTitle || "Everything You Need"}
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {content.deliverables?.map((item: any, i: number) => {
            const isExpanded = expandedIdx === i;
            const iconColors = [
              'from-cyan-500/25 to-blue-500/15 border-cyan-500/25',
              'from-blue-500/25 to-indigo-500/15 border-blue-500/25',
              'from-violet-500/25 to-purple-500/15 border-violet-500/25',
              'from-emerald-500/25 to-teal-500/15 border-emerald-500/25',
              'from-amber-500/25 to-orange-500/15 border-amber-500/25',
              'from-rose-500/25 to-pink-500/15 border-rose-500/25',
            ];

            return (
              <div
                key={i}
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
                className={cn(
                  'group relative p-6 rounded-2xl border cursor-pointer transition-all duration-500 space-y-4 overflow-hidden',
                  isExpanded
                    ? 'bg-cyan-500/[0.06] border-cyan-500/25 shadow-xl shadow-cyan-500/5 -translate-y-2 scale-[1.02]'
                    : 'bg-white/[0.02] border-white/[0.04] hover:border-cyan-500/15 hover:bg-white/[0.03] hover:-translate-y-1'
                )}
                style={{ transitionDelay: visible ? `${i * 60}ms` : '0ms' }}
              >
                {/* Background number */}
                <div className="absolute -bottom-4 -right-2 text-[80px] font-black opacity-[0.02] group-hover:opacity-[0.06] transition-opacity leading-none select-none">
                  {String(i + 1).padStart(2, '0')}
                </div>

                <div className="relative">
                  <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center border transition-all duration-300', iconColors[i % iconColors.length], isExpanded ? 'scale-110 rotate-3' : 'group-hover:scale-105')}>
                    <Check className="w-6 h-6 text-cyan-400" />
                  </div>
                </div>
                <h3 className={cn('relative text-white font-bold text-base transition-colors', isExpanded ? 'text-cyan-200' : 'group-hover:text-cyan-200')}>{item.title}</h3>
                <p className={cn('relative text-sm leading-relaxed transition-all', isExpanded ? 'text-gray-300' : 'text-gray-500 line-clamp-2')}>{item.description}</p>

                {/* Expand indicator */}
                <div className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors', isExpanded ? 'text-cyan-400' : 'text-gray-600 group-hover:text-gray-400')}>
                  <span>{isExpanded ? 'Collapse' : 'Learn more'}</span>
                  <ChevronDown className={cn('w-3 h-3 transition-transform duration-300', isExpanded ? 'rotate-180' : '')} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ComparisonTableSection({ content }: { content: any }) {
  const { ref, visible } = useScrollReveal();
  const columns = content.columns || ['Us', 'Competitors'];
  const rows = content.rows || [];
  const usScore = rows.filter((r: any) => r.us).length;
  const themScore = rows.filter((r: any) => r.them).length;

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#030014] via-indigo-950/5 to-[#030014]" />
      <div className={cn('relative max-w-3xl mx-auto px-4 sm:px-6 py-24 sm:py-32 transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <BarChart3 className="w-4 h-4" />
            Compare
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4">
            {content.sectionTitle || 'Why Choose Us'}
          </h2>
        </div>

        {/* Score summary */}
        <div className="flex items-center justify-center gap-8 mb-10">
          <div className="text-center">
            <div className="text-3xl font-extrabold text-emerald-400"><AnimatedCounter target={String(usScore)} /></div>
            <div className="text-xs text-gray-500 mt-1">{columns[0]}</div>
          </div>
          <div className="text-gray-600 text-lg font-medium">vs</div>
          <div className="text-center">
            <div className="text-3xl font-extrabold text-gray-500"><AnimatedCounter target={String(themScore)} /></div>
            <div className="text-xs text-gray-500 mt-1">{columns[1]}</div>
          </div>
        </div>

        <div className="bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-3xl overflow-hidden shadow-2xl shadow-black/20">
          <div className="grid grid-cols-[1fr_90px_90px] sm:grid-cols-[1fr_140px_140px] bg-white/[0.04] border-b border-white/[0.06]">
            <div className="p-5 text-sm text-gray-500 font-medium">Feature</div>
            <div className="p-5 text-sm font-bold text-emerald-400 text-center">{columns[0]}</div>
            <div className="p-5 text-sm font-medium text-gray-500 text-center">{columns[1]}</div>
          </div>
          {rows.map((row: any, i: number) => (
            <div
              key={i}
              className={cn(
                'group grid grid-cols-[1fr_90px_90px] sm:grid-cols-[1fr_140px_140px] border-b border-white/[0.03] transition-all duration-300 hover:bg-white/[0.03]',
                i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]'
              )}
              style={{ animationDelay: visible ? `${i * 50}ms` : '0ms' }}
            >
              <div className="p-4 sm:p-5 text-sm text-gray-300 group-hover:text-white transition-colors">{row.feature}</div>
              <div className="p-4 sm:p-5 flex items-center justify-center">
                {row.us ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center ring-1 ring-emerald-500/25 group-hover:ring-emerald-500/40 group-hover:scale-110 transition-all">
                    <Check className="w-4 h-4 text-emerald-400" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center ring-1 ring-red-500/20">
                    <X className="w-4 h-4 text-red-400/60" />
                  </div>
                )}
              </div>
              <div className="p-4 sm:p-5 flex items-center justify-center">
                {row.them ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/15">
                    <Check className="w-4 h-4 text-emerald-400/60" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center ring-1 ring-red-500/20">
                    <X className="w-4 h-4 text-red-400/60" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection({ content }: { content: any }) {
  const { ref, visible } = useScrollReveal();
  const items = content.items || content.testimonials || [];
  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length]);

  return (
    <section ref={ref} className="relative overflow-hidden py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-[#030014] via-amber-950/5 to-[#030014]" />
      <div className={cn('relative max-w-6xl mx-auto px-4 sm:px-6 transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Star className="w-4 h-4 fill-yellow-400" />
            Testimonials
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4">
            {content.sectionTitle || 'What Our Clients Say'}
          </h2>
        </div>

        {/* Featured testimonial with slide effect */}
        {items.length > 0 && (
          <div className="max-w-3xl mx-auto mb-14">
            <div className="relative bg-gradient-to-br from-yellow-500/[0.06] via-orange-500/[0.04] to-transparent border border-yellow-500/15 rounded-3xl p-8 sm:p-10 backdrop-blur-sm">
              {/* Large quote mark */}
              <div className="absolute top-6 left-8 text-7xl text-yellow-500/10 font-serif leading-none select-none">&ldquo;</div>

              {/* Star rating */}
              <div className="flex gap-1 mb-6 relative">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              <div className="relative min-h-[120px]">
                <p className="text-gray-200 text-lg sm:text-xl leading-relaxed italic transition-all duration-500">
                  {items[activeIdx]?.quote}
                </p>
              </div>

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/[0.06]">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500/30 to-orange-500/20 flex items-center justify-center text-white font-bold text-xl ring-2 ring-yellow-500/20">
                    {items[activeIdx]?.name?.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-lg">{items[activeIdx]?.name}</p>
                      {items[activeIdx]?.verified && <BadgeCheck className="w-5 h-5 text-blue-400" />}
                    </div>
                    <p className="text-gray-500 text-sm">{items[activeIdx]?.role}{items[activeIdx]?.company ? ` at ${items[activeIdx]?.company}` : ''}</p>
                  </div>
                </div>
                {items[activeIdx]?.metric && (
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-5 py-2.5 rounded-xl border border-emerald-500/20 text-sm whitespace-nowrap">
                    {items[activeIdx]?.metric}
                  </span>
                )}
              </div>

              {/* Navigation */}
              {items.length > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="flex gap-2">
                    {items.map((_: any, i: number) => (
                      <button
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={cn(
                          'rounded-full transition-all duration-500',
                          i === activeIdx ? 'w-10 h-2.5 bg-gradient-to-r from-yellow-400 to-orange-400' : 'w-2.5 h-2.5 bg-gray-700 hover:bg-gray-500'
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveIdx((activeIdx - 1 + items.length) % items.length)}
                      className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                    >
                      <ArrowRight className="w-4 h-4 text-gray-400 rotate-180" />
                    </button>
                    <button
                      onClick={() => setActiveIdx((activeIdx + 1) % items.length)}
                      className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
                    >
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Testimonial cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((t: any, i: number) => (
            <div
              key={i}
              onClick={() => setActiveIdx(i)}
              className={cn(
                'group cursor-pointer border rounded-2xl p-6 space-y-4 transition-all duration-500 hover:-translate-y-1',
                i === activeIdx
                  ? 'bg-yellow-500/[0.06] border-yellow-500/25 shadow-xl shadow-yellow-500/5 scale-[1.02]'
                  : 'bg-white/[0.02] border-white/[0.04] hover:border-yellow-500/15 hover:bg-white/[0.03]'
              )}
            >
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-gray-300 text-sm italic leading-relaxed line-clamp-3">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center justify-between pt-3 border-t border-white/[0.05]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/10 flex items-center justify-center text-white font-bold text-xs">
                    {t.name?.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-white font-semibold text-sm">{t.name}</p>
                      {t.verified && <BadgeCheck className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    <p className="text-gray-600 text-xs">{t.role}{t.company ? `, ${t.company}` : ''}</p>
                  </div>
                </div>
                {t.metric && (
                  <span className="text-emerald-400 text-[11px] font-bold bg-emerald-500/10 px-2 py-1 rounded-lg whitespace-nowrap">
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

function MediaFeaturesSection({ content }: { content: any }) {
  const { ref, visible } = useScrollReveal();
  const pubs = content.publications || [];
  const doubled = [...pubs, ...pubs];

  return (
    <section ref={ref} className="border-y border-white/[0.04] bg-white/[0.01] overflow-hidden">
      <div className={cn('py-16 transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <p className="text-center text-gray-500 text-xs uppercase tracking-[0.25em] mb-10 font-medium">
          {content.sectionTitle || 'As Seen In'}
        </p>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#030014] to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#030014] to-transparent z-10" />
          <div className="flex items-center gap-16 animate-marquee whitespace-nowrap" style={{ animationDuration: '20s' }}>
            {doubled.map((pub: string, i: number) => (
              <span key={i} className="text-gray-500 text-lg sm:text-xl font-bold opacity-30 hover:opacity-90 hover:text-white transition-all duration-500 flex-shrink-0 cursor-default">
                {pub}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingSection({ content }: { content: any }) {
  const { ref, visible } = useScrollReveal();
  const [hoveredTier, setHoveredTier] = useState<number | null>(null);

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#030014] via-indigo-950/10 to-[#030014]" />
      <GradientOrbs />
      <div className={cn('relative max-w-6xl mx-auto px-4 sm:px-6 py-24 sm:py-32 transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <DollarSign className="w-4 h-4" />
            Pricing
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4">
            {content.sectionTitle || 'Choose Your Plan'}
          </h2>
        </div>

        {content.savings && (
          <div className="text-center mb-4">
            <span className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-5 py-2.5 rounded-full text-sm font-bold animate-pulse-slow">
              <Sparkles className="w-4 h-4" />
              {content.savings}
            </span>
          </div>
        )}
        {content.priceSubtext && (
          <p className="text-center text-gray-500 text-sm mb-6">{content.priceSubtext}</p>
        )}

        {content.guarantee && (
          <p className="text-center text-emerald-400 text-sm font-medium mb-16 flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            {content.guarantee}
          </p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {content.tiers?.map((tier: any, i: number) => {
            const isHovered = hoveredTier === i;
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredTier(i)}
                onMouseLeave={() => setHoveredTier(null)}
                className={cn(
                  'group relative backdrop-blur-sm border rounded-3xl p-8 space-y-6 transition-all duration-500',
                  tier.highlight
                    ? 'border-blue-500/50 shadow-2xl shadow-blue-500/10 ring-1 ring-blue-500/20 bg-gradient-to-b from-blue-500/[0.08] to-transparent scale-[1.02]'
                    : 'border-white/[0.06] bg-white/[0.02]',
                  isHovered && !tier.highlight ? 'border-cyan-500/30 shadow-xl shadow-cyan-500/5 -translate-y-3 scale-[1.02] bg-white/[0.04]' : '',
                  isHovered && tier.highlight ? '-translate-y-3 shadow-3xl shadow-blue-500/15 scale-[1.04]' : ''
                )}
              >
                {tier.badge && (
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold px-5 py-2 rounded-full shadow-lg shadow-blue-500/25 border border-white/10 whitespace-nowrap">
                    {tier.badge}
                  </span>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                  <div className="mt-4 flex items-baseline gap-2">
                    {tier.originalPrice && (
                      <span className="text-lg text-gray-500 line-through">{tier.originalPrice}</span>
                    )}
                    <span className={cn('text-5xl font-extrabold transition-colors', tier.highlight ? 'text-white' : isHovered ? 'text-cyan-200' : 'text-white')}>{tier.price}</span>
                  </div>
                </div>

                <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

                <ul className="space-y-3.5">
                  {tier.features?.map((f: any, j: number) => {
                    const featureText = typeof f === 'string' ? f : (f?.title || f?.body || JSON.stringify(f));
                    return (
                      <li key={j} className="flex items-start gap-3 text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
                        <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-emerald-500/25 transition-colors">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                        {featureText}
                      </li>
                    );
                  })}
                </ul>
                <a
                  href="#lead-form"
                  className={cn(
                    'group/btn relative block text-center py-4 rounded-2xl font-semibold text-sm transition-all hover:-translate-y-0.5 border overflow-hidden',
                    tier.highlight
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/20 border-white/10'
                      : 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 border-white/[0.06]'
                  )}
                >
                  <span className="relative z-10">{tier.cta || 'Get Started'}</span>
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FAQSection({ content }: { content: any }) {
  const { ref, visible } = useScrollReveal();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const questions = content.questions || [];

  return (
    <section ref={ref} className="max-w-3xl mx-auto px-4 sm:px-6 py-24 sm:py-32">
      <div className={cn('transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            FAQ
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mt-4">
            {content.sectionTitle || 'Common Questions'}
          </h2>
          <p className="text-gray-500 mt-4">{questions.length} questions answered</p>
        </div>
        <div className="space-y-3">
          {questions.map((faq: any, i: number) => {
            const isOpen = openIdx === i;
            const question = typeof faq.q === 'string' ? faq.q : (faq.q?.title || JSON.stringify(faq.q));
            const answer = typeof faq.a === 'string' ? faq.a : (faq.a?.body || faq.a?.title || JSON.stringify(faq.a));

            return (
              <div
                key={i}
                className={cn(
                  'border rounded-2xl overflow-hidden transition-all duration-500',
                  isOpen ? 'border-violet-500/30 bg-violet-500/[0.06] shadow-xl shadow-violet-500/5' : 'border-white/[0.04] bg-white/[0.02] hover:border-violet-500/15 hover:bg-white/[0.03]'
                )}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center gap-4 p-5 sm:p-6 text-left group"
                >
                  {/* Number badge */}
                  <span className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300',
                    isOpen ? 'bg-violet-500/25 text-violet-300' : 'bg-white/[0.04] text-gray-600 group-hover:bg-violet-500/10 group-hover:text-violet-400'
                  )}>
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <span className={cn('font-semibold text-sm sm:text-base transition-colors flex-1', isOpen ? 'text-violet-200' : 'text-white group-hover:text-violet-200')}>
                    {question}
                  </span>

                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500',
                    isOpen ? 'bg-violet-500/25 rotate-180' : 'bg-white/[0.05] group-hover:bg-violet-500/10'
                  )}>
                    <ChevronDown className={cn('w-4 h-4 transition-colors', isOpen ? 'text-violet-400' : 'text-gray-500 group-hover:text-violet-400')} />
                  </div>
                </button>
                <div className={cn('grid transition-all duration-500', isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}>
                  <div className="overflow-hidden">
                    <div className="px-5 sm:px-6 pb-6 pl-[4.5rem] text-gray-400 text-sm leading-relaxed">
                      {answer}
                    </div>
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

function TrustSignalsSection({ content }: { content: any }) {
  const { ref, visible } = useScrollReveal();

  return (
    <section ref={ref} className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
      <div className={cn('transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        {content.guarantee && (
          <div className="relative p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-emerald-500/[0.06] via-cyan-500/[0.04] to-transparent border border-emerald-500/15 text-center mb-10 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'radial-gradient(circle, rgba(16,185,129,0.8) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }} />
            <div className="relative">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/20">
                  <Shield className="w-7 h-7 text-emerald-400" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-emerald-400 mb-3">Our Guarantee</h3>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">{content.guarantee}</p>
            </div>
          </div>
        )}

        {content.signals && content.signals.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-4">
            {content.signals.map((signal: any, i: number) => (
              <div key={i} className="group flex items-center gap-2.5 text-gray-400 text-sm bg-white/[0.02] px-5 py-3 rounded-2xl border border-white/[0.04] hover:border-emerald-500/15 hover:bg-white/[0.04] transition-all duration-300 cursor-default">
                <span className="text-xl group-hover:scale-110 transition-transform">{signal.icon}</span>
                <span className="group-hover:text-gray-300 transition-colors">{signal.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FinalCTASection({ content }: { content: any }) {
  const { ref, visible } = useScrollReveal();

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#030014] via-blue-950/15 to-[#030014]" />
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-500/[0.07] rounded-full blur-[120px] animate-pulse-slow" />
      </div>
      <DotGridBg />
      <div className={cn('relative max-w-3xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10')}>
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          {content.headline || 'Ready to Get Started?'}
        </h2>
        <p className="text-lg sm:text-xl text-gray-400 mb-10 max-w-xl mx-auto leading-relaxed">
          {content.subheadline}
        </p>

        {content.urgencyMessage && (
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 px-5 py-2.5 rounded-full text-sm font-medium mb-10 animate-pulse-slow">
            <Sparkles className="w-4 h-4" />
            {content.urgencyMessage}
          </div>
        )}

        <div className="flex flex-col items-center gap-5">
          <a
            href="#lead-form"
            className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-12 py-5 rounded-2xl text-xl font-bold transition-all hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1 border border-white/10"
          >
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400/20 to-cyan-400/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center gap-3">
              {content.ctaButton || 'Get Started Now'}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </span>
          </a>
          {content.ctaSubtext && (
            <p className="text-gray-500 text-sm">{content.ctaSubtext}</p>
          )}
        </div>
      </div>
    </section>
  );
}
