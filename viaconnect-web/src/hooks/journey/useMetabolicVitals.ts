'use client';

/**
 * src/hooks/journey/useMetabolicVitals.ts
 *
 * Prompt 208j Task J-T3. Reads the latest body_tracker_metabolic row for the
 * user: HRV, resting HR, respiratory rate, blood oxygen.
 *
 * Schema: body_tracker_metabolic.
 * hrv_ms and resting_hr_bpm are from migration 20260414000020_prompt_140_bio_tracker.sql
 * (types.ts line 3566). respiratory_rate and blood_oxygen_pct are from migration
 * 20260416000080_body_tracker_manual_input.sql.
 * Columns used: hrv_ms, resting_hr_bpm, respiratory_rate, blood_oxygen_pct, created_at.
 *
 * Resilience: withTimeout(4000) + try/catch fail-open + safeLog.
 * Auth scoped: filter by user_id = userId via RLS.
 *
 * Rules: no em-dashes, no emojis, no `any`.
 */

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

// ---------------------------------------------------------------------------
// Pure helper (exported for TDD)
// ---------------------------------------------------------------------------

/**
 * Format a vital value with its unit string.
 * Returns "X unit" when v is a non-null finite number (including 0).
 * Returns "--" for null, NaN, Infinity, or non-numeric values.
 */
export function formatVitalValue(v: number | null, unit: string): string {
  if (v === null) return '--';
  if (!isFinite(v)) return '--';
  return `${v} ${unit}`;
}

// ---------------------------------------------------------------------------
// Row type (avoids `any`)
// ---------------------------------------------------------------------------

interface MetabolicRow {
  hrv_ms: number | null;
  resting_hr_bpm: number | null;
  respiratory_rate: number | null;
  blood_oxygen_pct: number | null;
  created_at: string | null;
}

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface MetabolicVitalsResult {
  hrv: number | null;
  restingHr: number | null;
  respiratory: number | null;
  bloodOxygen: number | null;
  readingAt: string | null;
  loading: boolean;
}

const INITIAL: MetabolicVitalsResult = {
  hrv: null,
  restingHr: null,
  respiratory: null,
  bloodOxygen: null,
  readingAt: null,
  loading: true,
};

// ---------------------------------------------------------------------------
// useMetabolicVitals
// ---------------------------------------------------------------------------

/**
 * Reads the latest body_tracker_metabolic row for the user.
 *
 * Fail-open: any error resolves with all-null values and loading: false.
 *
 * @param userId The authenticated user id, or null before auth resolves.
 */
export function useMetabolicVitals(userId: string | null): MetabolicVitalsResult {
  const [result, setResult] = useState<MetabolicVitalsResult>(INITIAL);
  const [refreshTick, setRefreshTick] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleFocus = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setRefreshTick((t) => t + 1);
      }, 500);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!userId) {
      setResult({ hrv: null, restingHr: null, respiratory: null, bloodOxygen: null, readingAt: null, loading: false });
      return;
    }

    let active = true;

    (async () => {
      try {
        const supabase = createClient();
        type MvResult = { data: MetabolicRow | null; error: unknown };
        const { data } = await withTimeout(
          supabase
            .from('body_tracker_metabolic')
            .select('hrv_ms, resting_hr_bpm, respiratory_rate, blood_oxygen_pct, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle() as unknown as Promise<MvResult>,
          4000,
          'useMetabolicVitals.body_tracker_metabolic',
        );
        if (!active) return;
        const toNum = (v: number | null): number | null =>
          typeof v === 'number' && isFinite(v) ? v : null;
        if (data) {
          setResult({
            hrv: toNum(data.hrv_ms),
            restingHr: toNum(data.resting_hr_bpm),
            respiratory: toNum(data.respiratory_rate),
            bloodOxygen: toNum(data.blood_oxygen_pct),
            readingAt: typeof data.created_at === 'string' ? data.created_at : null,
            loading: false,
          });
        } else {
          setResult({ hrv: null, restingHr: null, respiratory: null, bloodOxygen: null, readingAt: null, loading: false });
        }
      } catch (err) {
        if (!active) return;
        safeLog.warn('useMetabolicVitals', 'body_tracker_metabolic read failed, failing open', { error: err });
        setResult({ hrv: null, restingHr: null, respiratory: null, bloodOxygen: null, readingAt: null, loading: false });
      }
    })();

    return () => { active = false; };
  }, [userId, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  return result;
}
