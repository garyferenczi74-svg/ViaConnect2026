/**
 * Prompt 170o Phase 1 Phase B: hydration preferences endpoint.
 *
 * GET returns current preferences. PUT updates counting_mode +
 * notifications_enabled + notification_cadence. Switching counting_mode does
 * NOT recompute stored meal_items.hydration_ml values; daily totals on
 * Today + History views apply the current mode at read time.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { safeLog } from '@/lib/utils/safe-log';
import { PreferencesUpdateSchema } from '@/lib/nutrition/hydration/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  if (process.env.HYDRATION_TRACKING_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Hydration tracking is temporarily unavailable.' }, { status: 503 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profileRow } = await admin
    .from('profiles')
    .select('hydration_counting_mode, hydration_notifications_enabled, hydration_notification_cadence')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({
    counting_mode: profileRow?.hydration_counting_mode ?? 'conservative',
    notifications_enabled: profileRow?.hydration_notifications_enabled ?? false,
    notification_cadence: profileRow?.hydration_notification_cadence ?? null,
  });
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  if (process.env.HYDRATION_TRACKING_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Hydration tracking is temporarily unavailable.' }, { status: 503 });
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = PreferencesUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};
  if (parsed.data.counting_mode !== undefined) updates.hydration_counting_mode = parsed.data.counting_mode;
  if (parsed.data.notifications_enabled !== undefined) updates.hydration_notifications_enabled = parsed.data.notifications_enabled;
  if (parsed.data.notification_cadence !== undefined) updates.hydration_notification_cadence = parsed.data.notification_cadence;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true, updated: false });
  }

  const { error: updateErr } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (updateErr) {
    safeLog.warn('api.hydration.preferences', 'profile update failed', { error: updateErr, userId: user.id });
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: true });
}
