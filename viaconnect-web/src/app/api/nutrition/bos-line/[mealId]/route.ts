// Prompt 172 Phase 2 (172b): GET /api/nutrition/bos-line/[mealId].
//
// Spec section 5.2 v3 + spec section 5.5 (post save). Returns the resolved
// Bio Optimization Score line for a saved meal, or 200 with a null body
// when the line is unavailable so the card can hide the slot cleanly.
//
// Auth posture (mirrors /api/safety-mode/status + /api/nutrition/hydration
// /log/[mealId]):
//   - Unauthenticated -> 401.
//   - Authenticated -> ownership check against meals.user_id. The 401 from
//     the auth boundary is fine; what we do NOT want to leak is whether the
//     mealId belongs to someone else, so a mismatched user_id returns 404
//     identical to a non existent mealId.
//
// Safety mode is resolved server side from user_safety_preferences so the
// client cannot influence the variant. Failure closes to enabled false.
//
// Kill switch: when BOS_LINE_RENDERING_ENABLED is false the endpoint
// returns 200 with a null body so the surface degrades cleanly without
// 404 noise or surface specific kill switch logic on the client.
//
// Caching: Cache-Control: private, max-age=300. The line is per user and
// inexpensive to recompute, but a five minute TTL keeps the post save
// re render free of repeated round trips during a single review session.
//
// Hard rules honored: no em or en dashes, no emojis, no any (explicit
// supabase-js type narrowing only where the SDK lacks types).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isKillSwitchEnabled } from '@/lib/compliance/kill-switches';
import { resolveBosLine } from '@/lib/nutrition/bos-line/resolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { mealId: string };
}

const CACHE_HEADER = 'private, max-age=300';

export async function GET(_req: NextRequest, ctx: RouteContext): Promise<NextResponse> {
  // Kill switch first. When off, the endpoint exists but returns null so
  // the card surface degrades to "no BOS slot" without needing to know
  // about the kill switch on the client.
  if (!isKillSwitchEnabled('BOS_LINE_RENDERING_ENABLED')) {
    return NextResponse.json(null, {
      status: 200,
      headers: { 'Cache-Control': CACHE_HEADER },
    });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const mealId = ctx.params.mealId;
  if (typeof mealId !== 'string' || mealId.length === 0) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
  }

  const admin = createAdminClient();

  // Ownership check. RLS scopes the user supabase client to the calling
  // user's rows already, but using the admin client here keeps the read
  // consistent with the resolver's admin read and ensures a clean 404 in
  // the cross user case (rather than a phantom empty maybeSingle that the
  // client could not distinguish from a not found).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: mealRow } = await (admin as any)
    .from('meals')
    .select('meal_id, user_id')
    .eq('meal_id', mealId)
    .maybeSingle();

  if (!mealRow || mealRow.user_id !== user.id) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
  }

  // Server side safety mode read. Mirrors /api/safety-mode/status logic
  // verbatim so client and server see the same flag. Master kill switch
  // off forces enabled false.
  let safetyMode = false;
  if (isKillSwitchEnabled('EATING_DISORDER_SAFETY_MODE_ENABLED')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prefRow, error: prefErr } = await (admin as any)
      .from('user_safety_preferences')
      .select('ed_safety_mode_enabled')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!prefErr) {
      safetyMode = Boolean(prefRow?.ed_safety_mode_enabled);
    }
  }

  const line = await resolveBosLine(admin, {
    mealId,
    userId: user.id,
    safetyMode,
  });

  // 200 with null body when the resolver could not produce a line. The
  // card surface treats null identically across both "kill switch off"
  // and "no analytics history yet" so the user sees the same quiet slot.
  return NextResponse.json(line, {
    status: 200,
    headers: { 'Cache-Control': CACHE_HEADER },
  });
}
