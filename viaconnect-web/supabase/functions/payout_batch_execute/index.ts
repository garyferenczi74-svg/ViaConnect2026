// Prompt #102 Workstream B — payout batch execute.
// For each 'queued' batch line: call the appropriate rail (Stripe
// Connect ACH now; PayPal + wire credential-gated scaffolds), record
// the transaction, update line status. Admin-triggered.

// deno-lint-ignore-file no-explicit-any
import { getSupabaseClient, jsonResponse, requireEnv } from '../_operations_shared/shared.ts';
import { withAbortTimeout, isTimeoutError } from '../_shared/with-timeout.ts';
import { safeLog } from '../_shared/safe-log.ts';
import { getCircuitBreaker, isCircuitBreakerError } from '../_shared/circuit-breaker.ts';

const stripeBreaker = getCircuitBreaker('stripe-api');

async function executeStripeTransfer(stripeSecret: string, destinationAccountId: string, amountCents: number, currency: string): Promise<{ id: string; status: string }> {
  const resp = await stripeBreaker.execute(() =>
    withAbortTimeout(
      (signal) => fetch('https://api.stripe.com/v1/transfers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeSecret}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: String(amountCents),
          currency: currency.toLowerCase(),
          destination: destinationAccountId,
        }),
        signal,
      }),
      15000,
      'payout-batch-execute.stripe-transfer',
    )
  );
  const body = await resp.json();
  if (!resp.ok) throw new Error(`stripe_${body.error?.code ?? 'unknown'}`);
  return { id: body.id as string, status: body.status as string ?? 'pending' };
}

Deno.serve(async (req) => {
  const { batchId } = await req.json().catch(() => ({} as Record<string, unknown>));
  if (!batchId) return jsonResponse({ error: 'missing batchId' }, 400);

  const stripeMissing = requireEnv(['STRIPE_SECRET_KEY']);
  // PayPal + wire are gated; missing creds cause those rails to be skipped.
  const supabase = getSupabaseClient() as any;

  const { data: batch } = await supabase
    .from('payout_batches').select('batch_id, status').eq('batch_id', batchId).maybeSingle();
  if (!batch) return jsonResponse({ error: 'batch_not_found' }, 404);
  if (batch.status !== 'approved') return jsonResponse({ error: 'batch_not_approved' }, 400);

  await supabase.from('payout_batches')
    .update({ status: 'executing', executed_at: new Date().toISOString() })
    .eq('batch_id', batchId);

  const { data: lines } = await supabase
    .from('payout_batch_lines')
    .select('line_id, practitioner_id, net_payable_cents, payout_method_id, rail_used, status')
    .eq('batch_id', batchId)
    .eq('status', 'queued');
  const lineRows = (lines ?? []) as Array<{
    line_id: string; practitioner_id: string; net_payable_cents: number;
    payout_method_id: string | null; rail_used: string | null; status: string;
  }>;

  let paidCount = 0;
  let failedCount = 0;
  for (const line of lineRows) {
    if (!line.payout_method_id) {
      await supabase.from('payout_batch_lines').update({
        status: 'failed', failed_reason: 'no_payout_method',
      }).eq('line_id', line.line_id);
      failedCount += 1;
      continue;
    }
    const { data: method } = await supabase
      .from('practitioner_payout_methods')
      .select('rail, stripe_connect_account_id, paypal_email, status')
      .eq('method_id', line.payout_method_id).maybeSingle();
    if (!method || method.status !== 'verified') {
      await supabase.from('payout_batch_lines').update({
        status: 'failed', failed_reason: 'method_not_verified',
      }).eq('line_id', line.line_id);
      failedCount += 1;
      continue;
    }

    try {
      if (method.rail === 'stripe_connect_ach') {
        if (stripeMissing) {
          await supabase.from('payout_batch_lines').update({
            status: 'failed', failed_reason: 'stripe_key_missing',
          }).eq('line_id', line.line_id);
          failedCount += 1;
          continue;
        }
        const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
        const result = await executeStripeTransfer(
          stripeSecret,
          method.stripe_connect_account_id as string,
          Number(line.net_payable_cents),
          'USD',
        );
        await supabase.from('payout_transactions').insert({
          batch_line_id: line.line_id,
          practitioner_id: line.practitioner_id,
          rail: 'stripe_connect_ach',
          amount_cents: line.net_payable_cents,
          currency: 'USD',
          external_transaction_id: result.id,
          external_status: result.status,
        });
        await supabase.from('payout_batch_lines').update({
          status: 'paid', paid_at: new Date().toISOString(),
          transaction_reference: result.id,
          rail_used: 'stripe_connect_ach',
        }).eq('line_id', line.line_id);
        paidCount += 1;
      } else {
        // PayPal + wire: defer to credential-gated follow-up.
        await supabase.from('payout_batch_lines').update({
          status: 'failed', failed_reason: `rail_${method.rail}_deferred`,
        }).eq('line_id', line.line_id);
        failedCount += 1;
      }
    } catch (err) {
      await supabase.from('payout_batch_lines').update({
        status: 'failed', failed_reason: String((err as Error).message ?? 'exec_error'),
      }).eq('line_id', line.line_id);
      failedCount += 1;
    }
  }

  await supabase.from('payout_batches').update({
    status: failedCount > 0 && paidCount === 0 ? 'failed' : 'completed',
    completed_at: new Date().toISOString(),
  }).eq('batch_id', batchId);

  await supabase.from('practitioner_operations_audit_log').insert({
    action_category: 'payout_batch', action_verb: 'payout_batch.executed',
    target_table: 'payout_batches', target_id: batchId,
    context_json: { paidCount, failedCount, totalLines: lineRows.length },
  });

  return jsonResponse({ paid: paidCount, failed: failedCount, total: lineRows.length });
});
