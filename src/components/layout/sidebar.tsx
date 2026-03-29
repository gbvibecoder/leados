'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Workflow, Users, BarChart3, Settings,
  Bot, ChevronLeft, ChevronRight, ChevronDown, Zap, FolderKanban,
  ShieldBan, Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Navigation grouped by section (like the reference) ── */
const sections = [
  {
    label: 'Core',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, accent: '#00f2ff' },
      { name: 'Projects', href: '/projects', icon: FolderKanban, accent: '#3b82f6' },
      { name: 'Pipeline', href: '/leados', icon: Workflow, accent: '#8b5cf6' },
    ],
  },
  {
    label: 'Performance',
    items: [
      { name: 'Analytics', href: '/analytics', icon: BarChart3, accent: '#f59e0b' },
      { name: 'Ad Creator', href: '/ads', icon: Megaphone, accent: '#ff6b00' },
      { name: 'Leads / CRM', href: '/leads', icon: Users, accent: '#10b981' },
    ],
  },
  {
    label: 'System',
    items: [
      { name: 'Blacklist', href: '/blacklist', icon: ShieldBan, accent: '#ef4444' },
      { name: 'Settings', href: '/settings', icon: Settings, accent: '#6b7280' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar, pipeline, projects, selectedProjectId } = useAppStore();
  const [aiEngine, setAiEngine] = useState({ model: 'Loading...', provider: '' });
  const [mounted, setMounted] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch('/api/ai-engine')
      .then(res => res.json())
      .then(data => setAiEngine(data))
      .catch(() => setAiEngine({ model: 'Unknown', provider: '' }));
  }, []);


  const toggleSection = (label: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const completedAgents = pipeline.agents.filter(a => a.status === 'done').length;
  const totalAgents = 13;
  const pipelineProgress = completedAgents / totalAgents;
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const pipelineStatus = pipeline.status === 'running' ? 'Running'
    : pipeline.status === 'paused' ? 'Paused'
    : completedAgents === totalAgents && completedAgents > 0 ? 'Complete'
    : completedAgents > 0 ? 'In Progress'
    : 'Ready';

  const statusColor = pipelineStatus === 'Complete' ? '#10b981'
    : pipelineStatus === 'Running' ? '#00f2ff'
    : pipelineStatus === 'Paused' ? '#f59e0b'
    : pipelineStatus === 'In Progress' ? '#3b82f6'
    : '#6b7280';

  return (
    <aside
      className={cn('fixed left-0 top-0 z-40 h-screen transition-all duration-300 flex flex-col', sidebarOpen ? 'w-64' : 'w-16')}
      style={{
        background: 'linear-gradient(180deg, rgba(8,10,18,0.98), rgba(4,6,12,0.99))',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* ── Background: Cross-grid ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ animation: 'grid-drift 8s linear infinite' }}>
        <defs>
          <pattern id="sidebar-cross-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <line x1="17" y1="20" x2="23" y2="20" stroke="rgba(120,130,180,0.08)" strokeWidth="0.5" strokeLinecap="round" />
            <line x1="20" y1="17" x2="20" y2="23" stroke="rgba(120,130,180,0.08)" strokeWidth="0.5" strokeLinecap="round" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sidebar-cross-grid)" />
      </svg>


      {/* ── Top accent line ── */}
      <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,242,255,0.12), transparent)' }} />

      {/* ══ Logo Header ══ */}
      <div className="relative flex h-14 items-center justify-between px-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        {sidebarOpen ? (
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full orbit-rotate" style={{ border: '1px solid rgba(0,242,255,0.2)' }}>
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 4px #00f2ff' }} />
              </div>
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(0,242,255,0.2)' }}>
                <Zap className="h-3 w-3 text-cyan-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-cinzel text-sm tracking-wider text-white group-hover:text-cyan-400 transition-colors">LEAD OS</span>
              <span className="mono-ui text-[6px] text-gray-600">v4.2 — ACTIVE</span>
            </div>
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full orbit-rotate" style={{ border: '1px solid rgba(0,242,255,0.15)' }}>
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400/60" />
              </div>
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.12), rgba(139,92,246,0.08))' }}>
                <Zap className="h-3 w-3 text-cyan-400" />
              </div>
            </div>
          </Link>
        )}
        <button onClick={toggleSidebar}
          className={cn('rounded-lg p-1.5 text-gray-600 hover:text-cyan-400 hover:bg-white/5 transition-all', !sidebarOpen && 'hidden')}>
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Collapse button when collapsed */}
      {!sidebarOpen && (
        <button onClick={toggleSidebar} className="w-full flex justify-center py-3 text-gray-600 hover:text-cyan-400 transition-colors shrink-0">
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* ══ Pipeline Status Banner ══ */}
      {sidebarOpen && (
        <div className="px-3 pt-3 shrink-0">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{
              background: `linear-gradient(135deg, ${statusColor}12, ${statusColor}06)`,
              border: `1px solid ${statusColor}20`,
            }}
          >
            <div className="relative w-2 h-2 shrink-0">
              <div className="absolute inset-0 rounded-full" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
              {pipelineStatus === 'Running' && (
                <div className="absolute inset-0 rounded-full animate-ping" style={{ background: `${statusColor}40` }} />
              )}
            </div>
            <span className="text-xs font-semibold" style={{ color: statusColor }}>
              {pipelineStatus === 'Complete' ? 'Pipeline Complete' :
               pipelineStatus === 'Running' ? 'Pipeline Running' :
               pipelineStatus === 'Paused' ? 'Pipeline Paused' :
               pipelineStatus === 'In Progress' ? 'Pipeline In Progress' :
               'Pipeline Ready'}
            </span>
          </div>
        </div>
      )}

      {/* ══ Selected Project Card ══ */}
      {sidebarOpen && selectedProject && (
        <div className="px-3 pt-2 shrink-0">
          <div className="rounded-xl p-3 transition-all duration-300 hover:border-cyan-500/15 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, rgba(12,14,22,0.8), rgba(6,8,14,0.9))',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-200 truncate">{selectedProject.name}</span>
              <span className="text-[9px] font-bold rounded-full px-2 py-0.5"
                style={{
                  color: statusColor,
                  background: `${statusColor}15`,
                  border: `1px solid ${statusColor}20`,
                }}
              >
                {pipelineStatus === 'Complete' ? 'DONE' : pipelineStatus.toUpperCase()}
              </span>
            </div>
            <p className="text-[10px] text-gray-600 mb-2">
              Stage: {pipelineStatus === 'Complete' ? 'Complete' : pipelineStatus === 'Running' ? 'Processing' : 'Waiting'}
            </p>
            {/* Progress bar */}
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pipelineProgress * 100}%`,
                  background: `linear-gradient(90deg, ${statusColor}, ${statusColor}cc)`,
                  boxShadow: `0 0 6px ${statusColor}40`,
                }} />
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="mono-ui text-[8px] text-gray-600 uppercase tracking-wider">{completedAgents}/{totalAgents} Agents</span>
              <span className="mono-ui text-[8px] text-gray-500">{Math.round(pipelineProgress * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ══ Scrollable Navigation Sections ══ */}
      <div className={cn('flex-1 overflow-y-auto overflow-x-hidden py-2', sidebarOpen ? 'px-2' : 'px-1.5')}>
        {sections.map((section) => {
          const isCollapsed = collapsedSections.has(section.label);
          return (
            <div key={section.label} className="mb-1">
              {/* Section header */}
              {sidebarOpen && (
                <button
                  onClick={() => toggleSection(section.label)}
                  className="w-full flex items-center justify-between px-2 pt-3 pb-1.5 group"
                >
                  <span className="mono-ui text-[8px] text-gray-600 uppercase tracking-widest group-hover:text-gray-400 transition-colors">
                    {section.label}
                  </span>
                  <ChevronDown className={cn(
                    'h-3 w-3 text-gray-700 group-hover:text-gray-500 transition-all duration-200',
                    isCollapsed && '-rotate-90'
                  )} />
                </button>
              )}

              {/* Section items */}
              <AnimatePresence initial={false}>
                {(!isCollapsed || !sidebarOpen) && (
                  <motion.div
                    initial={sidebarOpen ? { height: 0, opacity: 0 } : false}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden space-y-0.5"
                  >
                    {section.items.map((item) => {
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                      return (
                        <Link key={item.name} href={item.href}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-200 relative group',
                            isActive ? 'text-white' : 'text-gray-500 hover:text-gray-200',
                            !sidebarOpen && 'justify-center px-0 py-2.5'
                          )}
                          style={isActive ? {
                            background: `linear-gradient(135deg, ${item.accent}10, ${item.accent}05, transparent)`,
                            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.03)`,
                          } : undefined}
                        >
                          {/* Active left bar */}
                          {isActive && (
                            <motion.div layoutId="sidebar-active"
                              className="absolute left-0 top-[12%] bottom-[12%] w-[3px] rounded-r-full"
                              style={{ background: item.accent, boxShadow: `0 0 10px ${item.accent}, 0 0 4px ${item.accent}` }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                          )}

                          {/* Hover reveal */}
                          {!isActive && (
                            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200"
                              style={{ background: 'rgba(255,255,255,0.02)' }} />
                          )}

                          <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                            <item.icon className={cn('h-[17px] w-[17px] transition-all duration-200',
                              isActive ? '' : 'text-gray-600 group-hover:text-gray-400'
                            )} style={isActive ? { color: item.accent, filter: `drop-shadow(0 0 3px ${item.accent}60)` } : undefined} />
                          </div>

                          <AnimatePresence>
                            {sidebarOpen && (
                              <motion.span initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                                transition={{ duration: 0.15 }} className="truncate flex-1">
                                {item.name}
                              </motion.span>
                            )}
                          </AnimatePresence>

                          {/* Badge */}
                          {sidebarOpen && item.badge && (
                            <span className="text-[8px] font-bold rounded-full px-1.5 py-0.5 shrink-0"
                              style={{
                                color: item.badge === 'LIVE' ? '#10b981' : '#f59e0b',
                                background: item.badge === 'LIVE' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                                border: `1px solid ${item.badge === 'LIVE' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ══ Bottom Section — Pipeline + AI Engine ══ */}
      <div className="shrink-0 px-3 pb-3 space-y-2">
        {/* Pipeline progress card */}
        {sidebarOpen && (
          <Link href="/leados" className="block">
            <div className="rounded-xl p-3 transition-all duration-300 hover:border-cyan-500/15 group"
              style={{
                background: 'linear-gradient(135deg, rgba(12,14,22,0.8), rgba(6,8,14,0.9))',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 shrink-0">
                  <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="2.5" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(0,242,255,0.6)" strokeWidth="2.5"
                      strokeDasharray={`${pipelineProgress * 94.2} 94.2`} strokeLinecap="round"
                      style={{ filter: 'drop-shadow(0 0 3px rgba(0,242,255,0.4))', transition: 'stroke-dasharray 0.5s ease' }} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-300 truncate">Pipeline</p>
                  <p className="text-[10px] text-gray-600">{completedAgents}/{totalAgents} agents</p>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* AI Engine status */}
        {sidebarOpen && (
          <div className="rounded-xl p-2.5 flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, rgba(12,14,22,0.7), rgba(6,8,14,0.8))',
              border: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <div className="relative w-2 h-2 shrink-0">
              <div className="absolute inset-0 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
              <div className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
            </div>
            <p className="text-[10px] text-gray-500 truncate flex-1">{aiEngine.model}</p>
          </div>
        )}
      </div>

      {/* ── Bottom accent line ── */}
      <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,242,255,0.08), transparent)' }} />
    </aside>
  );
}
