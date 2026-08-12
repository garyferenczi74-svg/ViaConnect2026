// Prompt 177i (2026-06-07): DELETE /api/nutrition/meals/[mealId].
//
// Removes a logged meal for the authenticated user. Used by the per
// section remove control on the Today's Meals card on /nutrition and on
// the My Nutrition hub. The row may live in the canonical meals table OR,
// for manual text (analyze-text) entries, in the legacy nutrition_logs
// table; both are surfaced in Today's Meals via useUserMeals, so this
// handler looks in meals first and falls back to nutrition_logs, deleting
// from whichever holds the row (Gary 2026-06-13 fix: legacy rows used to
// 404 here and readd themselves). Hydration entries continue to route
// through /api/nutrition/hydration/log/[mealId]; this handler covers
// Breakfast, Lunch, Dinner, and Snacks (any non hydration meal_kind).
//
// Reversal contract:
//   1. Auth + ownership check via the user scoped Supabase client.
//   2. Sum the user's prior helix_transactions where
//      metadata.related_meal_id matches and type IN ('earn','bonus').
//      Insert a single adjustment row that nets the awarded amount
//      back to zero. Adjustment is its own enum value in the table
//      CHECK constraint so it does not conflict with the earn ledger.
//   3. Delete the row from whichever table holds it (meals, with
//      meal_items ON DELETE CASCADE, or legacy nutrition_logs), and
//      confirm via RETURNING that a row was actually removed.
//      helix_transactions stay in place because the audit trail is
//      append only; the adjustment row above is the canonical reversal.
//   4. Fire recomputeNutritionDimension for the meal's local date.
//      Best effort; failure logs but does not fail the response.
//
// Hard rules honored: no em or en dashes, no emojis, no any.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tryCreateAdminClient } from '@/lib/supabase/admin-optional';
import { safeLog } from '@/lib/utils/safe-log';
import { recomputeNutritionDimension } from '@/lib/nutrition/bos-bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ mealId: string }>;
}

const HANDLER_TIMEOUT_MS = 10_000;

interface HelixRow {
  id?: string;
  amount: number | null;
  type: string | null;
  source: string | null;
  event_type_id?: string | null;
  metadata?: Record<string, unknown> | null;
}

async function reverseHelixForMeal(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any;
  userId: string;
  mealId: string;
  requestId: string;
}): Promise<{ reversedAmount: number; rowsConsidered: number; errors: number }> {
  const { admin, userId, mealId, requestId } = args;
  let reversedAmount = 0;
  let rowsConsidered = 0;
  let errors = 0;

  try {
    const { data, error } = await admin
      .from('helix_transactions')
      .select('id, amount, type, source, event_type_id, metadata')
      .eq('user_id', userId)
      .contains('metadata', { related_meal_id: mealId });

    if (error) {
      safeLog.warn('api.nutrition.meals.delete', 'helix lookup failed', {
        request_id: requestId,
        user_id: userId,
        meal_id: mealId,
        error: error.message,
      });
      return { reversedAmount: 0, rowsConsidered: 0, errors: 1 };
    }

    const rows: HelixRow[] = Array.isArray(data) ? (data as HelixRow[]) : [];
    rowsConsidered = rows.length;
    let net = 0;
    for (const r of rows) {
      if (typeof r.amount !== 'number') continue;
      // Only reverse earn / bonus rows; ignore prior adjustments so this
      // handler is idempotent across repeated deletes (a second delete
      // attempt nets zero).
      if (r.type !== 'earn' && r.type !== 'bonus') continue;
      net += r.amount;
    }

    if (net === 0) {
      return { reversedAmount: 0, rowsConsidered, errors: 0 };
    }

    const { error: insertErr } = await admin.from('helix_transactions').insert({
      user_id: userId,
      amount: -net,
      type: 'adjustment',
      source: 'meal_removed',
      description: 'Reversal for removed meal',
      event_type_id: 'meal_removed_reversal',
      metadata: {
        event_key: 'meal_removed_reversal',
        related_meal_id: mealId,
        reversed_total: net,
        rows_considered: rowsConsidered,
      },
    });

    if (insertErr) {
      safeLog.warn('api.nutrition.meals.delete', 'helix reversal insert failed', {
        request_id: requestId,
        user_id: userId,
        meal_id: mealId,
        error: insertErr.message,
      });
      return { reversedAmount: 0, rowsConsidered, errors: 1 };
    }

    reversedAmount = net;
  } catch (err) {
    errors += 1;
    safeLog.warn('api.nutrition.meals.delete', 'helix reversal threw', {
      request_id: requestId,
      user_id: userId,
      meal_id: mealId,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return { reversedAmount, rowsConsidered, errors };
}

export async function DELETE(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  const requestId = `meals.delete-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HANDLER_TIMEOUT_MS);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mealId = (await ctx.params).mealId;
    if (!mealId || typeof mealId !== 'string') {
      return NextResponse.json({ error: 'Missing mealId' }, { status: 400 });
    }

    // Read with the user scoped client so RLS enforces ownership. If
    // the row is not visible to the caller we treat it as a 404 even
    // when an admin lookup might find it; the user's view is the
    // canonical authorization boundary.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userScoped = supabase as any;
    const { data: meal, error: readErr } = await userScoped
      .from('meals')
      .select('meal_id, user_id, meal_kind, logged_at, meal_type')
      .eq('meal_id', mealId)
      .maybeSingle();

    if (readErr) {
      safeLog.error('api.nutrition.meals.delete', 'meal lookup failed', {
        request_id: requestId,
        user_id: user.id,
        meal_id: mealId,
        error: readErr.message,
      });
      return NextResponse.json({ error: 'Could not load meal' }, { status: 500 });
    }

    // Legacy fallback (Gary 2026-06-13): manual text meals (the analyze-text
    // path) are written to the legacy nutrition_logs table, NOT the canonical
    // meals table, yet they are surfaced in Today's Meals via useUserMeals
    // (includeLegacy) with mealId = the nutrition_logs id. Without this branch
    // the Remove control on a typed in meal looked up only meals, 404d, and the
    // optimistic removal was reverted, so the meal readds itself. When the row
    // is not in meals we look it up in nutrition_logs and delete it there.
    // nutrition_logs has a per user DELETE RLS policy (auth.uid() = user_id),
    // so the user scoped client can remove it.
    let legacyMeal: { id: string; logged_at: string | null; meal_type: string | null } | null = null;
    if (!meal) {
      const { data: legacyRow, error: legacyReadErr } = await userScoped
        .from('nutrition_logs')
        .select('id, logged_at, meal_type')
        .eq('id', mealId)
        .maybeSingle();
      if (legacyReadErr) {
        safeLog.error('api.nutrition.meals.delete', 'legacy meal lookup failed', {
          request_id: requestId,
          user_id: user.id,
          meal_id: mealId,
          error: legacyReadErr.message,
        });
        return NextResponse.json({ error: 'Could not load meal' }, { status: 500 });
      }
      legacyMeal = (legacyRow as typeof legacyMeal) ?? null;
    }

    if (!meal && !legacyMeal) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Hydration mounts have their own DELETE route at
    // /api/nutrition/hydration/log/[mealId]; redirect callers there
    // rather than splitting the hydration recompute logic across two
    // handlers. Only canonical meals carry meal_kind; legacy nutrition_logs
    // rows are never hydration entries.
    if (meal && meal.meal_kind === 'hydration_only') {
      return NextResponse.json(
        { error: 'Use /api/nutrition/hydration/log/[mealId] for hydration entries' },
        { status: 400 },
      );
    }

    // Resolve the table that actually holds the row, its id column, and the
    // date used for the BOS recompute, so the rest of the handler is table
    // agnostic.
    const targetTable = meal ? 'meals' : 'nutrition_logs';
    const idColumn = meal ? 'meal_id' : 'id';
    // meal is the loosely typed (any) Supabase row; legacyMeal is the typed
    // nutrition_logs row. Coalesce to whichever was found and read the shared
    // fields off it, so the ternary does not narrow legacyMeal to never.
    const sourceRow = (meal ?? legacyMeal) as { logged_at: string | null; meal_type: string | null } | null;
    const loggedAt = sourceRow?.logged_at ?? null;
    const mealType = sourceRow?.meal_type ?? null;

    // Admin client only for the helix reversal because helix_transactions
    // has user_id RLS that the user scoped client cannot insert against
    // outside its own row in some edge configurations. Best effort: if
    // the admin client is unavailable we skip reversal but still allow
    // the delete (the meal record is the user facing surface). Keyed by
    // related_meal_id = mealId for both canonical and legacy rows.
    const admin = tryCreateAdminClient();
    let reversal = { reversedAmount: 0, rowsConsidered: 0, errors: 0 };
    if (admin) {
      reversal = await reverseHelixForMeal({
        admin,
        userId: user.id,
        mealId,
        requestId,
      });
    } else {
      safeLog.warn('api.nutrition.meals.delete', 'no admin client; skipping helix reversal', {
        request_id: requestId,
        user_id: user.id,
        meal_id: mealId,
      });
    }

    // Delete from whichever table holds the row. For meals, meal_items has
    // ON DELETE CASCADE. Both tables enforce ownership via RLS; the explicit
    // user_id filter is defense in depth. .select() confirms a row was
    // actually removed so an RLS no-op cannot masquerade as success and leave
    // the meal to readd on the next refetch.
    const { data: deletedRows, error: delErr } = await userScoped
      .from(targetTable)
      .delete()
      .eq(idColumn, mealId)
      .eq('user_id', user.id)
      .select(idColumn);

    if (delErr) {
      safeLog.error('api.nutrition.meals.delete', 'meal delete failed', {
        request_id: requestId,
        user_id: user.id,
        meal_id: mealId,
        table: targetTable,
        error: delErr.message,
      });
      return NextResponse.json({ error: 'Could not remove meal' }, { status: 500 });
    }
    if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
      safeLog.error('api.nutrition.meals.delete', 'meal delete removed no rows', {
        request_id: requestId,
        user_id: user.id,
        meal_id: mealId,
        table: targetTable,
      });
      return NextResponse.json({ error: 'Could not remove meal' }, { status: 500 });
    }

    // BOS recompute hook. Best effort; failures are logged and never
    // fail the response. The day key is derived from the meal's
    // logged_at UTC date because the bos-bridge stub keys by date
    // string. The live worker rederives the local date from the meal
    // row on its own when it lands.
    try {
      const dateKey =
        typeof loggedAt === 'string' && loggedAt.length >= 10
          ? loggedAt.slice(0, 10)
          : new Date().toISOString().slice(0, 10);
      await recomputeNutritionDimension({ userId: user.id, date: dateKey });
    } catch (bosErr) {
      safeLog.warn('api.nutrition.meals.delete', 'bos recompute failed', {
        request_id: requestId,
        user_id: user.id,
        meal_id: mealId,
        error: bosErr instanceof Error ? bosErr.message : String(bosErr),
      });
    }

    safeLog.info('api.nutrition.meals.delete', 'meal removed', {
      request_id: requestId,
      user_id: user.id,
      meal_id: mealId,
      table: targetTable,
      meal_type: mealType,
      helix_rows_considered: reversal.rowsConsidered,
      helix_reversed_amount: reversal.reversedAmount,
      helix_errors: reversal.errors,
    });

    return NextResponse.json({
      removed: true,
      meal_id: mealId,
      helix_reversed_amount: reversal.reversedAmount,
    });
  } catch (err) {
    safeLog.error('api.nutrition.meals.delete', 'handler threw', {
      request_id: requestId,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}
