'use client';

import { motion } from 'framer-motion';
import {
  Watch,
  Smartphone,
  Activity,
  CircleDot,
  Scale,
  Scan,
  Heart,
  Utensils,
  PieChart,
  Bike,
  RefreshCw,
  Unplug,
  Plug,
  AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

/* ── Icon lookup ─────────────────────────────────────── */
const ICON_MAP: Record<string, LucideIcon> = {
  Watch,
  Smartphone,
  Activity,
  CircleDot,
  Scale,
  Scan,
  Heart,
  Utensils,
  PieChart,
  Bike,
};

/* ── Relative time helper ────────────────────────────── */
function formatRelative(iso: string | undefined): string {
  if (!iso) return 'never';
  const diff = Date.now() - new Date(iso).getTime();
  const min = diff / (1000 * 60);
  if (min < 1) return 'just now';
  if (min < 60) return `${Math.round(min)} min ago`;
  const hours = min / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/* ── Status config ───────────────────────────────────── */
const STATUS_CONFIG: Record<
  string,
  { label: string; dotColor: string; textColor: string }
> = {
  connected:    { label: 'Connected',    dotColor: '#22C55E', textColor: 'text-green-400' },
  disconnected: { label: 'Disconnected', dotColor: '#6B7280', textColor: 'text-white/40' },
  syncing:      { label: 'Syncing',      dotColor: '#2DA5A0', textColor: 'text-[#2DA5A0]' },
  error:        { label: 'Error',        dotColor: '#EF4444', textColor: 'text-red-400' },
};

/* ── Types ───────────────────────────────────────────── */
export interface ConnectionSource {
  id: string;
  name: string;
  sourceType: 'plugin' | 'wearable';
  icon: string;
  description: string;
  dataProvided: string[];
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'syncing' | 'error';

interface ConnectionCardProps {
  source: ConnectionSource;
  status: ConnectionStatus;
  lastSyncAt?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onSyncNow: () => void;
}

/* ── Component ───────────────────────────────────────── */
export function ConnectionCard({
  source,
  status,
  lastSyncAt,
  onConnect,
  onDisconnect,
  onSyncNow,
}: ConnectionCardProps) {
  const Icon = ICON_MAP[source.icon] ?? Smartphone;
  const cfg = STATUS_CONFIG[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/5 p-4 backdrop-blur-md"
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.07]">
            <Icon className="h-5 w-5 text-white/60" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{source.name}</p>
            <p className="text-xs text-white/45">{source.description}</p>
          </div>
        </div>

        {/* Status dot */}
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          {status === 'syncing' ? (
            <RefreshCw
              className="h-3 w-3 animate-spin text-[#2DA5A0]"
              strokeWidth={1.5}
            />
          ) : (
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: cfg.dotColor }}
            />
          )}
          <span className={`text-[10px] font-medium ${cfg.textColor}`}>
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Data badges */}
      <div className="flex flex-wrap gap-1">
        {source.dataProvided.map((d) => (
          <span
            key={d}
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] text-white/40"
          >
            {d}
          </span>
        ))}
      </div>

      {/* Last sync */}
      {(status === 'connected' || status === 'syncing') && (
        <p className="text-[10px] text-white/30">
          Last synced: {formatRelative(lastSyncAt)}
        </p>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400" strokeWidth={1.5} />
          <span className="text-xs text-red-300">
            Connection lost. Please reconnect.
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-1">
        {status === 'disconnected' && (
          <button
            onClick={onConnect}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 text-sm font-medium text-white transition-colors hover:bg-[#2DA5A0]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
          >
            <Plug className="h-4 w-4" strokeWidth={1.5} />
            Connect
          </button>
        )}

        {status === 'error' && (
          <button
            onClick={onConnect}
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 text-sm font-medium text-white transition-colors hover:bg-[#2DA5A0]/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
          >
            <Plug className="h-4 w-4" strokeWidth={1.5} />
            Reconnect
          </button>
        )}

        {(status === 'connected' || status === 'syncing') && (
          <>
            <button
              onClick={onSyncNow}
              disabled={status === 'syncing'}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/10 px-4 text-sm font-medium text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/20 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
            >
              <RefreshCw className="h-4 w-4" strokeWidth={1.5} />
              Sync Now
            </button>
            <button
              onClick={onDisconnect}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm font-medium text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50"
            >
              <Unplug className="h-4 w-4" strokeWidth={1.5} />
              Disconnect
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
