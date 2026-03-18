'use client';

import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const { sidebarOpen } = useAppStore();

  return (
    <main
      className={cn(
        'min-h-screen pt-16 transition-all duration-300',
        sidebarOpen ? 'pl-64' : 'pl-16'
      )}
      style={{ background: '#020205' }}
    >
      {/* Subtle ambient background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute top-0 right-[20%] w-[600px] h-[400px] bg-cyan-500/[0.015] rounded-full blur-[150px]" />
        <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] bg-violet-500/[0.01] rounded-full blur-[120px]" />
        {/* Subtle dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.015) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="p-6 relative"
        style={{ zIndex: 1 }}
      >
        {children}
      </motion.div>
    </main>
  );
}
