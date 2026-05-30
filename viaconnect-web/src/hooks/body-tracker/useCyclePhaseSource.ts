'use client';

// useCyclePhaseSource  resolve the inputs needed to compute cycle-phase trend
// annotations for the CONSUMER's own body-scan history (Prompt #169b, 11.2.3).
//
// Reads ONCE (not per scan row):
//   * the opt-in (profiles.cycle_phase_annotation_opt_in, default OFF) via
//     useCyclePhaseOptIn, and
//   * ONLY when opted in, the cycle inputs (cycle start date + cycle length) from
//     the CAQ (clinical_assessments), read DEFENSIVELY.
//
// CYCLE-DATA SOURCE (see Task 18 report): the expected phase needs a cycle start
// date + cycle length. The current CAQ does NOT capture structured cycle data
// (clinical_assessments has biological_sex / date_of_birth / hormonal-symptom
// severity / a menopause flag, but no last-menstrual-period date and no cycle
// length). So these two columns are read defensively (they do not exist yet); when
// absent, computeCyclePhase yields 'unknown' and no note renders. The annotation
// lights up automatically once the CAQ supplies cycle data, with no code change.
//
// PRIVACY: cycle data is only fetched when the user has opted in (sensitive: it is
// not read at all otherwise), and it governs the consumer's own surface only.
//
// The phase MATH + annotation copy live in the pure, unit-tested module
// src/lib/body-tracker/time-of-day-trend.ts.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCyclePhaseOptIn } from '@/hooks/body-tracker/useCyclePhaseOptIn';
import {
  resolveCyclePhaseForScan,
  buildCyclePhaseAnnotation,
} from '@/lib/body-tracker/time-of-day-trend';

export interface UseCyclePhaseSourceResult {
  // The consumer's opt-in (default OFF).
  optedIn: boolean;
  // Loading either the opt-in or the cycle inputs.
  isLoading: boolean;
  // Build the per-scan annotation string for a scan date, or null when there is
  // nothing to show (not opted in, no cycle data, or a phase that carries no note).
  annotationFor: (scanDate: string) => string | null;
}

interface CycleSource {
  cycleStartDate: string | null;
  cycleLengthDays: number | null;
}

export function useCyclePhaseSource(): UseCyclePhaseSourceResult {
  const { optedIn, isLoading: optInLoading } = useCyclePhaseOptIn();
  const [source, setSource] = useState<CycleSource | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);

  useEffect(() => {
    // Sensitive: only read cycle data when opted in.
    if (!optedIn) { setSource(null); setSourceLoading(false); return; }
    let mounted = true;
    setSourceLoading(true);
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { if (mounted) { setSource(null); setSourceLoading(false); } return; }
        // Defensive optional read: these columns do not exist in the CAQ yet, so
        // the select may error; we swallow it and treat the data as absent.
        const res = await (supabase as unknown as {
          from: (t: string) => {
            select: (c: string) => {
              eq: (col: string, val: string) => {
                maybeSingle: () => Promise<{ data: Record<string, unknown> | null }>;
              };
            };
          };
        })
          .from('clinical_assessments')
          .select('cycle_start_date, cycle_length_days')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!mounted) return;
        const row = res.data ?? {};
        const start = typeof row.cycle_start_date === 'string' ? row.cycle_start_date : null;
        const len = typeof row.cycle_length_days === 'number' ? row.cycle_length_days : null;
        setSource({ cycleStartDate: start, cycleLengthDays: len });
      } catch {
        if (mounted) setSource({ cycleStartDate: null, cycleLengthDays: null });
      } finally {
        if (mounted) setSourceLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [optedIn]);

  const annotationFor = (scanDate: string): string | null => {
    if (!optedIn || !source) return null;
    const phase = resolveCyclePhaseForScan({
      optedIn,
      cycleStartDate: source.cycleStartDate,
      cycleLengthDays: source.cycleLengthDays,
      scanDate,
    });
    return buildCyclePhaseAnnotation(phase, optedIn);
  };

  return {
    optedIn,
    isLoading: optInLoading || sourceLoading,
    annotationFor,
  };
}
