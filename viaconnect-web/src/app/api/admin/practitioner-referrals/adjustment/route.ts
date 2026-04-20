// Prompt #98 Phase 5: Admin credit adjustment.
//
// POST /api/admin/practitioner-referrals/adjustment
//   body: {
//     practitioner_id: UUID,
//     amount_cents: number,      // positive or negative; non-zero
//     reason: string (20+ chars required)
//   }
//
// Writes an immutable admin_adjustment ledger entry. Usable for
// goodwill credits, corrections, or fraud-adjacent clawbacks the
// automated detector did not catch. Negative balances are allowed
// (flagged separately in admin reporting).

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const schema = z.object({
  practitioner_id: z.string().uuid(),
  amount_cents: z.number().int().refine((n) => n !== 0, 'amount_cents must be non-zero'),
  reason: z.string().min(20).max(1000),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sb = supabase as any;
  const { data: profile } = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
  }

  // Verify the target practitioner exists.
  const { data: target } = await sb
    .from('practitioners').select('id').eq('id', parsed.data.practitioner_id).maybeSingle();
  if (!target) return NextResponse.json({ error: 'Target practitioner not found' }, { status: 404 });

  const { data: balance } = await sb
    .from('practitioner_referral_credit_balances')
    .select('current_balance_cents')
    .eq('practitioner_id', parsed.data.practitioner_id)
    .maybeSingle();
  const runningBalance = (balance?.current_balance_cents ?? 0) + parsed.data.amount_cents;

  const { data: ledger, error } = await sb
    .from('practitioner_referral_credit_ledger')
    .insert({
      practitioner_id: parsed.data.practitioner_id,
      entry_type: 'admin_adjustment',
      amount_cents: parsed.data.amount_cents,
      running_balance_cents: runningBalance,
      admin_actor_id: user.id,
      admin_reason: parsed.data.reason,
      tax_year: parsed.data.amount_cents > 0 ? new Date().getUTCFullYear() : null,
      notes: parsed.data.amount_cents > 0 ? 'admin goodwill credit' : 'admin clawback',
    })
    .select('id')
    .maybeSingle();
  if (error || !ledger?.id) {
    return NextResponse.json({ error: 'Ledger insert failed', details: error?.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    ledger_entry_id: ledger.id,
    new_balance_cents: runningBalance,
  });
}
