'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, CheckCircle2,
  Target, Sparkles, Phone, Bot, Globe, TrendingUp, ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';

/* Orbit agent icons — 7 icons placed on the orbits */
const ORBIT_AGENTS = [
  { icon: Target,      color: '#3b82f6', label: 'Research' },
  { icon: Sparkles,    color: '#a855f7', label: 'Offer' },
  { icon: Globe,       color: '#06b6d4', label: 'Funnel' },
  { icon: Phone,       color: '#8b5cf6', label: 'Qualify' },
  { icon: Bot,         color: '#10b981', label: 'Capture' },
  { icon: TrendingUp,  color: '#f59e0b', label: 'Optimize' },
  { icon: ShieldCheck, color: '#ec4899', label: 'Validate' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === 'true';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(justRegistered);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowSuccess(false);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid credentials'); return; }
      localStorage.setItem('leados_token', data.token);
      localStorage.setItem('leados_user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-space-grotesk" style={{ background: '#020205', color: '#f8fafc' }}>
      <div className="cosmic-bg" />
      <div className="cosmic-stars" />
      <div className="cosmic-grid" />

      {/* ═══ LEFT — Decorative Panel ═══ */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        {/* Nebula glows */}
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-violet-600/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[300px] h-[300px] bg-cyan-600/[0.06] rounded-full blur-[100px]" />

        {/* Orbit system */}
        <div className="relative w-[500px] h-[500px]" style={{ zIndex: 5 }}>
          {/* Outer orbit */}
          <div className="absolute inset-0 rounded-full orbit-rotate-slow" style={{ border: '2px solid rgba(0,242,255,0.1)', boxShadow: '0 0 20px rgba(0,242,255,0.03)' }}>
            {/* Agents on outer orbit */}
            {ORBIT_AGENTS.slice(0, 4).map((agent, i) => {
              const angle = (i * 90);
              const Icon = agent.icon;
              return (
                <div key={i} className="absolute" style={{
                  top: '50%', left: '50%',
                  transform: `rotate(${angle}deg) translateY(-250px) rotate(-${angle}deg)`,
                  marginTop: -16, marginLeft: -16,
                }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center orbit-rotate-reverse"
                    style={{ background: `${agent.color}15`, border: `1px solid ${agent.color}30` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: agent.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Middle orbit — dashed, reverse */}
          <div className="absolute inset-[60px] rounded-full orbit-rotate-reverse" style={{ border: '1px dashed rgba(0,242,255,0.12)' }}>
            {ORBIT_AGENTS.slice(4, 7).map((agent, i) => {
              const angle = (i * 120) + 30;
              const Icon = agent.icon;
              return (
                <div key={i} className="absolute" style={{
                  top: '50%', left: '50%',
                  transform: `rotate(${angle}deg) translateY(-190px) rotate(-${angle}deg)`,
                  marginTop: -14, marginLeft: -14,
                }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center orbit-rotate"
                    style={{ background: `${agent.color}15`, border: `1px solid ${agent.color}30` }}>
                    <Icon className="h-3 w-3" style={{ color: agent.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inner orbit — fast */}
          <div className="absolute inset-[130px] rounded-full orbit-rotate" style={{ border: '2px solid rgba(255,207,125,0.08)', boxShadow: '0 0 15px rgba(255,207,125,0.02)' }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-300/50" style={{ boxShadow: '0 0 8px rgba(255,207,125,0.4)' }} />
          </div>

          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {/* Crosshair lines */}
            <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
            <div className="absolute h-full w-px bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent" />

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }}>
              <div className="mono-ui text-cyan-400/60 text-[9px] mb-3">Mission Control</div>
              <div className="font-cinzel text-4xl tracking-wider mb-4">LEAD OS</div>
              <div className="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent mb-4" />
              <p className="text-gray-500 text-xs max-w-[200px] leading-relaxed">
                The Autonomous Service Acquisition Machine
              </p>
            </motion.div>
          </div>

          {/* Floating particles */}
          {[
            { x: '15%', y: '20%', d: 0, s: 2 }, { x: '80%', y: '30%', d: 2, s: 1.5 },
            { x: '25%', y: '75%', d: 4, s: 2.5 }, { x: '70%', y: '80%', d: 1, s: 1.5 },
            { x: '50%', y: '10%', d: 3, s: 2 }, { x: '10%', y: '50%', d: 5, s: 1.5 },
          ].map((p, i) => (
            <div key={i} className="absolute rounded-full bg-cyan-400/30"
              style={{ left: p.x, top: p.y, width: p.s, height: p.s,
                animation: `float-particle 8s ease-in-out ${p.d}s infinite`,
                boxShadow: '0 0 6px rgba(0,242,255,0.3)' }} />
          ))}
        </div>

        {/* Bottom stats */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-12">
          {[{ v: '13', l: 'Agents' }, { v: '5', l: 'Phases' }, { v: '100%', l: 'Autonomous' }].map(s => (
            <motion.div key={s.l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="text-center">
              <div className="text-lg font-light text-white/60">{s.v}</div>
              <div className="mono-ui text-[7px] text-gray-600">{s.l}</div>
            </motion.div>
          ))}
        </div>

        {/* Vertical separator */}
        <div className="absolute right-0 top-[15%] bottom-[15%] w-px bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent" />
      </div>

      {/* ═══ RIGHT — Login Form ═══ */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 md:px-12 relative" style={{ zIndex: 10 }}>
        {/* Ambient glow behind form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-sm relative"
        >
          {/* Mobile logo — only on small screens */}
          <Link href="/" className="flex flex-col items-center mb-8 lg:hidden">
            <span className="mono-ui text-cyan-400 text-[9px] mb-1">Observatory Access</span>
            <span className="font-cinzel text-2xl tracking-widest">LEAD OS</span>
          </Link>

          {/* Header */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-8">
            <div className="mono-ui text-cyan-400/60 text-[9px] mb-2 flex items-center gap-2">
              <span className="w-4 h-px bg-cyan-500/30" />Authentication Protocol
            </div>
            <h1 className="font-cinzel text-2xl md:text-3xl mb-2">Welcome Back</h1>
            <p className="text-sm text-gray-500">Sign in to access your observatory</p>
          </motion.div>

          {/* Form card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="rounded-xl p-8 relative overflow-hidden"
            style={{ background: 'rgba(2,2,5,0.6)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}
          >
            {/* Top glow accent */}
            <div className="absolute top-0 left-[20%] right-[20%] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,242,255,0.2), transparent)' }} />

            <form onSubmit={handleSubmit} className="space-y-5">
              {showSuccess && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Account created! Please sign in.
                </motion.div>
              )}

              {error && (
                <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                  {error}
                </motion.div>
              )}

              <div>
                <label htmlFor="email" className="mono-ui text-[9px] text-gray-500 block mb-2">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-cyan-400 transition-colors" />
                  <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                    placeholder="you@company.com"
                    className="w-full cosmic-input rounded-lg pl-11 pr-4 py-3 text-sm" />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="mono-ui text-[9px] text-gray-500 block mb-2">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-cyan-400 transition-colors" />
                  <input id="password" type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password"
                    className="w-full cosmic-input rounded-lg pl-11 pr-11 py-3 text-sm" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="relative w-full py-3.5 rounded-lg mono-ui text-sm overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 group"
                style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.1), rgba(139,92,246,0.1))', border: '1px solid rgba(0,242,255,0.2)' }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.2), rgba(139,92,246,0.15))' }} />
                <span className="relative flex items-center justify-center gap-2 text-cyan-400 group-hover:text-white transition-colors">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>Sign In <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></>
                  )}
                </span>
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 transition-colors">Sign up</Link>
              </p>
            </div>
          </motion.div>

          {/* Bottom tagline */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            className="mt-8 flex items-center justify-center gap-3">
            <span className="w-6 h-px bg-white/10" />
            <span className="mono-ui text-[8px] text-gray-600">13 Agents. One Pipeline. Zero Manual Work.</span>
            <span className="w-6 h-px bg-white/10" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#020205' }}>
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
