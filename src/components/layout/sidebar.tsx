'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Workflow, Users, BarChart3, Settings,
  Bot, ChevronLeft, ChevronRight, Zap, FolderKanban, ShieldBan, Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, accent: '#00f2ff' },
  { name: 'Projects', href: '/projects', icon: FolderKanban, accent: '#3b82f6' },
  { name: 'LeadOS Pipeline', href: '/leados', icon: Workflow, accent: '#8b5cf6' },
  { name: 'Leads / CRM', href: '/leads', icon: Users, accent: '#10b981' },
  { name: 'Ad Creator', href: '/ads', icon: Megaphone, accent: '#ff6b00' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, accent: '#f59e0b' },
  { name: 'Blacklist', href: '/blacklist', icon: ShieldBan, accent: '#ef4444' },
  { name: 'Settings', href: '/settings', icon: Settings, accent: '#6b7280' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, pipeline } = useAppStore();
  const [aiEngine, setAiEngine] = useState({ model: 'Loading...', provider: '' });
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch('/api/ai-engine')
      .then(res => res.json())
      .then(data => setAiEngine(data))
      .catch(() => setAiEngine({ model: 'Unknown', provider: '' }));
  }, []);

  const completedAgents = pipeline.agents.filter(a => a.status === 'done').length;
  const pipelineProgress = completedAgents / 13;

  return (
    <aside
      className={cn('fixed left-0 top-0 z-40 h-screen transition-all duration-300 overflow-hidden', sidebarOpen ? 'w-64' : 'w-16')}
      style={{ background: 'rgba(2,2,5,0.97)', borderRight: '1px solid rgba(0,242,255,0.06)', backdropFilter: 'blur(20px)' }}
    >
      {/* Ambient floating dots */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {mounted && [
          { x: '20%', y: '25%', d: 0 }, { x: '75%', y: '45%', d: 2 }, { x: '40%', y: '70%', d: 4 },
          { x: '60%', y: '15%', d: 1 }, { x: '30%', y: '90%', d: 3 },
        ].map((p, i) => (
          <div key={i} className="absolute w-0.5 h-0.5 rounded-full bg-cyan-400/20"
            style={{ left: p.x, top: p.y, animation: `float-particle 12s ease-in-out ${p.d}s infinite` }} />
        ))}
      </div>

      {/* Logo area */}
      <div className="relative flex h-16 items-center justify-between px-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {sidebarOpen ? (
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 flex items-center justify-center">
              {/* Orbital ring */}
              <div className="absolute inset-0 rounded-full orbit-rotate" style={{ border: '1px solid rgba(0,242,255,0.2)' }}>
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 4px #00f2ff' }} />
              </div>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(0,242,255,0.2)' }}>
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-cinzel text-sm tracking-wider text-white group-hover:text-cyan-400 transition-colors">LEAD OS</span>
              <span className="mono-ui text-[6px] text-gray-600">v4.2 — ACTIVE</span>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto">
            <div className="relative w-9 h-9 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full orbit-rotate" style={{ border: '1px solid rgba(0,242,255,0.15)' }}>
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400/60" />
              </div>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.12), rgba(139,92,246,0.08))' }}>
                <Zap className="h-3.5 w-3.5 text-cyan-400" />
              </div>
            </div>
          </Link>
        )}
        <button onClick={toggleSidebar}
          className={cn('rounded-lg p-1.5 text-gray-600 hover:text-cyan-400 transition-colors', !sidebarOpen && 'hidden')}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Collapse button when collapsed */}
      {!sidebarOpen && (
        <button onClick={toggleSidebar} className="w-full flex justify-center py-3 text-gray-600 hover:text-cyan-400 transition-colors">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Section label */}
      {sidebarOpen && (
        <div className="px-4 pt-5 pb-2">
          <span className="mono-ui text-[7px] text-gray-600">Navigation</span>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn('space-y-0.5', sidebarOpen ? 'px-2' : 'px-1.5 mt-1')}>
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link key={item.name} href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300 relative group',
                isActive ? 'text-white' : 'text-gray-500 hover:text-gray-200',
                !sidebarOpen && 'justify-center px-0'
              )}
              style={isActive ? {
                background: `linear-gradient(135deg, ${item.accent}10, transparent)`,
                border: `1px solid ${item.accent}15`,
              } : { border: '1px solid transparent' }}
            >
              {/* Active glow bar */}
              {isActive && (
                <motion.div layoutId="sidebar-active" className="absolute left-0 top-[20%] bottom-[20%] w-[2px] rounded-full"
                  style={{ background: item.accent, boxShadow: `0 0 8px ${item.accent}` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
              )}

              {/* Hover glow */}
              {!isActive && (
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: `radial-gradient(circle at 30% 50%, ${item.accent}08, transparent 70%)` }} />
              )}

              <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                <item.icon className={cn('h-[18px] w-[18px] transition-all duration-300',
                  isActive ? '' : 'text-gray-600 group-hover:text-gray-300'
                )} style={isActive ? { color: item.accent } : undefined} />
                {/* Active dot */}
                {isActive && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: item.accent, boxShadow: `0 0 4px ${item.accent}` }} />
                )}
              </div>

              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.15 }} className="truncate">
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Pipeline progress ring */}
      {sidebarOpen && (
        <div className="absolute bottom-20 left-3 right-3">
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 shrink-0">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2" />
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(0,242,255,0.6)" strokeWidth="2"
                    strokeDasharray={`${pipelineProgress * 94.2} 94.2`} strokeLinecap="round"
                    style={{ filter: 'drop-shadow(0 0 3px rgba(0,242,255,0.4))', transition: 'stroke-dasharray 0.5s ease' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] font-bold text-cyan-400">{completedAgents}</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-300 truncate">Pipeline</p>
                <p className="text-[10px] text-gray-600">{completedAgents}/13 agents</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Engine */}
      {sidebarOpen && (
        <div className="absolute bottom-4 left-3 right-3">
          <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'rgba(0,242,255,0.02)', border: '1px solid rgba(0,242,255,0.06)' }}>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-400 truncate">{aiEngine.model}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
