'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, Check, Zap, Phone, Database,
  Target, Sparkles, ShieldCheck, Bot, TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';

const ORBIT_AGENTS = [
  { icon: Target,      color: '#3b82f6' },
  { icon: Sparkles,    color: '#a855f7' },
  { icon: Bot,         color: '#10b981' },
  { icon: Phone,       color: '#8b5cf6' },
  { icon: TrendingUp,  color: '#f59e0b' },
  { icon: ShieldCheck, color: '#ec4899' },
];

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordChecks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
  ];
  const allChecksMet = passwordChecks.every(c => c.met);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!allChecksMet) { setError('Please meet all password requirements'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to create account'); return; }
      router.push('/login?registered=true');
    } catch { setError('Network error. Please try again.'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex font-space-grotesk" style={{ background: '#020205', color: '#f8fafc' }}>
      <div className="cosmic-bg" />
      <div className="cosmic-stars" />
      <div className="cosmic-grid" />

      {/* ═══ LEFT — Decorative Panel ═══ */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        <div className="absolute top-[30%] left-[15%] w-[350px] h-[350px] bg-violet-600/[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-[25%] right-[15%] w-[250px] h-[250px] bg-cyan-600/[0.05] rounded-full blur-[100px]" />

        <div className="relative w-[500px] h-[500px]" style={{ zIndex: 5 }}>
          {/* Outer orbit */}
          <div className="absolute inset-0 rounded-full orbit-rotate" style={{ border: '2px solid rgba(139,92,246,0.1)', boxShadow: '0 0 20px rgba(139,92,246,0.03)' }}>
            {ORBIT_AGENTS.slice(0, 3).map((agent, i) => {
              const Icon = agent.icon;
              return (
                <div key={i} className="absolute" style={{ top: '50%', left: '50%', transform: `rotate(${i * 120}deg) translateY(-250px) rotate(-${i * 120}deg)`, marginTop: -16, marginLeft: -16 }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center orbit-rotate-reverse" style={{ background: `${agent.color}15`, border: `1px solid ${agent.color}30` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: agent.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Middle orbit */}
          <div className="absolute inset-[70px] rounded-full orbit-rotate-reverse" style={{ border: '1px dashed rgba(139,92,246,0.12)' }}>
            {ORBIT_AGENTS.slice(3, 6).map((agent, i) => {
              const Icon = agent.icon;
              return (
                <div key={i} className="absolute" style={{ top: '50%', left: '50%', transform: `rotate(${i * 120 + 60}deg) translateY(-180px) rotate(-${i * 120 + 60}deg)`, marginTop: -14, marginLeft: -14 }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center orbit-rotate" style={{ background: `${agent.color}15`, border: `1px solid ${agent.color}30` }}>
                    <Icon className="h-3 w-3" style={{ color: agent.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          {/* Inner orbit */}
          <div className="absolute inset-[140px] rounded-full orbit-rotate-slow" style={{ border: '2px solid rgba(0,242,255,0.08)' }}>
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400/50" style={{ boxShadow: '0 0 8px rgba(0,242,255,0.4)' }} />
          </div>
          {/* Center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-violet-500/10 to-transparent" />
            <div className="absolute h-full w-px bg-gradient-to-b from-transparent via-violet-500/10 to-transparent" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }}>
              <div className="mono-ui text-violet-400/60 text-[9px] mb-3">Activation Protocol</div>
              <div className="font-cinzel text-4xl tracking-wider mb-4">LEAD OS</div>
              <div className="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-violet-500/40 to-transparent mb-4" />
              <p className="text-gray-500 text-xs max-w-[200px] leading-relaxed">13 Autonomous Agents. One Pipeline. Zero Manual Work.</p>
            </motion.div>
          </div>
          {/* Particles */}
          {[{ x: '15%', y: '20%', d: 0 }, { x: '80%', y: '30%', d: 2 }, { x: '25%', y: '75%', d: 4 }, { x: '70%', y: '80%', d: 1 }].map((p, i) => (
            <div key={i} className="absolute rounded-full bg-violet-400/30" style={{ left: p.x, top: p.y, width: 2, height: 2, animation: `float-particle 8s ease-in-out ${p.d}s infinite`, boxShadow: '0 0 6px rgba(139,92,246,0.3)' }} />
          ))}
        </div>

        {/* Bottom features */}
        <div className="absolute bottom-12 left-0 right-0 flex justify-center gap-10">
          {[{ v: '13', l: 'AI Agents', icon: Zap }, { v: 'AI', l: 'Voice Calls', icon: Phone }, { v: '99.4%', l: 'Data Quality', icon: Database }].map(s => {
            const Icon = s.icon;
            return (
              <motion.div key={s.l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="text-center">
                <Icon className="h-4 w-4 text-violet-400/40 mx-auto mb-1.5" />
                <div className="text-base font-light text-white/60">{s.v}</div>
                <div className="mono-ui text-[7px] text-gray-600">{s.l}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="absolute right-0 top-[15%] bottom-[15%] w-px bg-gradient-to-b from-transparent via-violet-500/10 to-transparent" />
      </div>

      {/* ═══ RIGHT — Signup Form ═══ */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 md:px-12 py-12 relative" style={{ zIndex: 10 }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/[0.02] rounded-full blur-[100px] pointer-events-none" />

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="w-full max-w-sm relative">
          <Link href="/" className="flex flex-col items-center mb-8 lg:hidden">
            <span className="mono-ui text-violet-400 text-[9px] mb-1">Activation Protocol</span>
            <span className="font-cinzel text-2xl tracking-widest">LEAD OS</span>
          </Link>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mb-8">
            <div className="mono-ui text-[9px] text-violet-400/60 mb-2 flex items-center gap-2">
              <span className="w-4 h-px bg-violet-500/30" />Create Account
            </div>
            <h1 className="font-cinzel text-2xl md:text-3xl mb-2">Join The Mission</h1>
            <p className="text-sm text-gray-500">Begin automating your acquisition pipeline</p>
          </motion.div>

          <motion.form initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            onSubmit={handleSubmit}
            className="rounded-xl p-8 relative overflow-hidden space-y-5"
            style={{ background: 'rgba(2,2,5,0.6)', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
            <div className="absolute top-0 left-[20%] right-[20%] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.2), transparent)' }} />

            {error && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">{error}</motion.div>
            )}

            <div>
              <label className="mono-ui text-[9px] text-gray-500 block mb-2">Full Name</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-violet-400 transition-colors" />
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe"
                  className="w-full cosmic-input rounded-lg pl-11 pr-4 py-3 text-sm" />
              </div>
            </div>

            <div>
              <label className="mono-ui text-[9px] text-gray-500 block mb-2">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-violet-400 transition-colors" />
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com"
                  className="w-full cosmic-input rounded-lg pl-11 pr-4 py-3 text-sm" />
              </div>
            </div>

            <div>
              <label className="mono-ui text-[9px] text-gray-500 block mb-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 group-focus-within:text-violet-400 transition-colors" />
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="Create a strong password" className="w-full cosmic-input rounded-lg pl-11 pr-11 py-3 text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 space-y-1.5">
                  {passwordChecks.map((check) => (
                    <div key={check.label} className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full flex items-center justify-center transition-all"
                        style={{ background: check.met ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)', border: `1px solid ${check.met ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                        {check.met && <Check className="h-2.5 w-2.5 text-violet-400" />}
                      </div>
                      <span className={`text-[11px] transition-colors ${check.met ? 'text-violet-400' : 'text-gray-600'}`}>{check.label}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            <button type="submit" disabled={loading || !allChecksMet}
              className="relative w-full py-3.5 rounded-lg mono-ui text-sm overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed transition-all group"
              style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(0,242,255,0.05))', border: '1px solid rgba(139,92,246,0.2)' }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(0,242,255,0.1))' }} />
              <span className="relative flex items-center justify-center gap-2 text-violet-400 group-hover:text-white transition-colors">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" /></>}
              </span>
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-500">Already have an account? <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors">Sign in</Link></p>
            </div>
          </motion.form>

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
