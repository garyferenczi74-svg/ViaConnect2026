'use client';

// Task 211b-W4b - Pregnancy-mode gating hook (SAFETY-CRITICAL).
//
// Reads the user's own latest user_health_context.pregnancy_status (client-safe
// accessors in pregnancyContextDb.ts, own-row RLS) and composes it through the
// APPROVED W4a service getCompositionGating (pregnancyMode.ts) UNMODIFIED -- this
// hook never re-derives the pregnancy/composition-suppression DECISION itself.
// It only overrides the returned OUTCOME (never the decision logic) when the
// read that decision depends on has not yet completed or has failed.
//
// This is the single call site the composition page uses to decide whether to
// suppress composition ESTIMATE surfaces (BodyFatReadout, NotableChanges'
// composition-derived headline, FutureSelfPanel, PersonalPrecisionPanel). Girth
// MEASUREMENTS are never part of this gate (see pregnancyMode.ts).
//
// Task 211b-W4b review fix (C1, Critical, safety): fails CLOSED, not open. A
// read ERROR means we cannot confirm the user is not pregnant or lactating, so
// `gating.compositionSuppressed` (resolvePregnancyGating below) is forced true
// (with non-pregnancy-implying copy) until a successful read says otherwise,
// indefinitely if the error persists. This is a deliberate exception to the
// codebase's usual fail-open convention (CLAUDE.md resilience patterns): that
// convention governs non-safety reads, not a safety-critical suppression gate.
// The asymmetry of harm is decisive -- over-suppressing briefly (or on a rare
// error) is harmless; under-suppressing risks showing a pregnant user a
// composition estimate the product itself deems unreliable. `loading` is still
// exposed separately; deriveCompositionGate combines it with `gating` so the
// page can additionally fail closed on the pure loading window and show a
// neutral "checking" state there (never the pregnancy-suppression copy).
//
// Write path (Task 211b-W4b review fix, C2 Critical + stale-snapshot
// Important): user_health_context has SELECT-own and INSERT-own RLS but NO
// UPDATE-own policy (migration 20260621134000), so a status change is an
// append-only INSERT of a new row. To avoid destroying clinical PHI (meds /
// allergies / conditions / goals written by CAQ or admin surfaces) writePregnancyStatus
// below is a READ-MODIFY-WRITE: it blocks on a fresh, successful base read of
// the user's LATEST row taken immediately before the insert (never a stale
// mount-time snapshot), carries every other field forward unchanged, and
// changes only pregnancy_status. Re-reading immediately before the write (not
// reusing a mount-time ref) also mitigates a same-root concurrent-edit clobber:
// a newer clinical edit made after this page loaded is picked up and preserved
// rather than overwritten. If the base read fails, NOTHING is written -- never
// an empty-fields row -- and a non-destructive, revertible error is surfaced.

import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { getCompositionGating, type CompositionGatingResult } from '@/lib/formavision/pregnancy/pregnancyMode';
import {
  readOwnLatestHealthContext,
  insertOwnHealthContext,
  type HealthContextRow,
} from '@/lib/formavision/pregnancy/pregnancyContextDb';

const SCOPE = 'body-tracker.pregnancy-gating';
const TIMEOUT_MS = 4000;

/** The coarse, user-facing indication choices. Maps to pregnancy_status values
 * using the SAME convention isPregnancyModeActive already checks (substring
 * match on pregnant/lactating/breastfeeding/nursing). */
export type PregnancyIndication = 'none' | 'pregnant' | 'lactating';

function toIndication(status: string | null): PregnancyIndication {
  if (typeof status !== 'string') return 'none';
  const normalized = status.toLowerCase();
  if (normalized.includes('pregnant')) return 'pregnant';
  if (
    normalized.includes('lactating') ||
    normalized.includes('breastfeeding') ||
    normalized.includes('nursing')
  ) {
    return 'lactating';
  }
  return 'none';
}

const INDICATION_TO_STATUS: Readonly<Record<PregnancyIndication, string | null>> = {
  none: null,
  pregnant: 'pregnant',
  lactating: 'lactating',
};

// Task 211b-W4b review fix (C1): shown in place of an estimate ONLY while a
// read has genuinely FAILED (never during the initial loading window, which
// uses COMPOSITION_GATE_CHECKING_COPY below). Never implies the user is
// pregnant/lactating; states plainly that the setting could not be confirmed.
export const PREGNANCY_READ_ERROR_SUPPRESSED_COPY =
  'We could not confirm your pregnancy or lactation setting, so composition estimates are paused as a precaution. Girth measurements stay available. Please try again shortly.';

// Task 211b-W4b review fix (C1): shown on every composition-ESTIMATE surface
// during the pregnancy-gate's pure loading window (compositionSuppressed is
// false but loading is still true). Neutral and non-alarming -- it must never
// imply pregnancy or lactation mode is active, since most users seeing this
// window are neither.
export const COMPOSITION_GATE_CHECKING_COPY =
  'Checking your pregnancy and lactation setting before showing composition estimates.';

/**
 * Pure. Resolves the gating decision from the confirmed indication via the
 * APPROVED W4a service (getCompositionGating, never re-derived), overridden
 * to fail CLOSED when the base read has failed (C1, Critical).
 */
export function resolvePregnancyGating(
  indication: PregnancyIndication,
  readFailed: boolean,
): CompositionGatingResult {
  if (readFailed) {
    return { compositionSuppressed: true, reason: PREGNANCY_READ_ERROR_SUPPRESSED_COPY };
  }
  return getCompositionGating({ pregnancyStatus: INDICATION_TO_STATUS[indication] });
}

/**
 * Pure. Combines the resolved `gating` with the hook's `loading` flag into
 * the single value every composition-ESTIMATE call site must gate on (review
 * C1): active whenever gating already suppresses OR the base read has not
 * yet resolved. The copy differs by cause so a merely-loading (non-pregnant)
 * user is never shown pregnancy-suppression copy.
 */
export function deriveCompositionGate(
  gating: CompositionGatingResult,
  loading: boolean,
): { active: boolean; copy: string | null } {
  if (gating.compositionSuppressed) {
    return { active: true, copy: gating.reason };
  }
  if (loading) {
    return { active: true, copy: COMPOSITION_GATE_CHECKING_COPY };
  }
  return { active: false, copy: null };
}

export interface PregnancyStatusWriteResult {
  ok: boolean;
  /** The full row written (base row carried forward, pregnancy_status changed). Present iff ok. */
  row?: HealthContextRow;
  /** A safe-to-surface error message. Present iff not ok. */
  error?: string;
}

/**
 * Task 211b-W4b review fix (C2, Critical + stale-snapshot Important).
 * READ-MODIFY-WRITE against the FRESHEST user_health_context row: re-reads
 * immediately before writing (never a caller-supplied stale snapshot), so a
 * concurrent clinical edit made by another surface (CAQ, admin) is picked up
 * and preserved rather than clobbered. Writes ONLY when the base read
 * SUCCEEDS; a null row (genuinely no prior row) is a valid success with
 * nothing to preserve. On a FAILED base read (thrown/rejected, timed out, or
 * a Supabase-level error), this NEVER calls insertOwnHealthContext -- no
 * empty-fields row is ever written, which would otherwise become latest-by-
 * updated_at and bury existing meds/allergies/conditions.
 */
export async function writePregnancyStatus(
  supabase: SupabaseClient,
  userId: string,
  next: PregnancyIndication,
): Promise<PregnancyStatusWriteResult> {
  try {
    const baseRead = await withTimeout(
      readOwnLatestHealthContext(supabase, userId),
      TIMEOUT_MS,
      `${SCOPE}.base-read`,
    );
    if (baseRead.error) {
      throw new Error(baseRead.error.message);
    }
    // null data is a genuinely first-time row (no prior PHI to preserve), not
    // a failure. Every failed-read case above already threw and never
    // reaches this line, so insertOwnHealthContext below is never called on
    // a failed base read.
    const fresh: HealthContextRow | null = baseRead.data;
    const nextRow: HealthContextRow = {
      demographics: fresh?.demographics ?? {},
      conditions: fresh?.conditions ?? [],
      medications: fresh?.medications ?? [],
      allergies: fresh?.allergies ?? [],
      pregnancy_status: INDICATION_TO_STATUS[next],
      goals: fresh?.goals ?? [],
    };
    const { error: insertError } = await withTimeout(
      insertOwnHealthContext(supabase, { user_id: userId, ...nextRow }),
      TIMEOUT_MS,
      `${SCOPE}.write`,
    );
    if (insertError) throw new Error(insertError.message);
    return { ok: true, row: nextRow };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface UsePregnancyGatingResult {
  /** The current coarse indication, read from (or written to) pregnancy_status. */
  indication: PregnancyIndication;
  /**
   * The gating decision surfaced to the page (resolvePregnancyGating).
   * Derived from the APPROVED W4a service unmodified when the base read has
   * succeeded; forced to fail-closed when the read has failed (C1). Does NOT
   * account for `loading` -- pass this and `loading` to deriveCompositionGate
   * for the value every composition-estimate call site must actually gate on.
   */
  gating: CompositionGatingResult;
  loading: boolean;
  saving: boolean;
  error: string | null;
  setIndication: (next: PregnancyIndication) => void;
}

export function usePregnancyGating(userId: string | null): UsePregnancyGatingResult {
  const [indication, setIndicationState] = useState<PregnancyIndication>('none');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Task 211b-W4b review fix (C1): true only when the most recent base read
  // genuinely failed (thrown/rejected, timed out, or a Supabase-level error).
  // Drives resolvePregnancyGating's fail-closed override below. Reset at the
  // start of every new read attempt.
  const [readFailed, setReadFailed] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setReadFailed(false);
    void (async () => {
      try {
        const supabase = createClient();
        const result = await withTimeout(
          readOwnLatestHealthContext(supabase, userId),
          TIMEOUT_MS,
          `${SCOPE}.read`,
        );
        if (!active) return;
        // Task 211b-W4b review fix (C1): a Supabase-level error result must be
        // treated as a read failure too, not silently ignored (the prior
        // implementation only checked `result.data` and never surfaced
        // `result.error`, which left the gate fail-open on this path).
        if (result.error) {
          throw new Error(result.error.message);
        }
        if (result.data) {
          setIndicationState(toIndication(result.data.pregnancy_status));
        }
      } catch (err) {
        if (!active) return;
        setReadFailed(true);
        safeLog.warn(SCOPE, 'read failed, failing CLOSED (composition suppressed)', {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const setIndication = useCallback(
    (next: PregnancyIndication) => {
      if (!userId) return;
      const previous = indication;
      setIndicationState(next); // optimistic
      setSaving(true);
      setError(null);
      void (async () => {
        const supabase = createClient();
        const result = await writePregnancyStatus(supabase, userId, next);
        if (!result.ok) {
          setIndicationState(previous); // revert
          setError('Could not save that just now. Please try again.');
          safeLog.warn(SCOPE, 'write failed', { error: result.error });
        }
        setSaving(false);
      })();
    },
    [userId, indication],
  );

  const gating = resolvePregnancyGating(indication, readFailed);

  return { indication, gating, loading, saving, error, setIndication };
}
