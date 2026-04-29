import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/supabase/types";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { getCircuitBreaker, isCircuitBreakerError } from "@/lib/utils/circuit-breaker";

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
    await supabase.from("audit_logs").insert({
      user_id: userId,
      action,
      resource_type: "stripe_webhook",
      metadata: (metadata ?? null) as Json,
    });
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

    // Determine plan from price amount
    const items = subscription.items?.data ?? [];
    const amount = items[0]?.price?.unit_amount ?? 0;
    const plan =
      amount <= 888
        ? "gold"
        : amount <= 2888
          ? "platinum"
          : "practitioner";

    await supabase.from("subscriptions").upsert(
      {
        user_id: userId,
        stripe_customer_id: (typeof session.customer === "string"
          ? session.customer
          : (session.customer as unknown as Record<string, unknown>)?.id as string) ?? "",
        stripe_subscription_id: subscription.id,
        plan_id: items[0]?.price?.id ?? plan,
        plan: plan as "gold" | "platinum" | "practitioner",
        status: subscription.status as
          | "active"
          | "canceled"
          | "past_due"
          | "trialing"
          | "incomplete",
        current_period_start: period.start,
        current_period_end: period.end,
        cancel_at_period_end: subscription.cancel_at_period_end,
      },
      { onConflict: "stripe_subscription_id" }
    );
  }

  if (session.mode === "payment") {
    await supabase.from("orders").insert({
      user_id: userId,
      status: "pending",
      total: (session.amount_total ?? 0) / 100,
      items: {
        type: "genex_kit",
        session_id: session.id,
        product_type: session.metadata?.product_type ?? "genex_kit",
      } as unknown as Json,
    });
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
