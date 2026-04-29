import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { runPrecheck } from "@/lib/marshall/precheck/gateway";
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Re-scan an updated draft. Used after a practitioner applies accepted
// rewrites. Increments the recursion count; gateway caps at 2.
export async function POST(req: Request) {
  try {
    const userClient = createServerClient();
    const { data: { user } } = await withTimeout(userClient.auth.getUser(), 5000, 'api.marshall.precheck.apply.auth');
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    let body: { text?: string; parentSessionId?: string; round?: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const text = (body.text ?? "").toString();
    if (!text.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
    // Recursion cap is 2; apply route is the round-2 re-scan after a user
    // accepted auto-fixes. Accept 1 or 2 from the client but never more.
    const round = Math.min(2, Math.max(1, body.round ?? 2));

    const svc = serviceClient();
    const { data: prac } = await (svc as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: unknown) => { maybeSingle: () => Promise<{ data: { id: string } | null }> } } } })
      .from("practitioners")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!prac?.id) return NextResponse.json({ error: "Practitioner profile required" }, { status: 403 });

    try {
      const result = await runPrecheck(
        {
          practitionerId: prac.id,
          source: "portal",
          draft: { text },
          round,
          parentSessionId: body.parentSessionId,
        },
        svc,
      );
      return NextResponse.json(result);
    } catch (err) {
      safeLog.error('api.marshall.precheck.apply', 'runPrecheck failed', { error: err });
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.precheck.apply', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.precheck.apply', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
