'use client';

import { Activity, Apple, Brain, Heart, Plug, Watch, type LucideIcon } from 'lucide-react';
import type { AppCategory } from '@/lib/integrations/appRegistry';

const CATEGORY_ICONS: Record<AppCategory, LucideIcon> = {
  nutrition: Apple,
  fitness: Activity,
  mindfulness: Brain,
  health: Heart,
};

interface AppConnectionCardProps {
  app: {
    id: string;
    name: string;
    category: AppCategory;
    dataProvided: string[];
  };
  connection?: {
    isActive: boolean;
    lastSyncAt: string | null;
    syncStatus: 'healthy' | 'error' | 'reauth_needed';
  };
  onConnect: () => void;
  onDisconnect: () => void;
}

function formatTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min} min ago`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function AppConnectionCard({ app, connection, onConnect, onDisconnect }: AppConnectionCardProps) {
  const Icon = CATEGORY_ICONS[app.category] ?? Plug;
  const isConnected = connection?.isActive;

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#1E3054]/60 backdrop-blur-md p-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.06]">
          <Icon className="h-5 w-5 text-white/50" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{app.name}</p>
          <p className="truncate text-xs text-white/40">{app.dataProvided.join(', ')}</p>
          {isConnected && connection.lastSyncAt && (
            <p className="text-[10px] text-white/30">Last sync: {formatTimeAgo(connection.lastSyncAt)}</p>
          )}
        </div>
      </div>

      {isConnected ? (
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`h-2 w-2 rounded-full ${
            connection.syncStatus === 'healthy' ? 'bg-[#22C55E]'
              : connection.syncStatus === 'error' ? 'bg-red-400'
              : 'bg-[#F59E0B]'
          }`} />
          <button
            onClick={onDisconnect}
            className="text-xs text-white/30 hover:text-red-400 transition-colors"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={onConnect}
          className="flex-shrink-0 rounded-lg bg-[#2DA5A0] px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-[#2DA5A0]/90"
        >
          Connect
        </button>
      )}
    </div>
  );
}
