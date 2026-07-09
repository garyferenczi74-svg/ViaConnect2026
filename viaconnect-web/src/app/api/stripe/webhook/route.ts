import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/types";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { reportSupabaseError } from "@/lib/utils/schema-drift";
import { getCircuitBreaker, isCircuitBreakerError } from "@/lib/utils/circuit-breaker";
import {
  buildOrderInsertPayload,
  buildSubscriptionUpsertPayload,
} from "./payload-shapes";

const stripeBreaker = getCircuitBreaker("stripe-api");

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { timeout: 10000, maxNetworkRetries: 0 });
}

function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function apiEnvelope(
  success: boolean,
  data?: unknown,
  error?: string,
  errorCode?: string
) {
  return {
    success,
    ...(data !== undefined && { data }),
    ...(error && { error, errorCode: errorCode ?? "UNKNOWN" }),
    timestamp: new Date().toISOString(),
  };
}

type ServiceSupabase = ReturnType<typeof getServiceSupabase>;

async function writeAuditLog(
  supabase: ServiceSupabase,
  userId: string | null,
  action: string,
  metadata?: Record<string, unknown>
) {
  try {
    const auditInsertResult: { error: unknown } = await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      resource_type: "stripe_webhook",
      metadata: (metadata ?? null) as Json,
    });
    if (auditInsertResult.error) {
      reportSupabaseError("audit.insert", auditInsertResult.error, { table: "audit_logs" });
    }
  } catch {
    // Non-blocking
  }
}

// Helper to safely extract subscription period timestamps from Stripe v20+ objects
function getSubscriptionPeriod(subscription: Record<string, unknown>) {
  // Stripe v20 may nest these differently
  const start = subscription.current_period_start as number | undefined;
  const end = subscription.current_period_end as number | undefined;
  return {
    start: start ? new Date(start * 1000).toISOString() : null,
    end: end ? new Date(end * 1000).toISOString() : null,
  };
}

// ---------- Event handlers ----------

async function handleCheckoutCompleted(
  supabase: ServiceSupabase,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id;
  if (!userId) return;

  if (session.mode === "subscription" && session.subscription) {
    const stripe = getStripe();
    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : (session.subscription as unknown as Record<string, unknown>).id as string;

    const subscription = await stripeBreaker.execute(() => stripe.subscriptions.retrieve(subId));
    const subData = subscription as unknown as Record<string, unknown>;
    const period = getSubscriptionPeriod(subData);

    const items = subscription.items?.data ?? [];

    const subscriptionUpsertResult: { error: unknown } = await supabase
      .from("subscriptions")
      .upsert(
        buildSubscriptionUpsertPayload({
          userId,
          customer: session.customer,
          subscriptionId: subscription.id,
          status: subscription.status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          unitAmount: items[0]?.price?.unit_amount,
          priceId: items[0]?.price?.id,
          periodStart: period.start,
          periodEnd: period.end,
        }),
        { onConflict: "stripe_subscription_id" }
      );
    if (subscriptionUpsertResult.error) {
      try {
        reportSupabaseError(
          "stripe.webhook.subscriptions",
          subscriptionUpsertResult.error,
          { table: "subscriptions" }
        );
      } catch {
        // Strict-mode rethrow contained: an escaping throw would flip the
        // webhook's dev/preview response for this event from the current 200
        // envelope to a 500 and skip the audit log below. Drift is already
        // logged by reportSupabaseError before it rethrows.
      }
    }
  }

  if (session.mode === "payment") {
    const orderInsertResult: { error: unknown } = await supabase
      .from("orders")
      .insert(
        buildOrderInsertPayload({
          userId,
          sessionId: session.id,
          amountTotal: session.amount_total,
          productType: session.metadata?.product_type,
        })
      );
    if (orderInsertResult.error) {
      try {
        reportSupabaseError("stripe.webhook.orders", orderInsertResult.error, {
          table: "orders",
        });
      } catch {
        // Strict-mode rethrow contained: same reasoning as the subscription
        // branch; the payment branch must still fall through to the audit
        // log and the 200 envelope.
      }
    }
  }

  await writeAuditLog(supabase, userId, "checkout_completed", {
    session_id: session.id,
    mode: session.mode,
    amount_total: session.amount_total,
  });
}

async function handleSubscriptionUpdated(
  supabase: ServiceSupabase,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.user_id ?? null;
  const subData = subscription as unknown as Record<string, unknown>;
  const period = getSubscriptionPeriod(subData);

  await supabase
    .from("subscriptions")
    .update({
      status: subscription.status as
        | "active"
        | "canceled"
        | "past_due"
        | "trialing"
        | "incomplete",
      current_period_start: period.start,
      current_period_end: period.end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  await writeAuditLog(supabase, userId, "subscription_updated", {
    subscription_id: subscription.id,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
  });
}

async function handleSubscriptionDeleted(
  supabase: ServiceSupabase,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.user_id ?? null;

  await supabase
    .from("subscriptions")
    .update({
      status: "canceled" as const,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  await writeAuditLog(supabase, userId, "subscription_deleted", {
    subscription_id: subscription.id,
  });
}

async function handleInvoiceEvent(
  supabase: ServiceSupabase,
  invoice: Stripe.Invoice,
  succeeded: boolean
) {
  // Safely extract subscription and user info from invoice using v20-safe approach
  const invoiceData = invoice as unknown as Record<string, unknown>;
  const subDetails = invoiceData.subscription_details as
    | Record<string, unknown>
    | undefined;
  const userId = (subDetails?.metadata as Record<string, string>)?.user_id ?? null;
  const subscriptionId =
    (typeof invoiceData.subscription === "string"
      ? invoiceData.subscription
      : (invoiceData.subscription as Record<string, unknown>)?.id) as
      | string
      | null;

  if (!succeeded) {
    // Update subscription status to past_due on failure
    if (subscriptionId) {
      await supabase
        .from("subscriptions")
        .update({
          status: "past_due" as const,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", subscriptionId);
    }

    // Create a notification for the user
    if (userId) {
      await supabase.from("notifications").insert({
        user_id: userId,
        notification_type: "payment_failed",
        title: "Payment Failed",
        message:
          "Your subscription payment failed. Please update your payment method to avoid service interruption.",
      });
    }
  }

  await writeAuditLog(
    supabase,
    userId,
    succeeded ? "invoice_paid" : "invoice_payment_failed",
    {
      invoice_id: invoice.id,
      amount: succeeded ? invoice.amount_paid : invoice.amount_due,
      subscription_id: subscriptionId,
    }
  );
}

// ---------- Route handler ----------

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json(
      apiEnvelope(
        false,
        undefined,
        "Missing stripe-signature header",
        "MISSING_SIGNATURE"
      ),
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Signature verification failed";
    return NextResponse.json(
      apiEnvelope(
        false,
        undefined,
        `Webhook Error: ${message}`,
        "INVALID_SIGNATURE"
      ),
      { status: 400 }
    );
  }

  const supabase = getServiceSupabase();
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    await withTimeout(
      (async () => {
        switch (event.type) {
          case "checkout.session.completed":
            await handleCheckoutCompleted(
              supabase,
              event.data.object as Stripe.Checkout.Session
            );
            break;

          case "customer.subscription.updated":
            await handleSubscriptionUpdated(
              supabase,
              event.data.object as Stripe.Subscription
            );
            break;

          case "customer.subscription.deleted":
            await handleSubscriptionDeleted(
              supabase,
              event.data.object as Stripe.Subscription
            );
            break;

          case "invoice.payment_succeeded":
            await handleInvoiceEvent(
              supabase,
              event.data.object as Stripe.Invoice,
              true
            );
            break;

          case "invoice.payment_failed":
            await handleInvoiceEvent(
              supabase,
              event.data.object as Stripe.Invoice,
              false
            );
            break;

          default:
            await writeAuditLog(supabase, null, "webhook_unhandled", {
              event_type: event.type,
              event_id: event.id,
            });
        }
      })(),
      25000,
      `api.stripe.webhook.dispatch.${event.type}`
    );

    safeLog.info("api.stripe.webhook", "event processed", {
      requestId, eventId: event.id, eventType: event.type,
    });
    return NextResponse.json(apiEnvelope(true, { received: true }));
  } catch (err) {
    if (isCircuitBreakerError(err)) {
      safeLog.warn("api.stripe.webhook", "stripe circuit open", { requestId, eventId: event.id, error: err });
      return NextResponse.json(
        apiEnvelope(false, undefined, "Stripe API temporarily unavailable", "STRIPE_CIRCUIT_OPEN"),
        { status: 503 }
      );
    }
    if (isTimeoutError(err)) {
      safeLog.error("api.stripe.webhook", "dispatch timeout", { requestId, eventId: event.id, eventType: event.type, error: err });
      return NextResponse.json(
        apiEnvelope(false, undefined, "Webhook processing timed out", "WEBHOOK_TIMEOUT"),
        { status: 504 }
      );
    }
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    safeLog.error("api.stripe.webhook", "processing failed", { requestId, eventId: event.id, eventType: event.type, error: err });
    return NextResponse.json(
      apiEnvelope(false, undefined, message, "WEBHOOK_PROCESSING_ERROR"),
      { status: 500 }
    );
  }
}
