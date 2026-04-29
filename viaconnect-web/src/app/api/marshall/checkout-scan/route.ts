import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { scanCheckout } from "@/lib/compliance/adapters/checkout";
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await withTimeout(supabase.auth.getUser(), 5000, 'api.marshall.checkout-scan.auth');
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
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.checkout-scan', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.checkout-scan', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
