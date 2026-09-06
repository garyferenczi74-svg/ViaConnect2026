'use client';

/**
 * Prompt 231: mounts the "Your scans" section on the FormaVision landing page.
 * Photo-scan rows arrive only through GET /api/scan/history — never via a
 * client import of scanReadsShared / supabase/server.
 */

import { useCallback, useEffect, useState } from 'react';
import { ScanHistory } from './ScanHistory';
import type { ScanSummary } from '@/lib/scan/scanSummary';

const HISTORY_FETCH_TIMEOUT_MS = 8000;

interface HistoryResponse {
  ok?: boolean;
  scans?: ScanSummary[];
}

export interface ScanHistorySectionProps {
  userId: string | null;
  /** Bump after Analyze persist so the list refetches without a remount. */
  refreshKey?: number;
  /** Latest fetched list so Results / 3D can share the Ready photo-scan row. */
  onScansChange?: (scans: ScanSummary[] | null) => void;
}

export function ScanHistorySection({
  userId,
  refreshKey = 0,
  onScansChange,
}: ScanHistorySectionProps) {
  const [scans, setScans] = useState<ScanSummary[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!userId) {
      setScans(null);
      setLoadFailed(false);
      return;
    }
    let cancelled = false;
    setLoadFailed(false);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HISTORY_FETCH_TIMEOUT_MS);
    (async () => {
      try {
        const res = await fetch('/api/scan/history', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const body = (await res.json().catch(() => null)) as HistoryResponse | null;
        if (cancelled) return;
        if (res.ok && body?.ok) {
          setScans(body.scans ?? []);
        } else {
          setLoadFailed(true);
          setScans([]);
        }
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
          setScans([]);
        }
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [userId, reloadToken, refreshKey]);

  const handleDeleted = useCallback((sessionId: string) => {
    setScans((prev) => (prev ? prev.filter((s) => s.id !== sessionId) : prev));
  }, []);

  const handleRetryLoad = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    onScansChange?.(scans);
  }, [scans, onScansChange]);

  return (
    <section data-testid="formavision-scan-history-section" className="space-y-3">
      <h2 className="font-instrument text-base font-semibold text-white">Your scans</h2>
      {loadFailed ? (
        <div
          className="font-instrument flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[var(--card)] px-4 py-3"
          data-testid="formavision-scan-history-error"
        >
          <p className="text-sm text-white/60">Couldn&apos;t load your scans.</p>
          <button
            type="button"
            data-testid="formavision-scan-history-retry"
            onClick={handleRetryLoad}
            className="shrink-0 rounded-md border border-white/20 px-2.5 py-1.5 text-xs font-medium text-white/80"
          >
            Retry
          </button>
        </div>
      ) : (
        <ScanHistory scans={scans} onDeleted={handleDeleted} />
      )}
    </section>
  );
}
