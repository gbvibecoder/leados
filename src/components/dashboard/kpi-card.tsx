'use client';

import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color?: 'indigo' | 'emerald' | 'amber' | 'red' | 'blue';
}

const colorMap = {
  indigo: { accent: '#6366f1', ring: 'rgba(99,102,241,0.15)' },
  emerald: { accent: '#10b981', ring: 'rgba(16,185,129,0.15)' },
  amber: { accent: '#f59e0b', ring: 'rgba(245,158,11,0.15)' },
  red: { accent: '#ef4444', ring: 'rgba(239,68,68,0.15)' },
  blue: { accent: '#3b82f6', ring: 'rgba(59,130,246,0.15)' },
};

export function KPICard({ title, value, change, changeLabel, icon: Icon, color = 'indigo' }: KPICardProps) {
  const c = colorMap[color];
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="rounded-xl p-5 relative overflow-hidden group transition-all duration-500"
      style={{ background: 'rgba(2,2,5,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-xl"
        style={{ background: `radial-gradient(circle at 80% 20%, ${c.ring}, transparent 60%)` }} />
      {/* Top accent line */}
      <div className="absolute top-0 left-[20%] right-[20%] h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `linear-gradient(90deg, transparent, ${c.accent}50, transparent)` }} />
      <div className="relative flex items-center justify-between">
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl relative"
          style={{ background: `${c.accent}10`, border: `1px solid ${c.accent}20` }}>
          <Icon className="h-5 w-5" style={{ color: c.accent }} />
        </div>
      </div>
      <p className="relative mt-3 text-2xl font-bold text-white">{value}</p>
      {change !== undefined && (
        <div className="relative mt-1.5 flex items-center gap-1">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-emerald-400" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-400" />
          )}
          <span className={cn('text-xs font-medium', isPositive ? 'text-emerald-400' : 'text-red-400')}>
            {isPositive ? '+' : ''}{change}%
          </span>
          {changeLabel && <span className="text-xs text-gray-600">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}
