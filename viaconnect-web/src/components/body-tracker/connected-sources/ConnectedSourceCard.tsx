'use client';

// Prompt 201: one card per CONNECTED_SOURCES registry entry.
//
// The card is presentational. It receives the source, its last sync time, the
// detected platform, and click handlers. The page decides which action a source
// gets; the card only renders honest controls. A scaffold source never shows a
// connect flow that cannot complete: it renders a disabled control plus the
// honest note from the registry.
//
// Design tokens: Card surface #1E3054 on Deep Navy #1A2744, Teal #2DA5A0 accent,
// Orange #B75E18 reserved for warnings. Instrument Sans is inherited from the
// app shell. Lucide icons render at strokeWidth 1.5. No emojis. No em or en
// dashes anywhere.

import { motion } from 'framer-motion';
import { Upload, Plus, Lock, CheckCircle2, Link2, ArrowRight } from 'lucide-react';
import type { ConnectedSource } from '@/lib/body-tracker/connected-sources/registry';
import { resolveLastSyncState } from '@/lib/body-tracker/last-sync-state';
import { resolveSourceIcon } from './iconMap';

export type SourceAction =
  | { kind: 'import' }
  | { kind: 'add_reading' }
  | { kind: 'native_connect' }
  | { kind: 'oauth_connect'; connected: boolean }
  | { kind: 'superseded'; via: string; viaId: string }
  | { kind: 'disabled'; reason: string };

interface ConnectedSourceCardProps {
  source: ConnectedSource;
  lastSyncAt?: string;
  action: SourceAction;
  index: number;
  onImport: () => void;
  onAddReading: () => void;
  onNativeConnect: () => void;
  onConnect: (sourceId: string) => void;
}

function formatLastSync(iso: string | undefined): string {
  return resolveLastSyncState({
    linked: Boolean(iso),
    lastSyncAt: iso ?? null,
  }).label;
}

function StatusPill({
  status,
  lastSyncAt,
}: {
  status: ConnectedSource['status'];
  lastSyncAt?: string;
}) {
  if (status === 'active') {
    if (!lastSyncAt) return null;
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[#2DA5A0]/15 px-2.5 py-1 text-[11px] font-medium text-[#2DA5A0] ring-1 ring-inset ring-[#2DA5A0]/30">
        <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
        Active
      </span>
    );
  }
  if (status === 'deprecated') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/45 ring-1 ring-inset ring-white/10">
        Moved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/45 ring-1 ring-inset ring-white/10">
      Coming soon
    </span>
  );
}

export function ConnectedSourceCard({
  source,
  lastSyncAt,
  action,
  index,
  onImport,
  onAddReading,
  onNativeConnect,
  onConnect,
}: ConnectedSourceCardProps) {
  const Icon = resolveSourceIcon(source.icon);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="flex h-full flex-col gap-4 rounded-2xl border border-white/[0.08] bg-[#1E3054] p-4 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] sm:p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#1A2744] ring-1 ring-inset ring-white/[0.06]">
            <Icon className="h-5 w-5 text-[#2DA5A0]" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{source.displayName}</p>
            <p className="text-[11px] text-white/45">{formatLastSync(lastSyncAt)}</p>
          </div>
        </div>
        <StatusPill status={source.status} lastSyncAt={lastSyncAt} />
      </div>

      {/* Capability note */}
      {source.notes && (
        <p className="text-[12px] leading-relaxed text-white/55">{source.notes}</p>
      )}

      {/* Provided data types */}
      {source.dataTypes && source.dataTypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {source.dataTypes.map((t) => (
            <span
              key={t}
              className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium text-white/55 ring-1 ring-inset ring-white/10"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Action */}
      <div className="mt-auto pt-1">
        {action.kind === 'import' && (
          <button
            type="button"
            onClick={onImport}
            aria-label={`Import from ${source.displayName}`}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
          >
            <Upload className="h-4 w-4" strokeWidth={1.5} />
            Import
          </button>
        )}

        {action.kind === 'add_reading' && (
          <button
            type="button"
            onClick={onAddReading}
            aria-label={`Add a reading for ${source.displayName}`}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add reading
          </button>
        )}

        {action.kind === 'native_connect' && (
          <button
            type="button"
            onClick={onNativeConnect}
            aria-label={`Connect ${source.displayName}`}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
          >
            Connect {source.displayName}
          </button>
        )}

        {action.kind === 'oauth_connect' && (
          <button
            type="button"
            onClick={() => onConnect(source.id)}
            aria-label={`Connect ${source.displayName}`}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[#2DA5A0] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2DA5A0]/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
          >
            <Link2 className="h-4 w-4" strokeWidth={1.5} />
            {action.connected ? 'Reconnect' : `Connect ${source.displayName}`}
          </button>
        )}

        {action.kind === 'superseded' && (
          <button
            type="button"
            onClick={() => onConnect(action.viaId)}
            aria-label={`Connect through ${action.via}`}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/10 px-4 text-sm font-semibold text-[#2DA5A0] transition-colors hover:bg-[#2DA5A0]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/60"
          >
            Connect via {action.via}
            <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}

        {action.kind === 'disabled' && (
          <button
            type="button"
            disabled
            aria-disabled="true"
            aria-label={`${source.displayName} is not available yet`}
            className="flex min-h-[44px] w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm font-medium text-white/40"
          >
            <Lock className="h-4 w-4" strokeWidth={1.5} />
            {action.reason}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default ConnectedSourceCard;
