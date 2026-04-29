// Prompt #98 Phase 5: Apply referral credit to a purchase.
//
// POST /api/practitioner/referrals/apply-credit
//   body: {
//     transaction_type: 'applied_to_subscription' | 'applied_to_wholesale_order' |
//                       'applied_to_certification_fee' | 'applied_to_level_3_fee' |
//                       'applied_to_level_4_fee',
//     transaction_reference_id: UUID,
//     requested_cents: number,
//     transaction_total_cents: number,
//   }
//
// Loads current balance, runs the pure calculator, inserts an
// immutable ledger entry (negative amount). Returns the applied
// amount + the remaining_due for the checkout flow to charge Stripe.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  computeCreditApplication,
  VALID_APPLICATION_ENTRY_TYPES,
} from '@/lib/practitioner-referral/credit-application';
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = 'nodejs';

const schema = z.object({
  transaction_type: z.enum(VALID_APPLICATION_ENTRY_TYPES as unknown as [string, ...string[]]),
  transaction_reference_id: z.string().uuid(),
  requested_cents: z.number().int().min(1).max(1_000_000_00),
  transaction_total_cents: z.number().int().min(1).max(10_000_000_00),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        'api.practitioner.referrals.apply-credit.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.practitioner.referrals.apply-credit', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: 'Authentication timed out. Please try again.' }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const json = await request.json().catch(() => null);
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.issues }, { status: 400 });
    }

    const sb = supabase as any;
    const practitionerRes = await withTimeout(
      (async () => sb.from('practitioners').select('id').eq('user_id', user.id).maybeSingle())(),
      8000,
      'api.practitioner.referrals.apply-credit.practitioner-load',
    );
    const practitioner = practitionerRes.data;
    if (!practitioner) return NextResponse.json({ error: 'No practitioner record' }, { status: 404 });

    const balanceRes = await withTimeout(
      (async () => sb
        .from('practitioner_referral_credit_balances')
        .select('current_balance_cents')
        .eq('practitioner_id', practitioner.id)
        .maybeSingle())(),
      8000,
      'api.practitioner.referrals.apply-credit.balance-load',
    );
    const balance = balanceRes.data;
    const availableCents = balance?.current_balance_cents ?? 0;

    const result = computeCreditApplication({
      practitioner_id: practitioner.id,
      transaction_type: parsed.data.transaction_type as (typeof VALID_APPLICATION_ENTRY_TYPES)[number],
      transaction_reference_id: parsed.data.transaction_reference_id,
      requested_cents: parsed.data.requested_cents,
      available_balance_cents: availableCents,
      transaction_total_cents: parsed.data.transaction_total_cents,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, reason: result.reason }, { status: 400 });
    }

    // Insert immutable ledger entry; the balance trigger recomputes.
    const ledgerRes = await withTimeout(
      (async () => sb
        .from('practitioner_referral_credit_ledger')
        .insert({
          practitioner_id: practitioner.id,
          entry_type: parsed.data.transaction_type,
          amount_cents: result.ledger_amount_cents,
          running_balance_cents: result.new_balance_cents,
          applied_to_reference_type: parsed.data.transaction_type.replace('applied_to_', ''),
          applied_to_reference_id: parsed.data.transaction_reference_id,
          notes: `Applied ${result.applied_cents} cents to ${parsed.data.transaction_type}`,
        })
        .select('id')
        .maybeSingle())(),
      8000,
      'api.practitioner.referrals.apply-credit.ledger-insert',
    );
    const ledger = ledgerRes.data;
    const insertErr = ledgerRes.error;
    if (insertErr || !ledger?.id) {
      safeLog.error('api.practitioner.referrals.apply-credit', 'ledger insert failed', { requestId, error: insertErr });
      return NextResponse.json({ error: 'Ledger insert failed', details: insertErr?.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      applied_cents: result.applied_cents,
      remaining_due_cents: result.remaining_due_cents,
      ledger_entry_id: ledger.id,
      new_balance_cents: result.new_balance_cents,
    });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.referrals.apply-credit', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: 'Database operation timed out. Please try again.' }, { status: 503 });
    }
    safeLog.error('api.practitioner.referrals.apply-credit', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
