import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { runPrecheck } from "@/lib/marshall/precheck/gateway";
import { checkRateLimit } from "@/lib/marshall/precheck/rateLimit";
import type { PrecheckSource } from "@/lib/marshall/precheck/types";
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DRAFT_LENGTH = 20000;

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const userClient = createServerClient();
    const { data: { user } } = await withTimeout(userClient.auth.getUser(), 5000, 'api.marshall.precheck.scan.auth');
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    let body: { text?: string; mediaUrls?: string[]; targetPlatform?: string; source?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const text = (body.text ?? "").toString();
    if (!text.trim()) return NextResponse.json({ error: "text required" }, { status: 400 });
    if (text.length > MAX_DRAFT_LENGTH) return NextResponse.json({ error: `text exceeds ${MAX_DRAFT_LENGTH} char limit` }, { status: 413 });

    // Resolve practitioner id via existing practitioners(user_id) table.
    const svc = serviceClient();
    const { data: prac } = await (svc as unknown as { from: (t: string) => { select: (c: string) => { eq: (k: string, v: unknown) => { maybeSingle: () => Promise<{ data: { id: string } | null }> } } } })
      .from("practitioners")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!prac?.id) return NextResponse.json({ error: "Practitioner profile required" }, { status: 403 });

    const source: PrecheckSource = (body.source === "extension" || body.source === "mobile_app" || body.source === "scheduler_webhook") ? body.source : "portal";

    const rate = await checkRateLimit(svc, prac.id, source);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", remaining: rate.remaining, resetAt: rate.resetAt },
        { status: 429 },
      );
    }

    try {
      const result = await runPrecheck(
        {
          practitionerId: prac.id,
          source,
          draft: {
            text,
            mediaUrls: body.mediaUrls,
            targetPlatform: body.targetPlatform as never,
          },
        },
        svc,
      );
      return NextResponse.json(result);
    } catch (err) {
      safeLog.error('api.marshall.precheck.scan', 'runPrecheck failed', { error: err });
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.precheck.scan', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.precheck.scan', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
