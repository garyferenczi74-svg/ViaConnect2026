'use client';

import { useCallback, useEffect, useState } from 'react';
import { Camera, ImageOff, Loader2, Trash2 } from 'lucide-react';
import { POSE_ORDER, type PoseId } from '@/lib/scan/poses';
import { FORMAVISION_PHOTO_PROTOCOL } from '@/lib/scan/scanProtocols';
import {
  formatScanEstimateBfRange,
  scanHistoryShowsFrblGrid,
  type ScanSummary,
} from '@/lib/scan/scanSummary';
import {
  HISTORY_REMOVE_PHOTOS_BODY,
  HISTORY_REMOVE_PHOTOS_CONFIRM,
  HISTORY_REMOVE_PHOTOS_TITLE,
  SCAN_HISTORY_PHOTOS_DISCARDED,
  SCAN_HISTORY_PHOTOS_RETAINED,
  consumerProtocolLabel,
  scanHistoryPhotoCaption,
} from '@/lib/formavision/twoProtocolCopy';
import { patchScanAfterFrblDiscard } from '@/lib/formavision/retainFrbl';
import { invalidateSignedFullUrlsForScan } from '@/lib/formavision/viewer/signedFullUrlCache';
import { Modal } from '@/components/ui/Modal';

/**
 * Prompt 231: the 4-pose scan history list. Reuses the Task 13
 * /api/scan/signed-url and /api/scan/delete routes - never mints or deletes
 * anything itself. The scan list is a prop (the fetch belongs to a future
 * server loader, mirroring ScanExperienceLoader/ScanExperience) so this
 * component stays pure and testable with renderToStaticMarkup.
 *
 * `scans` is a prop from ScanHistorySection, which fetches GET
 * /api/scan/history only. This file must never import scanReadsShared
 * (that module pulls supabase/server → next/headers). The API already
 * filters 4-pose + FormaVision photo scans and excludes tombstones
 * (condition 5, 17). This component filters tombstones again so a
 * tombstoned row can never render as a normal, deletable scan.
 *
 * SSOT: formavision_photo hides the FRBL grid when photos were discarded.
 * Retained opt-in rows show the grid plus SCAN_HISTORY_PHOTOS_RETAINED and
 * a Remove control (retain-frbl discard — never /api/scan/delete).
 * Discard rows keep SCAN_HISTORY_PHOTOS_DISCARDED. No ImageOff chase on
 * the discard path. 4pose_v1 guided thumbs stay on the grid; Delete is
 * unchanged.
 *
 * Token discipline: var(--card) / var(--teal), no raw hex. Instrument Sans
 * via the .font-instrument scoped class. Lucide icons, strokeWidth 1.5.
 */

const DELETE_TIMEOUT_MS = 10000;
const DISCARD_TIMEOUT_MS = 10000;
const SIGN_TIMEOUT_MS = 8000;
const DELETE_TIMEOUT_MESSAGE = 'Deleting is taking longer than expected. Try again.';
const DISCARD_TIMEOUT_MESSAGE = 'Removing photos is taking longer than expected. Try again.';

type DeleteState = 'idle' | 'deleting' | 'error';
type DiscardState = 'idle' | 'discarding' | 'error';

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

interface DiscardResponse {
  ok?: boolean;
  discarded?: boolean;
  error?: string;
}

export interface ScanHistoryProps {
  /** null = still loading. [] = loaded, no scans (honest empty state). */
  scans: ScanSummary[] | null;
  /** Called once a delete is confirmed by the server. Removing the row from
   * the list this component renders is the caller's responsibility. */
  onDeleted?: (sessionId: string) => void;
  /** Called after retain-frbl discard succeeds. Caller patches the row in
   * place (photosRetained false, clear FRBL) and keeps the card + BF. */
  onPhotosDiscarded?: (photoScanId: string) => void;
}

function isVisible(scan: ScanSummary): boolean {
  return scan.captureStatus !== 'delete_pending' && scan.captureStatus !== 'deleted';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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

export function ScanHistory({ scans, onDeleted, onPhotosDiscarded }: ScanHistoryProps) {
  const [deleteState, setDeleteState] = useState<Record<string, DeleteState>>({});
  const [deleteMessage, setDeleteMessage] = useState<Record<string, string>>({});
  const [discardedIds, setDiscardedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [confirmScanId, setConfirmScanId] = useState<string | null>(null);
  const [discardState, setDiscardState] = useState<Record<string, DiscardState>>({});
  const [discardMessage, setDiscardMessage] = useState<Record<string, string>>({});

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

  const handleDiscardPhotos = useCallback(
    async (photoScanId: string) => {
      setDiscardState((s) => ({ ...s, [photoScanId]: 'discarding' }));
      setDiscardMessage((m) => ({ ...m, [photoScanId]: '' }));

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DISCARD_TIMEOUT_MS);
      try {
        const res = await fetch('/api/formavision/retain-frbl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'discard', photoScanId }),
          signal: controller.signal,
        });
        const body = (await res.json().catch(() => null)) as DiscardResponse | null;
        if (res.ok && body?.ok) {
          const discarded = scans?.find((scan) => scan.id === photoScanId);
          if (discarded) invalidateSignedFullUrlsForScan(discarded);
          setDiscardedIds((prev) => {
            const next = new Set(prev);
            next.add(photoScanId);
            return next;
          });
          setConfirmScanId(null);
          setDiscardState((s) => ({ ...s, [photoScanId]: 'idle' }));
          onPhotosDiscarded?.(photoScanId);
          return;
        }
        setDiscardState((s) => ({ ...s, [photoScanId]: 'error' }));
        setDiscardMessage((m) => ({
          ...m,
          [photoScanId]: body?.error ?? DISCARD_TIMEOUT_MESSAGE,
        }));
      } catch {
        setDiscardState((s) => ({ ...s, [photoScanId]: 'error' }));
        setDiscardMessage((m) => ({ ...m, [photoScanId]: DISCARD_TIMEOUT_MESSAGE }));
      } finally {
        clearTimeout(timer);
      }
    },
    [onPhotosDiscarded, scans],
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

  const confirmScan = confirmScanId
    ? visible.find((s) => s.id === confirmScanId) ?? null
    : null;
  const confirmDiscarding = confirmScan
    ? (discardState[confirmScan.id] ?? 'idle') === 'discarding'
    : false;

  return (
    <>
    <ul className="font-instrument space-y-3" data-testid="scan-history-list">
      {visible.map((raw) => {
        const scan = discardedIds.has(raw.id) ? patchScanAfterFrblDiscard(raw) : raw;
        const state = deleteState[scan.id] ?? 'idle';
        const message = deleteMessage[scan.id] ?? '';
        const removeState = discardState[scan.id] ?? 'idle';
        const removeMessage = discardMessage[scan.id] ?? '';
        const bfRange = formatScanEstimateBfRange(scan);
        const photoCaption = scanHistoryPhotoCaption(scan);
        const showFrblGrid = scanHistoryShowsFrblGrid(scan);
        const showRemovePhotos =
          scan.protocol === FORMAVISION_PHOTO_PROTOCOL && showFrblGrid;
        const retainedCaption = photoCaption === SCAN_HISTORY_PHOTOS_RETAINED;
        const discardedCaption = photoCaption === SCAN_HISTORY_PHOTOS_DISCARDED;
        return (
          <li
            key={scan.id}
            data-testid={`scan-history-item-${scan.id}`}
            className="relative space-y-3 rounded-2xl border border-white/10 bg-[var(--card)] p-4"
          >
            {showRemovePhotos ? (
              removeState === 'discarding' ? (
                <span className="absolute right-2 top-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-white/50">
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
                </span>
              ) : (
                <button
                  type="button"
                  data-testid={`scan-history-remove-photos-${scan.id}`}
                  onClick={() => setConfirmScanId(scan.id)}
                  aria-label={HISTORY_REMOVE_PHOTOS_TITLE}
                  className="absolute right-2 top-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/70"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              )
            ) : null}
            <div className={`flex items-center justify-between gap-3${showRemovePhotos ? ' pr-12' : ''}`}>
              <div>
                <p className="text-sm font-semibold text-white">{formatDate(scan.date)}</p>
                <p className="text-xs text-white/50">
                  <span data-testid={`scan-history-protocol-${scan.id}`}>
                    {consumerProtocolLabel(scan.protocol)}
                  </span>
                  {' · '}
                  <span data-testid={`scan-history-status-${scan.id}`}>
                    {statusLabel(scan.captureStatus)}
                  </span>
                  {bfRange ? (
                    <>
                      {' · '}
                      <span data-testid={`scan-history-bf-${scan.id}`}>
                        Body fat {bfRange}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              {scan.protocol === FORMAVISION_PHOTO_PROTOCOL ? null : state === 'deleting' ? (
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

            {photoCaption ? (
              <p
                className="text-xs text-white/45"
                data-testid={
                  retainedCaption
                    ? `scan-history-photos-retained-${scan.id}`
                    : discardedCaption
                      ? `scan-history-photos-discarded-${scan.id}`
                      : `scan-history-photos-caption-${scan.id}`
                }
              >
                {photoCaption}
              </p>
            ) : null}
            {showFrblGrid ? (
              <div className="grid grid-cols-4 gap-2">
                {POSE_ORDER.map((pose) => (
                  <ScanHistoryThumb
                    key={pose}
                    sessionId={scan.frblSessionId ?? scan.id}
                    pose={pose}
                    present={scan.poses[pose]}
                  />
                ))}
              </div>
            ) : null}

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
            {removeState === 'error' && removeMessage && (
              <p
                className="text-xs text-red-300"
                data-testid={`scan-history-remove-photos-error-${scan.id}`}
              >
                {removeMessage}
              </p>
            )}
          </li>
        );
      })}
    </ul>
    {confirmScan ? (
      <Modal
        open
        onOpenChange={(open) => {
          if (!open && !confirmDiscarding) setConfirmScanId(null);
        }}
        title={HISTORY_REMOVE_PHOTOS_TITLE}
        description={HISTORY_REMOVE_PHOTOS_BODY}
      >
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            data-testid="scan-history-remove-photos-cancel"
            onClick={() => setConfirmScanId(null)}
            disabled={confirmDiscarding}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-white/15 px-4 text-sm text-white/70 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="scan-history-remove-photos-confirm"
            onClick={() => void handleDiscardPhotos(confirmScan.id)}
            disabled={confirmDiscarding}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-red-500/90 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            {confirmDiscarding ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
            ) : null}
            {HISTORY_REMOVE_PHOTOS_CONFIRM}
          </button>
        </div>
      </Modal>
    ) : null}
    </>
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
