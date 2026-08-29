'use client';

import { useCallback, useEffect, useState } from 'react';
import { Camera, ImageOff, Loader2, Trash2 } from 'lucide-react';
import { POSE_ORDER, type PoseId } from '@/lib/scan/poses';
import type { ScanSummary } from '@/lib/scan/scanReadsShared';

/**
 * Prompt 231: the 4-pose scan history list. Reuses the Task 13
 * /api/scan/signed-url and /api/scan/delete routes - never mints or deletes
 * anything itself. The scan list is a prop (the fetch belongs to a future
 * server loader, mirroring ScanExperienceLoader/ScanExperience) so this
 * component stays pure and testable with renderToStaticMarkup.
 *
 * `scans` comes from scanReadsShared.listScans, which already filters to
 * protocol='4pose_v1' and excludes tombstoned rows (condition 5, 17). This
 * component filters again defensively so a tombstoned row can never render
 * as a normal, deletable scan even if it somehow reaches this prop.
 *
 * Token discipline: var(--card) / var(--teal), no raw hex. Instrument Sans
 * via the .font-instrument scoped class. Lucide icons, strokeWidth 1.5.
 */

const DELETE_TIMEOUT_MS = 10000;
const SIGN_TIMEOUT_MS = 8000;
const DELETE_TIMEOUT_MESSAGE = 'Deleting is taking longer than expected. Try again.';

type DeleteState = 'idle' | 'deleting' | 'error';

interface DeleteResponse {
  ok?: boolean;
  deleted?: boolean;
  nextAction?: string;
  error?: string;
}

interface SignedUrlResponse {
  ok?: boolean;
  signedUrl?: string;
  error?: string;
}

export interface ScanHistoryProps {
  /** null = still loading. [] = loaded, no scans (honest empty state). */
  scans: ScanSummary[] | null;
  /** Called once a delete is confirmed by the server. Removing the row from
   * the list this component renders is the caller's responsibility. */
  onDeleted?: (sessionId: string) => void;
}

function isVisible(scan: ScanSummary): boolean {
  return scan.captureStatus !== 'delete_pending' && scan.captureStatus !== 'deleted';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Prompt 231: consumer-facing label for a scan protocol id. Never render
// the raw protocol string (e.g. '4pose_v1') on a consumer surface.
function protocolLabel(protocol: string): string {
  switch (protocol) {
    case '4pose_v1':
      return 'Body scan';
    default:
      return 'Body scan';
  }
}

function statusLabel(status: ScanSummary['captureStatus']): string {
  switch (status) {
    case 'ready':
      return 'Ready';
    case 'partial':
      return 'Partial';
    case 'uploading':
      return 'Uploading';
    default:
      return 'Saved';
  }
}

export function ScanHistory({ scans, onDeleted }: ScanHistoryProps) {
  const [deleteState, setDeleteState] = useState<Record<string, DeleteState>>({});
  const [deleteMessage, setDeleteMessage] = useState<Record<string, string>>({});

  const handleDelete = useCallback(
    async (sessionId: string) => {
      setDeleteState((s) => ({ ...s, [sessionId]: 'deleting' }));
      setDeleteMessage((m) => ({ ...m, [sessionId]: '' }));

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DELETE_TIMEOUT_MS);
      try {
        const res = await fetch('/api/scan/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
          signal: controller.signal,
        });
        const body = (await res.json().catch(() => null)) as DeleteResponse | null;
        if (res.ok && body?.ok && body.deleted) {
          onDeleted?.(sessionId);
          return;
        }
        // Never report Deleted on a 202 delete_pending or any other
        // non-confirmed outcome. Always leave a named next action.
        setDeleteState((s) => ({ ...s, [sessionId]: 'error' }));
        setDeleteMessage((m) => ({
          ...m,
          [sessionId]: body?.nextAction ?? DELETE_TIMEOUT_MESSAGE,
        }));
      } catch {
        setDeleteState((s) => ({ ...s, [sessionId]: 'error' }));
        setDeleteMessage((m) => ({ ...m, [sessionId]: DELETE_TIMEOUT_MESSAGE }));
      } finally {
        clearTimeout(timer);
      }
    },
    [onDeleted],
  );

  if (scans === null) {
    return (
      <div
        className="font-instrument flex items-center justify-center rounded-2xl border border-white/10 bg-[var(--card)] py-8"
        data-testid="scan-history-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin text-white/40" strokeWidth={1.5} />
      </div>
    );
  }

  const visible = scans.filter(isVisible);

  if (visible.length === 0) {
    return (
      <div
        className="font-instrument rounded-2xl border border-white/10 bg-[var(--card)] px-6 py-8 text-center"
        data-testid="scan-history-empty"
      >
        <Camera className="mx-auto mb-2 h-5 w-5 text-white/30" strokeWidth={1.5} />
        <p className="text-sm text-white/60">
          No scans yet. Your first scan takes about a minute.
        </p>
      </div>
    );
  }

  return (
    <ul className="font-instrument space-y-3" data-testid="scan-history-list">
      {visible.map((scan) => {
        const state = deleteState[scan.id] ?? 'idle';
        const message = deleteMessage[scan.id] ?? '';
        return (
          <li
            key={scan.id}
            data-testid={`scan-history-item-${scan.id}`}
            className="space-y-3 rounded-2xl border border-white/10 bg-[var(--card)] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{formatDate(scan.date)}</p>
                <p className="text-xs text-white/50">
                  <span data-testid={`scan-history-protocol-${scan.id}`}>
                    {protocolLabel(scan.protocol)}
                  </span>
                  {' · '}
                  <span data-testid={`scan-history-status-${scan.id}`}>
                    {statusLabel(scan.captureStatus)}
                  </span>
                </p>
              </div>
              {state === 'deleting' ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
                  Deleting...
                </span>
              ) : (
                <button
                  type="button"
                  data-testid={`scan-history-delete-${scan.id}`}
                  onClick={() => void handleDelete(scan.id)}
                  className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-white/15 px-3 py-1.5 text-xs font-medium text-white/70"
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Delete
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {POSE_ORDER.map((pose) => (
                <ScanHistoryThumb
                  key={pose}
                  sessionId={scan.id}
                  pose={pose}
                  present={scan.poses[pose]}
                />
              ))}
            </div>

            {state === 'error' && message && (
              <p
                className="text-xs text-red-300"
                data-testid={`scan-history-delete-error-${scan.id}`}
              >
                {message}
                {' '}
                <button
                  type="button"
                  data-testid={`scan-history-delete-retry-${scan.id}`}
                  onClick={() => void handleDelete(scan.id)}
                  className="underline"
                >
                  Retry
                </button>
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ScanHistoryThumb({
  sessionId,
  pose,
  present,
}: {
  sessionId: string;
  pose: PoseId;
  present: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!present) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SIGN_TIMEOUT_MS);
    (async () => {
      try {
        const res = await fetch('/api/scan/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, view: pose, variant: 'thumb' }),
          signal: controller.signal,
        });
        const body = (await res.json().catch(() => null)) as SignedUrlResponse | null;
        if (cancelled) return;
        if (res.ok && body?.ok && typeof body.signedUrl === 'string') {
          setUrl(body.signedUrl);
        } else {
          setFailed(true);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [sessionId, pose, present]);

  if (!present || failed) {
    return (
      <div
        data-testid={`scan-history-pose-placeholder-${pose}`}
        className="flex aspect-[3/4] items-center justify-center rounded-lg border border-white/10 bg-black/20 text-white/30"
      >
        <ImageOff className="h-4 w-4" strokeWidth={1.5} />
      </div>
    );
  }

  if (!url) {
    return (
      <div
        data-testid={`scan-history-pose-loading-${pose}`}
        className="flex aspect-[3/4] items-center justify-center rounded-lg border border-white/10 bg-black/20"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="aspect-[3/4] overflow-hidden rounded-lg border border-white/10">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL, not an optimizable remote asset */}
      <img src={url} alt={`${pose} pose`} className="h-full w-full object-cover" />
    </div>
  );
}
