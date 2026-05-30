'use client';

// useCaqFreshness  load the user's last known weight/height + the AGE of that
// stat, decide whether a pre capture confirm step is required, and persist a
// confirmed/updated stat (Prompt #169b, Task 17, spec section 10).
//
// Exposes:
//   * isLoading
//   * decision           the staleness decision (needsConfirm + reason)
//   * weightKg/heightCm  the current canonical (kg/cm) profile values, or null
//   * statDateIso        the date of the freshness signal (most recent dated
//                        stat entry), or null when unknown (first ever scan)
//   * unitSystem         the user's preferred display unit (imperial / metric)
//   * confirmStats(...)  persist a confirmed/updated stat for the given session
//
// FRESHNESS SIGNAL (see caq-freshness.ts header): profiles.weight_kg /
// profiles.height_cm have no per field updated-at, and profiles.updated_at is not
// stat specific. The authoritative dated self reported weight is the most recent
// body_tracker_weight row, dated by its linked body_tracker_entries.entry_date
// (the same join useCircumferenceData uses). When no dated stat entry exists the
// age is UNKNOWN and the decision treats it as stale (prompt), never silently
// fresh. Height has no separate dated source, so it reuses that same stat date.
//
// The DECISION + every payload shape are the pure, unit tested module
// src/lib/body-tracker/caq-freshness.ts; this hook is only I/O + React state.
//
// PERSISTENCE on confirm (no new migration; columns from 20260516000070):
//   * body_photo_sessions.weight_kg_at_scan / height_cm_at_scan (+ *_source) is
//     the per scan pin the composition inputs use (never a later stale read).
//   * caq_demographics_updates logs each field the user actually CHANGED.
//   * profiles.weight_kg / height_cm master is updated ONLY when the user opts in
//     ("also update my profile"); otherwise the master is left undisturbed.

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  decideStatFreshness,
  ageInDays,
  resolveStatSource,
  isStatChanged,
  buildDemographicsUpdatePayload,
  buildSessionStatPatch,
  buildProfileMasterPatch,
  WEIGHT_UNCHANGED_EPSILON_KG,
  HEIGHT_UNCHANGED_EPSILON_CM,
  type StatFreshnessDecision,
  type UnitSystem,
} from '@/lib/body-tracker/caq-freshness';

export interface ConfirmStatsArgs {
  sessionId: string;
  // Confirmed values in CANONICAL units (kg / cm). The screen converts from the
  // user's display unit before calling this.
  weightKg: number;
  heightCm: number;
  // "Also update my profile" opt in. When false (default), the confirm is a per
  // scan input only and the profiles master is left undisturbed.
  updateMaster: boolean;
}

export interface UseCaqFreshnessResult {
  isLoading: boolean;
  decision: StatFreshnessDecision;
  weightKg: number | null;
  heightCm: number | null;
  statDateIso: string | null;
  unitSystem: UnitSystem;
  // Persist the confirmed/updated stat. Resolves true on success. Internally:
  // pins the per scan columns, logs changed fields, and (opt in) updates master.
  confirmStats: (args: ConfirmStatsArgs) => Promise<boolean>;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

// Loose structural cast for the foreign table join read, matching the
// body-tracker hooks convention (these tables are not in the generated types).
interface WeightFreshnessRow {
  weight_lbs: number | null;
  created_at: string | null;
  body_tracker_entries?: { entry_date: string | null } | null;
}

export function useCaqFreshness(): UseCaqFreshnessResult {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [statDateIso, setStatDateIso] = useState<string | null>(null);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [decision, setDecision] = useState<StatFreshnessDecision>({
    needsConfirm: false,
    reason: 'fresh',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setIsLoading(false);
          return;
        }
        if (!cancelled) setUserId(user.id);

        // Profile: current canonical weight/height + the user's display unit.
        const { data: profile } = await supabase
          .from('profiles')
          .select('weight_kg, height_cm, unit_system')
          .eq('id', user.id)
          .maybeSingle();
        const p = profile as { weight_kg?: number | null; height_cm?: number | null; unit_system?: string | null } | null;
        const wKg = p?.weight_kg ?? null;
        const hCm = p?.height_cm ?? null;
        const unit: UnitSystem = p?.unit_system === 'metric' ? 'metric' : 'imperial';

        // Freshness signal: the most recent dated body_tracker_weight row.
        const sb = supabase as unknown as {
          from: (t: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                order: (col: string, opts: { ascending: boolean }) => {
                  limit: (n: number) => Promise<{ data: WeightFreshnessRow[] | null }>;
                };
              };
            };
          };
        };
        const { data: weightRows } = await sb
          .from('body_tracker_weight')
          .select('weight_lbs, created_at, body_tracker_entries(entry_date)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const latestWeight = (weightRows ?? [])[0] ?? null;
        // Prefer the entry's logical date; fall back to the row's created_at.
        const statDate = latestWeight?.body_tracker_entries?.entry_date ?? latestWeight?.created_at ?? null;

        const ageDays = ageInDays(statDate);
        const nextDecision = decideStatFreshness({ weightKg: wKg, heightCm: hCm, ageDays });

        if (!cancelled) {
          setWeightKg(wKg);
          setHeightCm(hCm);
          setStatDateIso(statDate);
          setUnitSystem(unit);
          setDecision(nextDecision);
        }
      } catch {
        // Fail safe: on a read error, PROMPT (treat as stale) rather than letting
        // a possibly stale stat silently feed the composition estimate.
        if (!cancelled) {
          setDecision({ needsConfirm: true, reason: 'unknown_age' });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const confirmStats = useCallback(async (args: ConfirmStatsArgs): Promise<boolean> => {
    if (!userId) return false;
    try {
      const supabase = createClient();

      const newWeightKg = round2(args.weightKg);
      const newHeightCm = round2(args.heightCm);

      const weightSource = resolveStatSource(weightKg, newWeightKg, WEIGHT_UNCHANGED_EPSILON_KG);
      const heightSource = resolveStatSource(heightCm, newHeightCm, HEIGHT_UNCHANGED_EPSILON_CM);
      const weightChanged = isStatChanged(weightKg, newWeightKg, WEIGHT_UNCHANGED_EPSILON_KG);
      const heightChanged = isStatChanged(heightCm, newHeightCm, HEIGHT_UNCHANGED_EPSILON_CM);

      // 1. Pin the confirmed stat onto the session (the composition inputs use
      //    THIS, not a later stale profile read).
      const patch = buildSessionStatPatch({
        weightKg: newWeightKg,
        heightCm: newHeightCm,
        weightSource,
        heightSource,
      });
      const { error: sessionErr } = await supabase
        .from('body_photo_sessions')
        .update(patch as never)
        .eq('id', args.sessionId)
        .eq('user_id', userId);
      if (sessionErr) return false;

      // 2. Log each field the user actually CHANGED to the audit trail. An
      //    unchanged confirm (caq_phase_1) does not create a log row.
      const logRows: Record<string, unknown>[] = [];
      if (weightChanged) {
        logRows.push({
          ...buildDemographicsUpdatePayload({
            field: 'weight_kg',
            oldValue: weightKg,
            newValue: newWeightKg,
            source: weightSource,
            updatedCaqMaster: args.updateMaster,
          }),
          user_id: userId,
        });
      }
      if (heightChanged) {
        logRows.push({
          ...buildDemographicsUpdatePayload({
            field: 'height_cm',
            oldValue: heightCm,
            newValue: newHeightCm,
            source: heightSource,
            updatedCaqMaster: args.updateMaster,
          }),
          user_id: userId,
        });
      }
      if (logRows.length > 0) {
        // Best effort audit log; a log failure must not block the scan.
        // caq_demographics_updates is not in the generated supabase types, so use
        // a narrow structural cast for the insert (matching useBiometricConsent).
        const writer = supabase as unknown as {
          from: (t: string) => {
            insert: (rows: Record<string, unknown>[]) => Promise<{ error: { message: string } | null }>;
          };
        };
        await writer.from('caq_demographics_updates').insert(logRows);
      }

      // 3. Update the CAQ / profile master ONLY when the user opted in, and only
      //    for the fields they changed. Otherwise the master is left untouched.
      const masterPatch = buildProfileMasterPatch({
        updateMaster: args.updateMaster,
        weightChanged,
        heightChanged,
        weightKg: newWeightKg,
        heightCm: newHeightCm,
      });
      if (masterPatch) {
        await supabase
          .from('profiles')
          .update(masterPatch as never)
          .eq('id', userId);
        // Reflect the new master locally so a re-render shows the updated value.
        if (masterPatch.weight_kg !== undefined) setWeightKg(masterPatch.weight_kg);
        if (masterPatch.height_cm !== undefined) setHeightCm(masterPatch.height_cm);
      }

      // The confirm satisfied the freshness gate for this capture.
      setDecision({ needsConfirm: false, reason: 'fresh' });
      return true;
    } catch {
      return false;
    }
  }, [userId, weightKg, heightCm]);

  return { isLoading, decision, weightKg, heightCm, statDateIso, unitSystem, confirmStats };
}
