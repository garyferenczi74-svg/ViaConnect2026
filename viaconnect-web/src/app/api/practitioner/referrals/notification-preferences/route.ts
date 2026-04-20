// Prompt #98 Phase 3: Referred-practitioner notification preferences.
//
// PATCH /api/practitioner/referrals/notification-preferences
//   body: { allow_referrer_progress_notifications: boolean }
//
// Owned by the referred practitioner. When toggled to false the
// referrer stops receiving milestone notifications; reward vesting
// continues silently (Phase 4 dispatcher checks this flag).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const schema = z.object({
  allow_referrer_progress_notifications: z.boolean(),
});

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
  }

  const sb = supabase as any;
  const { data: practitioner } = await sb
    .from('practitioners').select('id').eq('user_id', user.id).maybeSingle();
  if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

  const { data: existing } = await sb
    .from('practitioner_referral_notification_preferences')
    .select('attribution_id, allow_referrer_progress_notifications')
    .eq('referred_practitioner_id', practitioner.id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: 'No referral attribution; nothing to configure' }, { status: 404 });
  }

  const wasEnabled = existing.allow_referrer_progress_notifications === true;
  const isEnabling = parsed.data.allow_referrer_progress_notifications === true;
  const justOptedOut = wasEnabled && !isEnabling;

  await sb
    .from('practitioner_referral_notification_preferences')
    .update({
      allow_referrer_progress_notifications: parsed.data.allow_referrer_progress_notifications,
      opted_out_at: isEnabling ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('referred_practitioner_id', practitioner.id);

  // Phase 4 will hook a one-time notification to the referrer here on
  // the just-opted-out edge. For now we log so the dispatcher's contract
  // is documented and easy to grep.
  if (justOptedOut) {
    console.log(`[wl-ref-prefs] practitioner ${practitioner.id} opted out; referrer should receive a one-time silent-vesting notice`);
  }

  return NextResponse.json({
    allow_referrer_progress_notifications: parsed.data.allow_referrer_progress_notifications,
    opted_out_just_now: justOptedOut,
  });
}
