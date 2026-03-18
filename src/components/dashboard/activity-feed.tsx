'use client';

import { useState, useEffect } from 'react';
import { Bot, CheckCircle2, AlertCircle, Zap, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore, ActivityItem } from '@/lib/store';
import { leados } from '@/lib/api';

const iconMap = {
  agent_started: { icon: Bot, color: 'text-cyan-400' },
  agent_completed: { icon: CheckCircle2, color: 'text-emerald-400' },
  agent_error: { icon: AlertCircle, color: 'text-red-400' },
  pipeline_completed: { icon: Zap, color: 'text-cyan-400' },
  info: { icon: Info, color: 'text-gray-500' },
};

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${h}:${m}:${s}`;
}

const PLACEHOLDER_ITEM: ActivityItem = {
  id: '1',
  type: 'info',
  message: 'No activity yet. Run a pipeline to get started.',
  timestamp: '',
};

export function ActivityFeed() {
  const { activityFeed } = useAppStore();
  const [dbActivity, setDbActivity] = useState<ActivityItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    leados.activity().then((items) => {
      setDbActivity(items.map((item: any) => ({
        id: item.id,
        type: item.type as ActivityItem['type'],
        message: item.message,
        agentName: item.agentName,
        timestamp: item.timestamp,
      })));
    }).catch(() => {});
  }, []);

  const items: ActivityItem[] = activityFeed.length > 0
    ? activityFeed
    : dbActivity.length > 0
      ? dbActivity
      : [PLACEHOLDER_ITEM];

  return (
    <div className="rounded-xl p-5"
      style={{ background: 'rgba(2,2,5,0.6)', border: '1px solid rgba(255,255,255,0.04)' }}>
      <h3 className="mb-4 text-sm font-semibold text-gray-200">Recent Activity</h3>
      <div className="space-y-3">
        {items.slice(0, 10).map((item) => {
          const config = iconMap[item.type];
          const Icon = config.icon;
          return (
            <div key={item.id} className="flex gap-3 group">
              <div className="mt-0.5 shrink-0">
                <div className="w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <Icon className={cn('h-3.5 w-3.5', config.color)} />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-gray-300">{item.message}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  {item.agentName && <span className="text-xs text-gray-600">{item.agentName}</span>}
                  {mounted && item.timestamp && <span className="text-xs text-gray-700">{formatTime(item.timestamp)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
