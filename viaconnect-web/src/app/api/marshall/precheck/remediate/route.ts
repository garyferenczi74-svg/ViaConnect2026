import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { proposeAndRevalidate } from "@/lib/marshall/precheck/remediate";
import { checkRateLimit } from "@/lib/marshall/precheck/rateLimit";
import type { PrecheckFindingDto } from "@/lib/marshall/precheck/types";
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

export async function POST(req: Request) {
  try {
    const userClient = createServerClient();
    const { data: { user } } = await withTimeout(userClient.auth.getUser(), 5000, 'api.marshall.precheck.remediate.auth');
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    let body: { finding?: PrecheckFindingDto; fullDraft?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body.finding || !body.fullDraft) {
      return NextResponse.json({ error: "finding and fullDraft required" }, { status: 400 });
    }
    if (body.fullDraft.length > 20000) {
      return NextResponse.json({ error: "fullDraft too long" }, { status: 413 });
    }

    // Rate limit the LLM rewrite endpoint on its own bucket. Shares the
    // precheck_sessions counter as a proxy; a burst of remediate calls without
    // intervening scans still consumes the practitioner's hourly budget.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = serviceClient() as any;
    const { data: prac } = await svc.from("practitioners").select("id").eq("user_id", user.id).maybeSingle();
    if (!prac?.id) return NextResponse.json({ error: "Practitioner profile required" }, { status: 403 });
    const rate = await checkRateLimit(svc, prac.id, "portal");
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "rate_limit_exceeded", remaining: rate.remaining, resetAt: rate.resetAt },
        { status: 429 },
      );
    }

    const res = await proposeAndRevalidate(body.finding, body.fullDraft);
    return NextResponse.json(res);
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.precheck.remediate', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.precheck.remediate', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
