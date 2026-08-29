'use client';

// Prompt 231b: data-fetching wrapper that mounts the "Body photo shares"
// section in the settings share hub. Gets the current user the same way
// src/app/(app)/(consumer)/settings/shared-access/page.tsx does
// (supabase.auth.getUser() from the browser client), then loads the data
// layer in src/lib/photo-shares/photoShares.ts. The presentational parts
// (PhotoSharesView, PhotoShareGrantModal, PhotoShareRevokeModal) are pure
// and prop-driven so they render in bare tests without mocking Supabase.
//
// Initial load races an 8s guard so the section never spins forever; a
// timed-out or failed load shows Retry (a named next action), not a blank
// screen. grantPhotoShare/revokePhotoShare results are only ever surfaced
// as a confirmation after ok:true, never before.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  grantPhotoShare,
  listActivePhotoShares,
  listShareablePractitioners,
  revokePhotoShare,
  type GrantPhotoShareResult,
  type RevokePhotoShareResult,
} from '@/lib/photo-shares/photoShares';
import type { ActivePhotoShare, ShareablePractitioner } from '@/lib/photo-shares/types';
import { PhotoSharesView } from './PhotoSharesView';
import { PhotoShareGrantModal } from './PhotoShareGrantModal';
import { PhotoShareRevokeModal } from './PhotoShareRevokeModal';

const LOAD_TIMEOUT_MS = 8000;

export function PhotoSharesSection() {
  const [userId, setUserId] = useState<string | null>(null);
  const [shares, setShares] = useState<ActivePhotoShare[] | null>(null);
  const [practitioners, setPractitioners] = useState<ShareablePractitioner[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [grantOpen, setGrantOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ActivePhotoShare | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let settled = false;
    setLoadError(false);

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (!cancelled) setLoadError(true);
    }, LOAD_TIMEOUT_MS);

    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (settled || cancelled) return;
        if (!user) {
          settled = true;
          clearTimeout(timer);
          setLoadError(true);
          return;
        }
        setUserId(user.id);

        const [activeShares, shareablePractitioners] = await Promise.all([
          listActivePhotoShares(supabase, user.id),
          listShareablePractitioners(supabase, user.id),
        ]);
        if (settled || cancelled) return;
        settled = true;
        clearTimeout(timer);
        setShares(activeShares);
        setPractitioners(shareablePractitioners);
      } catch {
        if (settled || cancelled) return;
        settled = true;
        clearTimeout(timer);
        setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reloadToken]);

  const handleRetryLoad = useCallback(() => {
    setShares(null);
    setPractitioners(null);
    setReloadToken((n) => n + 1);
  }, []);

  const refetchShares = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const activeShares = await listActivePhotoShares(supabase, userId);
    setShares(activeShares);
  }, [userId]);

  const handleGrantConfirm = useCallback(
    async (practitionerId: string): Promise<GrantPhotoShareResult> => {
      if (!userId) return { ok: false, reason: 'error' };
      const supabase = createClient();
      return grantPhotoShare(supabase, userId, practitionerId);
    },
    [userId],
  );

  const handleGranted = useCallback(() => {
    setGrantOpen(false);
    setConfirmation('Shared. Your practitioner now has access to your body photos.');
    void refetchShares();
  }, [refetchShares]);

  const handleRevokeConfirm = useCallback(
    async (practitionerId: string): Promise<RevokePhotoShareResult> => {
      if (!userId) return { ok: false, reason: 'error' };
      const supabase = createClient();
      return revokePhotoShare(supabase, userId, practitionerId);
    },
    [userId],
  );

  const handleRevoked = useCallback(() => {
    const name = revokeTarget?.displayName ?? 'Practitioner';
    setRevokeTarget(null);
    setConfirmation(`Revoked. ${name} no longer has access to your body photos.`);
    void refetchShares();
  }, [revokeTarget, refetchShares]);

  return (
    <>
      <PhotoSharesView
        shares={shares}
        loadError={loadError}
        onRetryLoad={handleRetryLoad}
        onOpenGrant={() => setGrantOpen(true)}
        onOpenRevoke={(share) => setRevokeTarget(share)}
      />

      {confirmation && (
        <p
          data-testid="photo-shares-confirmation"
          className="font-instrument mt-3 text-xs text-[var(--teal)]"
        >
          {confirmation}
        </p>
      )}

      <PhotoShareGrantModal
        open={grantOpen}
        practitioners={practitioners}
        onClose={() => setGrantOpen(false)}
        onConfirm={handleGrantConfirm}
        onGranted={handleGranted}
      />

      <PhotoShareRevokeModal
        target={revokeTarget}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={handleRevokeConfirm}
        onRevoked={handleRevoked}
      />
    </>
  );
}
