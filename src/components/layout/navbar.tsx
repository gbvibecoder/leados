'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, User, Building2, Globe, X, LogOut } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function Navbar() {
  const router = useRouter();
  const { sidebarOpen, projects, selectedProjectId, selectProject } = useAppStore();
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userName, setUserName] = useState('User');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('leados_user');
      if (stored) {
        const user = JSON.parse(stored);
        setUserName(user.name || user.email?.split('@')[0] || 'User');
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const logout = useAppStore((s) => s.logout);

  const handleLogout = () => {
    localStorage.removeItem('leados_token');
    localStorage.removeItem('leados_user');
    logout();
    router.push('/login');
  };

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 backdrop-blur-sm transition-all',
        sidebarOpen ? 'left-64' : 'left-16'
      )}
    >
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-white">LeadOS</h2>

        {/* Active project indicator */}
        {selectedProject && (
          <div className="flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-1.5">
            {selectedProject.type === 'internal' ? (
              <Building2 className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Globe className="h-3.5 w-3.5 text-indigo-400" />
            )}
            <span className="text-xs font-medium text-zinc-300">{selectedProject.name}</span>
            <button
              onClick={() => selectProject(null)}
              className="ml-1 rounded p-0.5 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
              title="Clear project filter"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search agents, leads..."
            className="h-9 w-64 rounded-lg border border-zinc-700 bg-zinc-900 pl-10 pr-4 text-sm text-zinc-300 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            <User className="h-4 w-4" />
            <span className="hidden md:inline">{userName}</span>
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-zinc-800"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
