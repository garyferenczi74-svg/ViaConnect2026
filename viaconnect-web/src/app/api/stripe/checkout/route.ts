import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { priceId, mode = "subscription" } = body;

  if (!priceId) {
    return NextResponse.json({ error: "priceId required" }, { status: 400 });
  }

  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL!;

  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: mode as Stripe.Checkout.SessionCreateParams.Mode,
    success_url: `${origin}/dashboard?checkout=success`,
    cancel_url: `${origin}/dashboard?checkout=cancelled`,
    metadata: {
      user_id: user.id,
      role: user.user_metadata?.role ?? "consumer",
    },
  });

  return NextResponse.json({ url: session.url });
}
