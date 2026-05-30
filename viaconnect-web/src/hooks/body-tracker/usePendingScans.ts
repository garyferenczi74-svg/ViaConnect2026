'use client';

// usePendingScans  the React binding for the body-scan network-resilience queue
// (Prompt #169b, Task 20, spec section 16.3).
//
// RESPONSIBILITY (thin I/O + scheduling around the pure contract):
//   * Load the pending captures from the PendingScanStore (IndexedDB, or the
//     in-memory fallback) on mount, so a scan captured offline and left
//     unprocessed surfaces on app reopen.
//   * Drive the BACKGROUND RETRY on the spec schedule (every 30s for the first
//     5 minutes, then every 5 minutes, then every 30 minutes, up to 24 hours),
//     and ALSO retry immediately on the browser 'online' event (reconnect).
//   * For each due item, RESUME the scan by re-running runScanAnalysis with the
//     SAME session id (the finalize UPDATE is already idempotent via
//     `.neq('scan_status','complete')`, so a resume reconciles to the SAME scan
//     row and never duplicates).
//   * Classify the outcome with the pure classifier: a TRANSIENT failure keeps
//     the item (the scan is not lost) and schedules the next retry; a PERMANENT
//     rejection (the DB finalize-trigger raises age_restricted /
//     scan_rate_limited / premium_required, or a consent/age gate) REMOVES the
//     item and surfaces the specific reason. Permanent rejections are NEVER
//     retried.
//
// ALL of the decision logic (key, classifier, schedule, lifecycle) lives in the
// pure, unit-tested module src/lib/body-tracker/pending-scan-sync.ts; this hook
// is only effects + state, matching the useCaqFreshness / useBiometricConsent
// pattern.

import { useCallback, useEffect, useRef, useState } from 'react';
import { runScanAnalysis } from '@/lib/arnold/scanning/runScanAnalysis';
import {
  applyProcessingFailure,
  isDueForRetry,
  nextRetryDelayMs,
  removeItem,
  type CapturePayload,
  type PendingScanItem,
} from '@/lib/body-tracker/pending-scan-sync';
import {
  acquireSessionLock,
  persistPendingCapture,
  releaseSessionLock,
  resolvePendingScanStore,
} from '@/lib/body-tracker/pending-scan-store';

// The minimum cadence of the background tick. We never schedule a sleep longer
// than this so a newly-due item (or a tier transition) is picked up promptly,
// even though the per-item interval may be much longer (5m / 30m). The pure
// nextRetryDelayMs decides whether each item is actually due on each tick.
const TICK_FLOOR_MS = 30_000;

export interface UsePendingScansResult {
  // The pending captures, newest first. Empty when nothing is waiting.
  items: PendingScanItem[];
  // True while the initial store read is in flight.
  isLoading: boolean;
  // True while any resume is currently running (so the surface can show a spinner).
  isProcessing: boolean;
  // The last PERMANENT rejection message surfaced (e.g. the mapped trigger
  // rejection), or null. The surface shows this prominently; it is cleared when a
  // new resume starts.
  permanentError: string | null;
  // Persist a freshly captured scan to the queue (call IMMEDIATELY after capture,
  // before processing). Idempotent on the deterministic key.
  enqueueCapture: (payload: CapturePayload) => Promise<void>;
  // Manually resume one pending item now (the "Finish processing" action).
  resumeNow: (processingKey: string) => Promise<void>;
  // Resume every due item now (used by the online-event handler + manual "retry all").
  resumeAllDue: () => Promise<void>;
  // Drop a pending item from the queue without processing (defensive; not shown
  // by default, but lets the surface offer a discard).
  dismiss: (processingKey: string) => Promise<void>;
}

export function usePendingScans(): UsePendingScansResult {
  const [items, setItems] = useState<PendingScanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permanentError, setPermanentError] = useState<string | null>(null);

  // The store is resolved once (IndexedDB or in-memory fallback) and reused.
  const storeRef = useRef(resolvePendingScanStore());
  // A ref mirror of items so the tick / online callbacks always see the latest
  // list without being re-created (and without stale closures).
  const itemsRef = useRef<PendingScanItem[]>([]);
  itemsRef.current = items;
  // Keys currently being resumed, to prevent a tick + an online event (or a
  // manual tap) from double-firing the same item.
  const inFlightRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);

  const refreshFromStore = useCallback(async () => {
    try {
      const all = await storeRef.current.getAll();
      // Newest capture first for the surface.
      all.sort((a, b) => b.firstCapturedAtMs - a.firstCapturedAtMs);
      if (mountedRef.current) setItems(all);
    } catch {
      // A read failure must not crash the surface; leave the current list.
    }
  }, []);

  // Initial load (surfaces captures left unprocessed from a prior session).
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      await refreshFromStore();
      if (mountedRef.current) setIsLoading(false);
    })();
    return () => {
      mountedRef.current = false;
    };
  }, [refreshFromStore]);

  // Resume a single item by key. Pure-classifier-driven: success removes it,
  // transient keeps it (records the attempt), permanent removes it + surfaces.
  const resumeItem = useCallback(async (item: PendingScanItem): Promise<void> => {
    const key = item.processingKey;
    if (inFlightRef.current.has(key)) return; // already running in this hook
    // Cross-component lock: do not resume a session the live RunScanButton (or
    // another resume) is already analyzing in this tab. The body_scan_measurements
    // INSERT is not unique-constrained, so concurrent analyses of one session
    // could otherwise duplicate a measurement row.
    if (!acquireSessionLock(item.sessionId)) return;
    inFlightRef.current.add(key);
    if (mountedRef.current) {
      setIsProcessing(true);
      setPermanentError(null);
    }

    const store = storeRef.current;

    try {
      // RESUME via the primary path with the SAME session id. runScanAnalysis
      // re-reads the session + photos from the DB and re-runs finalize, whose
      // UPDATE is idempotent (`.neq('scan_status','complete')`); a session that
      // already completed simply no-ops, so a resume never duplicates the scan.
      await runScanAnalysis({ sessionId: item.sessionId });

      // Success: remove from the store + the list.
      await store.delete(key);
      if (mountedRef.current) setItems((prev) => removeItem(prev, key));
    } catch (e) {
      const now = Date.now();
      // Route via the pure lifecycle: permanent -> remove; transient/unknown ->
      // keep (applyProcessingFailure classifies internally via the same classifier).
      const result = applyProcessingFailure(itemsRef.current, key, e, now);

      if (result.outcome === 'removed_permanent') {
        await store.delete(key);
        const msg = e instanceof Error ? e.message : 'Scan could not be completed';
        if (mountedRef.current) {
          setItems((prev) => removeItem(prev, key));
          setPermanentError(msg);
        }
      } else {
        // Transient / unknown: persist the recorded attempt so the 24h window +
        // attempt count survive a reload, and keep the item in the list.
        const updated = result.items.find((x) => x.processingKey === key);
        if (updated) {
          try {
            await store.put(updated);
          } catch {
            /* persistence best-effort; the in-session list is still correct */
          }
        }
        if (mountedRef.current) setItems(result.items.slice().sort((a, b) => b.firstCapturedAtMs - a.firstCapturedAtMs));
      }
    } finally {
      inFlightRef.current.delete(key);
      releaseSessionLock(item.sessionId);
      if (mountedRef.current) setIsProcessing(inFlightRef.current.size > 0);
    }
  }, []);

  const resumeNow = useCallback(async (processingKey: string): Promise<void> => {
    const item = itemsRef.current.find((x) => x.processingKey === processingKey);
    if (item) await resumeItem(item);
  }, [resumeItem]);

  const resumeAllDue = useCallback(async (): Promise<void> => {
    const now = Date.now();
    // Snapshot the due items (those whose schedule says retry-now and not in flight).
    const due = itemsRef.current.filter(
      (it) =>
        it.status !== 'processing' &&
        !inFlightRef.current.has(it.processingKey) &&
        isDueForRetry({
          firstCapturedAtMs: it.firstCapturedAtMs,
          lastAttemptAtMs: it.lastAttemptAtMs,
          nowMs: now,
        }),
    );
    // Resume sequentially: the client analysis is CPU heavy, and serializing
    // avoids hammering the device / network with parallel resumes.
    for (const it of due) {
      // eslint-disable-next-line no-await-in-loop
      await resumeItem(it);
    }
  }, [resumeItem]);

  const enqueueCapture = useCallback(async (payload: CapturePayload): Promise<void> => {
    // Persist immediately (idempotent on the deterministic key); then mirror into
    // state so the surface shows it right away.
    const item = await persistPendingCapture(payload, Date.now(), storeRef.current);
    if (item && mountedRef.current) {
      setItems((prev) => {
        if (prev.some((x) => x.processingKey === item.processingKey)) return prev;
        return [item, ...prev];
      });
    }
  }, []);

  const dismiss = useCallback(async (processingKey: string): Promise<void> => {
    try {
      await storeRef.current.delete(processingKey);
    } catch {
      /* best-effort */
    }
    if (mountedRef.current) setItems((prev) => removeItem(prev, processingKey));
  }, []);

  // ---- Background retry tick (the schedule) + reconnect handler ----
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      // Only attempt when online; if offline, just wait for the next tick / the
      // 'online' event. (navigator may be undefined in non-browser envs.)
      const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
      if (online) {
        await resumeAllDue();
      }
      if (stopped) return;
      // Schedule the next tick at the SOONEST of: the tick floor, or the nearest
      // per-item due time (so we do not over-sleep past a tier transition).
      const now = Date.now();
      let soonest = TICK_FLOOR_MS;
      for (const it of itemsRef.current) {
        const delay = nextRetryDelayMs({
          firstCapturedAtMs: it.firstCapturedAtMs,
          lastAttemptAtMs: it.lastAttemptAtMs,
          nowMs: now,
        });
        if (delay !== null) soonest = Math.min(soonest, Math.max(delay, 1000));
      }
      timer = setTimeout(() => void tick(), soonest);
    };

    // Kick off the loop shortly after mount (after the initial load settles).
    timer = setTimeout(() => void tick(), 1000);

    const onOnline = () => {
      // Reconnect: retry every due item immediately.
      void resumeAllDue();
    };
    const onVisibility = () => {
      // Returning to a foregrounded tab: opportunistically retry due items.
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void resumeAllDue();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', onOnline);
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', onOnline);
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [resumeAllDue]);

  return {
    items,
    isLoading,
    isProcessing,
    permanentError,
    enqueueCapture,
    resumeNow,
    resumeAllDue,
    dismiss,
  };
}
