// =============================================================================
// Prompt 185a slice 3b (2026-06-09): Hannah timing orchestration (the DB half).
//
// For a user's active supplements: resolve the knowledge-base rule by match_key,
// read the CAQ Layer 2 signals, apply the precedence guard (never touch a
// user-set slot), call the pure recommendTiming engine, and persist a hannah
// slot per recommended bucket to user_supplement_schedule.
//
// Precedence (Prompt 185 spec): a slot with time_source in {user_caq,
// user_manual, user_drag} is user-set and is never recomputed or overwritten.
// Hannah assigns only where the supplement has no slot, and recomputes a
// hannah-sourced slot only on an explicit force (a CAQ change), not on every
// load. Recompute is idempotent: existing hannah slots are replaced from
// scratch, never deltad.
//
// Resilience: every DB call is wrapped with withTimeout, every path try/catch
// fails open, and failures are structured-logged. PHI-free.
//
// The Supabase client is typed loosely here because the new 185 tables are not
// yet in the generated Database types; the API route passes the real server
// client. No emojis. No em or en dashes.
// =============================================================================

import { withTimeout } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';
import { recommendTiming } from './engine';
import { matchRuleKeyForIngredients } from './matchKey';
import type { CaqTimingSignals, Frequency, TimeOfDay, TimingRule } from './types';
import { localDateString } from '@/lib/timezone';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

const DB_TIMEOUT_MS = 4000;
const SCOPE = 'hannah.timing.assign';
const SYMPTOM_THRESHOLD = 5; // 0 to 10 severity; 5 and up is a notable signal

export interface RegimenSupplement {
  id: string;
  supplement_name: string;
  key_ingredients: string[] | null;
  frequency: string | null;
}

export interface ScheduleSlot {
  id?: string;
  user_id?: string;
  user_supplement_id: string;
  time_of_day: TimeOfDay;
  time_source: 'user_caq' | 'user_manual' | 'user_drag' | 'hannah';
  rationale: string | null;
  display_order: number;
}

// Enriched card the Daily Schedule UI renders: slot joined to its supplement
// (name + dose) and the engine's constraint chips.
export interface ScheduleCard {
  slot_id: string;
  user_supplement_id: string;
  name: string;
  dose: string | null;
  time_of_day: TimeOfDay;
  time_source: 'user_caq' | 'user_manual' | 'user_drag' | 'hannah';
  rationale: string | null;
  with_food: boolean;
  empty_stomach: boolean;
  fat_soluble: boolean;
  away_from: string[];
  taken: boolean;
  display_order: number;
}

export type ScheduleView = Record<TimeOfDay, ScheduleCard[]>;

// ---- Pure helpers (exported for unit tests) --------------------------------

export function mapFrequency(raw: string | null | undefined): Frequency {
  const f = (raw ?? '').toLowerCase();
  if (f.includes('three') || f.includes('3x') || f.includes('thrice')) return 'three_daily';
  if (f.includes('twice') || f.includes('2x') || f.includes('two')) return 'twice_daily';
  if (f.includes('week')) return 'weekly';
  if (f.includes('as need') || f.includes('needed') || f.includes('prn')) return 'as_needed';
  return 'once_daily';
}

export function mealToBucket(meal: string): TimeOfDay | null {
  const m = meal.trim().toLowerCase();
  if (m === 'breakfast') return 'morning';
  if (m === 'lunch') return 'afternoon';
  if (m === 'dinner') return 'evening';
  return null;
}

export function buildIngredientNames(s: RegimenSupplement): string[] {
  const names: string[] = [];
  if (Array.isArray(s.key_ingredients)) {
    for (const k of s.key_ingredients) {
      if (typeof k === 'string' && k.trim()) names.push(k);
    }
  }
  if (typeof s.supplement_name === 'string' && s.supplement_name.trim()) names.push(s.supplement_name);
  return names.length > 0 ? names : [s.supplement_name ?? ''];
}

export function symptomScore(data: Record<string, unknown>, field: string): number {
  const v = data[field];
  if (v && typeof v === 'object' && 'score' in (v as Record<string, unknown>)) {
    const s = (v as { score?: unknown }).score;
    return typeof s === 'number' ? s : 0;
  }
  return 0;
}

const SLEEP_CONCERNS = new Set(['poor_sleep', 'insomnia', 'sleep_apnea', 'trouble_sleeping']);
const ENERGY_CONCERNS = new Set(['low_energy', 'fatigue', 'chronic_fatigue', 'tiredness']);

// ---- CAQ signal read -------------------------------------------------------

/**
 * Read the user's CAQ timing signals from assessment_results (phases 3, 6, 7,
 * 8). Fails open to an empty signal set so a missing or partial CAQ never
 * blocks an assignment.
 */
export async function readCaqTimingSignals(supabase: Db, userId: string): Promise<CaqTimingSignals> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('assessment_results').select('phase, data').eq('user_id', userId),
      DB_TIMEOUT_MS,
      `${SCOPE}.caq.read`,
    );
    if (error) {
      safeLog.warn(SCOPE, 'caq read failed; defaulting signals', { userId, error: error.message });
      return {};
    }
    const byPhase = new Map<number, Record<string, unknown>>();
    for (const row of (data ?? []) as Array<{ phase: number; data: Record<string, unknown> | null }>) {
      byPhase.set(row.phase, row.data ?? {});
    }
    const lifestyle = byPhase.get(3) ?? {};
    const concerns = byPhase.get(6) ?? {};
    const physical = byPhase.get(7) ?? {};
    const neuro = byPhase.get(8) ?? {};

    const healthConcerns = Array.isArray((concerns as Record<string, unknown>).healthConcerns)
      ? ((concerns as Record<string, unknown>).healthConcerns as unknown[]).map((c) => String(c).toLowerCase())
      : [];
    const sleepDifficulty =
      healthConcerns.some((c) => SLEEP_CONCERNS.has(c)) ||
      symptomScore(neuro, 'sleep_onset_severity') >= SYMPTOM_THRESHOLD ||
      symptomScore(neuro, 'sleep_quality_severity') >= SYMPTOM_THRESHOLD;
    const lowEnergy =
      healthConcerns.some((c) => ENERGY_CONCERNS.has(c)) ||
      symptomScore(physical, 'fatigue_severity') >= SYMPTOM_THRESHOLD;
    const caffeine = typeof (lifestyle as Record<string, unknown>).caffeine === 'string'
      ? ((lifestyle as Record<string, unknown>).caffeine as string)
      : '';
    const highMorningCaffeine = caffeine === 'Heavy';
    const largestMeal = typeof (lifestyle as Record<string, unknown>).largestMeal === 'string'
      ? ((lifestyle as Record<string, unknown>).largestMeal as string)
      : '';

    return {
      sleepDifficulty,
      lowEnergy,
      highMorningCaffeine,
      largestMealWindow: mealToBucket(largestMeal),
    };
  } catch (err) {
    safeLog.warn(SCOPE, 'caq read threw; defaulting signals', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return {};
  }
}

// ---- Assignment ------------------------------------------------------------

/**
 * Assign (or, on force, recompute) Hannah's timing slots for one supplement,
 * honoring the precedence guard. user_* slots are never touched; an already
 * assigned hannah slot is left as-is unless forceRecompute is set.
 */
export async function assignHannahTiming(args: {
  supabase: Db;
  userId: string;
  supplement: RegimenSupplement;
  signals?: CaqTimingSignals;
  forceRecompute?: boolean;
}): Promise<{ status: 'user_locked' | 'assigned' | 'noop'; slots: ScheduleSlot[] }> {
  const { supabase, userId, supplement } = args;
  try {
    const { data: existing, error: readErr } = await withTimeout(
      supabase
        .from('user_supplement_schedule')
        .select('id, user_supplement_id, time_of_day, time_source, rationale, display_order')
        .eq('user_supplement_id', supplement.id),
      DB_TIMEOUT_MS,
      `${SCOPE}.slots.read`,
    );
    if (readErr) {
      safeLog.warn(SCOPE, 'slot read failed; skipping', { userId, supplementId: supplement.id, error: readErr.message });
      return { status: 'noop', slots: [] };
    }
    const slots = (existing ?? []) as ScheduleSlot[];

    // Precedence guard: any user-set slot means Hannah computes nothing.
    if (slots.some((s) => s.time_source !== 'hannah')) {
      return { status: 'user_locked', slots };
    }
    // Already assigned by Hannah: do not recompute on a normal load.
    if (slots.length > 0 && !args.forceRecompute) {
      return { status: 'noop', slots };
    }

    const names = buildIngredientNames(supplement);
    const matchKey = matchRuleKeyForIngredients(names);
    let rule: TimingRule | null = null;
    if (matchKey) {
      const { data: ruleRow } = await withTimeout(
        supabase
          .from('supplement_timing_rules')
          .select('match_key, default_time_of_day, with_food, empty_stomach, fat_soluble, away_from, rationale_short')
          .eq('match_key', matchKey)
          .maybeSingle(),
        DB_TIMEOUT_MS,
        `${SCOPE}.rule.read`,
      );
      rule = (ruleRow ?? null) as TimingRule | null;
    } else {
      safeLog.info(SCOPE, 'unmatched supplement; class inference fallback', { supplement: supplement.supplement_name });
    }

    const signals = args.signals ?? (await readCaqTimingSignals(supabase, userId));
    const rec = recommendTiming({
      ingredients: names.map((name) => ({ name })),
      frequency: mapFrequency(supplement.frequency),
      matchedRule: rule,
      caqSignals: signals,
    });

    // Idempotent recompute: clear existing hannah slots, then insert fresh.
    await withTimeout(
      supabase
        .from('user_supplement_schedule')
        .delete()
        .eq('user_supplement_id', supplement.id)
        .eq('time_source', 'hannah'),
      DB_TIMEOUT_MS,
      `${SCOPE}.slots.clear`,
    );

    const rows = rec.times.map((tod, i) => ({
      user_id: userId,
      user_supplement_id: supplement.id,
      time_of_day: tod,
      time_source: 'hannah' as const,
      rationale: rec.reason,
      display_order: i,
    }));

    if (rows.length > 0) {
      const { error: insErr } = await withTimeout(
        supabase.from('user_supplement_schedule').insert(rows),
        DB_TIMEOUT_MS,
        `${SCOPE}.slots.insert`,
      );
      if (insErr) {
        safeLog.warn(SCOPE, 'slot insert failed', { userId, supplementId: supplement.id, error: insErr.message });
        return { status: 'noop', slots: [] };
      }
    }
    return { status: 'assigned', slots: rows as ScheduleSlot[] };
  } catch (err) {
    safeLog.error(SCOPE, 'assignHannahTiming threw; failing open', {
      userId,
      supplementId: supplement.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return { status: 'noop', slots: [] };
  }
}

/**
 * Ensure every active supplement has a slot, then return the full schedule.
 * Reads CAQ signals once and reuses them. Pass force to recompute hannah slots
 * (used after a CAQ change); the default leaves already-assigned slots intact.
 */
export async function ensureScheduleForUser(
  supabase: Db,
  userId: string,
  opts?: { force?: boolean },
): Promise<ScheduleSlot[]> {
  try {
    const { data: regimen, error } = await withTimeout(
      supabase
        .from('user_current_supplements')
        .select('id, supplement_name, key_ingredients, frequency')
        .eq('user_id', userId)
        .eq('is_current', true),
      DB_TIMEOUT_MS,
      `${SCOPE}.regimen.read`,
    );
    if (error) {
      safeLog.warn(SCOPE, 'regimen read failed', { userId, error: error.message });
      return [];
    }
    const supplements = (regimen ?? []) as RegimenSupplement[];
    const signals = await readCaqTimingSignals(supabase, userId);
    for (const s of supplements) {
      await assignHannahTiming({ supabase, userId, supplement: s, signals, forceRecompute: opts?.force });
    }
    const { data: full } = await withTimeout(
      supabase
        .from('user_supplement_schedule')
        .select('id, user_supplement_id, time_of_day, time_source, rationale, display_order')
        .eq('user_id', userId),
      DB_TIMEOUT_MS,
      `${SCOPE}.schedule.read`,
    );
    return (full ?? []) as ScheduleSlot[];
  } catch (err) {
    safeLog.error(SCOPE, 'ensureScheduleForUser threw', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

/**
 * Build the grouped, enriched Daily Schedule view for the UI: ensure slots
 * exist, then join each slot to its supplement (name + dose) and the engine's
 * constraint chips, grouped into the three buckets and ordered by display_order.
 * Chips are recomputed in memory from the rules fetched once, so the enrichment
 * pass adds no per-supplement DB reads. Fails open to an empty view.
 */
export async function getScheduleView(supabase: Db, userId: string): Promise<ScheduleView> {
  const view: ScheduleView = { morning: [], afternoon: [], evening: [] };
  try {
    const signals = await readCaqTimingSignals(supabase, userId);

    const { data: regimen, error: regErr } = await withTimeout(
      supabase
        .from('user_current_supplements')
        .select('id, supplement_name, dosage, key_ingredients, frequency')
        .eq('user_id', userId)
        .eq('is_current', true),
      DB_TIMEOUT_MS,
      `${SCOPE}.view.regimen`,
    );
    if (regErr) {
      safeLog.warn(SCOPE, 'view regimen read failed', { userId, error: regErr.message });
      return view;
    }
    const supplements = (regimen ?? []) as Array<RegimenSupplement & { dosage: string | null }>;

    for (const s of supplements) {
      await assignHannahTiming({ supabase, userId, supplement: s, signals });
    }

    const [slotsRes, rulesRes] = await Promise.all([
      withTimeout(
        supabase
          .from('user_supplement_schedule')
          .select('id, user_supplement_id, time_of_day, time_source, rationale, display_order')
          .eq('user_id', userId),
        DB_TIMEOUT_MS,
        `${SCOPE}.view.slots`,
      ),
      withTimeout(
        supabase
          .from('supplement_timing_rules')
          .select('match_key, default_time_of_day, with_food, empty_stomach, fat_soluble, away_from, rationale_short'),
        DB_TIMEOUT_MS,
        `${SCOPE}.view.rules`,
      ),
    ]);

    const rulesByKey = new Map<string, TimingRule>();
    for (const r of ((rulesRes?.data ?? []) as TimingRule[])) rulesByKey.set(r.match_key, r);

    const suppById = new Map(supplements.map((s) => [s.id, s]));
    const chipsBySupp = new Map<string, { with_food: boolean; empty_stomach: boolean; fat_soluble: boolean; away_from: string[] }>();
    for (const s of supplements) {
      const names = buildIngredientNames(s);
      const matchKey = matchRuleKeyForIngredients(names);
      const rule = matchKey ? rulesByKey.get(matchKey) ?? null : null;
      const rec = recommendTiming({
        ingredients: names.map((name) => ({ name })),
        frequency: mapFrequency(s.frequency),
        matchedRule: rule,
        caqSignals: signals,
      });
      chipsBySupp.set(s.id, {
        with_food: rec.with_food,
        empty_stomach: rec.empty_stomach,
        fat_soluble: rec.fat_soluble,
        away_from: [...rec.away_from],
      });
    }

    // Today's taken state, keyed user-local date, from protocol_adherence_log.
    // product_slug carries the user_supplement_id for schedule rows.
    const localDate = await getUserLocalDate(supabase, userId);
    const takenSet = new Set<string>();
    try {
      const { data: adh } = await withTimeout(
        supabase
          .from('protocol_adherence_log')
          .select('product_slug, time_of_day, completed')
          .eq('user_id', userId)
          .eq('scheduled_date', localDate),
        DB_TIMEOUT_MS,
        `${SCOPE}.view.adherence`,
      );
      for (const row of ((adh ?? []) as Array<{ product_slug: string; time_of_day: string; completed: boolean }>)) {
        if (row.completed) takenSet.add(`${row.product_slug}:${row.time_of_day}`);
      }
    } catch {
      // fail open: no adherence read means nothing shows as taken yet
    }

    for (const slot of ((slotsRes?.data ?? []) as ScheduleSlot[])) {
      const supp = suppById.get(slot.user_supplement_id);
      const tod = slot.time_of_day;
      if (!supp || (tod !== 'morning' && tod !== 'afternoon' && tod !== 'evening')) continue;
      const chips = chipsBySupp.get(slot.user_supplement_id) ?? { with_food: false, empty_stomach: false, fat_soluble: false, away_from: [] };
      view[tod].push({
        slot_id: slot.id ?? '',
        user_supplement_id: slot.user_supplement_id,
        name: supp.supplement_name,
        dose: supp.dosage ?? null,
        time_of_day: tod,
        time_source: slot.time_source,
        rationale: slot.rationale,
        with_food: chips.with_food,
        empty_stomach: chips.empty_stomach,
        fat_soluble: chips.fat_soluble,
        away_from: chips.away_from,
        taken: takenSet.has(`${slot.user_supplement_id}:${tod}`),
        display_order: slot.display_order,
      });
    }
    for (const tod of ['morning', 'afternoon', 'evening'] as TimeOfDay[]) {
      view[tod].sort((a, b) => a.display_order - b.display_order);
    }
    return view;
  } catch (err) {
    safeLog.error(SCOPE, 'getScheduleView threw', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return view;
  }
}

/**
 * Move a slot to a different bucket, marking it user_drag so Hannah never
 * reassigns it (the precedence guard then treats the whole supplement as
 * user-set). Idempotent per slot. The (user_supplement_id, time_of_day) unique
 * constraint rejects moving a split-dose slot onto a bucket the same supplement
 * already occupies; the caller reverts optimistically on error.
 */
export async function moveSlot(
  supabase: Db,
  userId: string,
  slotId: string,
  timeOfDay: TimeOfDay,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const nowIso = new Date().toISOString();
    const { error } = await withTimeout(
      supabase
        .from('user_supplement_schedule')
        .update({ time_of_day: timeOfDay, time_source: 'user_drag', assigned_at: nowIso, updated_at: nowIso })
        .eq('id', slotId)
        .eq('user_id', userId),
      DB_TIMEOUT_MS,
      `${SCOPE}.slot.move`,
    );
    if (error) {
      safeLog.warn(SCOPE, 'slot move failed', { userId, slotId, timeOfDay, error: error.message });
      const friendly = /duplicate key|unique/i.test(error.message)
        ? 'That supplement is already scheduled in that time of day.'
        : 'Could not move the supplement; please try again.';
      return { ok: false, error: friendly };
    }
    return { ok: true };
  } catch (err) {
    safeLog.error(SCOPE, 'moveSlot threw', {
      userId,
      slotId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Reorder slots within a bucket: set display_order to the given sequence and
 * mark each user_drag (a reorder is a user-set action). Used by the drag layer.
 */
export async function reorderSlots(
  supabase: Db,
  userId: string,
  orderedSlotIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  try {
    const nowIso = new Date().toISOString();
    for (let i = 0; i < orderedSlotIds.length; i++) {
      const { error } = await withTimeout(
        supabase
          .from('user_supplement_schedule')
          .update({ display_order: i, time_source: 'user_drag', updated_at: nowIso })
          .eq('id', orderedSlotIds[i])
          .eq('user_id', userId),
        DB_TIMEOUT_MS,
        `${SCOPE}.slot.reorder`,
      );
      if (error) {
        safeLog.warn(SCOPE, 'slot reorder failed', { userId, slotId: orderedSlotIds[i], error: error.message });
        return { ok: false, error: error.message };
      }
    }
    return { ok: true };
  } catch (err) {
    safeLog.error(SCOPE, 'reorderSlots threw', {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * The user's current local date (YYYY-MM-DD) from profiles.timezone, the single
 * timezone source of truth. Falls back to UTC. This is the daily reset key.
 */
async function getUserLocalDate(supabase: Db, userId: string): Promise<string> {
  try {
    const { data } = await withTimeout(
      supabase.from('profiles').select('timezone').eq('id', userId).maybeSingle(),
      DB_TIMEOUT_MS,
      `${SCOPE}.tz.read`,
    );
    const tz = data && typeof data.timezone === 'string' && data.timezone ? data.timezone : 'UTC';
    return localDateString(tz);
  } catch {
    return localDateString('UTC');
  }
}

/**
 * Mark a schedule slot taken or not taken for the user's current local date.
 * Writes to the existing protocol_adherence_log (reused per Gary 2026-06-09);
 * product_slug carries the user_supplement_id. Idempotent per (supplement,
 * bucket, local date). The taken state is the presence of a completed row, so
 * the reset is implicit at local midnight and history is preserved.
 */
export async function toggleIntake(
  supabase: Db,
  userId: string,
  productSlug: string,
  timeOfDay: TimeOfDay,
  taken: boolean,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const scheduledDate = await getUserLocalDate(supabase, userId);
    const nowIso = new Date().toISOString();
    const { error } = await withTimeout(
      supabase.from('protocol_adherence_log').upsert(
        {
          user_id: userId,
          product_slug: productSlug,
          scheduled_date: scheduledDate,
          time_of_day: timeOfDay,
          completed: taken,
          completed_at: taken ? nowIso : null,
          updated_at: nowIso,
        },
        { onConflict: 'user_id,product_slug,scheduled_date,time_of_day' },
      ),
      DB_TIMEOUT_MS,
      `${SCOPE}.intake.upsert`,
    );
    if (error) {
      safeLog.warn(SCOPE, 'intake upsert failed', { userId, productSlug, timeOfDay, error: error.message });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    safeLog.error(SCOPE, 'toggleIntake threw', {
      userId,
      productSlug,
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
