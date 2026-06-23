'use client';

// Prompt #209: reads the latest body_tracker_entries + segmental_fat +
// segmental_muscle rows for a user and returns a typed CompositionSnapshot.
// BMI is computed from profile height + latest weight - null (UNKNOWN) when
// either is absent or non-positive, never fabricated, never coerced to 0.
// Each sub-query is individually try/caught and fail-open to null so a single
// missing table never blanks the entire card set.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { mapRows } from '@/lib/body-tracker/composition/mapRows';
import type { CompositionSnapshot } from '@/lib/body-tracker/composition/types';

export interface UseLatestCompositionResult {
  snapshot: CompositionSnapshot | null;
  bmi: number | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

const TIMEOUT_MS = 4000;
const SCOPE = 'hook.useLatestComposition';

export function useLatestComposition(userId: string | null): UseLatestCompositionResult {
  const [snapshot, setSnapshot] = useState<CompositionSnapshot | null>(null);
  const [bmi, setBmi] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!userId) {
      setSnapshot(null);
      setBmi(null);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(false);

    (async () => {
      try {
        const supabase = createClient();

        // a. Latest segmental fat row
        type FatRowRaw = {
          right_arm_pct: number | null;
          left_arm_pct: number | null;
          trunk_pct: number | null;
          right_leg_pct: number | null;
          left_leg_pct: number | null;
          total_body_fat_pct: number | null;
          visceral_fat_rating: number | null;
          body_water_pct: number | null;
          entry_id: string | null;
        };

        let fatRow: FatRowRaw | null = null;
        try {
          const result = await withTimeout(
            (supabase as unknown as {
              from: (t: string) => {
                select: (cols: string) => {
                  eq: (col: string, val: string) => {
                    order: (col: string, opts: { ascending: boolean }) => {
                      limit: (n: number) => {
                        maybeSingle: () => Promise<{ data: FatRowRaw | null; error: { message: string } | null }>;
                      };
                    };
                  };
                };
              };
            })
              .from('body_tracker_segmental_fat')
              .select(
                'right_arm_pct,left_arm_pct,trunk_pct,right_leg_pct,left_leg_pct,total_body_fat_pct,visceral_fat_rating,body_water_pct,entry_id'
              )
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            TIMEOUT_MS,
            `${SCOPE}.fat`
          );
          if (result.error) {
            safeLog.warn(SCOPE, 'fat row query error', { message: result.error.message });
          } else {
            fatRow = result.data;
          }
        } catch (e) {
          safeLog.warn(SCOPE, 'fat row fetch failed (fail-open)', { error: e });
        }

        // b. Latest segmental muscle row
        type MuscleRowRaw = {
          right_arm_lbs: number | null;
          left_arm_lbs: number | null;
          trunk_lbs: number | null;
          right_leg_lbs: number | null;
          left_leg_lbs: number | null;
          total_muscle_mass_lbs: number | null;
          skeletal_muscle_mass_lbs: number | null;
          entry_id: string | null;
        };

        let muscleRow: MuscleRowRaw | null = null;
        try {
          const result = await withTimeout(
            (supabase as unknown as {
              from: (t: string) => {
                select: (cols: string) => {
                  eq: (col: string, val: string) => {
                    order: (col: string, opts: { ascending: boolean }) => {
                      limit: (n: number) => {
                        maybeSingle: () => Promise<{ data: MuscleRowRaw | null; error: { message: string } | null }>;
                      };
                    };
                  };
                };
              };
            })
              .from('body_tracker_segmental_muscle')
              .select(
                'right_arm_lbs,left_arm_lbs,trunk_lbs,right_leg_lbs,left_leg_lbs,total_muscle_mass_lbs,skeletal_muscle_mass_lbs,entry_id'
              )
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            TIMEOUT_MS,
            `${SCOPE}.muscle`
          );
          if (result.error) {
            safeLog.warn(SCOPE, 'muscle row query error', { message: result.error.message });
          } else {
            muscleRow = result.data;
          }
        } catch (e) {
          safeLog.warn(SCOPE, 'muscle row fetch failed (fail-open)', { error: e });
        }

        // c. Parent body_tracker_entries row
        // Use fat entry_id if present, else muscle entry_id.
        const entryId = fatRow?.entry_id ?? muscleRow?.entry_id ?? null;

        type EntryRowRaw = {
          id: string;
          source: 'scan' | 'manual';
          created_at: string;
        };

        let entryRow: EntryRowRaw | null = null;
        if (entryId) {
          try {
            const result = await withTimeout(
              (supabase as unknown as {
                from: (t: string) => {
                  select: (cols: string) => {
                    eq: (col: string, val: string) => {
                      maybeSingle: () => Promise<{ data: EntryRowRaw | null; error: { message: string } | null }>;
                    };
                  };
                };
              })
                .from('body_tracker_entries')
                .select('id,source,created_at')
                .eq('id', entryId)
                .maybeSingle(),
              TIMEOUT_MS,
              `${SCOPE}.entry`
            );
            if (result.error) {
              safeLog.warn(SCOPE, 'entry row query error', { message: result.error.message });
            } else {
              entryRow = result.data;
            }
          } catch (e) {
            safeLog.warn(SCOPE, 'entry row fetch failed (fail-open)', { error: e });
          }
        }

        // d. Clinical assessment (height + fallback weight) + latest tracker weight for BMI.
        // height_cm lives on clinical_assessments, NOT profiles (profiles.height_cm does not exist).
        // UNKNOWN (null) when either is absent or non-positive.
        let bmiValue: number | null = null;

        type ClinicalRowRaw = { height_cm: number | null; weight_kg: number | null };
        let clinicalRow: ClinicalRowRaw | null = null;
        try {
          const result = await withTimeout(
            (supabase as unknown as {
              from: (t: string) => {
                select: (cols: string) => {
                  eq: (col: string, val: string) => {
                    order: (col: string, opts: { ascending: boolean }) => {
                      limit: (n: number) => {
                        maybeSingle: () => Promise<{ data: ClinicalRowRaw | null; error: { message: string } | null }>;
                      };
                    };
                  };
                };
              };
            })
              .from('clinical_assessments')
              .select('height_cm, weight_kg')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            TIMEOUT_MS,
            'composition.latest.height'
          );
          if (result.error) {
            safeLog.warn(SCOPE, 'clinical_assessments query error (fail-open)', { message: result.error.message });
          } else {
            clinicalRow = result.data;
          }
        } catch (e) {
          safeLog.warn(SCOPE, 'clinical_assessments fetch failed (fail-open)', { error: e });
        }

        const heightCm: number | null = clinicalRow?.height_cm ?? null;

        let weightLbs: number | null = null;
        try {
          const result = await withTimeout(
            (supabase as unknown as {
              from: (t: string) => {
                select: (cols: string) => {
                  eq: (col: string, val: string) => {
                    order: (col: string, opts: { ascending: boolean }) => {
                      limit: (n: number) => {
                        maybeSingle: () => Promise<{ data: { weight_lbs: number | null } | null; error: { message: string } | null }>;
                      };
                    };
                  };
                };
              };
            })
              .from('body_tracker_weight')
              .select('weight_lbs')
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            TIMEOUT_MS,
            `${SCOPE}.weight`
          );
          if (!result.error && result.data) {
            weightLbs = result.data.weight_lbs;
          }
        } catch (e) {
          safeLog.warn(SCOPE, 'weight fetch failed (fail-open)', { error: e });
        }

        // Prefer body_tracker_weight (lbs converted); fall back to clinical assessment weight_kg.
        const weightKg: number | null =
          weightLbs !== null
            ? weightLbs * 0.45359237
            : (clinicalRow?.weight_kg ?? null);

        if (heightCm !== null && heightCm > 0 && weightKg !== null && weightKg > 0) {
          const heightM = heightCm / 100;
          bmiValue = weightKg / (heightM * heightM);
        }

        if (cancelled) return;

        // Build the snapshot. mapRows returns null when entry is null.
        const built = mapRows({ entry: entryRow, fat: fatRow, muscle: muscleRow });

        setSnapshot(built);
        setBmi(bmiValue);
        setLoading(false);
        setError(false);
      } catch (e) {
        if (cancelled) return;
        safeLog.error(SCOPE, 'top-level composition load failed', { error: e, userId });
        setSnapshot(null);
        setBmi(null);
        setLoading(false);
        setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  return { snapshot, bmi, loading, error, refresh };
}
