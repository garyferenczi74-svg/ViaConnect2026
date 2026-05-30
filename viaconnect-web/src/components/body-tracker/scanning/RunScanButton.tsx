'use client';

import { useState } from 'react';
import { Loader2, ScanLine } from 'lucide-react';
import { runScanAnalysis, type ScanProgress } from '@/lib/arnold/scanning/runScanAnalysis';
import { usePremiumEntitlement } from '@/hooks/body-tracker/usePremiumEntitlement';
import { selectScanEntryGate, selectScanCaptureGate } from '@/lib/body-tracker/scan-gate';
import { createClient } from '@/lib/supabase/client';
import { isPermanent, type CapturePayload } from '@/lib/body-tracker/pending-scan-sync';
import {
  acquireSessionLock,
  persistPendingCapture,
  releaseSessionLock,
  resolvePendingScanStore,
} from '@/lib/body-tracker/pending-scan-store';
import { BodyScanPremiumPaywall } from './BodyScanPremiumPaywall';
import { BodyScanFreeTeaserBanner } from './BodyScanFreeTeaserBanner';

interface RunScanButtonProps {
  sessionId: string;
  onComplete?: () => void;
  alreadyScanned?: boolean;
}

export function RunScanButton({ sessionId, onComplete, alreadyScanned }: RunScanButtonProps) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Body-scan entitlement powers both the entry guard point (which surface to
  // show: normal button, free-teaser banner, or paywall) and the pre-capture
  // re-check below (Prompt #169a, spec section 3.1.a + 3.1.b). These are
  // defense-in-depth / UX only. The AUTHORITATIVE gate is the
  // body_photo_sessions finalize trigger (migration 20260516000080): this button
  // runs runScanAnalysis, which writes scan_status = 'complete' DIRECTLY and
  // never calls the body-scan-analyze edge function, so the DB trigger (not the
  // edge function) is what actually enforces age + 24h frequency + entitlement
  // for this path.
  const { premium, freeTeaserUsed, isLoading: entitlementLoading } = usePremiumEntitlement();

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
    // moment of capture (defense against stale client state). A teaser-exhausted
    // non-premium consumer is routed to the paywall, never silently downgraded.
    const captureGate = selectScanCaptureGate({ premium, freeTeaserUsed });
    if (!captureGate.allowed) {
      // The entry gate below will already be rendering the paywall for this
      // state; bail out of starting the scan.
      return;
    }

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
      // Success: the scan finalized; clear the durable pending record.
      if (pending) {
        try { await store.delete(pending.processingKey); } catch { /* best effort */ }
      }
      onComplete?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Scan failed';
      setError(msg);
      setProgress({ phase: 'failed', percent: 0, message: msg });

      // Classify the failure (Task 20). The ScanFinalizeError carries the original
      // error as `cause`, so isPermanent sees the real trigger / network signal.
      //   * PERMANENT (age_restricted / scan_rate_limited / premium_required, or a
      //     4xx): the scan can never finalize; remove the durable record so it is
      //     not retried. The reason is already shown above.
      //   * TRANSIENT (offline / 5xx / timeout): LEAVE the record in the store so
      //     the PendingScansSurface resumes it automatically on reconnect.
      if (pending && isPermanent(e)) {
        try { await store.delete(pending.processingKey); } catch { /* best effort */ }
      }
    } finally {
      releaseSessionLock(sessionId);
    }
  }

  const busy = progress !== null && progress.phase !== 'complete' && progress.phase !== 'failed';
  const label = alreadyScanned ? 'Re run AI scan' : 'Run AI scan';

  // Entry guard point (spec section 3.1.a). While entitlement is loading, do not
  // flash a paywall: fall through to the normal button (disabled), which matches
  // the fail-open-to-teaser default in usePremiumEntitlement.
  const entryGate = entitlementLoading ? 'normal' : selectScanEntryGate({ premium, freeTeaserUsed });

  // Non-premium, teaser already used: the dashboard entry is the paywall.
  if (entryGate === 'paywall') {
    return <BodyScanPremiumPaywall />;
  }

  // Non-premium, teaser unused: invite the free first scan. The banner triggers
  // the same scan kickoff; the capture re-check in start() still applies.
  if (entryGate === 'free_teaser' && !busy) {
    return <BodyScanFreeTeaserBanner onStart={() => { void start(); }} />;
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
