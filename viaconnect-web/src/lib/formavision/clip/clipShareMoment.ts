/**
 * src/lib/formavision/clip/clipShareMoment.ts
 *
 * Prompt 211a W1: PURE logic for the consumer-only Helix first-share moment.
 *
 * Reuses the MilestoneMoment pattern (celebrate-only, one-shot per browser). This
 * celebrates the user's FIRST time sharing a transformation clip.
 *
 * ECONOMY CONTRACT (binding, Gary decision 2026-06-27; same as milestoneMoment.ts):
 *   READ-ONLY. This surface NEVER writes any Helix economy row, NEVER credits any
 *   balance, NEVER awards Helix from the clip surface. It only DISPLAYS a
 *   celebratory moment. Any first-share to Helix crediting is a SEPARATE server
 *   task in the server award lane, never here. The avatar / clip surface is a
 *   visualization layer only. (This module is deliberately free of every economy
 *   write symbol so the structural read-only test passes by construction.)
 *
 * First-share guard: localStorage key vc_clip_first_share_seen (per-browser, no
 * PII). Once set, the moment never re-fires. Mirrors the milestoneMoment seen-guard
 * idiom but persists across sessions (a first share is a once-ever moment).
 *
 * Standing rules: no em dashes, no en dashes, no emojis, zero any. Pure/SSR-safe;
 * never throws.
 */

// The once-ever first-share guard key. localStorage (not sessionStorage): a first
// share is celebrated once per browser, ever, not once per tab session.
export const CLIP_FIRST_SHARE_KEY = 'vc_clip_first_share_seen';

/**
 * True when the first-share moment has NOT yet been celebrated on this browser.
 * SSR-safe (typeof window guard) and fail-open: any storage error returns false
 * (do not celebrate) so a private-mode failure never forces a repeat celebration.
 * Pure read; does not mutate storage.
 */
export function shouldCelebrateFirstShare(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(CLIP_FIRST_SHARE_KEY) === null;
  } catch {
    return false;
  }
}

/**
 * Marks the first-share moment as celebrated on this browser so it never re-fires.
 * Fail-open: any write error (private browsing, storage full, SSR) is swallowed.
 *
 * NOTE: this writes ONLY the local seen-guard flag. It does NOT write any Helix
 * economy table (read-only economy contract).
 */
export function markFirstShareCelebrated(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CLIP_FIRST_SHARE_KEY, '1');
  } catch {
    // Fail-open: swallow write errors.
  }
}
