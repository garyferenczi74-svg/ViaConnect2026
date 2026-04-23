import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { scanCheckout } from "@/lib/compliance/adapters/checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  let body: { userAge?: number | null; hasActivePractitionerLink?: boolean; shippingState?: string; cart?: Array<{ sku: string; category: string; name?: string }> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const cart = body.cart ?? [];

  const result = await scanCheckout({
    userId: user.id,
    userAge: body.userAge ?? null,
    hasActivePractitionerLink: !!body.hasActivePractitionerLink,
    shippingState: body.shippingState,
    cart,
  });

  return NextResponse.json(result);
}
