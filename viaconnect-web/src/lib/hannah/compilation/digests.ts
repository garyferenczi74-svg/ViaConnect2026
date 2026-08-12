/**
 * Prompt 213a supplier digests.
 * Each supplier is fail-open with timeout; Hannah never recomputes domain math.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import type { DigestFn, DigestItem, SupplierDigest } from './types';

const TIMEOUT_MS = 4000;

async function timedDigest(
  supplier: SupplierDigest['supplier'],
  fn: () => Promise<DigestItem[]>,
): Promise<SupplierDigest> {
  const t0 = Date.now();
  try {
    const items = await withTimeout(fn(), TIMEOUT_MS, `digest.${supplier}`);
    return {
      supplier,
      ok: true,
      durationMs: Date.now() - t0,
      items: Array.isArray(items) ? items : [],
    };
  } catch (err) {
    safeLog.warn('hannah.digest', 'supplier skipped', {
      supplier,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      supplier,
      ok: false,
      skipped: true,
      skipReason: err instanceof Error ? err.message : String(err),
      durationMs: Date.now() - t0,
      items: [],
    };
  }
}

/** Gordon: nutrition from unified meals / logs (read finished values only). */
export const getGordonDailyDigest: DigestFn = async (userId, sinceIso) =>
  timedDigest('gordon', async () => {
    const supabase = createAdminClient();
    const items: DigestItem[] = [];

    // Prefer meals table when present; fail-open to nutrition_logs.
    type MealRow = {
      id?: string;
      calories?: number | null;
      protein_g?: number | null;
      carbs_g?: number | null;
      meal_score?: number | null;
      logged_at?: string;
      created_at?: string;
    };

    let rows: MealRow[] = [];
    const mealsRes = await supabase
      .from('meals')
      .select('id, calories, protein_g, carbs_g, meal_score, logged_at, created_at')
      .eq('user_id', userId)
      .gte('logged_at', sinceIso)
      .order('logged_at', { ascending: false })
      .limit(20);

    if (!mealsRes.error && Array.isArray(mealsRes.data)) {
      rows = mealsRes.data as MealRow[];
    } else {
      const logsRes = await supabase
        .from('nutrition_logs')
        .select('id, calories, protein_g, carbs_g, logged_at')
        .eq('user_id', userId)
        .eq('status', 'confirmed')
        .gte('logged_at', sinceIso)
        .order('logged_at', { ascending: false })
        .limit(20);
      if (!logsRes.error && Array.isArray(logsRes.data)) {
        rows = logsRes.data as MealRow[];
      }
    }

    if (rows.length === 0) {
      items.push({
        id: 'gordon-sparse',
        hub: 'Nutrition',
        summary: 'No meals logged in the window. Connect or log a meal to unlock nutrition accelerators.',
        metricLabel: 'meals',
        metricValue: null,
        refs: ['meals'],
      });
      return items;
    }

    const cal = rows
      .map((r) => (typeof r.calories === 'number' && isFinite(r.calories) ? r.calories : null))
      .filter((v): v is number => v !== null);
    const protein = rows
      .map((r) => (typeof r.protein_g === 'number' && isFinite(r.protein_g) ? r.protein_g : null))
      .filter((v): v is number => v !== null);

    items.push({
      id: `gordon-meals-${rows.length}`,
      hub: 'Nutrition',
      summary: `${rows.length} meal log${rows.length === 1 ? '' : 's'} in window.`,
      metricLabel: 'meal_count',
      metricValue: String(rows.length),
      refs: rows.slice(0, 5).map((r) => r.id ?? 'meal'),
    });

    if (cal.length > 0) {
      const avg = Math.round(cal.reduce((a, b) => a + b, 0) / cal.length);
      items.push({
        id: 'gordon-cal-avg',
        hub: 'Nutrition',
        summary: `Average meal energy around ${avg} kcal (Gordon-scored values only).`,
        metricLabel: 'avg_kcal',
        metricValue: String(avg),
        refs: ['gordon:meals'],
      });
    } else {
      items.push({
        id: 'gordon-cal-unknown',
        hub: 'Nutrition',
        summary: 'Energy values UNKNOWN for recent meals; no fabricated average.',
        metricLabel: 'avg_kcal',
        metricValue: null,
        refs: ['gordon:unknown'],
      });
    }

    if (protein.length > 0) {
      const avgP = Math.round(protein.reduce((a, b) => a + b, 0) / protein.length);
      items.push({
        id: 'gordon-protein',
        hub: 'Nutrition',
        summary: `Protein averaging about ${avgP} g across recent meals.`,
        metricLabel: 'avg_protein_g',
        metricValue: String(avgP),
        refs: ['gordon:protein'],
      });
    }

    return items;
  });

/** Arnold: body composition / biology signals. */
export const getArnoldDailyDigest: DigestFn = async (userId, sinceIso) =>
  timedDigest('arnold', async () => {
    const supabase = createAdminClient();
    const items: DigestItem[] = [];

    const { data: snaps } = await supabase
      .from('body_tracker_composition')
      .select('id, total_body_fat_pct, recorded_at, created_at')
      .eq('user_id', userId)
      .order('recorded_at', { ascending: false })
      .limit(5);

    const rows = Array.isArray(snaps) ? snaps : [];
    if (rows.length === 0) {
      items.push({
        id: 'arnold-sparse',
        hub: 'Biology',
        summary: 'No body composition scan yet. Run FormaVision or Log Data to unlock biology accelerators.',
        metricLabel: 'body_fat_pct',
        metricValue: null,
        refs: ['body_tracker_composition'],
      });
      return items;
    }

    const latest = rows[0] as {
      id?: string;
      total_body_fat_pct?: number | null;
      recorded_at?: string;
    };
    const bf =
      typeof latest.total_body_fat_pct === 'number' && isFinite(latest.total_body_fat_pct)
        ? latest.total_body_fat_pct
        : null;

    items.push({
      id: `arnold-latest-${latest.id ?? 'x'}`,
      hub: 'Biology',
      summary:
        bf === null
          ? 'Latest composition on file with UNKNOWN body fat; no fabricated value.'
          : `Latest body fat reading ${bf.toFixed(1)}% on file from Arnold.`,
      metricLabel: 'body_fat_pct',
      metricValue: bf === null ? null : bf.toFixed(1),
      refs: [latest.id ?? 'composition'],
    });

    if (rows.length >= 2) {
      const prev = rows[1] as { total_body_fat_pct?: number | null };
      const prevBf =
        typeof prev.total_body_fat_pct === 'number' && isFinite(prev.total_body_fat_pct)
          ? prev.total_body_fat_pct
          : null;
      if (bf !== null && prevBf !== null) {
        const delta = bf - prevBf;
        items.push({
          id: 'arnold-delta',
          hub: 'Biology',
          summary:
            Math.abs(delta) < 0.1
              ? 'Body fat essentially unchanged scan over scan.'
              : `Body fat moved ${delta > 0 ? '+' : ''}${delta.toFixed(1)} points vs prior scan.`,
          metricLabel: 'bf_delta',
          metricValue: delta.toFixed(1),
          refs: ['composition:delta'],
        });
      }
    }

    // Soft check that sinceIso window saw any new row
    const recent = rows.some((r) => {
      const ts = (r as { recorded_at?: string; created_at?: string }).recorded_at
        ?? (r as { created_at?: string }).created_at;
      return ts ? new Date(ts).getTime() >= new Date(sinceIso).getTime() : false;
    });
    if (!recent) {
      items.push({
        id: 'arnold-stale-window',
        hub: 'Biology',
        summary: 'No new composition in the compile window; using latest known reading only.',
        refs: ['composition:window'],
      });
    }

    return items;
  });

/** Jeffery: platform / CAQ / hub connection status. */
export const getJefferyDailyDigest: DigestFn = async (userId, sinceIso) =>
  timedDigest('jeffery', async () => {
    const supabase = createAdminClient();
    const items: DigestItem[] = [];

    const { data: caq } = await supabase
      .from('clinical_assessments')
      .select('id, created_at, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    const caqRow = Array.isArray(caq) && caq[0] ? caq[0] : null;
    items.push({
      id: 'jeffery-caq',
      hub: 'CAQ',
      summary: caqRow
        ? 'CAQ on file. Hannah can derive lifestyle accelerators from your answers.'
        : 'CAQ not complete. Finish assessment to unlock personalized CAQ accelerators.',
      metricLabel: 'caq',
      metricValue: caqRow ? 'connected' : null,
      refs: caqRow ? [String((caqRow as { id?: string }).id ?? 'caq')] : ['caq:missing'],
    });

    // Bio Optimization latest score if present
    const { data: scores } = await supabase
      .from('body_tracker_scores')
      .select('bio_optimization_score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(2);

    const scoreRows = Array.isArray(scores) ? scores : [];
    if (scoreRows.length > 0) {
      const s = scoreRows[0] as { bio_optimization_score?: number | null };
      const val =
        typeof s.bio_optimization_score === 'number' && isFinite(s.bio_optimization_score)
          ? s.bio_optimization_score
          : null;
      items.push({
        id: 'jeffery-bos',
        hub: 'CAQ',
        summary:
          val === null
            ? 'Bio Optimization score UNKNOWN on latest row.'
            : `Bio Optimization score currently ${Math.round(val)}.`,
        metricLabel: 'bio_optimization',
        metricValue: val === null ? null : String(Math.round(val)),
        refs: ['body_tracker_scores'],
      });
    }

    // Hub connection nudges (sparse launch-day default)
    const hubs = [
      { hub: 'Nutrition' as const, check: 'meals' },
      { hub: 'Biology' as const, check: 'composition' },
      { hub: 'Genetics' as const, check: 'variants' },
    ];
    for (const h of hubs) {
      items.push({
        id: `jeffery-hub-${h.check}`,
        hub: h.hub,
        summary: `Hub signal check for ${h.hub} (connection status used for nudge composition only).`,
        refs: [`hub:${h.check}`, sinceIso],
      });
    }

    return items;
  });

/** Sherlock: research / gated curation (reads finished research tables when present). */
export const getSherlockDailyDigest: DigestFn = async (userId, sinceIso) =>
  timedDigest('sherlock', async () => {
    const supabase = createAdminClient();
    const items: DigestItem[] = [];

    // Prefer gated Hound Dog content curated for research (global, not user PII).
    const { data: gated } = await supabase
      .from('hounddog_gated_items')
      .select('id, title, summary, source_url, approved_at')
      .gte('approved_at', sinceIso)
      .order('approved_at', { ascending: false })
      .limit(5);

    const gatedRows = Array.isArray(gated) ? gated : [];
    if (gatedRows.length > 0) {
      for (const g of gatedRows) {
        const row = g as {
          id?: string;
          title?: string;
          summary?: string;
          source_url?: string;
        };
        items.push({
          id: `sherlock-gated-${row.id ?? 'x'}`,
          hub: 'Supplements',
          summary: `${row.title ?? 'Study'}: ${row.summary ?? ''}`.slice(0, 280),
          refs: [row.source_url ?? row.id ?? 'gated'],
        });
      }
    } else {
      items.push({
        id: 'sherlock-sparse',
        hub: 'Supplements',
        summary: 'No newly gated research in window. Sherlock will attach studies as Hound Dog promotions land.',
        metricValue: null,
        refs: ['hounddog_gated_items'],
      });
    }

    // userId reserved for personalization later; silence unused lint via ref
    void userId;
    return items;
  });

/** Hound Dog: only GATED items (never raw staging). */
export const getHoundDogDailyDigest: DigestFn = async (_userId, sinceIso) =>
  timedDigest('hounddog', async () => {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('hounddog_gated_items')
      .select('id, title, summary, attribution, approved_at')
      .gte('approved_at', sinceIso)
      .order('approved_at', { ascending: false })
      .limit(5);

    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) {
      return [
        {
          id: 'hounddog-empty',
          hub: 'Supplements' as const,
          summary: 'No newly approved clinical ingestions in window.',
          metricValue: null,
          refs: ['hounddog_gated'],
        },
      ];
    }

    return rows.map((r) => {
      const row = r as {
        id?: string;
        title?: string;
        summary?: string;
        attribution?: string;
      };
      return {
        id: `hounddog-${row.id ?? 'x'}`,
        hub: 'Supplements' as const,
        summary: `${row.title ?? 'Source'}: ${row.summary ?? ''}`.slice(0, 280),
        refs: [row.attribution ?? row.id ?? 'gated'],
      };
    });
  });

/** User input: goals / profile changes. */
export const getUserInputDailyDigest: DigestFn = async (userId, sinceIso) =>
  timedDigest('user_input', async () => {
    const supabase = createAdminClient();
    const items: DigestItem[] = [];

    const { data: goals } = await supabase
      .from('body_goals')
      .select('id, goal_type, status, updated_at, created_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(3);

    const goalRows = Array.isArray(goals) ? goals : [];
    if (goalRows.length === 0) {
      items.push({
        id: 'user-goal-sparse',
        hub: 'CAQ',
        summary: 'No active body goal on file. Set a goal to sharpen accelerator priority.',
        metricValue: null,
        refs: ['body_goals'],
      });
    } else {
      for (const g of goalRows) {
        const row = g as { id?: string; goal_type?: string; status?: string; updated_at?: string };
        const recent =
          row.updated_at && new Date(row.updated_at).getTime() >= new Date(sinceIso).getTime();
        items.push({
          id: `user-goal-${row.id ?? 'x'}`,
          hub: 'CAQ',
          summary: recent
            ? `Goal updated recently (${row.goal_type ?? 'goal'}, ${row.status ?? 'active'}).`
            : `Active goal on file: ${row.goal_type ?? 'goal'}.`,
          refs: [row.id ?? 'goal'],
        });
      }
    }

    return items;
  });

export const ALL_DIGEST_FNS: DigestFn[] = [
  getGordonDailyDigest,
  getArnoldDailyDigest,
  getJefferyDailyDigest,
  getSherlockDailyDigest,
  getHoundDogDailyDigest,
  getUserInputDailyDigest,
];
