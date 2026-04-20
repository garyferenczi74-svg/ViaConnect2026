// Prompt #98 Phase 2: Resolve referral attribution at signup.
//
// POST /api/practitioner/referrals/resolve-attribution
//   body: { visitor_uuid, cookie_code_slug }
//
// Called by the practitioner onboarding flow immediately after the
// practitioners row is created. Reads the click history for the
// visitor + the candidate code, runs the pure resolver, and persists
// either a verified-pending attribution or a blocked self-referral
// (with fraud flag).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  resolveAttributionFromSignals,
  type ClickRecord,
  type PractitionerSignals,
} from '@/lib/practitioner-referral/attribution-resolver';

export const runtime = 'nodejs';

const schema = z.object({
  visitor_uuid: z.string().uuid().nullable().optional(),
  cookie_code_slug: z.string().max(120).nullable().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
  }

  const sb = supabase as any;

  // Look up the calling user's practitioner row.
  const { data: practitioner } = await sb
    .from('practitioners')
    .select('id, user_id, practice_name, practice_street_address, practice_city, practice_state, practice_postal_code, practice_phone')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

  const referredSignals: PractitionerSignals = {
    practitioner_id: practitioner.id,
    user_id: practitioner.user_id,
    practice_name: practitioner.practice_name ?? null,
    practice_street_address: practitioner.practice_street_address ?? null,
    practice_city: practitioner.practice_city ?? null,
    practice_state: practitioner.practice_state ?? null,
    practice_postal_code: practitioner.practice_postal_code ?? null,
    practice_phone: practitioner.practice_phone ?? null,
  };

  // No cookie / visitor uuid -> nothing to resolve.
  if (!parsed.data.visitor_uuid || !parsed.data.cookie_code_slug) {
    return NextResponse.json({ attributed: false, reason: 'no_cookie_or_visitor_uuid' });
  }

  // Already attributed? Idempotent: short-circuit with 200.
  const { data: existing } = await sb
    .from('practitioner_referral_attributions')
    .select('id, status, referring_practitioner_id')
    .eq('referred_practitioner_id', practitioner.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ attributed: existing.status === 'verified_active' || existing.status === 'pending_verification', reason: 'already_attributed', attribution_id: existing.id });
  }

  // Load all clicks tied to this visitor across all codes (we need
  // them all to determine first-click winner).
  const { data: clickRows } = await sb
    .from('practitioner_referral_link_clicks')
    .select('id, referral_code_id, clicked_at, practitioner_referral_codes!inner(practitioner_id, is_active)')
    .eq('visitor_uuid', parsed.data.visitor_uuid)
    .order('clicked_at', { ascending: true });

  const clicks: ClickRecord[] = ((clickRows ?? []) as Array<{
    id: string;
    referral_code_id: string;
    clicked_at: string;
    practitioner_referral_codes: { practitioner_id: string; is_active: boolean };
  }>).map((row) => ({
    id: row.id,
    referral_code_id: row.referral_code_id,
    referring_practitioner_id: row.practitioner_referral_codes.practitioner_id,
    code_is_active: row.practitioner_referral_codes.is_active,
    clicked_at: row.clicked_at,
  }));

  const result = await resolveAttributionFromSignals({
    now: new Date(),
    visitor_uuid: parsed.data.visitor_uuid ?? null,
    cookie_code_slug: parsed.data.cookie_code_slug ?? null,
    candidate_clicks: clicks,
    referrer_signals_lookup: async (referringId) => {
      const { data: r } = await sb
        .from('practitioners')
        .select('id, user_id, practice_name, practice_street_address, practice_city, practice_state, practice_postal_code, practice_phone')
        .eq('id', referringId)
        .maybeSingle();
      if (!r) return null;
      return {
        practitioner_id: r.id,
        user_id: r.user_id,
        practice_name: r.practice_name ?? null,
        practice_street_address: r.practice_street_address ?? null,
        practice_city: r.practice_city ?? null,
        practice_state: r.practice_state ?? null,
        practice_postal_code: r.practice_postal_code ?? null,
        practice_phone: r.practice_phone ?? null,
      };
    },
    referred_signals: referredSignals,
  });

  if (!result.proposed_status || !result.referral_code_id || !result.referring_practitioner_id) {
    return NextResponse.json({ attributed: false, reason: result.reason ?? 'unresolvable' });
  }

  // Persist attribution + (on block) fraud flag + notification preferences.
  const { data: attribution, error: insertError } = await sb
    .from('practitioner_referral_attributions')
    .insert({
      referral_code_id: result.referral_code_id,
      referring_practitioner_id: result.referring_practitioner_id,
      referred_practitioner_id: practitioner.id,
      first_click_id: result.winning_click_id ?? null,
      first_click_at: result.winning_click_id
        ? clicks.find((c) => c.id === result.winning_click_id)?.clicked_at ?? null
        : null,
      days_from_first_click_to_signup: result.days_from_first_click_to_signup ?? null,
      status: result.proposed_status,
      self_referral_signals: result.self_referral_signals ?? {},
    })
    .select('id')
    .maybeSingle();

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ attributed: false, reason: 'already_attributed' });
    }
    return NextResponse.json({ error: 'Attribution insert failed', details: insertError.message }, { status: 500 });
  }

  // Mark the winning click converted.
  if (result.winning_click_id && attribution?.id) {
    await sb
      .from('practitioner_referral_link_clicks')
      .update({ converted_to_attribution: true, attribution_id: attribution.id })
      .eq('id', result.winning_click_id);
  }

  // Default opt-in notification preferences.
  if (attribution?.id) {
    await sb.from('practitioner_referral_notification_preferences').insert({
      referred_practitioner_id: practitioner.id,
      attribution_id: attribution.id,
      allow_referrer_progress_notifications: true,
    });
  }

  // Raise fraud flag on a blocking self-referral.
  if (result.proposed_status === 'blocked_self_referral' && result.self_referral_signals && attribution?.id) {
    await sb.from('practitioner_referral_fraud_flags').insert({
      attribution_id: attribution.id,
      flag_type: result.self_referral_signals.primary_flag_type,
      severity: 'blocking',
      evidence: result.self_referral_signals,
      auto_detected: true,
    });
  }

  return NextResponse.json({
    attributed: result.attributed,
    attribution_id: attribution?.id,
    reason: result.reason,
    proposed_status: result.proposed_status,
  });
}
