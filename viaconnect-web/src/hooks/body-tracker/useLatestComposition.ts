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
import { parsePositiveFinite, resolveWeightKg } from '@/lib/scan/clinicalBodyMetrics';

export interface UseLatestCompositionResult {
  snapshot: CompositionSnapshot | null;
  bmi: number | null;
  /** CAQ-first Total Weight (resolveWeightKg) converted to lbs. Honest null. */
  caqWeightLbs: number | null;
  /** Manual / XML weight-row fat. Independent of segmental fat. */
  weightBodyFatPct: number | null;
  /** Manual / XML weight-row lean. Independent of segmental muscle. */
  weightLeanLbs: number | null;
  loading: boolean;
  error: boolean;
  refresh: () => void;
}

const TIMEOUT_MS = 4000;
const SCOPE = 'hook.useLatestComposition';

export function useLatestComposition(userId: string | null): UseLatestCompositionResult {
  const [snapshot, setSnapshot] = useState<CompositionSnapshot | null>(null);
  const [bmi, setBmi] = useState<number | null>(null);
  const [caqWeightLbs, setCaqWeightLbs] = useState<number | null>(null);
  const [weightBodyFatPct, setWeightBodyFatPct] = useState<number | null>(null);
  const [weightLeanLbs, setWeightLeanLbs] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!userId) {
      setSnapshot(null);
      setBmi(null);
      setCaqWeightLbs(null);
      setWeightBodyFatPct(null);
      setWeightLeanLbs(null);
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

        // c. Parent body_tracker_entries row.
        // Prefer the entry linked to the latest fat/muscle detail row.
        // Prompt 210l: if the user only logged weight/girths (manual path), there
        // may be no segmental rows yet. Fall back to the latest parent entry so
        // the fat/muscle tabs still mount with honest No data for composition
        // fields instead of blanking the entire spine.
        const entryId = fatRow?.entry_id ?? muscleRow?.entry_id ?? null;

        type EntryRowRaw = {
          id: string;
          source: string;
          created_at: string;
          scan_id?: string | null;
          notes?: string | null;
          device_name?: string | null;
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
                .select('id,source,created_at,scan_id,notes,device_name,manual_source_id')
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

        if (!entryRow) {
          try {
            const result = await withTimeout(
              (supabase as unknown as {
                from: (t: string) => {
                  select: (cols: string) => {
                    eq: (col: string, val: string) => {
                      order: (col: string, opts: { ascending: boolean }) => {
                        limit: (n: number) => {
                          maybeSingle: () => Promise<{ data: EntryRowRaw | null; error: { message: string } | null }>;
                        };
                      };
                    };
                  };
                };
              })
                .from('body_tracker_entries')
                .select('id,source,created_at,scan_id,notes,device_name,manual_source_id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
              TIMEOUT_MS,
              `${SCOPE}.entry_fallback`
            );
            if (result.error) {
              safeLog.warn(SCOPE, 'entry fallback query error', {
                message: result.error.message,
              });
            } else {
              entryRow = result.data;
            }
          } catch (e) {
            safeLog.warn(SCOPE, 'entry fallback fetch failed (fail-open)', { error: e });
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
        let latestWeightFatPct: number | null = null;
        let latestWeightLeanLbs: number | null = null;
        try {
          const result = await withTimeout(
            (supabase as unknown as {
              from: (t: string) => {
                select: (cols: string) => {
                  eq: (col: string, val: string) => {
                    not: (col: string, op: string, val: null) => {
                      order: (col: string, opts: { ascending: boolean }) => {
                        limit: (n: number) => {
                          maybeSingle: () => Promise<{
                            data: {
                              weight_lbs: number | null;
                              body_fat_pct: number | null;
                              lean_body_mass_lbs: number | null;
                            } | null;
                            error: { message: string } | null;
                          }>;
                        };
                      };
                    };
                  };
                };
              };
            })
              .from('body_tracker_weight')
              .select('weight_lbs, body_fat_pct, lean_body_mass_lbs')
              .eq('user_id', userId)
              // Prompt 210c T10: ignore weight rows whose weight_lbs is NULL (e.g. a
              // hip-only circumference-scan row, or a manual hip entry from #85d) so
              // such a row can never shadow the real most-recent weight for BMI.
              .not('weight_lbs', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            TIMEOUT_MS,
            `${SCOPE}.weight`
          );
          if (!result.error && result.data) {
            weightLbs = result.data.weight_lbs;
            const fat = result.data.body_fat_pct;
            const lean = result.data.lean_body_mass_lbs;
            if (typeof fat === 'number' && Number.isFinite(fat) && fat > 0) {
              latestWeightFatPct = fat;
            }
            if (typeof lean === 'number' && Number.isFinite(lean) && lean > 0) {
              latestWeightLeanLbs = lean;
            }
          }
        } catch (e) {
          safeLog.warn(SCOPE, 'weight fetch failed (fail-open)', { error: e });
        }

        // Gary HARD: prefer finite CAQ Total Weight; never invent kg / Muscle lbs.
        // Tracker lbs is only used when CAQ + clinical weight are UNKNOWN.
        const resolvedWeight = await resolveWeightKg(supabase, userId);
        const caqKg = parsePositiveFinite(resolvedWeight.weightKg);
        const trackerKg =
          weightLbs !== null && Number.isFinite(weightLbs) && weightLbs > 0
            ? weightLbs * 0.45359237
            : null;
        const weightKg: number | null = caqKg ?? trackerKg;

        if (heightCm !== null && heightCm > 0 && weightKg !== null && weightKg > 0) {
          const heightM = heightCm / 100;
          bmiValue = weightKg / (heightM * heightM);
        }

        if (cancelled) return;

        // Build the snapshot. mapRows returns null when entry is null.
        const built = mapRows({ entry: entryRow, fat: fatRow, muscle: muscleRow });

        const caqLbs = caqKg !== null ? caqKg * 2.20462262 : null;

        setSnapshot(built);
        setBmi(bmiValue);
        setCaqWeightLbs(caqLbs);
        setWeightBodyFatPct(latestWeightFatPct);
        setWeightLeanLbs(latestWeightLeanLbs);
        setLoading(false);
        setError(false);
      } catch (e) {
        if (cancelled) return;
        safeLog.error(SCOPE, 'top-level composition load failed', { error: e, userId });
        setSnapshot(null);
        setBmi(null);
        setCaqWeightLbs(null);
        setWeightBodyFatPct(null);
        setWeightLeanLbs(null);
        setLoading(false);
        setError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  return {
    snapshot,
    bmi,
    caqWeightLbs,
    weightBodyFatPct,
    weightLeanLbs,
    loading,
    error,
    refresh,
  };
}
