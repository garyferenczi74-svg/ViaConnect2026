// Persist last honest circ fail across BF Ready settle + composition remount.
// BodyScanUploader unmounts after persist-ok (navigates to FormaVision).
// Measurements empty CTA reads this. Never invents cm / girths / Muscle lbs.
// Not for Body Fat segmental pills (those are %).

import { isCircFailReason, type CircFailReason } from './circFailReason';

export const CIRC_FAIL_PERSIST_KEY = 'vc_circ_fail_reason';

export function writeCircFailReason(reason: CircFailReason | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (reason == null) {
      window.sessionStorage.removeItem(CIRC_FAIL_PERSIST_KEY);
      return;
    }
    if (!isCircFailReason(reason)) return;
    window.sessionStorage.setItem(CIRC_FAIL_PERSIST_KEY, reason);
  } catch {
    /* sessionStorage can throw — fail-open */
  }
}

export function readCircFailReason(): CircFailReason | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CIRC_FAIL_PERSIST_KEY);
    return isCircFailReason(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function clearCircFailReason(): void {
  writeCircFailReason(null);
}
