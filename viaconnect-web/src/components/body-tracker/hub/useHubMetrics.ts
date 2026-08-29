'use client';

// Prompt 180 (2026-06-08): fail open metric hook for the My Biology Hub.
//
// Resolves all surface metric keys in one round trip and returns a map
// from metric key to a formatted string. Three layer resilience:
//   - Timeout: 3 second Promise.race so a slow source cannot hang the
//     hub.
//   - Fail open: on timeout or thrown error, return an empty map. A
//     card with no resolved metric simply renders without the chip.
//   - Structured logging: one safeLog line per failed source so the
//     drop off is observable.
//
// Sources are read only and lean on existing tables. If a key cannot
// be resolved without inventing data, it stays undefined and the card
// falls through to no chip. Metric formatting (sign, suffix, etc) is
// the card's job, not the hook's.

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { resolveHormonesReportChip } from '@/lib/kb/hormones/hormonesHubChip';
import {
  formatBodyFatChip,
  resolveLatestBodyFat,
} from '@/lib/body-tracker/composition/resolveLatestBodyFat';
import { safeLog } from '@/lib/utils/safe-log';

export interface HubMetricMap {
  bio_optimization_score?: string;
  body_fat_pct?: string;
  pct_to_goal?: string;
  latest_weight_lbs?: string;
  milestones_done_this_week?: string;
  resting_hr_bpm?: string;
  /** Latest hormone-like lab draw date (e.g. "Aug 1"); absent when none. */
  hormones_report?: string;
}

export interface UseHubMetricsResult {
  metrics: HubMetricMap;
  loading: boolean;
}

const TIMEOUT_MS = 3_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`hub metric timeout ${ms}ms`)), ms),
    ),
  ]);
}

export function useHubMetrics(): UseHubMetricsResult {
  const [metrics, setMetrics] = useState<HubMetricMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next: HubMetricMap = {};
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createClient() as any;
        const authResult = (await withTimeout(
          supabase.auth.getUser(),
          TIMEOUT_MS,
        )) as { data: { user: { id: string } | null } };
        const user = authResult.data.user;
        if (!user) {
          if (!cancelled) {
            setMetrics(next);
            setLoading(false);
          }
          return;
        }

        // Bio Optimization signal. The hub only needs the latest
        // numeric score; the dashboard surface owns the full context.
        try {
          const scoreResult = (await withTimeout(
            supabase
              .from('body_tracker_scores')
              .select('body_score')
              .eq('user_id', user.id)
              .order('score_date', { ascending: false })
              .limit(1)
              .maybeSingle(),
            TIMEOUT_MS,
          )) as { data: { body_score?: number | null } | null };
          const scoreRow = scoreResult.data;
          if (scoreRow?.body_score != null) {
            next.bio_optimization_score = String(Math.round(Number(scoreRow.body_score)));
          }
        } catch (err) {
          safeLog.warn('hub.metrics', 'bio_optimization_score failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // Weight from the latest real scale/import row. Scan persist inserts a
        // placeholder weight row (weight_lbs NULL) that must not shadow this chip.
        try {
          const weightResult = (await withTimeout(
            supabase
              .from('body_tracker_weight')
              .select('weight_lbs, body_fat_pct, goal_weight_lbs, created_at')
              .eq('user_id', user.id)
              .not('weight_lbs', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            TIMEOUT_MS,
          )) as {
            data: {
              weight_lbs?: number | null;
              body_fat_pct?: number | null;
              goal_weight_lbs?: number | null;
              created_at?: string | null;
            } | null;
          };
          const weightRow = weightResult.data;
          if (weightRow?.weight_lbs != null) {
            next.latest_weight_lbs = Number(weightRow.weight_lbs).toFixed(1);
          }

          // Scan body fat is written to segmental_fat.total_body_fat_pct, not
          // weight.body_fat_pct (that column stays NULL on a photo scan).
          let segmentalFat: { total_body_fat_pct?: number | null; created_at?: string | null } | null =
            null;
          try {
            const fatResult = (await withTimeout(
              supabase
                .from('body_tracker_segmental_fat')
                .select('total_body_fat_pct, created_at')
                .eq('user_id', user.id)
                .not('total_body_fat_pct', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
              TIMEOUT_MS,
            )) as {
              data: { total_body_fat_pct?: number | null; created_at?: string | null } | null;
            };
            segmentalFat = fatResult.data;
          } catch (fatErr) {
            safeLog.warn('hub.metrics', 'segmental_fat failed', {
              error: fatErr instanceof Error ? fatErr.message : String(fatErr),
            });
          }

          const resolvedFat = resolveLatestBodyFat([
            {
              pct: segmentalFat?.total_body_fat_pct ?? null,
              createdAt: segmentalFat?.created_at ?? null,
              sourceName: 'FormaVision',
            },
            {
              pct: weightRow?.body_fat_pct ?? null,
              createdAt: weightRow?.created_at ?? null,
              sourceName: 'manual',
            },
          ]);
          if (resolvedFat.pct != null) {
            next.body_fat_pct = formatBodyFatChip(resolvedFat.pct);
          }
          // pct_to_goal: simple linear share if both current + goal
          // exist. The progress surface owns the real journey math;
          // the hub only needs a single number.
          const w = weightRow?.weight_lbs != null ? Number(weightRow.weight_lbs) : null;
          const g = weightRow?.goal_weight_lbs != null ? Number(weightRow.goal_weight_lbs) : null;
          if (w !== null && g !== null && w > 0 && g > 0 && w !== g) {
            // Absolute proximity, 0 to 100 share regardless of
            // direction (loss or gain).
            const remaining = Math.abs(w - g);
            const fromStart = Math.abs(w);
            const pct = Math.max(0, Math.min(100, Math.round(100 - (remaining / fromStart) * 100)));
            next.pct_to_goal = `${pct}%`;
          }
        } catch (err) {
          safeLog.warn('hub.metrics', 'weight row failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // Resting HR from the latest metabolic row.
        try {
          const metabResult = (await withTimeout(
            supabase
              .from('body_tracker_metabolic')
              .select('resting_hr_bpm')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            TIMEOUT_MS,
          )) as { data: { resting_hr_bpm?: number | null } | null };
          const metabRow = metabResult.data;
          if (metabRow?.resting_hr_bpm != null) {
            next.resting_hr_bpm = `${Math.round(Number(metabRow.resting_hr_bpm))} bpm`;
          }
        } catch (err) {
          safeLog.warn('hub.metrics', 'resting_hr_bpm failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // Milestones this week: count completed in the last 7 days.
        try {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const milestoneResult = (await withTimeout(
            supabase
              .from('body_tracker_milestones')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('completed', true)
              .gte('completed_at', sevenDaysAgo.toISOString()),
            TIMEOUT_MS,
          )) as { count: number | null };
          if (typeof milestoneResult.count === 'number') {
            next.milestones_done_this_week = String(milestoneResult.count);
          }
        } catch (err) {
          safeLog.warn('hub.metrics', 'milestones_done_this_week failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // Hormones chip: most recent hormone-like lab date only.
        // Prefer lab_biomarkers (upload store); also check lab_results_normalized.
        // No date → no chip (never fabricate).
        try {
          const dateRows: Array<{ biomarker: string; measured_at: string | null }> = [];
          try {
            const bioResult = (await withTimeout(
              supabase
                .from('lab_biomarkers')
                .select('name, collection_date')
                .eq('user_id', user.id)
                .not('collection_date', 'is', null)
                .order('collection_date', { ascending: false })
                .limit(80),
              TIMEOUT_MS,
            )) as {
              data: Array<{ name?: string | null; collection_date?: string | null }> | null;
            };
            for (const r of bioResult.data ?? []) {
              dateRows.push({
                biomarker: String(r.name ?? ''),
                measured_at: r.collection_date ?? null,
              });
            }
          } catch {
            /* optional */
          }
          try {
            const normResult = (await withTimeout(
              supabase
                .from('lab_results_normalized')
                .select('biomarker, measured_at')
                .eq('user_id', user.id)
                .not('measured_at', 'is', null)
                .order('measured_at', { ascending: false })
                .limit(80),
              TIMEOUT_MS,
            )) as {
              data: Array<{ biomarker?: string | null; measured_at?: string | null }> | null;
            };
            for (const r of normResult.data ?? []) {
              dateRows.push({
                biomarker: String(r.biomarker ?? ''),
                measured_at: r.measured_at ?? null,
              });
            }
          } catch {
            /* optional */
          }
          const chip = resolveHormonesReportChip(dateRows);
          if (chip) next.hormones_report = chip;
        } catch (err) {
          safeLog.warn('hub.metrics', 'hormones_report failed', {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } catch (err) {
        // Top level fail open: any auth or network error returns the
        // empty (or partial) map the hub already collected.
        safeLog.warn('hub.metrics', 'top level failure', {
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        if (!cancelled) {
          setMetrics(next);
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { metrics, loading };
}

export default useHubMetrics;
