import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { handleCors } from '../_shared/cors.ts';
import { ok, err } from '../_shared/response.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { writeAudit } from '../_shared/audit.ts';

// ── Stripe signature verification ────────────────────────────────────────
async function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const parts = signature.split(',');
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2);
  const sig = parts.find((p) => p.startsWith('v1='))?.slice(3);
  if (!timestamp || !sig) return false;

  // Tolerance: 5 minutes
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (age > 300) return false;

  const payload = `${timestamp}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  );
  const expectedHex = [...new Uint8Array(expected)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return expectedHex === sig;
}

// ── Truemed HSA/FSA qualification check ──────────────────────────────────
async function checkTruemedEligibility(
  _customerId: string,
): Promise<{ eligible: boolean; qualificationId: string | null }> {
  // Placeholder — Truemed integration requires API key and patient data
  // In production, POST to Truemed API with customer health data
  return { eligible: false, qualificationId: null };
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      return err('Webhook secret not configured', 'CONFIG_ERROR', 500);
    }

    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return err('Missing stripe-signature header', 'SIGNATURE_MISSING', 400);
    }

    const rawBody = await req.text();
    const valid = await verifyStripeSignature(rawBody, signature, webhookSecret);
    if (!valid) {
      return err('Invalid signature', 'SIGNATURE_INVALID', 401);
    }

    const event = JSON.parse(rawBody);
    const admin = getSupabaseAdmin();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        // Find user by Stripe customer ID
        const { data: sub } = await admin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (sub && subscriptionId) {
          await admin
            .from('subscriptions')
            .update({
              stripe_subscription_id: subscriptionId,
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', customerId);

          // Update membership tier based on plan
          const planId = session.metadata?.plan_id ?? 'gold';
          const tierMap: Record<string, string> = {
            gold: 'gold',
            platinum: 'platinum',
            practitioner: 'practitioner',
          };
          await admin.from('memberships').upsert({
            user_id: sub.user_id,
            tier: tierMap[planId] ?? 'gold',
            stripe_subscription_id: subscriptionId,
            started_at: new Date().toISOString(),
            status: 'active',
          });
        }

        await writeAudit({
          userId: sub?.user_id ?? null,
          action: 'stripe_checkout_completed',
          tableName: 'subscriptions',
          recordId: subscriptionId ?? session.id,
          newData: { customerId, planId: session.metadata?.plan_id },
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const updates: Record<string, unknown> = {
          status: subscription.status === 'active' ? 'active' : subscription.status,
          current_period_start: new Date(
            subscription.current_period_start * 1000,
          ).toISOString(),
          current_period_end: new Date(
            subscription.current_period_end * 1000,
          ).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end ?? false,
          updated_at: new Date().toISOString(),
        };

        await admin
          .from('subscriptions')
          .update(updates)
          .eq('stripe_subscription_id', subscription.id);

        // Check HSA/FSA eligibility
        if (subscription.metadata?.check_hsa_fsa === 'true') {
          const truemed = await checkTruemedEligibility(
            subscription.customer,
          );
          if (truemed.eligible) {
            await admin
              .from('subscriptions')
              .update({
                hsa_fsa_eligible: true,
                truemed_qualification_id: truemed.qualificationId,
              })
              .eq('stripe_subscription_id', subscription.id);
          }
        }

        await writeAudit({
          userId: null,
          action: 'stripe_subscription_updated',
          tableName: 'subscriptions',
          recordId: subscription.id,
          newData: updates,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;

        await admin
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        // Downgrade membership
        const { data: sub } = await admin
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (sub) {
          await admin
            .from('memberships')
            .update({ status: 'cancelled', tier: 'free' })
            .eq('user_id', sub.user_id);
        }

        await writeAudit({
          userId: sub?.user_id ?? null,
          action: 'stripe_subscription_deleted',
          tableName: 'subscriptions',
          recordId: subscription.id,
          newData: { status: 'canceled' },
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await admin
            .from('subscriptions')
            .update({
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription);
        }

        await writeAudit({
          userId: null,
          action: 'stripe_payment_succeeded',
          tableName: 'subscriptions',
          recordId: invoice.subscription ?? invoice.id,
          newData: { amount: invoice.amount_paid, currency: invoice.currency },
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          await admin
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription);
        }

        await writeAudit({
          userId: null,
          action: 'stripe_payment_failed',
          tableName: 'subscriptions',
          recordId: invoice.subscription ?? invoice.id,
          newData: {
            amount: invoice.amount_due,
            attemptCount: invoice.attempt_count,
          },
        });
        break;
      }

      default:
        // Unhandled event type — log but don't error
        await writeAudit({
          userId: null,
          action: `stripe_unhandled_${event.type}`,
          tableName: 'subscriptions',
          recordId: event.id,
          newData: { type: event.type },
        });
    }

    return ok({ received: true, type: event.type });
  } catch (e) {
    return err(
      e instanceof Error ? e.message : 'Internal server error',
      'INTERNAL_ERROR',
      500,
    );
  }
});
