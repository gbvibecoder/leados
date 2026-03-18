'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, Check, Zap, Phone, Database } from 'lucide-react';
import { motion } from 'framer-motion';

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

    if (!allChecksMet) {
      setError('Please meet all password requirements');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      router.push('/login?registered=true');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 font-space-grotesk" style={{ background: '#020205', color: '#f8fafc' }}>
      <div className="cosmic-bg" />
      <div className="cosmic-stars" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.4, 0.25, 1] }}
        className="w-full max-w-md"
        style={{ position: 'relative', zIndex: 10 }}
      >
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center mb-8">
          <span className="mono-ui text-cyan-400 text-[9px] mb-1">Activation Protocol</span>
          <span className="font-cinzel text-2xl tracking-widest">LEAD OS</span>
        </Link>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="stellar-panel rounded-sm p-8"
        >
          <div className="text-center mb-6">
            <h1 className="font-cinzel text-xl">Create Your Account</h1>
            <p className="text-sm text-gray-500 mt-1">Begin automating your acquisition pipeline</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                className="rounded border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                {error}
              </motion.div>
            )}

            <div>
              <label htmlFor="name" className="mono-ui text-[9px] text-gray-500 block mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="John Doe"
                  className="w-full cosmic-input rounded pl-10 pr-4 py-2.5 text-sm" />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mono-ui text-[9px] text-gray-500 block mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@company.com"
                  className="w-full cosmic-input rounded pl-10 pr-4 py-2.5 text-sm" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mono-ui text-[9px] text-gray-500 block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600" />
                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required
                  placeholder="Create a strong password" className="w-full cosmic-input rounded pl-10 pr-10 py-2.5 text-sm" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {password.length > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.25 }} className="mt-2 space-y-1">
                  {passwordChecks.map((check) => (
                    <div key={check.label} className="flex items-center gap-1.5">
                      <div className={`h-3 w-3 rounded-full flex items-center justify-center transition-colors ${check.met ? 'bg-cyan-500/20' : 'bg-white/5'}`}>
                        {check.met && <Check className="h-2 w-2 text-cyan-400" />}
                      </div>
                      <span className={`text-[10px] transition-colors ${check.met ? 'text-cyan-400' : 'text-gray-600'}`}>{check.label}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>

            <button type="submit" disabled={loading || !allChecksMet}
              className="flex w-full items-center justify-center gap-2 py-3 border border-cyan-500/30 text-cyan-400 mono-ui hover:bg-cyan-500 hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account <ArrowRight className="h-3 w-3" /></>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?{' '}
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300">Sign in</Link>
            </p>
          </div>
        </motion.div>

        {/* Feature badges */}
        <motion.div
          initial="hidden" animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } } }}
          className="mt-6 grid grid-cols-3 gap-3"
        >
          {[
            { label: '13 AI Agents', icon: Zap },
            { label: 'AI Voice Calls', icon: Phone },
            { label: '99.4% Clean Data', icon: Database },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.label}
                variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } }}
                className="cosmic-card rounded px-3 py-2.5 text-center">
                <Icon className="h-4 w-4 text-cyan-400/60 mx-auto mb-1" />
                <p className="mono-ui text-[7px] text-gray-500">{item.label}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </div>
  );
}
