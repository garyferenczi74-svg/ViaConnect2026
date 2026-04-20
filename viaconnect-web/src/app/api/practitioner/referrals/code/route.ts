// Prompt #98 Phase 2: Practitioner referral code (get-or-create).
//
// GET /api/practitioner/referrals/code
// Returns the calling practitioner's persistent referral code, creating
// it on first call. Refused unless practitioner.account_status='active'.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateReferralCode, buildReferralUrl } from '@/lib/practitioner-referral/code-generation';

export const runtime = 'nodejs';

export async function GET(): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: practitioner } = await sb
    .from('practitioners')
    .select('id, practice_name, account_status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

  try {
    const result = await getOrCreateReferralCode({
      practitioner_id: practitioner.id,
      practice_name: practitioner.practice_name,
      account_status: practitioner.account_status,
      supabase,
    });
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    return NextResponse.json({
      code: result.code,
      full_url: buildReferralUrl(result.code.code_slug, baseUrl),
      was_existing: result.was_existing,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
