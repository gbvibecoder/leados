'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Workflow,
  Users,
  BarChart3,
  Settings,
  Bot,
  ChevronLeft,
  ChevronRight,
  Zap,
  FolderKanban,
  ShieldBan,
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
        'fixed left-0 top-0 z-40 h-screen border-r border-zinc-800 bg-zinc-950 transition-all duration-300',
        sidebarOpen ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-4">
        {sidebarOpen && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">LeadOS</span>
          </Link>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      <nav className="mt-4 space-y-1 px-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-600/10 text-indigo-400'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {sidebarOpen && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-medium text-zinc-300">AI Engine</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">{aiEngine.model}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
