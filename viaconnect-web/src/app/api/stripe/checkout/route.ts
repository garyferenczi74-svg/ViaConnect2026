import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
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
  const stripe = getStripe();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  try {
    // Determine success URL based on product type
    const isSubscription = mode === "subscription";
    const successUrl = isSubscription
      ? `${origin}/dashboard?checkout=success`
      : `${origin}/consumer/genetics?checkout=success`;

    const session = await stripe.checkout.sessions.create({
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
    });

    // Audit log the checkout initiation — cast for jsonb metadata payload
    await (supabase as any).from("audit_logs").insert({
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
    });

    return NextResponse.json(
      apiEnvelope(true, { sessionUrl: session.url })
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Checkout session creation failed";
    return NextResponse.json(
      apiEnvelope(false, undefined, message, "STRIPE_ERROR"),
      { status: 500 }
    );
  }
}
