'use client';

import { useState } from 'react';
import { Loader2, ScanLine } from 'lucide-react';
import { runScanAnalysis, type ScanProgress } from '@/lib/arnold/scanning/runScanAnalysis';
import { usePremiumEntitlement } from '@/hooks/body-tracker/usePremiumEntitlement';
import { selectScanEntryGate, selectScanCaptureGate } from '@/lib/body-tracker/scan-gate';
import { createClient } from '@/lib/supabase/client';
import {
  isPermanent,
  classifyFailure,
  recordTransientFailure,
  type CapturePayload,
} from '@/lib/body-tracker/pending-scan-sync';
import {
  acquireSessionLock,
  persistPendingCapture,
  releaseSessionLock,
  resolvePendingScanStore,
} from '@/lib/body-tracker/pending-scan-store';
import {
  trackCaptureStarted,
  trackProcessingStarted,
  trackProcessingCompleted,
  trackProcessingFailed,
} from '@/lib/body-tracker/scan-analytics';
import { BodyScanPremiumPaywall } from './BodyScanPremiumPaywall';

interface RunScanButtonProps {
  sessionId: string;
  onComplete?: () => void;
  alreadyScanned?: boolean;
}

// Map a scan-finalize / processing error to a COARSE, non-sensitive analytics
// error_code (§14). Keys on the stable DB-trigger rejection prefixes (the same
// ones the network-resilience classifier uses) so we can distinguish the common
// business reasons, then falls back to the transient / permanent / unknown
// class. Never returns the raw error text or any value. The wrapped
// ScanFinalizeError carries the original error as `cause`, which isPermanent /
// classifyFailure unwrap, so the original signal drives this.
function coarseProcessingErrorCode(error: unknown): string {
  const msg = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();
  const cause = (error as { cause?: unknown })?.cause;
  const causeMsg = (cause instanceof Error ? cause.message : String(cause ?? '')).toLowerCase();
  const all = `${msg} ${causeMsg}`;
  if (all.includes('age_restricted')) return 'age_restricted';
  if (all.includes('scan_rate_limited')) return 'rate_limited';
  if (all.includes('premium_required')) return 'premium_required';
  if (all.includes('consent')) return 'consent_required';
  if (all.includes('no photos') || all.includes('no_photos')) return 'no_photos';
  if (all.includes('height and weight') || all.includes('required for scan')) return 'missing_stats';
  // Fall back to the transient / permanent / unknown classification.
  return classifyFailure(error);
}

export function RunScanButton({ sessionId, onComplete, alreadyScanned }: RunScanButtonProps) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Body-scan entitlement powers both the entry guard point (which surface to
  // show: normal button or the Platinum upgrade prompt) and the pre-capture
  // re-check below (Prompt #169a, spec section 3.1.a + 3.1.b). Under #169f the
  // Free tier has NO scan and the free teaser is RETIRED: a non-entitled user
  // gets the upgrade prompt. These are defense-in-depth / UX only. The
  // AUTHORITATIVE gate is the body_photo_sessions finalize trigger (migration
  // 20260516000150): this button runs runScanAnalysis, which writes scan_status
  // = 'complete' DIRECTLY and never calls the body-scan-analyze edge function,
  // so the DB trigger (not the edge function) is what actually enforces age +
  // 24h frequency + entitlement for this path.
  const { entitled, isLoading: entitlementLoading } = usePremiumEntitlement();

  // Build the deterministic-key capture payload (Prompt #169b, Task 20, spec
  // section 16.3) from the session row: the pose object paths + the per scan
  // pinned stats + the tier. Persisting THIS before processing makes the capture
  // durable, and re-running it hashes to the same processing key, so a resume
  // reconciles to the same scan row and never duplicates.
  async function buildCapturePayload(): Promise<CapturePayload> {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('body_photo_sessions')
        .select('front_full_path, back_full_path, left_full_path, right_full_path, weight_kg_at_scan, height_cm_at_scan')
        .eq('id', sessionId)
        .maybeSingle();
      const s = (data ?? {}) as Record<string, unknown>;
      return {
        sessionId,
        posePaths: {
          front: (s.front_full_path as string | null) ?? null,
          back: (s.back_full_path as string | null) ?? null,
          left: (s.left_full_path as string | null) ?? null,
          right: (s.right_full_path as string | null) ?? null,
        },
        weightKgAtScan: (s.weight_kg_at_scan as number | null) ?? null,
        heightCmAtScan: (s.height_cm_at_scan as number | null) ?? null,
        tier: 1,
      };
    } catch {
      // Fall back to a session-only payload (still deterministic + idempotent).
      return { sessionId, tier: 1 };
    }
  }

  async function start() {
    setError(null);

    // Pre-capture guard point (spec section 3.1.b): re-check entitlement at the
    // moment of capture (defense against stale client state). A non-entitled
    // consumer is routed to the Platinum upgrade prompt, never silently
    // downgraded.
    const captureGate = selectScanCaptureGate({ entitled });
    if (!captureGate.allowed) {
      // The entry gate below will already be rendering the upgrade prompt for
      // this state; bail out of starting the scan.
      return;
    }

    // Analytics (§14): the capture/scan was started, then processing began.
    // Metadata only (tier + entitlement flag); no biometric value.
    // processedStartMs anchors the processing latency emitted on completion.
    trackCaptureStarted({ tier: 1, is_premium: entitled, capture_mode: 'run_scan' });
    trackProcessingStarted({ tier: 1, is_premium: entitled });
    const processStartMs = Date.now();

    // PERSIST-BEFORE-PROCESS (spec section 16.3): make the capture durable in the
    // pending store BEFORE running analysis / finalize. If the device is offline
    // or the connection drops mid finalize, the captured scan is not lost: the
    // PendingScansSurface retry loop will resume it (re-running the idempotent
    // finalize) on reconnect. Persistence is best effort and never blocks the scan.
    const store = resolvePendingScanStore();
    const payload = await buildCapturePayload();
    const pending = await persistPendingCapture(payload, Date.now(), store);

    // Acquire the per session in-flight lock so the background PendingScansSurface
    // retry loop does not resume THIS session in parallel (which could duplicate
    // the non-unique body_scan_measurements INSERT). If another resume is already
    // running this session, let it own the finalize and do not double-run here.
    if (!acquireSessionLock(sessionId)) return;
    try {
      await runScanAnalysis({
        sessionId,
        onProgress: (p) => setProgress(p),
      });
      // Analytics (§14): processing completed. latency_seconds is a duration
      // only; NO result value (no body fat %, measurements) is carried.
      trackProcessingCompleted({
        tier: 1,
        is_premium: entitled,
        latency_seconds: Math.round((Date.now() - processStartMs) / 1000),
      });
      // Success: the scan finalized; clear the durable pending record.
      if (pending) {
        try { await store.delete(pending.processingKey); } catch { /* best effort */ }
      }
      onComplete?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scan failed';
      setError(msg);
      setProgress({ phase: 'failed', percent: 0, message: msg });

      // Analytics (§14): processing failed. error_code is a COARSE category
      // derived from the failure class, never the raw error text or any value.
      trackProcessingFailed({
        error_code: coarseProcessingErrorCode(e),
        latency_seconds: Math.round((Date.now() - processStartMs) / 1000),
      });

      // Classify the failure (Task 20). The ScanFinalizeError carries the original
      // error as `cause`, so isPermanent sees the real trigger / network signal.
      //   * PERMANENT (age_restricted / scan_rate_limited / premium_required, or a
      //     4xx): the scan can never finalize; remove the durable record so it is
      //     not retried. The reason is already shown above.
      //   * TRANSIENT (offline / 5xx / timeout): LEAVE the record in the store so
      //     the PendingScansSurface resumes it automatically on reconnect. RECORD
      //     this capture-time attempt on the record (lastAttemptAtMs + attemptCount)
      //     so the backoff schedule starts from NOW. Without it, lastAttemptAtMs
      //     stays null, which nextRetryDelayMs reads as "due immediately" so the
      //     very first background tick would resume right away, skipping the 30s
      //     tier-1 wait (and hammering a still-down connection). Reuse the pure
      //     recordTransientFailure reducer that the resume loop uses, then persist.
      if (pending && isPermanent(e)) {
        try { await store.delete(pending.processingKey); } catch { /* best effort */ }
      } else if (pending) {
        const [updated] = recordTransientFailure([pending], pending.processingKey, Date.now(), msg);
        if (updated) {
          try { await store.put(updated); } catch { /* best effort */ }
        }
      }
    } finally {
      releaseSessionLock(sessionId);
    }
  }

  const busy = progress !== null && progress.phase !== 'complete' && progress.phase !== 'failed';
  const label = alreadyScanned ? 'Re run AI scan' : 'Run AI scan';

  // Entry guard point (spec section 3.1.a). While entitlement is loading, do not
  // flash the upgrade prompt: fall through to the normal button (disabled),
  // which avoids a paywall flash on a slow entitlement read.
  const entryGate = entitlementLoading ? 'normal' : selectScanEntryGate({ entitled });

  // Non-entitled (Free / Gold / no membership): the dashboard entry is the
  // Platinum upgrade prompt. Under #169f there is no free teaser.
  if (entryGate === 'upgrade_platinum') {
    return <BodyScanPremiumPaywall />;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={start}
        disabled={busy || entitlementLoading}
        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-[#E8803A]/40 bg-[#E8803A]/15 px-4 py-2.5 text-sm font-semibold text-[#E8803A] hover:bg-[#E8803A]/25 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <ScanLine className="h-4 w-4" strokeWidth={1.5} />}
        {busy ? progress?.message ?? 'Scanning' : label}
      </button>
      {busy && progress && (
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-[#E8803A] transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
          <p className="text-[11px] text-white/55">{progress.message}</p>
        </div>
      )}
      {error && <p className="text-xs text-[#FCA5A5]">{error}</p>}
    </div>
  );
}
