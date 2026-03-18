'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Workflow, Users, BarChart3, Settings,
  Bot, ChevronLeft, ChevronRight, Zap, FolderKanban, ShieldBan,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'LeadOS Pipeline', href: '/leados', icon: Workflow },
  { name: 'Leads / CRM', href: '/leads', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Blacklist', href: '/blacklist', icon: ShieldBan },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const [aiEngine, setAiEngine] = useState({ model: 'Loading...', provider: '' });

  useEffect(() => {
    fetch('/api/ai-engine')
      .then(res => res.json())
      .then(data => setAiEngine(data))
      .catch(() => setAiEngine({ model: 'Unknown', provider: '' }));
  }, []);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
      style={{
        background: 'rgba(2,2,5,0.95)',
        borderRight: '1px solid rgba(0,242,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo area */}
      <div className="flex h-16 items-center justify-between px-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        {sidebarOpen && (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg relative"
              style={{ background: 'linear-gradient(135deg, rgba(0,242,255,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(0,242,255,0.2)' }}>
              <Zap className="h-4 w-4 text-cyan-400" />
            </div>
            <span className="font-cinzel text-base tracking-wider text-white">LEAD OS</span>
          </Link>
        )}
        <button onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-gray-600 hover:text-cyan-400 transition-colors">
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-4 space-y-1 px-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link key={item.name} href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 relative group',
                isActive
                  ? 'text-cyan-400'
                  : 'text-gray-500 hover:text-white'
              )}
              style={isActive ? {
                background: 'rgba(0,242,255,0.05)',
                boxShadow: 'inset 0 0 20px rgba(0,242,255,0.03)',
              } : undefined}
            >
              {/* Active indicator line */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-full bg-cyan-400"
                  style={{ boxShadow: '0 0 8px rgba(0,242,255,0.5)' }} />
              )}
              <item.icon className={cn('h-5 w-5 flex-shrink-0 transition-colors', isActive ? 'text-cyan-400' : 'text-gray-600 group-hover:text-gray-300')} />
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* AI Engine indicator */}
      {sidebarOpen && (
        <div className="absolute bottom-4 left-3 right-3">
          <div className="rounded-lg p-3" style={{ background: 'rgba(0,242,255,0.03)', border: '1px solid rgba(0,242,255,0.08)' }}>
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-cyan-400/60" />
              <span className="text-xs font-medium text-gray-400">AI Engine</span>
            </div>
            <p className="mt-1 text-xs text-gray-600 truncate">{aiEngine.model}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
