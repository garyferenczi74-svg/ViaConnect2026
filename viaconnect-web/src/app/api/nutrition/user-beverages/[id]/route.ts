/**
 * Prompt 207a Task 4: PATCH /api/nutrition/user-beverages/[id]
 *
 * Allows the authenticated user to rename (display_name), change the default
 * volume (default_volume_ml), or archive (is_active: false) their own custom
 * beverage. Only these three fields are accepted; all others are ignored.
 *
 * updated_at is explicitly set on every update because the user_beverages
 * table has no auto-update trigger. RLS on the table enforces ownership: the
 * update will match zero rows (and return no data) if the row does not belong
 * to the requesting user, returning a 500 to the client.
 *
 * CRITICAL: uses await createClient() (session client), NOT createAdminClient().
 * The RLS policies and the user_hash column default require auth.uid() to be
 * populated, which only the session client provides.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { safeLog } from '@/lib/utils/safe-log';
import { withTimeout } from '@/lib/nutrition/resilience/timeout';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PatchBeverageSchema = z
  .object({
    display_name: z.string().min(1).max(60).optional(),
    default_volume_ml: z.number().int().min(10).max(5000).optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (obj) =>
      obj.display_name !== undefined ||
      obj.default_volume_ml !== undefined ||
      obj.is_active !== undefined,
    { message: 'At least one field (display_name, default_volume_ml, is_active) is required' },
  );

// ---- PATCH ----------------------------------------------------------------

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const supabase = await createClient();

  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    safeLog.warn('api.user_beverages.patch', 'getUser failed', { error: err });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PatchBeverageSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { display_name, default_volume_ml, is_active } = parsed.data;

  // Build update object; always set updated_at (no auto-update trigger on the table)
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (display_name !== undefined) updatePayload.display_name = display_name;
  if (default_volume_ml !== undefined) updatePayload.default_volume_ml = default_volume_ml;
  if (is_active !== undefined) updatePayload.is_active = is_active;

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('user_beverages')
        .update(updatePayload)
        .eq('id', id)
        .select(
          'id, display_name, category, hydration_source_kind, default_volume_ml, hydration_coefficient, caffeine_mg_per_serving, is_alcoholic, is_active',
        )
        .single(),
      { timeoutMs: 4000, op: 'user_beverages.patch' },
    );

    if (error || !data) {
      safeLog.warn('api.user_beverages.patch', 'update failed', { error, userId: user.id, id });
      return NextResponse.json({ error: 'Could not update beverage' }, { status: 500 });
    }

    safeLog.info('api.user_beverages.patch', 'beverage updated', {
      userId: user.id,
      beverageId: id,
      fields: Object.keys(updatePayload).filter((k) => k !== 'updated_at'),
    });

    return NextResponse.json({ beverage: data });
  } catch (err) {
    safeLog.error('api.user_beverages.patch', 'unexpected error', { error: err, userId: user.id, id });
    return NextResponse.json({ error: 'Could not update beverage' }, { status: 500 });
  }
}
