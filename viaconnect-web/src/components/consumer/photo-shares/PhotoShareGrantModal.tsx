'use client';

// Prompt 231b: the "Share your body photos" grant modal. The practitioner
// list is a required selection (never a free-text email) so a grant can
// only ever target a real linked practitioner_id, matching
// grantPhotoShare's own defense-in-depth link check in
// src/lib/photo-shares/photoShares.ts.
//
// The warning copy below is the exact R5 wording; do not paraphrase it.
//
// The actual grantPhotoShare(supabase, userId, practitionerId) call is
// injected as onConfirm so this component stays pure/testable: it never
// imports the Supabase client itself.

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ShareablePractitioner } from '@/lib/photo-shares/types';
import type { GrantPhotoShareResult } from '@/lib/photo-shares/photoShares';

const SAVE_TIMEOUT_MS = 10000;
const SAVE_TIMEOUT_MESSAGE = 'Sharing is taking longer than expected. Try again.';
// Prompt 231b fix: named exit + timeout for the practitioners === null
// (still loading) branch, so it is never a bare spinner with no way out.
const PRACTITIONERS_LOAD_TIMEOUT_MS = 8000;
const PRACTITIONERS_LOAD_ERROR_MESSAGE = 'Could not load your practitioners. Close and try again.';

type ConfirmState = 'idle' | 'saving' | 'error';

type GrantFailureReason = Extract<GrantPhotoShareResult, { ok: false }>['reason'];

function reasonMessage(reason: GrantFailureReason): string {
  switch (reason) {
    case 'no_photos':
      return 'Take a body scan first, then you can share it.';
    case 'not_linked':
      return 'That practitioner is no longer linked to you.';
    default:
      return 'Something went wrong. Try again.';
  }
}

// Prompt 231b fix: pure, prop-driven so the timed-out state renders in a
// bare renderToStaticMarkup test without needing real timers. Always shows
// a named Close action, even before the timeout fires.
export interface PhotoShareGrantLoadingStateProps {
  timedOut: boolean;
  onClose: () => void;
}

export function PhotoShareGrantLoadingState({ timedOut, onClose }: PhotoShareGrantLoadingStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-6">
      {timedOut ? (
        <p data-testid="photo-share-grant-load-error" className="text-sm text-white/60 text-center">
          {PRACTITIONERS_LOAD_ERROR_MESSAGE}
        </p>
      ) : (
        <Loader2 className="w-5 h-5 animate-spin text-white/40" strokeWidth={1.5} />
      )}
      <button
        type="button"
        onClick={onClose}
        data-testid="photo-share-grant-close"
        className="px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/[0.10] hover:border-white/[0.20] transition-all"
      >
        Close
      </button>
    </div>
  );
}

export interface PhotoShareGrantModalProps {
  open: boolean;
  /** null while the practitioner list is still loading. */
  practitioners: ShareablePractitioner[] | null;
  onClose: () => void;
  onConfirm: (practitionerId: string) => Promise<GrantPhotoShareResult>;
  /** Called only after onConfirm resolves ok:true. Never called speculatively. */
  onGranted: () => void;
}

export function PhotoShareGrantModal({
  open,
  practitioners,
  onClose,
  onConfirm,
  onGranted,
}: PhotoShareGrantModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [state, setState] = useState<ConfirmState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [practitionersTimedOut, setPractitionersTimedOut] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setState('idle');
      setErrorMessage(null);
    }
  }, [open]);

  // Prompt 231b fix: the practitioners === null branch must never spin
  // forever. If the list has not arrived by the timeout while the modal is
  // open, switch to the named failure copy (Close stays available the
  // whole time regardless).
  useEffect(() => {
    if (!open || practitioners !== null) {
      setPractitionersTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setPractitionersTimedOut(true), PRACTITIONERS_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [open, practitioners]);

  const handleConfirm = useCallback(() => {
    if (!selectedId) return;
    setState('saving');
    setErrorMessage(null);
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      setState('error');
      setErrorMessage(SAVE_TIMEOUT_MESSAGE);
    }, SAVE_TIMEOUT_MS);

    onConfirm(selectedId)
      .then((result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (result.ok) {
          onGranted();
        } else {
          setState('error');
          setErrorMessage(reasonMessage(result.reason));
        }
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        setState('error');
        setErrorMessage(reasonMessage('error'));
      });
  }, [selectedId, onConfirm, onGranted]);

  if (!open) return null;

  const saving = state === 'saving';
  const noPractitioners = practitioners !== null && practitioners.length === 0;

  return (
    <div
      className="font-instrument fixed inset-0 z-[110] flex items-center justify-center px-4"
      data-testid="photo-share-grant-modal"
    >
      <div
        onClick={saving ? undefined : onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.10] bg-[var(--card)] p-6 shadow-2xl"
      >
        <h3 className="text-base font-semibold text-white mb-4">Share your body photos</h3>

        {practitioners === null ? (
          <PhotoShareGrantLoadingState timedOut={practitionersTimedOut} onClose={onClose} />
        ) : noPractitioners ? (
          <p data-testid="photo-share-grant-no-practitioners" className="text-sm text-white/60">
            You have no linked practitioners yet. A practitioner must add you to their care team
            before you can share.
          </p>
        ) : (
          <>
            <ul data-testid="photo-share-grant-list" className="space-y-2 mb-4">
              {practitioners.map((p) => (
                <li key={p.practitionerId}>
                  <label className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 cursor-pointer hover:border-white/20 transition-all">
                    <input
                      type="radio"
                      name="photo-share-practitioner"
                      value={p.practitionerId}
                      checked={selectedId === p.practitionerId}
                      onChange={() => setSelectedId(p.practitionerId)}
                      disabled={saving}
                      data-testid={`photo-share-grant-radio-${p.practitionerId}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm text-white truncate">{p.displayName}</span>
                      {p.practiceName && (
                        <span className="block text-xs text-white/50 truncate">{p.practiceName}</span>
                      )}
                    </span>
                  </label>
                </li>
              ))}
            </ul>

            <div
              data-testid="photo-share-grant-warning"
              className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.03] px-3 py-2.5 mb-4"
            >
              <p className="text-xs text-white/70">
                Sharing gives your practitioner access to all of your body photos, past and
                future, until you revoke it.
              </p>
              <p className="text-xs text-white/50 mt-1.5">
                Access expires in 30 days unless you renew or revoke it.
              </p>
            </div>

            {errorMessage && (
              <p data-testid="photo-share-grant-error" className="text-xs text-red-300 mb-3">
                {errorMessage}
              </p>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/[0.10] hover:border-white/[0.20] transition-all disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedId || saving}
                data-testid="photo-share-grant-confirm"
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[var(--teal)] hover:bg-[var(--teal)]/90 transition-all inline-flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                    Saving...
                  </>
                ) : (
                  'Share'
                )}
              </button>
            </div>
          </>
        )}

        {noPractitioners && (
          <div className="flex items-center justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/[0.10] hover:border-white/[0.20] transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
