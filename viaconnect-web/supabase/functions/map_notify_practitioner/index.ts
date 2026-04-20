// Prompt #100 map_notify_practitioner
// In-app + email + (for red/black) SMS notification delivery.
// Twilio SMS is credential-gated via TWILIO_ACCOUNT_SID +
// TWILIO_AUTH_TOKEN + TWILIO_FROM_NUMBER. When missing, SMS is
// silently skipped; in-app + email still fire.

// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const SEVERITY_SLA_HOURS = { yellow: 168, orange: 24, red: 4, black: 1 } as const;
const GRACE_HOURS = { yellow: 168, orange: 72, red: 48, black: 24 } as const;

Deno.serve(async (req) => {
  const { violationId } = await req.json();
  if (!violationId) return jsonResponse({ error: 'missing violationId' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  const { data: violation } = await (supabase as any)
    .from('map_violations')
    .select('violation_id, practitioner_id, severity, product_id, observed_price_cents, map_price_cents')
    .eq('violation_id', violationId)
    .maybeSingle();
  if (!violation) return jsonResponse({ error: 'violation not found' }, 404);

  const { data: product } = await (supabase as any)
    .from('products')
    .select('name, sku')
    .eq('id', violation.product_id)
    .maybeSingle();

  const { data: practitioner } = await (supabase as any)
    .from('practitioners')
    .select('user_id, display_name')
    .eq('id', violation.practitioner_id)
    .maybeSingle();
  if (!practitioner) return jsonResponse({ error: 'practitioner not found' }, 404);

  const severity = violation.severity as keyof typeof SEVERITY_SLA_HOURS;
  const productName = product?.name ?? product?.sku ?? 'one of your listed products';

  // In-app notification
  await (supabase as any).from('notifications').insert({
    user_id: practitioner.user_id,
    notification_type: 'map_violation',
    title: `MAP ${severity.toUpperCase()} violation`,
    message: `${productName}: observed price is below MAP. ${GRACE_HOURS[severity]}h grace period.`,
  });

  // Email — via existing app email service if the RPC is present.
  try {
    await (supabase as any).rpc('send_transactional_email', {
      to_user_id: practitioner.user_id,
      template: 'map_violation_notification',
      context: {
        productName,
        severity,
        mapPriceCents: violation.map_price_cents,
        observedPriceCents: violation.observed_price_cents,
        gracePeriodHours: GRACE_HOURS[severity],
      },
    });
  } catch (err) {
    console.warn('email rpc missing or failed', (err as Error).message);
  }

  // SMS via Twilio (red + black only, credential-gated)
  const smsNeeded = severity === 'red' || severity === 'black';
  if (smsNeeded) {
    const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const token = Deno.env.get('TWILIO_AUTH_TOKEN');
    const from = Deno.env.get('TWILIO_FROM_NUMBER');
    if (sid && token && from) {
      const { data: phone } = await (supabase as any)
        .from('profiles')
        .select('phone_number')
        .eq('id', practitioner.user_id)
        .maybeSingle();
      if (phone?.phone_number) {
        const body = `MAP ${severity.toUpperCase()} alert: ${productName}. Remediate within ${GRACE_HOURS[severity]}h.`;
        try {
          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ From: from, To: phone.phone_number, Body: body }),
          });
        } catch (err) {
          console.error('twilio send failed', err);
        }
      }
    } else {
      console.warn('Twilio credentials missing; SMS skipped for red/black severity');
    }
  }

  await (supabase as any)
    .from('map_violations')
    .update({ notified_at: new Date().toISOString(), status: 'notified' })
    .eq('violation_id', violationId);

  return jsonResponse({ sent: true, sms_required: smsNeeded });
});
