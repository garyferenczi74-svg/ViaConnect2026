'use client';

// Prompt #170a supplement §20.D + Deviation B: Log-Manually handoff via
// sessionStorage. Bridges the NutriVision error card to /nutrition without
// touching /nutrition/log-meal (frozen per Prompt 170 §4 architectural
// exception).
//
// Flow:
//   1. ErrorStateCard's Log-Manually handler calls writeNutrivisionManualLogHandoff
//      (or uses the persist helper inline) to stash { source_photo_blob_id,
//      expires_at } in sessionStorage under HANDOFF_KEY.
//   2. router.push('/nutrition').
//   3. /nutrition mounts and uses this hook to detect the stash. If present
//      and unexpired, renders a banner inviting the user to open a Quick Log
//      pill below.
//   4. When the user saves a meal via QuickLogsSurface, the dashboard handler
//      reads the stash and appends source_photo_blob_id to the POST payload.
//      On 200, the dashboard handler calls clearHandoff.
//
// TTL is 15 minutes. The hook returns null on expiry and also clears the
// expired stash automatically so a stale handoff never leaks across sessions.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { useCallback, useEffect, useState } from 'react';

const HANDOFF_KEY = 'nutrivision_manual_log_handoff';
export const HANDOFF_TTL_MS = 15 * 60 * 1000;

export interface NutrivisionManualLogHandoff {
  source_photo_blob_id: string;
  expires_at: number;
}

function readRaw(): NutrivisionManualLogHandoff | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    const blobId = obj.source_photo_blob_id;
    const expiresAt = obj.expires_at;
    if (typeof blobId !== 'string' || blobId.length === 0) return null;
    if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return null;
    return { source_photo_blob_id: blobId, expires_at: expiresAt };
  } catch {
    return null;
  }
}

function clearRaw(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(HANDOFF_KEY);
  } catch {
    /* silent */
  }
}

/**
 * Stash a NutriVision photo blob id in sessionStorage so the next visit to
 * /nutrition (or the dashboard Quick Logs) can attach it to a manually-logged
 * meal. Defaults the expiry 15 minutes from now.
 */
export function writeNutrivisionManualLogHandoff(sourcePhotoBlobId: string): void {
  if (typeof window === 'undefined') return;
  if (typeof sourcePhotoBlobId !== 'string' || sourcePhotoBlobId.length === 0) {
    return;
  }
  const payload: NutrivisionManualLogHandoff = {
    source_photo_blob_id: sourcePhotoBlobId,
    expires_at: Date.now() + HANDOFF_TTL_MS,
  };
  try {
    window.sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload));
  } catch {
    /* silent */
  }
}

/**
 * Synchronous read of the stash, returns null if absent or expired and
 * also clears the expired stash. Safe to call from non-React contexts.
 */
export function readNutrivisionManualLogHandoff(): NutrivisionManualLogHandoff | null {
  const raw = readRaw();
  if (!raw) return null;
  if (raw.expires_at <= Date.now()) {
    clearRaw();
    return null;
  }
  return raw;
}

export function clearNutrivisionManualLogHandoff(): void {
  clearRaw();
}

export interface UseNutrivisionManualLogHandoffReturn {
  handoff: NutrivisionManualLogHandoff | null;
  clearHandoff: () => void;
}

export function useNutrivisionManualLogHandoff(): UseNutrivisionManualLogHandoffReturn {
  const [handoff, setHandoff] = useState<NutrivisionManualLogHandoff | null>(() => {
    return readNutrivisionManualLogHandoff();
  });

  // Refresh on mount in case the SSR pass returned null.
  useEffect(() => {
    const current = readNutrivisionManualLogHandoff();
    setHandoff(current);
  }, []);

  const clearHandoff = useCallback(() => {
    clearRaw();
    setHandoff(null);
  }, []);

  return { handoff, clearHandoff };
}
