'use client';

// Task 211b-W4b - Pregnancy-mode gating hook (SAFETY-CRITICAL).
//
// Reads the user's own latest user_health_context.pregnancy_status (client-safe
// accessors in pregnancyContextDb.ts, own-row RLS) and composes it through the
// APPROVED W4a service getCompositionGating (pregnancyMode.ts) UNMODIFIED -- this
// hook never re-derives the pregnancy/composition-suppression decision itself.
//
// This is the single call site the composition page uses to decide whether to
// suppress composition ESTIMATE surfaces (BodyFatReadout, NotableChanges'
// composition-derived headline, FutureSelfPanel, PersonalPrecisionPanel). Girth
// MEASUREMENTS are never part of this gate (see pregnancyMode.ts).
//
// Fail-open on a read error (matches every other own-row read in this codebase
// per CLAUDE.md's resilience patterns): gating.compositionSuppressed defaults to
// false until a successful read says otherwise, so a transient network error
// never blocks a non-pregnant user's normal page. See the W4b report for the
// flagged loading-window race this implies (composition figures can render
// briefly before this hook's read resolves) -- a Kelsey/product call on whether
// a stricter fail-closed loading state is required before ship.
//
// Write path: user_health_context has SELECT-own and INSERT-own RLS but NO
// UPDATE-own policy (migration 20260621134000), so a status change is an
// append-only INSERT of a new row, carrying forward the other fields from the
// latest row so they are not silently reset to empty.

import { useCallback, useEffect, useRef, useState } from 'react';
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

export interface UsePregnancyGatingResult {
  /** The current coarse indication, read from (or written to) pregnancy_status. */
  indication: PregnancyIndication;
  /** The APPROVED W4a gating decision, computed from `indication` unmodified. */
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
  // Carries forward the other user_health_context fields on a write (append-only
  // INSERT); never re-derived, just the last row we successfully read/wrote.
  const lastRowRef = useRef<HealthContextRow | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const supabase = createClient();
        const result = await withTimeout(
          readOwnLatestHealthContext(supabase, userId),
          TIMEOUT_MS,
          `${SCOPE}.read`,
        );
        if (!active) return;
        if (result.data) {
          lastRowRef.current = result.data;
          setIndicationState(toIndication(result.data.pregnancy_status));
        }
      } catch (err) {
        safeLog.warn(SCOPE, 'read failed, failing open (not suppressed)', {
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
        try {
          const supabase = createClient();
          const prior = lastRowRef.current;
          const nextRow: HealthContextRow = {
            demographics: prior?.demographics ?? {},
            conditions: prior?.conditions ?? [],
            medications: prior?.medications ?? [],
            allergies: prior?.allergies ?? [],
            pregnancy_status: INDICATION_TO_STATUS[next],
            goals: prior?.goals ?? [],
          };
          const { error: insertError } = await withTimeout(
            insertOwnHealthContext(supabase, { user_id: userId, ...nextRow }),
            TIMEOUT_MS,
            `${SCOPE}.write`,
          );
          if (insertError) throw new Error(insertError.message);
          lastRowRef.current = nextRow;
        } catch (err) {
          setIndicationState(previous); // revert
          setError('Could not save that just now. Please try again.');
          safeLog.warn(SCOPE, 'write failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        } finally {
          setSaving(false);
        }
      })();
    },
    [userId, indication],
  );

  // The APPROVED W4a service decides suppression. Never re-derived here.
  const gating = getCompositionGating({ pregnancyStatus: INDICATION_TO_STATUS[indication] });

  return { indication, gating, loading, saving, error, setIndication };
}
