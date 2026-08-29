'use client';

/**
 * Prompt 231: mounts the "Your scans" section on the FormaVision landing
 * page (spec Section 14). Fetches the signed-in user's 4-pose scan list
 * from GET /api/scan/history (a thin auth boundary over
 * scanReadsShared.listScans, mirroring the 224 dashboard tile's
 * /api/scan/latest fetch in DashboardBento.tsx) and renders it through
 * ScanHistory, which stays pure/prop-driven. Wires onDeleted so a confirmed
 * delete removes the row from this list immediately - without that,
 * ScanHistory's own delete button would spin forever after a confirmed
 * 200.
 *
 * A failed fetch surfaces "Couldn't load your scans" + Retry rather than
 * leaving `scans` at null forever (which would render ScanHistory's loading
 * spinner permanently - no transitional state without a timeout + named
 * next action) or falling to `[]` (a false "No scans yet").
 *
 * Purely additive: this section never touches the legacy "Scan My Body"
 * button/panel elsewhere on this page, which stays on the old uploader
 * during the transition.
 */

import { useCallback, useEffect, useState } from 'react';
import { ScanHistory } from './ScanHistory';
import type { ScanSummary } from '@/lib/scan/scanReadsShared';

interface HistoryResponse {
  ok?: boolean;
  scans?: ScanSummary[];
}

export interface ScanHistorySectionProps {
  userId: string | null;
}

export function ScanHistorySection({ userId }: ScanHistorySectionProps) {
  const [scans, setScans] = useState<ScanSummary[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoadFailed(false);
    (async () => {
      try {
        const res = await fetch('/api/scan/history', { cache: 'no-store' });
        const body = (await res.json().catch(() => null)) as HistoryResponse | null;
        if (cancelled) return;
        if (res.ok && body?.ok) {
          setScans(body.scans ?? []);
        } else {
          setLoadFailed(true);
        }
      } catch {
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadToken]);

  const handleDeleted = useCallback((sessionId: string) => {
    setScans((prev) => (prev ? prev.filter((s) => s.id !== sessionId) : prev));
  }, []);

  const handleRetryLoad = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

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
