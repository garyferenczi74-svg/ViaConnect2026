'use client';

// Prompt 231b: confirm-revoke modal for a single practitioner's body-photo
// access. Mirrors ConfirmRevokeModal in
// src/app/(app)/(consumer)/settings/shared-access/page.tsx for visual
// language. The actual revokePhotoShare(supabase, userId, practitionerId)
// call is injected as onConfirm; this component never imports Supabase.
//
// Never shows a "Revoked" confirmation before onConfirm resolves ok:true.

import { useCallback, useEffect, useState } from 'react';
import { Loader2, ShieldOff } from 'lucide-react';
import type { ActivePhotoShare } from '@/lib/photo-shares/types';
import type { RevokePhotoShareResult } from '@/lib/photo-shares/photoShares';

const REVOKE_TIMEOUT_MS = 10000;
const REVOKE_TIMEOUT_MESSAGE = 'Revoking is taking longer than expected. Try again.';
const REVOKE_ERROR_MESSAGE = 'Something went wrong. Try again.';

type RevokeState = 'idle' | 'revoking' | 'error';

export interface PhotoShareRevokeModalProps {
  target: ActivePhotoShare | null;
  onCancel: () => void;
  onConfirm: (practitionerId: string) => Promise<RevokePhotoShareResult>;
  /** Called only after onConfirm resolves ok:true. Never called speculatively. */
  onRevoked: () => void;
}

export function PhotoShareRevokeModal({
  target,
  onCancel,
  onConfirm,
  onRevoked,
}: PhotoShareRevokeModalProps) {
  const [state, setState] = useState<RevokeState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setState('idle');
    setErrorMessage(null);
  }, [target]);

  const handleConfirm = useCallback(() => {
    if (!target) return;
    setState('revoking');
    setErrorMessage(null);
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      setState('error');
      setErrorMessage(REVOKE_TIMEOUT_MESSAGE);
    }, REVOKE_TIMEOUT_MS);

    onConfirm(target.practitionerId)
      .then((result) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (result.ok) {
          onRevoked();
        } else {
          setState('error');
          setErrorMessage(REVOKE_ERROR_MESSAGE);
        }
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        setState('error');
        setErrorMessage(REVOKE_ERROR_MESSAGE);
      });
  }, [target, onConfirm, onRevoked]);

  if (!target) return null;

  const revoking = state === 'revoking';

  return (
    <div
      className="font-instrument fixed inset-0 z-[110] flex items-center justify-center px-4"
      data-testid="photo-share-revoke-modal"
    >
      <div
        onClick={revoking ? undefined : onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-sm rounded-2xl border border-white/[0.10] bg-[var(--card)] p-6 shadow-2xl"
      >
        <h3 className="text-base font-semibold text-white mb-1">
          Revoke {target.displayName}&apos;s access to your body photos?
        </h3>
        <p className="text-sm text-white/60 mb-5">
          They will lose access to all your body photos immediately. You can share again later.
        </p>

        {errorMessage && (
          <p data-testid="photo-share-revoke-error" className="text-xs text-red-300 mb-3">
            {errorMessage}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={revoking}
            className="px-4 py-2 rounded-xl text-sm text-white/70 hover:text-white border border-white/[0.10] hover:border-white/[0.20] transition-all disabled:opacity-60"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={revoking}
            data-testid="photo-share-revoke-confirm"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-500/90 hover:bg-red-500 transition-all inline-flex items-center gap-2 disabled:opacity-60"
          >
            {revoking ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                Revoking...
              </>
            ) : (
              <>
                <ShieldOff className="w-3.5 h-3.5" strokeWidth={1.5} />
                Revoke
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
