'use client';

import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useAppStore();

  return (
    <main
      className={cn(
        'min-h-screen bg-zinc-950 pt-16 transition-all duration-300',
        sidebarOpen ? 'pl-64' : 'pl-16'
      )}
    >
      <div className="p-6">{children}</div>
    </main>
  );
}
