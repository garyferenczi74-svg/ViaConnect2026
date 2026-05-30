'use client';

// PendingScansSurface.tsx  (Prompt #169b, Task 20, spec section 16.3)
//
// The small "scans waiting to finish" surface on the body-tracker scan area. It
// lists captures that were taken offline or hit a transient network failure mid
// processing, and could not yet be finalized. Each row offers a "Finish
// processing" action that resumes the scan (re-running the idempotent finalize
// with the same session id, so a resume reconciles to the same scan row and never
// duplicates). The queue + retry schedule + classifier all live in the
// usePendingScans hook / the pure pending-scan-sync module.
//
// BEHAVIOUR:
//   * Renders NOTHING when there is nothing pending (no clutter on the common path).
//   * A captured-and-saved row reads reassuringly ("we will finish when you
//     reconnect"); it is being auto-retried on the spec schedule in the background.
//   * A PERMANENT rejection (the DB finalize trigger raised age_restricted /
//     scan_rate_limited / premium_required, or a consent/age gate) is surfaced as
//     a distinct message and the item is removed (never retried).
//
// Styling mirrors the body-tracker callout cards (info/teal accent). Lucide icons
// at strokeWidth 1.5. Copy uses commas/colons only (no dashes per standing rules).

import { CloudOff, Loader2, RefreshCw, AlertCircle, X } from 'lucide-react';
import { usePendingScans } from '@/hooks/body-tracker/usePendingScans';
import {
  PENDING_SCANS_SURFACE_TITLE,
  PENDING_SCANS_FINISH_ACTION_LABEL,
  CAPTURE_SAVED_OFFLINE_MESSAGE,
  pendingItemStatusLine,
} from '@/lib/body-tracker/pending-scan-sync';

interface PendingScansSurfaceProps {
  className?: string;
  // Called after a resume removes an item (success or permanent), so the parent
  // page can refresh the latest-session view.
  onResolved?: () => void;
}

export function PendingScansSurface({ className = '', onResolved }: PendingScansSurfaceProps) {
  const { items, isLoading, isProcessing, permanentError, resumeNow, dismiss } = usePendingScans();

  // Nothing pending and no rejection to show: render nothing (no clutter).
  if (isLoading) return null;
  if (items.length === 0 && !permanentError) return null;

  return (
    <section
      data-testid="pending-scans-surface"
      className={`rounded-2xl border border-[#2DA5A0]/30 bg-[#2DA5A0]/[0.08] p-4 ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-[#2DA5A0]/20">
          <CloudOff className="h-4.5 w-4.5 text-[#2DA5A0]" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{PENDING_SCANS_SURFACE_TITLE}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-white/65">{CAPTURE_SAVED_OFFLINE_MESSAGE}</p>
        </div>
      </div>

      {/* Permanent rejection (surfaced once, the item already removed). */}
      {permanentError && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#FCA5A5]/30 bg-[#FCA5A5]/10 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-[#FCA5A5]" strokeWidth={1.5} />
          <p className="text-xs leading-relaxed text-[#FCA5A5]">{permanentError}</p>
        </div>
      )}

      {/* The pending captures. */}
      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((item) => {
            const busy = item.status === 'processing';
            return (
              <li
                key={item.processingKey}
                data-testid="pending-scan-item"
                className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/85">{pendingItemStatusLine(item)}</p>
                  {item.attemptCount > 0 && (
                    <p className="mt-0.5 text-[11px] text-white/45">
                      Retried {item.attemptCount} {item.attemptCount === 1 ? 'time' : 'times'} so far
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    await resumeNow(item.processingKey);
                    onResolved?.();
                  }}
                  disabled={busy || isProcessing}
                  className="flex flex-none items-center justify-center gap-1.5 rounded-xl border border-[#2DA5A0]/40 bg-[#2DA5A0]/20 px-3 py-2 text-xs font-semibold text-[#2DA5A0] hover:bg-[#2DA5A0]/30 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  {busy ? 'Finishing' : PENDING_SCANS_FINISH_ACTION_LABEL}
                </button>

                <button
                  type="button"
                  aria-label="Dismiss this pending scan"
                  onClick={() => void dismiss(item.processingKey)}
                  disabled={busy}
                  className="flex h-9 w-9 flex-none items-center justify-center rounded-lg text-white/40 hover:bg-white/[0.06] hover:text-white/70 disabled:opacity-40"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
