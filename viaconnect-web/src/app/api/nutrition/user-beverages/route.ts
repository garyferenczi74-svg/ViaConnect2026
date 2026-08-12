/**
 * Prompt 207a Task 4: GET + POST /api/nutrition/user-beverages
 *
 * GET  - returns the authenticated user's own active custom beverages,
 *        newest first. RLS on user_beverages scopes the query automatically
 *        when the session client is used.
 *
 * POST - validates the request body with Zod, derives hydration_source_kind /
 *        hydration_coefficient / is_alcoholic from the category via
 *        deriveCustomBeverageDefaults, forces caffeine_mg_per_serving to 0
 *        unless the category is in CAFFEINE_CATEGORIES (coffee / tea /
 *        sports_energy), inserts WITHOUT user_hash (the column default
 *        caq_compute_user_hash(auth.uid()) resolves it via the session client),
 *        and returns the created row as { beverage }.
 *
 * CRITICAL: uses await createClient() (session client) for ALL reads and writes so
 * that auth.uid() is set, RLS WITH CHECK resolves, and the user_hash column
 * default fills correctly. createAdminClient() must NOT be used here.
 *
 * Every Supabase call is wrapped in withTimeout (3-5 s). Errors are caught
 * and returned as structured JSON. safeLog is used for all diagnostic output.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/nutrition/resilience/timeout';
import {
  deriveCustomBeverageDefaults,
  BEVERAGE_CATEGORIES,
  CAFFEINE_CATEGORIES,
} from '@/lib/nutrition/hydration/custom-beverage-mapping';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CreateBeverageSchema = z.object({
  display_name: z.string().min(1).max(60),
  category: z.enum(BEVERAGE_CATEGORIES as unknown as [string, ...string[]]),
  default_volume_ml: z.number().int().min(10).max(5000),
  caffeine_mg_per_serving: z.number().int().min(0).max(500).optional(),
});

// ---- GET ------------------------------------------------------------------

export async function GET(): Promise<NextResponse> {
  const supabase = await createClient();

  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    safeLog.warn('api.user_beverages.get', 'getUser failed', { error: err });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('user_beverages')
        .select(
          'id, display_name, category, hydration_source_kind, default_volume_ml, hydration_coefficient, caffeine_mg_per_serving, is_alcoholic, is_active',
        )
        .eq('is_active', true)
        .order('created_at', { ascending: false }),
      { timeoutMs: 4000, op: 'user_beverages.list' },
    );

    if (error) {
      safeLog.warn('api.user_beverages.get', 'select failed', { error, userId: user.id });
      return NextResponse.json({ error: 'Could not load beverages' }, { status: 500 });
    }

    return NextResponse.json({ beverages: data ?? [] });
  } catch (err) {
    safeLog.error('api.user_beverages.get', 'unexpected error', { error: err, userId: user.id });
    return NextResponse.json({ error: 'Could not load beverages' }, { status: 500 });
  }
}

// ---- POST -----------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createClient();

  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    safeLog.warn('api.user_beverages.post', 'getUser failed', { error: err });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateBeverageSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { display_name, category, default_volume_ml, caffeine_mg_per_serving } = parsed.data;
  const derived = deriveCustomBeverageDefaults(category as Parameters<typeof deriveCustomBeverageDefaults>[0]);

  // Force caffeine to 0 for non-caffeinated categories
  const caffeineMg = CAFFEINE_CATEGORIES.includes(category as typeof CAFFEINE_CATEGORIES[number])
    ? (caffeine_mg_per_serving ?? 0)
    : 0;

  // Do NOT pass user_hash: the column default caq_compute_user_hash(auth.uid())
  // fills it via the session client. Passing it from here would be wrong and
  // could fail the RLS WITH CHECK.
  const insertPayload = {
    display_name,
    category,
    hydration_source_kind: derived.hydration_source_kind,
    hydration_coefficient: derived.hydration_coefficient,
    is_alcoholic: derived.is_alcoholic,
    default_volume_ml,
    caffeine_mg_per_serving: caffeineMg,
  };

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('user_beverages')
        .insert(insertPayload)
        .select(
          'id, display_name, category, hydration_source_kind, default_volume_ml, hydration_coefficient, caffeine_mg_per_serving, is_alcoholic, is_active',
        )
        .single(),
      { timeoutMs: 4000, op: 'user_beverages.insert' },
    );

    if (error || !data) {
      safeLog.warn('api.user_beverages.post', 'insert failed', { error, userId: user.id });
      return NextResponse.json({ error: 'Could not create beverage' }, { status: 500 });
    }

    safeLog.info('api.user_beverages.post', 'beverage created', {
      userId: user.id,
      beverageId: (data as Record<string, unknown>).id,
      category,
    });

    return NextResponse.json({ beverage: data }, { status: 201 });
  } catch (err) {
    safeLog.error('api.user_beverages.post', 'unexpected error', { error: err, userId: user.id });
    return NextResponse.json({ error: 'Could not create beverage' }, { status: 500 });
  }
}
