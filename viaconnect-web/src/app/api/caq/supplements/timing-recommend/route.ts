// =============================================================================
// Prompt 175h Section 2.5 (2026-06-05): Hannah timing recommendation route.
//
// POST /api/caq/supplements/timing-recommend
//
// Input:
//   {
//     ingredients: Array<{ name, amount?, unit?, form? }>
//     frequency: 'once_daily' | 'twice_daily' | 'three_daily' | 'weekly' | 'as_needed'
//     productName?: string
//     skip_user_lookup?: boolean   // tests only
//   }
//
// Behavior:
//   1. Validate the input. No ingredients OR no frequency => 400.
//   2. Read user_current_supplements for the signed-in user, name +
//      time_of_day only, for the spacing-conflict pass. The user_id +
//      auth client are not required (route is callable from the
//      pre-save confirm panel where the row does not yet exist).
//   3. recommendTiming(input) -> deterministic Hannah recommendation
//   4. Return { times, with_food, reason, detectedClass, conflicts }
//
// Pure recommendation; no DB writes. The caller (confirm panel or
// Update Supplements tab) writes the chosen values to
// user_current_supplements with timing_source = 'hannah_recommended'
// or 'user_set' depending on whether the user accepted Hannah's
// suggestion.
// =============================================================================

import { NextResponse } from 'next/server';
import { safeLog } from '@/lib/utils/safe-log';
import { createClient } from '@/lib/supabase/server';
import { recommendTiming } from '@/lib/caq/supplements/timing/engine';
import type {
  Frequency,
  TimeOfDay,
  TimingIngredientInput,
} from '@/lib/caq/supplements/timing/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

interface IncomingPayload {
  ingredients?: unknown;
  frequency?: unknown;
  productName?: unknown;
  skip_user_lookup?: unknown;
}

const VALID_FREQUENCIES: ReadonlyArray<Frequency> = [
  'once_daily',
  'twice_daily',
  'three_daily',
  'weekly',
  'as_needed',
];

const VALID_TIMES: ReadonlyArray<TimeOfDay> = ['morning', 'afternoon', 'evening'];

function coerceIngredient(raw: unknown): TimingIngredientInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.name !== 'string' || obj.name.trim() === '') return null;
  const amount = obj.amount === null || typeof obj.amount === 'number' ? obj.amount : null;
  const unit = obj.unit === null || typeof obj.unit === 'string' ? obj.unit : null;
  const form = obj.form === null || typeof obj.form === 'string' ? obj.form : null;
  return {
    name: obj.name.trim(),
    amount: amount === undefined ? null : amount,
    unit: unit === undefined ? null : unit,
    form: form === undefined ? null : form,
  };
}

function coerceTimeOfDayArray(raw: unknown): ReadonlyArray<TimeOfDay> | null {
  if (!Array.isArray(raw)) return null;
  const out: TimeOfDay[] = [];
  for (const v of raw) {
    if (typeof v !== 'string') continue;
    if ((VALID_TIMES as ReadonlyArray<string>).includes(v)) out.push(v as TimeOfDay);
  }
  return out;
}

export async function POST(request: Request) {
  let payload: IncomingPayload | null = null;
  try {
    const parsed = await request.json();
    if (parsed && typeof parsed === 'object') payload = parsed as IncomingPayload;
  } catch {
    payload = null;
  }
  if (!payload) {
    return NextResponse.json(
      { error: 'invalid_payload' },
      { status: 400 },
    );
  }

  const rawIngredients = Array.isArray(payload.ingredients) ? payload.ingredients : [];
  const ingredients: TimingIngredientInput[] = [];
  for (const raw of rawIngredients) {
    const coerced = coerceIngredient(raw);
    if (coerced) ingredients.push(coerced);
  }

  const frequencyRaw = payload.frequency;
  const frequency: Frequency | null =
    typeof frequencyRaw === 'string' && (VALID_FREQUENCIES as ReadonlyArray<string>).includes(frequencyRaw)
      ? (frequencyRaw as Frequency)
      : null;

  if (ingredients.length === 0 || frequency === null) {
    return NextResponse.json(
      { error: 'invalid_payload', detail: 'ingredients and a valid frequency are required' },
      { status: 400 },
    );
  }

  // userSupplements: read the user's existing intake list so the engine
  // can surface spacing conflicts. Best-effort: a missing user or a DB
  // hiccup degrades to an empty list (recommendation still returns).
  let userSupplements: ReadonlyArray<{ name: string; time_of_day?: ReadonlyArray<TimeOfDay> | null }> = [];
  if (payload.skip_user_lookup !== true) {
    try {
      const supabase = await createClient();
      const { data: userData } = await supabase.auth.getUser();
      const userId: string | null = userData?.user?.id ?? null;
      if (userId) {
        // Read the actual column name `supplement_name` (the table does
        // not have a plain `name` column). time_of_day was added in
        // Prompt 175h's migration so Supabase generated types may not
        // include it yet; treat the read as untyped at the row level.
        const { data: rows, error } = await supabase
          .from('user_current_supplements')
          .select('supplement_name, time_of_day')
          .eq('user_id', userId);
        if (error) {
          safeLog.warn('api.caq.timing-recommend', 'user supplements read failed', { error: error.message });
        } else if (Array.isArray(rows)) {
          const typedRows = rows as unknown as ReadonlyArray<Record<string, unknown>>;
          userSupplements = typedRows
            .filter((r) => typeof r.supplement_name === 'string')
            .map((r) => ({
              name: r.supplement_name as string,
              time_of_day: coerceTimeOfDayArray(r.time_of_day),
            }));
        }
      }
    } catch (err) {
      safeLog.warn('api.caq.timing-recommend', 'user lookup failed', { error: err });
    }
  }

  const recommendation = recommendTiming({
    ingredients,
    frequency,
    userSupplements,
  });

  return NextResponse.json(recommendation);
}
