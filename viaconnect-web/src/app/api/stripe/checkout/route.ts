import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";
import { getCircuitBreaker, isCircuitBreakerError } from "@/lib/utils/circuit-breaker";

const stripeBreaker = getCircuitBreaker("stripe-api");

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { timeout: 10000, maxNetworkRetries: 0 });
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

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();

  try {
    const stripe = getStripe();
    const supabase = createClient();

    let user;
    try {
      const authResult = await withTimeout(
        supabase.auth.getUser(),
        5000,
        "api.stripe.checkout.auth"
      );
      user = authResult.data.user;
    } catch (error) {
      if (isTimeoutError(error)) {
        safeLog.error("api.stripe.checkout", "auth timeout", { requestId, error });
        return NextResponse.json(
          apiEnvelope(false, undefined, "Authentication check timed out", "AUTH_TIMEOUT"),
          { status: 503 }
        );
      }
      throw error;
    }

    if (!user) {
      return NextResponse.json(
        apiEnvelope(false, undefined, "Unauthorized", "AUTH_REQUIRED"),
        { status: 401 }
      );
    }

    let body: { priceId?: string; userId?: string; mode?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        apiEnvelope(false, undefined, "Invalid JSON body", "INVALID_BODY"),
        { status: 400 }
      );
    }

    const { priceId, mode = "payment" } = body;

    if (!priceId) {
      return NextResponse.json(
        apiEnvelope(false, undefined, "priceId required", "MISSING_PRICE_ID"),
        { status: 400 }
      );
    }

    const origin =
      request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL!;

    const isSubscription = mode === "subscription";
    const successUrl = isSubscription
      ? `${origin}/dashboard?checkout=success`
      : `${origin}/consumer/genetics?checkout=success`;

    let session;
    try {
      session = await stripeBreaker.execute(() =>
        stripe.checkout.sessions.create({
          customer_email: user.email,
          line_items: [{ price: priceId, quantity: 1 }],
          mode: mode as Stripe.Checkout.SessionCreateParams.Mode,
          success_url: successUrl,
          cancel_url: `${origin}/dashboard?checkout=cancelled`,
          metadata: {
            user_id: user.id,
            role: user.user_metadata?.role ?? "consumer",
            product_type: isSubscription ? "membership" : "genex_kit",
          },
          ...(isSubscription && {
            subscription_data: {
              metadata: {
                user_id: user.id,
              },
            },
          }),
        })
      );
    } catch (err) {
      if (isCircuitBreakerError(err)) {
        safeLog.warn("api.stripe.checkout", "stripe circuit open", { requestId, userId: user.id, error: err });
        return NextResponse.json(
          apiEnvelope(false, undefined, "Payment service temporarily unavailable. Please retry shortly.", "STRIPE_CIRCUIT_OPEN"),
          { status: 503 }
        );
      }
      const message = err instanceof Error ? err.message : "Checkout session creation failed";
      safeLog.error("api.stripe.checkout", "stripe call failed", { requestId, userId: user.id, error: err });
      return NextResponse.json(
        apiEnvelope(false, undefined, message, "STRIPE_ERROR"),
        { status: 500 }
      );
    }

    try {
      await withTimeout(
        (async () => (supabase as any).from("audit_logs").insert({
          user_id: user.id,
          action: "checkout_initiated",
          resource_type: "stripe",
          metadata: {
            session_id: session.id,
            price_id: priceId,
            mode,
          },
          ip_address:
            request.headers.get("x-forwarded-for")?.split(",")[0] ?? null,
        }))(),
        5000,
        "api.stripe.checkout.audit-log"
      );
    } catch (auditError) {
      safeLog.warn("api.stripe.checkout", "audit log failed (non-blocking)", {
        requestId, userId: user.id, sessionId: session.id, error: auditError,
      });
    }

    safeLog.info("api.stripe.checkout", "checkout session created", {
      requestId, userId: user.id, sessionId: session.id, mode,
    });

    return NextResponse.json(
      apiEnvelope(true, { sessionUrl: session.url })
    );
  } catch (err) {
    safeLog.error("api.stripe.checkout", "unexpected error", { requestId, error: err });
    return NextResponse.json(
      apiEnvelope(false, undefined, "An unexpected error occurred.", "SERVER_ERROR"),
      { status: 500 }
    );
  }
}
