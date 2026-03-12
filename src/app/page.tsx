'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap,
  Bot,
  Target,
  TrendingUp,
  Phone,
  BarChart3,
  ArrowRight,
  Sparkles,
  Globe,
  Mail,
  MousePointer,
  ShieldCheck,
  LogIn,
  UserPlus,
} from 'lucide-react';

const AGENTS_PREVIEW = [
  { icon: Target, name: 'Service Research', desc: 'Discovers high-demand opportunities', color: 'text-blue-400' },
  { icon: Sparkles, name: 'Offer Engineering', desc: 'Crafts irresistible offers', color: 'text-purple-400' },
  { icon: ShieldCheck, name: 'Validation', desc: 'GO / NO-GO decision engine', color: 'text-emerald-400' },
  { icon: Globe, name: 'Funnel Builder', desc: 'Builds conversion-optimized pages', color: 'text-cyan-400' },
  { icon: Mail, name: 'Content & Creative', desc: 'Produces all marketing assets', color: 'text-pink-400' },
  { icon: MousePointer, name: 'Paid Traffic', desc: 'Google & Meta ad campaigns', color: 'text-orange-400' },
  { icon: Mail, name: 'Outbound Outreach', desc: 'Cold email & LinkedIn automation', color: 'text-yellow-400' },
  { icon: Bot, name: 'Lead Capture', desc: 'Centralizes & scores all leads', color: 'text-indigo-400' },
  { icon: Phone, name: 'AI Qualification', desc: 'AI voice calls to qualify leads', color: 'text-violet-400' },
  { icon: ArrowRight, name: 'Sales Routing', desc: 'Routes leads to the right path', color: 'text-teal-400' },
  { icon: BarChart3, name: 'Tracking', desc: 'Multi-touch attribution', color: 'text-sky-400' },
  { icon: TrendingUp, name: 'Optimization', desc: 'Continuous performance tuning', color: 'text-rose-400' },
  { icon: ShieldCheck, name: 'CRM Hygiene', desc: 'Clean, deduplicated data', color: 'text-lime-400' },
];

const STATS = [
  { value: '13', label: 'AI Agents' },
  { value: '100%', label: 'Autonomous' },
  { value: '24/7', label: 'Always Running' },
  { value: '<5min', label: 'Pipeline Launch' },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-lg">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-indigo-400" />
            <span className="text-lg font-bold text-white">LeadOS</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
            >
              <LogIn className="h-4 w-4" />
              Log In
            </Link>
            <Link
              href="/signup"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-indigo-500"
            >
              <UserPlus className="h-4 w-4" />
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24 text-center pt-32">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-indigo-600/10 blur-[120px]" />
          <div className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-purple-600/8 blur-[100px]" />
          <div className="absolute left-0 bottom-1/4 h-[300px] w-[300px] rounded-full bg-cyan-600/6 blur-[80px]" />
        </div>

        {/* Grid pattern overlay */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/5 px-4 py-2 text-sm text-indigo-400">
            <Zap className="h-4 w-4" />
            <span>13 Autonomous AI Agents</span>
          </div>

          {/* Title */}
          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl md:text-7xl">
            <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              The Autonomous
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Service Acquisition Machine
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mb-10 max-w-2xl text-lg text-zinc-400 leading-relaxed sm:text-xl">
            LeadOS automates the entire go-to-market lifecycle — from identifying service opportunities
            to qualifying leads via AI voice calls — with minimal human intervention.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="group flex items-center gap-3 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              onClick={() => {
                document.getElementById('agents-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 px-8 py-4 text-base font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
            >
              Explore Agents
            </button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-4 py-5 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-xs text-zinc-500 sm:text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="h-8 w-5 rounded-full border-2 border-zinc-700 flex items-start justify-center p-1">
            <div className="h-2 w-1 rounded-full bg-zinc-500" />
          </div>
        </div>
      </section>

      {/* Pipeline Flow Section */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
            <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              End-to-End Automated Pipeline
            </span>
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-zinc-500">
            From research to revenue — every step is handled by specialized AI agents working in concert.
          </p>

          {/* Flow diagram */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Research', 'Offer', 'Validate', 'Build', 'Content', 'Ads + Outreach', 'Capture', 'Qualify', 'Route', 'Optimize'].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-300">
                  {step}
                </div>
                {i < 9 && <ArrowRight className="h-4 w-4 text-zinc-700 hidden sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agents Grid Section */}
      <section id="agents-section" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
            <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              13 Specialized AI Agents
            </span>
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-zinc-500">
            Each agent owns a distinct domain — research, content, outreach, qualification, and optimization.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {AGENTS_PREVIEW.map((agent, i) => {
              const Icon = agent.icon;
              return (
                <div
                  key={i}
                  className="group rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900/60"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-800/80">
                      <Icon className={`h-4 w-4 ${agent.color}`} />
                    </div>
                    <span className="text-xs font-bold text-zinc-500">Agent {i + 1}</span>
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-zinc-200">{agent.name}</h3>
                  <p className="text-xs text-zinc-500">{agent.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-12 text-center">
          <Zap className="mx-auto mb-4 h-10 w-10 text-indigo-400" />
          <h2 className="mb-4 text-3xl font-bold">Ready to Launch Your Pipeline?</h2>
          <p className="mb-8 text-zinc-400">
            Create your account, configure your agents, and let LeadOS handle the rest.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-3 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              Sign Up Free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-8 py-4 text-base font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
            >
              <LogIn className="h-4 w-4" />
              Log In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-400" />
            <p className="text-sm text-zinc-600">LeadOS — Autonomous Service Lead Generation</p>
          </div>
          <p className="text-xs text-zinc-700">13 Agents. One Pipeline. Zero Manual Work.</p>
        </div>
      </footer>
    </div>
  );
}
