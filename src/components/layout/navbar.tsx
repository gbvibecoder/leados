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
        'fixed top-0 right-0 z-30 flex h-16 items-center justify-between px-6 transition-all',
        sidebarOpen ? 'left-64' : 'left-16'
      )}
      style={{
        background: 'rgba(2,2,5,0.8)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex items-center gap-4">
        <h2 className="font-cinzel text-base tracking-wider text-white/80">LeadOS</h2>

        {selectedProject && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-1.5"
            style={{ background: 'rgba(0,242,255,0.05)', border: '1px solid rgba(0,242,255,0.1)' }}>
            {selectedProject.type === 'internal' ? (
              <Building2 className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Globe className="h-3.5 w-3.5 text-cyan-400" />
            )}
            <span className="text-xs font-medium text-gray-300">{selectedProject.name}</span>
            <button onClick={() => selectProject(null)}
              className="ml-1 rounded p-0.5 text-gray-500 hover:text-cyan-400 transition-colors" title="Clear project filter">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
          <input type="text" placeholder="Search agents, leads..."
            className="h-9 w-64 rounded-lg pl-10 pr-4 text-sm cosmic-input" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative rounded-lg p-2 text-gray-500 hover:text-cyan-400 transition-colors">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-500" style={{ boxShadow: '0 0 6px rgba(0,242,255,0.4)' }} />
        </button>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-300 transition-all hover:text-white"
            style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
            <User className="h-4 w-4" />
            <span className="hidden md:inline">{userName}</span>
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg py-1 shadow-xl"
              style={{ background: 'rgba(2,2,5,0.95)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}>
              <button onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
