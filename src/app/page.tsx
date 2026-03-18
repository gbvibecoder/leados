'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Zap, Bot, Target, TrendingUp, Phone, BarChart3, ArrowRight, Sparkles,
  Globe, Mail, MousePointer, ShieldCheck, LogIn, UserPlus, ChevronDown,
  Layers, Crosshair, Network, Activity, Users, DollarSign, Percent,
  Play, Settings2, Search, Megaphone, Eye, Database, GitBranch,
} from 'lucide-react';
import { motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════ */

const AGENTS = [
  { icon: Search,       name: 'Service Research',         alias: 'The Seer',      phase: 'Observation',  status: 'Spectral Focus: Active',    desc: 'Discovers high-demand service niches via Google Trends, Reddit & LinkedIn' },
  { icon: Sparkles,     name: 'Offer Engineering',        alias: 'The Architect', phase: 'Structural',   status: 'Void Integrity: 98%',       desc: 'Crafts irresistible offers with ICP targeting, pricing tiers & guarantees' },
  { icon: ShieldCheck,  name: 'Validation',               alias: 'The Alchemist', phase: 'Synthesis',    status: 'Mutation Ratio: Stable',    desc: 'GO/NO-GO scoring — evaluates demand, competition & monetization potential' },
  { icon: Globe,        name: 'Funnel Builder',           alias: 'The Weaver',    phase: 'Construction', status: 'Web Tension: Optimal',      desc: 'Generates landing pages, forms & tracking setup for lead capture' },
  { icon: Mail,         name: 'Content & Creative',       alias: 'The Muse',      phase: 'Creation',     status: 'Inspiration: Flowing',      desc: 'Produces ad copy, email sequences & UGC scripts per channel' },
  { icon: Megaphone,    name: 'Paid Traffic',             alias: 'The Herald',    phase: 'Broadcast',    status: 'Signal Reach: 12.4 Mpc',   desc: 'Manages Google & Meta campaigns — budgets, bidding & A/B tests' },
  { icon: Mail,         name: 'Outbound Outreach',        alias: 'The Messenger', phase: 'Transmission', status: 'Delivery Rate: 94%',        desc: 'Orchestrates cold email (Instantly/Smartlead) & LinkedIn sequences' },
  { icon: Bot,          name: 'Inbound Capture',          alias: 'The Collector', phase: 'Acquisition',  status: 'Capture Field: Active',     desc: 'Captures form, chat & webhook leads — enriches via Apollo & Clearbit' },
  { icon: Phone,        name: 'AI Qualification',         alias: 'The Oracle',    phase: 'Divination',   status: 'Voice Sync: Resonant',      desc: 'Conducts AI voice calls to score leads on Budget, Authority, Need & Timeline' },
  { icon: GitBranch,    name: 'Sales Routing',            alias: 'The Navigator', phase: 'Resolution',   status: 'Event Horizon: Reached',    desc: 'Routes qualified leads to reps via rules, round-robin or AI scoring' },
  { icon: Eye,          name: 'Tracking & Attribution',   alias: 'The Watcher',   phase: 'Surveillance', status: 'Sight Range: Infinite',     desc: 'Multi-touch attribution with UTM tracking, GA4 & CAPI integration' },
  { icon: TrendingUp,   name: 'Performance Optimization', alias: 'The Tuner',     phase: 'Calibration',  status: 'Frequency: Locked',         desc: 'Automated budget reallocation, creative rotation & CPL/ROAS optimization' },
  { icon: Database,     name: 'CRM & Data Hygiene',       alias: 'The Purifier',  phase: 'Purification', status: 'Purity Index: 99.4%',       desc: 'Deduplication at >99%, lifecycle management & enrichment sync' },
];

const PIPELINE_PHASES = [
  { name: 'Discovery & Offer', agents: 4, icon: Target,      color: 'from-blue-500/20 to-transparent', border: 'border-blue-500/20' },
  { name: 'Funnel & Content',  agents: 2, icon: Globe,       color: 'from-purple-500/20 to-transparent', border: 'border-purple-500/20' },
  { name: 'Lead Generation',   agents: 2, icon: Users,       color: 'from-cyan-500/20 to-transparent', border: 'border-cyan-500/20' },
  { name: 'Qualification',     agents: 2, icon: Phone,       color: 'from-violet-500/20 to-transparent', border: 'border-violet-500/20' },
  { name: 'Optimization',      agents: 3, icon: TrendingUp,  color: 'from-emerald-500/20 to-transparent', border: 'border-emerald-500/20' },
];

const STAR_POSITIONS = [
  { top: '4%',  left: '10%',  size: 8,  glow: '0 0 15px #fff' },
  { top: '12%', left: '35%',  size: 12, glow: '0 0 20px #00f2ff' },
  { top: '6%',  left: '62%',  size: 6,  glow: '0 0 12px #d8b4fe' },
  { top: '18%', left: '82%',  size: 10, glow: '0 0 18px #fff' },
  { top: '28%', left: '88%',  size: 8,  glow: '0 0 12px #fff' },
  { top: '38%', left: '68%',  size: 14, glow: '0 0 25px #00f2ff' },
  { top: '32%', left: '15%',  size: 8,  glow: '0 0 12px #fff' },
  { top: '48%', left: '45%',  size: 6,  glow: '0 0 10px #fff' },
  { top: '56%', left: '75%',  size: 16, glow: '0 0 30px #fff' },
  { top: '62%', left: '30%',  size: 10, glow: '0 0 18px #00f2ff' },
  { top: '72%', left: '58%',  size: 8,  glow: '0 0 12px #fff' },
  { top: '80%', left: '82%',  size: 12, glow: '0 0 18px #d8b4fe' },
  { top: '87%', left: '40%',  size: 6,  glow: '0 0 12px #fff' },
];

const STAR_COLORS = [
  'bg-white', 'bg-cyan-200', 'bg-purple-300', 'bg-white', 'bg-white',
  'bg-cyan-200', 'bg-white', 'bg-white', 'bg-white', 'bg-cyan-200',
  'bg-white', 'bg-purple-300', 'bg-white',
];

const LABEL_SIDE: ('left' | 'right')[] = [
  'right', 'right', 'left', 'left', 'left',
  'left', 'right', 'right', 'left', 'right',
  'left', 'left', 'right',
];

const CONSTELLATION_LINES = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],
  [0,6],[2,5],[5,9],[8,10],
];

const FEATURED_AGENTS = [
  {
    ...AGENTS[8], // The Oracle
    metric: '97%', metricLabel: 'BANT Accuracy',
    capabilities: ['AI Voice Calls', 'Lead Scoring', 'BANT Framework'],
    quote: 'The future speaks to those who listen with purpose.',
  },
  {
    ...AGENTS[5], // The Herald
    metric: '3.2x', metricLabel: 'Avg ROAS',
    capabilities: ['Google Ads', 'Meta Campaigns', 'A/B Testing'],
    quote: 'A signal without reach is merely a whisper in the void.',
  },
  {
    ...AGENTS[12], // The Purifier
    metric: '99.4%', metricLabel: 'Data Accuracy',
    capabilities: ['Deduplication', 'Lifecycle Mgmt', 'Enrichment Sync'],
    quote: 'Truth emerges when noise is stripped away.',
  },
];

const SYSTEM_STATS = [
  { label: 'Lead Throughput',  value: '1,402',  unit: '/day',    unitColor: 'text-cyan-400' },
  { label: 'Conversion Rate',  value: '12.8%',  unit: 'Avg',     unitColor: 'text-cyan-400' },
  { label: 'Agent Sync Rate',  value: '88.4%',  unit: 'Optimal', unitColor: 'text-cyan-400' },
  { label: 'Cost Per Lead',    value: '$4.20',   unit: 'Avg',     unitColor: 'text-emerald-400' },
  { label: 'Pipeline Velocity', value: '<5',     unit: 'min',     unitColor: 'text-cyan-400' },
  { label: 'System Load',      value: 'Low',    unit: 'Shielded', unitColor: 'text-green-400' },
];

const STEPS = [
  { number: '01', title: 'Configure Your Mission', desc: 'Create a project, define your target market, and select which agents to deploy. Internal or external — LeadOS adapts.', icon: Settings2 },
  { number: '02', title: 'Launch The Pipeline', desc: 'One click activates all 13 agents in sequence. Watch them research, build, reach, qualify, and optimize — autonomously.', icon: Play },
  { number: '03', title: 'Watch Leads Flow', desc: 'Monitor real-time metrics on your dashboard. Qualified leads are routed, scored, and synced to your CRM automatically.', icon: Activity },
];

/* ═══════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════ */

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen overflow-x-hidden selection:bg-cyan-500/30 font-space-grotesk" style={{ background: '#020205', color: '#f8fafc' }}>
      {/* ══════ Fixed Background Layers ══════ */}
      <div className="cosmic-bg" />
      <div className="cosmic-stars" />
      <div className="cosmic-grid" />
      <div className="cosmic-vignette" />

      {/* ══════ Navigation ══════ */}
      <nav className="fixed top-0 left-0 w-full px-6 md:px-12 py-5 md:py-8 flex justify-between items-center" style={{ zIndex: 100 }}>
        <div className="flex flex-col">
          <span className="mono-ui text-cyan-400">Mission Control</span>
          <span className="font-cinzel text-xl md:text-2xl tracking-widest mt-1">LEAD OS</span>
        </div>
        <div className="hidden lg:flex items-center space-x-12 mono-ui opacity-60">
          <a href="#pipeline" className="hover:opacity-100 transition-opacity">Pipeline</a>
          <a href="#constellation" className="hover:opacity-100 transition-opacity">Agents</a>
          <a href="#metrics" className="hover:opacity-100 transition-opacity">Metrics</a>
          <a href="#how" className="hover:opacity-100 transition-opacity">How It Works</a>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden md:flex items-center gap-1.5 mono-ui opacity-60 hover:opacity-100 transition-opacity">
            <LogIn className="h-3 w-3" /> Access
          </Link>
          <Link href="/signup" className="bg-white/5 border border-white/20 hover:border-cyan-400 px-4 md:px-6 py-2 mono-ui transition-all hover:bg-cyan-400/10">
            Begin Focus
          </Link>
        </div>
      </nav>

      <main className="relative" style={{ zIndex: 20 }}>

        {/* ══════ HERO ══════ */}
        <section className="h-screen flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
          {/* Floating metric cards */}
          <div className="pointer-events-none absolute inset-0 hidden lg:block">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 1 }} className="absolute left-[4%] top-[20%]">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className="cosmic-card rounded-lg px-4 py-3 -rotate-2">
                <div className="flex items-center gap-2 mb-1.5">
                  <Target className="h-3 w-3 text-cyan-400" />
                  <span className="mono-ui text-[8px] text-cyan-400">Lead Score</span>
                </div>
                <div className="flex items-end gap-1.5">
                  <span className="text-2xl font-bold">94</span>
                  <span className="text-[10px] text-emerald-400 mb-1">+12%</span>
                </div>
                <div className="mt-1.5 h-[2px] w-20 bg-white/5"><div className="h-full w-[94%] bg-cyan-400" style={{ boxShadow: '0 0 6px #00f2ff' }} /></div>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 1.2 }} className="absolute left-[3%] bottom-[22%]">
              <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} className="cosmic-card rounded-lg px-4 py-3 rotate-2">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-3 w-3 text-emerald-400" />
                  <span className="mono-ui text-[8px] text-emerald-400">Pipeline</span>
                </div>
                <div className="space-y-1.5">
                  {[{ l: 'Research', w: 'w-full', c: 'bg-emerald-500' }, { l: 'Qualify', w: 'w-3/4', c: 'bg-cyan-500' }, { l: 'Convert', w: 'w-1/2', c: 'bg-purple-500' }].map(s => (
                    <div key={s.l} className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-500 w-10">{s.l}</span>
                      <div className="h-[2px] flex-1 bg-white/5"><div className={`h-full ${s.w} ${s.c}`} /></div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 1.1 }} className="absolute right-[5%] top-[18%]">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }} className="cosmic-card rounded-lg px-4 py-3 rotate-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <Phone className="h-3 w-3 text-violet-400" />
                  <span className="mono-ui text-[8px] text-violet-400">AI Qualification</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-violet-500/20 flex items-center justify-center"><Bot className="h-3 w-3 text-violet-400" /></div>
                  <div><p className="text-[10px] font-medium">BANT Score</p><p className="text-[9px] text-gray-500">Voice call complete</p></div>
                  <span className="ml-2 text-sm font-bold text-violet-400">A+</span>
                </div>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 1.3 }} className="absolute right-[4%] bottom-[24%]">
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }} className="cosmic-card rounded-lg px-4 py-3 -rotate-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <Users className="h-3 w-3 text-cyan-400" />
                  <span className="mono-ui text-[8px] text-cyan-400">Live Leads</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold">2,847</span>
                  <div className="flex items-center gap-0.5"><TrendingUp className="h-3 w-3 text-emerald-400" /><span className="text-[10px] text-emerald-400 font-medium">+23%</span></div>
                </div>
                <p className="text-[9px] text-gray-500 mt-0.5">This month</p>
              </motion.div>
            </motion.div>
          </div>

          <div className="flex flex-col items-center">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="mono-ui text-cyan-500 mb-6 flex items-center gap-4">
              <span className="h-px w-12 bg-cyan-500/30" />
              13 Autonomous AI Agents
              <span className="h-px w-12 bg-cyan-500/30" />
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }}
              className="font-cinzel text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-8 tracking-tight leading-tight">
              The Service{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20">Acquisition</span>
              <br />
              <span className="text-shimmer">Machine</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.7 }}
              className="max-w-2xl text-gray-400 font-light text-base md:text-lg leading-relaxed mb-10">
              From identifying service niches to qualifying leads via AI voice calls — LeadOS automates
              your entire go-to-market lifecycle. One pipeline. Zero manual work.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.9 }}
              className="flex flex-col sm:flex-row items-center gap-4 mb-16">
              <Link href="/signup" className="group flex items-center gap-3 border border-cyan-500/30 text-cyan-400 px-8 py-4 mono-ui hover:bg-cyan-500 hover:text-black transition-all">
                <Zap className="h-4 w-4" /> Launch Pipeline
                <span className="inline-block transform group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <button onClick={() => document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 px-8 py-4 mono-ui text-gray-400 hover:text-white transition-all border border-white/5 hover:border-white/20">
                Explore Architecture
              </button>
            </motion.div>

            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
              onClick={() => document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' })} className="animate-bounce cursor-pointer">
              <ChevronDown className="h-8 w-8 text-cyan-400/40" strokeWidth={1} />
            </motion.button>
          </div>

          {/* Background: Rotating Orbits & Particles */}
          <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
            {/* Inner orbit — fast, visible */}
            <div className="cosmic-ring orbit-rotate w-[300px] h-[300px] md:w-[500px] md:h-[500px] absolute" style={{ borderColor: 'rgba(0,242,255,0.15)' }}>
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full" style={{ boxShadow: '0 0 16px #00f2ff, 0 0 30px rgba(0,242,255,0.3)' }} />
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-purple-400 rounded-full" style={{ boxShadow: '0 0 12px #d8b4fe, 0 0 24px rgba(216,180,254,0.3)' }} />
            </div>

            {/* Middle orbit — reverse, dashed */}
            <svg className="absolute w-[440px] h-[440px] md:w-[700px] md:h-[700px] orbit-rotate-reverse">
              <circle cx="50%" cy="50%" r="49%" fill="none" stroke="rgba(0,242,255,0.16)" strokeWidth="1.5" strokeDasharray="8 10" className="orbit-dash-animate" />
            </svg>

            {/* Outer orbit — slow, golden */}
            <div className="cosmic-ring-gold orbit-rotate-slow w-[550px] h-[550px] md:w-[900px] md:h-[900px] absolute">
              <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 bg-amber-300/70 rounded-full" style={{ boxShadow: '0 0 12px rgba(255,207,125,0.5), 0 0 24px rgba(255,207,125,0.2)' }} />
            </div>

            {/* Cross hairs */}
            <div className="absolute w-[500px] md:w-[700px] h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
            <div className="absolute h-[500px] md:h-[700px] w-px bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent" />

            {/* Floating particles */}
            {[
              { x: '20%', y: '30%', delay: 0, size: 3 },
              { x: '75%', y: '25%', delay: 2, size: 2 },
              { x: '85%', y: '60%', delay: 4, size: 2.5 },
              { x: '15%', y: '70%', delay: 1, size: 2 },
              { x: '60%', y: '80%', delay: 3, size: 1.5 },
              { x: '40%', y: '15%', delay: 5, size: 2 },
            ].map((p, i) => (
              <div key={i} className="absolute rounded-full bg-cyan-400/40"
                style={{
                  left: p.x, top: p.y, width: p.size, height: p.size,
                  animation: `float-particle 8s ease-in-out ${p.delay}s infinite`,
                  boxShadow: '0 0 6px rgba(0,242,255,0.3)',
                }}
              />
            ))}
          </div>
        </section>

        {/* ══════ PIPELINE FLOW ══════ */}
        <section id="pipeline" className="py-24 md:py-48 px-6 md:px-24 relative overflow-hidden">
          {/* Section background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-cyan-500/[0.03] rounded-full blur-[120px]" />
            {[{ x: '8%', y: '15%', d: 0 }, { x: '92%', y: '30%', d: 2 }, { x: '45%', y: '85%', d: 4 }, { x: '85%', y: '75%', d: 1 }, { x: '15%', y: '60%', d: 3 }, { x: '70%', y: '10%', d: 5 }].map((p, i) => (
              <div key={i} className="absolute w-1 h-1 rounded-full bg-cyan-400/30" style={{ left: p.x, top: p.y, animation: `float-particle 10s ease-in-out ${p.d}s infinite`, boxShadow: '0 0 8px rgba(0,242,255,0.2)' }} />
            ))}
          </div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-60px' }} variants={stagger} className="max-w-6xl mx-auto relative">
            <motion.div variants={fadeUp} className="text-center mb-24">
              <div className="mono-ui text-cyan-400 mb-4 flex items-center justify-center gap-3">
                <span className="w-8 h-px bg-cyan-500/30" />End-to-End Automation<span className="w-8 h-px bg-cyan-500/30" />
              </div>
              <h2 className="font-cinzel text-3xl md:text-5xl mb-6">Five Phases. Thirteen Agents.</h2>
              <p className="text-gray-500 text-sm max-w-xl mx-auto leading-relaxed">From market research to CRM hygiene — every step is handled by specialized AI agents working in concert.</p>
            </motion.div>

            {/* Pipeline visualization */}
            <div className="relative">
              {/* Connecting energy beam */}
              <div className="hidden md:block absolute top-1/2 left-[10%] right-[10%] -translate-y-1/2" style={{ zIndex: 0 }}>
                <div className="w-full h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,242,255,0.15) 20%, rgba(0,242,255,0.3) 50%, rgba(0,242,255,0.15) 80%, transparent)', boxShadow: '0 0 12px rgba(0,242,255,0.1)' }} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-5 relative" style={{ zIndex: 1 }}>
                {PIPELINE_PHASES.map((phase, i) => {
                  const Icon = phase.icon;
                  const phaseColors = [
                    { accent: '#3b82f6', ring: 'rgba(59,130,246,0.25)' },
                    { accent: '#a855f7', ring: 'rgba(168,85,247,0.25)' },
                    { accent: '#06b6d4', ring: 'rgba(6,182,212,0.25)' },
                    { accent: '#8b5cf6', ring: 'rgba(139,92,246,0.25)' },
                    { accent: '#10b981', ring: 'rgba(16,185,129,0.25)' },
                  ][i];
                  return (
                    <motion.div key={phase.name} variants={fadeUp}
                      whileHover={{ y: -10, transition: { duration: 0.4, ease: [0.23, 1, 0.32, 1] } }}
                      className="relative group cursor-pointer">
                      <div className="relative rounded-2xl p-7 text-center overflow-hidden transition-all duration-500"
                        style={{ background: 'rgba(2,2,5,0.8)', border: `1px solid rgba(255,255,255,0.04)` }}>
                        {/* Hover glow */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 rounded-2xl"
                          style={{ background: `radial-gradient(circle at 50% 30%, ${phaseColors.ring}, transparent 70%)`, boxShadow: `inset 0 1px 0 ${phaseColors.ring}` }} />
                        {/* Top accent line */}
                        <div className="absolute top-0 left-[20%] right-[20%] h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                          style={{ background: `linear-gradient(90deg, transparent, ${phaseColors.accent}80, transparent)` }} />

                        <div className="relative">
                          {/* Icon with double ring */}
                          <div className="relative w-16 h-16 mx-auto mb-5">
                            <div className="absolute inset-0 rounded-full border-2 opacity-30 group-hover:opacity-60 transition-opacity duration-500"
                              style={{ borderColor: phaseColors.accent }} />
                            <div className="absolute inset-1 rounded-full border opacity-15 group-hover:opacity-30 transition-opacity orbit-rotate"
                              style={{ borderColor: phaseColors.accent, borderStyle: 'dashed' }} />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Icon className="h-6 w-6 transition-transform duration-500 group-hover:scale-110" style={{ color: phaseColors.accent }} />
                            </div>
                            {/* Dot on orbit */}
                            <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{ background: phaseColors.accent, boxShadow: `0 0 6px ${phaseColors.accent}` }} />
                          </div>

                          <h3 className="text-sm font-medium mb-2 group-hover:text-white transition-colors">{phase.name}</h3>
                          <p className="mono-ui text-[8px] text-gray-500 mb-3">{phase.agents} agents</p>

                          {/* Mini progress bar */}
                          <div className="w-12 h-[2px] mx-auto rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700 group-hover:w-full w-0"
                              style={{ background: phaseColors.accent, boxShadow: `0 0 6px ${phaseColors.accent}` }} />
                          </div>

                          <div className="mt-4 mono-ui text-[7px] transition-colors duration-300 group-hover:text-white/40" style={{ color: `${phaseColors.accent}40` }}>
                            Phase {String(i + 1).padStart(2, '0')}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Bottom stats bar */}
            <motion.div variants={fadeUp} className="mt-16 flex flex-wrap items-center justify-center gap-8 md:gap-16">
              {[
                { label: 'Total Agents', value: '13' },
                { label: 'Pipeline Phases', value: '5' },
                { label: 'Avg Execution', value: '<5 min' },
                { label: 'Automation', value: '100%' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className="text-xl md:text-2xl font-light text-white/80">{s.value}</div>
                  <div className="mono-ui text-[7px] text-gray-600 mt-1">{s.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* ══════ AGENT GALAXY — All 13 Agents ══════ */}
        <section id="constellation" className="py-24 md:py-40 px-6 md:px-24 relative overflow-hidden">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-20">
            <motion.div variants={fadeUp} className="mono-ui text-cyan-400 mb-4">The Agent Array</motion.div>
            <motion.h2 variants={fadeUp} className="font-cinzel text-3xl md:text-5xl mb-6">Meet The Constellation</motion.h2>
            <motion.p variants={fadeUp} className="text-gray-500 text-sm max-w-lg mx-auto">Each agent is a specialized intelligence node. Together they form an autonomous acquisition machine.</motion.p>
          </motion.div>

          {/* === Phase 1: Discovery & Offer (4 agents) === */}
          <div className="max-w-7xl mx-auto mb-32 relative">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="mono-ui text-blue-400/60 mb-8 flex items-center gap-3">
              <span className="w-8 h-px bg-blue-400/30" /> Phase 01 — Discovery &amp; Offer
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* The Seer — HERO card */}
              <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
                className="md:col-span-7 cosmic-card rounded-xl p-8 md:p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-all duration-700" />
                <div className="flex items-start gap-6 relative">
                  <div className="shrink-0">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border border-blue-500/20 flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), transparent)' }}>
                      <Search className="h-8 w-8 md:h-10 md:w-10 text-blue-400" strokeWidth={1.2} />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full glow-breathe" style={{ boxShadow: '0 0 8px #3b82f6' }} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-cinzel text-xl md:text-2xl">The Seer</h3>
                      <span className="mono-ui text-[7px] text-blue-400/60 border border-blue-400/20 rounded-full px-2 py-0.5">01</span>
                    </div>
                    <p className="mono-ui text-[8px] text-gray-500 mb-3">Service Research Agent</p>
                    <p className="text-sm text-gray-400 leading-relaxed mb-4">{AGENTS[0].desc}</p>
                    <div className="flex gap-3">
                      {['Google Trends', 'Reddit', 'LinkedIn', 'Upwork'].map(t => (
                        <span key={t} className="mono-ui text-[7px] text-gray-600 border border-white/5 rounded px-2 py-1">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
              {/* The Architect + The Alchemist — stacked */}
              <div className="md:col-span-5 flex flex-col gap-6">
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
                  whileHover={{ y: -4, transition: { duration: 0.3 } }}
                  className="cosmic-card rounded-xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
                  <div className="flex items-center gap-4 relative">
                    <div className="w-12 h-12 rounded-xl border border-purple-500/20 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.1), transparent)' }}>
                      <Sparkles className="h-6 w-6 text-purple-400" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-cinzel text-lg">The Architect</h3>
                        <span className="mono-ui text-[7px] text-purple-400/60">02</span>
                      </div>
                      <p className="mono-ui text-[8px] text-gray-500">Offer Engineering</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 leading-relaxed">{AGENTS[1].desc}</p>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
                  whileHover={{ y: -4, transition: { duration: 0.3 } }}
                  className="cosmic-card rounded-xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl" />
                  <div className="flex items-center gap-4 relative">
                    <div className="w-12 h-12 rounded-xl border border-emerald-500/20 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), transparent)' }}>
                      <ShieldCheck className="h-6 w-6 text-emerald-400" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-cinzel text-lg">The Alchemist</h3>
                        <span className="mono-ui text-[7px] text-emerald-400/60">03</span>
                      </div>
                      <p className="mono-ui text-[8px] text-gray-500">Validation Agent</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 leading-relaxed">{AGENTS[2].desc}</p>
                </motion.div>
              </div>
            </div>
            {/* The Weaver — wide card */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ y: -4, transition: { duration: 0.3 } }}
              className="mt-6 cosmic-card rounded-xl p-6 md:p-8 relative overflow-hidden group">
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl" />
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 relative">
                <div className="w-12 h-12 rounded-xl border border-cyan-500/20 flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.1), transparent)' }}>
                  <Globe className="h-6 w-6 text-cyan-400" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-cinzel text-lg">The Weaver</h3>
                    <span className="mono-ui text-[7px] text-cyan-400/60">04</span>
                  </div>
                  <p className="mono-ui text-[8px] text-gray-500 mb-2">Funnel Builder Agent</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{AGENTS[3].desc}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {['Webflow', 'Framer', 'Forms'].map(t => (
                    <span key={t} className="mono-ui text-[7px] text-gray-600 border border-white/5 rounded px-2 py-1">{t}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* === Phase 2: Funnel & Content (2 agents) === */}
          <div className="max-w-7xl mx-auto mb-32 relative">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="mono-ui text-purple-400/60 mb-8 flex items-center gap-3">
              <span className="w-8 h-px bg-purple-400/30" /> Phase 02 — Funnel &amp; Content
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[AGENTS[4], AGENTS[5]].map((agent, i) => {
                const Icon = agent.icon;
                const colors = i === 0
                  ? { border: 'border-pink-500/20', bg: 'rgba(236,72,153,0.1)', text: 'text-pink-400', glow: 'bg-pink-500/5', num: '05' }
                  : { border: 'border-orange-500/20', bg: 'rgba(249,115,22,0.1)', text: 'text-orange-400', glow: 'bg-orange-500/5', num: '06' };
                return (
                  <motion.div key={agent.name} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.15 }}
                    whileHover={{ y: -6, transition: { duration: 0.3 } }}
                    className="cosmic-card rounded-xl p-8 relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 w-40 h-40 ${colors.glow} rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700`} />
                    <div className="relative">
                      <div className={`w-16 h-16 rounded-2xl border ${colors.border} flex items-center justify-center mb-6`} style={{ background: `linear-gradient(135deg, ${colors.bg}, transparent)` }}>
                        <Icon className={`h-8 w-8 ${colors.text}`} strokeWidth={1.2} />
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-cinzel text-xl">{agent.alias}</h3>
                        <span className={`mono-ui text-[7px] ${colors.text} opacity-60`}>{colors.num}</span>
                      </div>
                      <p className="mono-ui text-[8px] text-gray-500 mb-3">{agent.name}</p>
                      <p className="text-sm text-gray-400 leading-relaxed mb-4">{agent.desc}</p>
                      <div className="mono-ui text-[8px] text-gray-600">{agent.status}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* === Phase 3: Lead Generation (2 agents) === */}
          <div className="max-w-7xl mx-auto mb-32 relative">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="mono-ui text-cyan-400/60 mb-8 flex items-center gap-3">
              <span className="w-8 h-px bg-cyan-400/30" /> Phase 03 — Lead Generation
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* The Messenger */}
              <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
                whileHover={{ x: 4, transition: { duration: 0.3 } }}
                className="md:col-span-5 cosmic-card rounded-xl p-8 relative overflow-hidden group">
                <div className="absolute bottom-0 right-0 w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl border border-yellow-500/20 flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.1), transparent)' }}>
                    <Mail className="h-7 w-7 text-yellow-400" strokeWidth={1.2} />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-cinzel text-xl">The Messenger</h3>
                    <span className="mono-ui text-[7px] text-yellow-400/60">07</span>
                  </div>
                  <p className="mono-ui text-[8px] text-gray-500 mb-3">Outbound Outreach Agent</p>
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">{AGENTS[6].desc}</p>
                  <div className="flex gap-2">
                    {['Instantly', 'Smartlead', 'LinkedIn'].map(t => (
                      <span key={t} className="mono-ui text-[7px] text-gray-600 border border-white/5 rounded px-2 py-1">{t}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
              {/* Energy bridge */}
              <div className="md:col-span-2 hidden md:flex items-center justify-center relative">
                <div className="w-full h-px flow-line" />
                <div className="absolute w-2 h-2 bg-cyan-400/40 rounded-full glow-breathe" />
              </div>
              {/* The Collector */}
              <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }}
                whileHover={{ x: -4, transition: { duration: 0.3 } }}
                className="md:col-span-5 cosmic-card rounded-xl p-8 relative overflow-hidden group">
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl" />
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl border border-cyan-500/20 flex items-center justify-center mb-5" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), transparent)' }}>
                    <Bot className="h-7 w-7 text-cyan-400" strokeWidth={1.2} />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-cinzel text-xl">The Collector</h3>
                    <span className="mono-ui text-[7px] text-cyan-400/60">08</span>
                  </div>
                  <p className="mono-ui text-[8px] text-gray-500 mb-3">Inbound Lead Capture Agent</p>
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">{AGENTS[7].desc}</p>
                  <div className="flex gap-2">
                    {['Apollo', 'Clearbit', 'Webhooks'].map(t => (
                      <span key={t} className="mono-ui text-[7px] text-gray-600 border border-white/5 rounded px-2 py-1">{t}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* === Phase 4: Qualification & Routing (2 agents) — HERO SECTION === */}
          <div className="max-w-7xl mx-auto mb-32 relative">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="mono-ui text-violet-400/60 mb-8 flex items-center gap-3">
              <span className="w-8 h-px bg-violet-400/30" /> Phase 04 — Qualification &amp; Routing
            </motion.div>
            {/* The Oracle — MASSIVE hero card */}
            <motion.div initial={{ opacity: 0, y: 50, scale: 0.98 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
              className="cosmic-card rounded-2xl p-8 md:p-12 relative overflow-hidden group mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5 group-hover:from-violet-500/10 group-hover:to-cyan-500/10 transition-all duration-700" />
              {/* Decorative orbit */}
              <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                <div className="w-full h-full rounded-full border border-violet-400/30 orbit-rotate flex items-center justify-center">
                  <div className="w-3/4 h-3/4 rounded-full border border-cyan-400/20 orbit-rotate-reverse" />
                </div>
              </div>
              <div className="relative flex flex-col md:flex-row items-start gap-8">
                <div className="shrink-0">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 border-violet-500/30 flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(0,242,255,0.05))' }}>
                    <Phone className="h-10 w-10 md:h-12 md:w-12 text-violet-400" strokeWidth={1} />
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-violet-400 rounded-full" style={{ boxShadow: '0 0 12px #8b5cf6, 0 0 24px rgba(139,92,246,0.3)' }}>
                      <div className="w-full h-full rounded-full animate-ping bg-violet-400/50" />
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-cinzel text-2xl md:text-3xl">The Oracle</h3>
                    <span className="mono-ui text-[8px] text-violet-400 border border-violet-400/20 rounded-full px-3 py-0.5">09 / Divination</span>
                  </div>
                  <p className="mono-ui text-[8px] text-gray-500 mb-4">AI Qualification Agent</p>
                  <p className="text-base text-gray-400 leading-relaxed mb-6 max-w-2xl">{AGENTS[8].desc}</p>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[{ label: 'BANT Accuracy', value: '97%' }, { label: 'Call Duration', value: '4.2m' }, { label: 'Qualification Rate', value: '68%' }].map(m => (
                      <div key={m.label} className="cosmic-card rounded-lg p-3 text-center">
                        <div className="text-lg font-light text-cyan-400">{m.value}</div>
                        <div className="mono-ui text-[7px] text-gray-500 mt-1">{m.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {['Bland AI', 'Vapi', 'ElevenLabs', 'BANT Framework', 'Voice Synthesis'].map(t => (
                      <span key={t} className="mono-ui text-[7px] text-violet-400/60 border border-violet-400/10 rounded px-2 py-1">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
            {/* The Navigator */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -4, transition: { duration: 0.3 } }}
              className="cosmic-card rounded-xl p-6 md:p-8 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-40 h-40 bg-teal-500/5 rounded-full blur-3xl" />
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 relative">
                <div className="w-14 h-14 rounded-2xl border border-teal-500/20 flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.1), transparent)' }}>
                  <GitBranch className="h-7 w-7 text-teal-400" strokeWidth={1.2} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-cinzel text-xl">The Navigator</h3>
                    <span className="mono-ui text-[7px] text-teal-400/60">10</span>
                  </div>
                  <p className="mono-ui text-[8px] text-gray-500 mb-2">Sales Routing Agent</p>
                  <p className="text-sm text-gray-400 leading-relaxed">{AGENTS[9].desc}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {['Round-Robin', 'AI Scoring', 'Rules'].map(t => (
                    <span key={t} className="mono-ui text-[7px] text-gray-600 border border-white/5 rounded px-2 py-1">{t}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* === Phase 5: Optimization (3 agents) === */}
          <div className="max-w-7xl mx-auto relative">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="mono-ui text-emerald-400/60 mb-8 flex items-center gap-3">
              <span className="w-8 h-px bg-emerald-400/30" /> Phase 05 — Optimization &amp; Hygiene
            </motion.div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { agent: AGENTS[10], color: 'sky',     num: '11' },
                { agent: AGENTS[11], color: 'rose',    num: '12' },
                { agent: AGENTS[12], color: 'emerald', num: '13' },
              ].map(({ agent, color, num }, i) => {
                const Icon = agent.icon;
                return (
                  <motion.div key={agent.name} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.12 }}
                    whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.3 } }}
                    className="cosmic-card rounded-xl p-8 relative overflow-hidden group">
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 rounded-full blur-3xl group-hover:bg-${color}-500/10 transition-all duration-700`} />
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-2xl border border-${color}-500/20 flex items-center justify-center mb-6`} style={{ background: `linear-gradient(135deg, rgba(var(--tw-${color}-rgb, 100,200,200),0.1), transparent)` }}>
                        <Icon className={`h-7 w-7 text-${color}-400`} strokeWidth={1.2} />
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-cinzel text-xl">{agent.alias}</h3>
                        <span className={`mono-ui text-[7px] text-${color}-400/60`}>{num}</span>
                      </div>
                      <p className="mono-ui text-[8px] text-gray-500 mb-3">{agent.name}</p>
                      <p className="text-sm text-gray-400 leading-relaxed mb-4">{agent.desc}</p>
                      <div className="mono-ui text-[8px] text-gray-600">{agent.status}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════ METRICS / SYSTEM ALIGNMENT ══════ */}
        <section id="metrics" className="py-20 md:py-40 px-6 md:px-24">
          <div className="max-w-6xl mx-auto border border-white/5 p-1">
            <div className="bg-black/60 backdrop-blur-3xl p-8 md:p-16 lg:p-20 border border-white/10 relative">
              <div className="absolute top-0 right-0 p-4 mono-ui opacity-20 text-[8px]">System Epoch: 4.2.0</div>
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
                <motion.div variants={fadeUp} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 md:gap-12 mb-12 md:mb-20">
                  <div className="max-w-xl">
                    <div className="mono-ui text-cyan-400 mb-4">Live Telemetry</div>
                    <h2 className="font-cinzel text-3xl md:text-4xl mb-6">Total System Alignment</h2>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      When all 13 agents are synchronized, LeadOS reaches peak performance.
                      Real-time metrics from the entire acquisition constellation.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center"><Crosshair className="h-4 w-4" /></div>
                    <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center"><Network className="h-4 w-4" /></div>
                  </div>
                </motion.div>
                <div className="border-t border-white/5 pt-12 md:pt-20 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
                  {SYSTEM_STATS.map((stat) => (
                    <motion.div key={stat.label} variants={fadeUp} className="space-y-2">
                      <div className="mono-ui text-[8px] text-gray-500">{stat.label}</div>
                      <div className="text-xl md:text-2xl font-light">
                        {stat.value} <span className={`text-[10px] mono-ui ${stat.unitColor}`}>{stat.unit}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ══════ HOW IT WORKS ══════ */}
        <section id="how" className="py-20 md:py-40 px-6 md:px-24">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-5xl mx-auto">
            <motion.div variants={fadeUp} className="text-center mb-16">
              <div className="mono-ui text-cyan-400 mb-4">Activation Protocol</div>
              <h2 className="font-cinzel text-3xl md:text-5xl mb-6">Three Steps to Singularity</h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <motion.div key={step.number} variants={fadeUp} className="relative">
                    <div className="cosmic-card rounded-lg p-8">
                      <div className="mono-ui text-cyan-500/40 text-3xl font-bold mb-6">{step.number}</div>
                      <div className="w-10 h-10 rounded-full border border-cyan-500/20 flex items-center justify-center mb-4 glow-breathe">
                        <Icon className="h-4 w-4 text-cyan-400" />
                      </div>
                      <h3 className="text-lg font-medium mb-3">{step.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* ══════ CTA ══════ */}
        <section className="py-20 md:py-32 px-6 md:px-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center">
            <Zap className="mx-auto mb-6 h-8 w-8 text-cyan-400 opacity-60" />
            <h2 className="font-cinzel text-3xl md:text-5xl mb-6">Ready to Reach<br />Singularity?</h2>
            <p className="text-gray-500 text-sm mb-10 max-w-lg mx-auto">
              Create your account, configure your agents, and let LeadOS autonomously acquire, qualify, and convert leads for you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup" className="group flex items-center gap-3 border border-cyan-500/30 text-cyan-400 px-8 py-4 mono-ui hover:bg-cyan-500 hover:text-black transition-all">
                <UserPlus className="h-4 w-4" /> Activate Now
                <span className="inline-block transform group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link href="/login" className="flex items-center gap-2 border border-white/10 px-8 py-4 mono-ui text-gray-400 hover:text-white hover:border-white/30 transition-all">
                <LogIn className="h-4 w-4" /> Log In
              </Link>
            </div>
            <p className="mono-ui text-[8px] text-gray-700 mt-8">13 Agents. One Pipeline. Zero Manual Work.</p>
          </motion.div>
        </section>
      </main>

      {/* ══════ FOOTER ══════ */}
      <footer className="py-16 md:py-24 px-6 md:px-12 border-t border-white/5" style={{ position: 'relative', zIndex: 20 }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-12">
          <div className="flex flex-col">
            <div className="font-cinzel text-2xl mb-2">Lead OS</div>
            <div className="mono-ui text-[8px] text-gray-600">The Autonomous Service Acquisition Machine</div>
          </div>
          <div className="flex flex-wrap gap-8 md:gap-12 mono-ui text-[9px] text-gray-500">
            <a href="#pipeline" className="hover:text-cyan-400 transition-colors">Pipeline</a>
            <a href="#constellation" className="hover:text-cyan-400 transition-colors">Agents</a>
            <a href="#metrics" className="hover:text-cyan-400 transition-colors">Metrics</a>
            <a href="#how" className="hover:text-cyan-400 transition-colors">How It Works</a>
            <Link href="/login" className="hover:text-cyan-400 transition-colors">Observatory Access</Link>
          </div>
          <div className="mono-ui text-[9px] text-cyan-900">© 2025. LEAD_OS_v4.2</div>
        </div>
      </footer>
    </div>
  );
}
