import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLAIM_TYPES = new Set(["dispute_attribution", "dispute_interpretation", "already_remediated", "other"]);

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const { id } = await params;
    const userClient = createServerClient();
    let user;
    try {
      const authResult = await withTimeout(
        userClient.auth.getUser(),
        5000,
        'api.practitioner.compliance.notices.appeal.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.practitioner.compliance.notices.appeal', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: "Authentication timed out. Please try again." }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    let body: { claimType?: string; rebuttal?: string; supportingLinks?: string[] };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const claimType = (body.claimType ?? "").toLowerCase();
    const rebuttal = (body.rebuttal ?? "").trim();
    if (!CLAIM_TYPES.has(claimType)) return NextResponse.json({ error: "Unknown claim type" }, { status: 400 });
    if (!rebuttal || rebuttal.length > 2000) return NextResponse.json({ error: "Invalid rebuttal" }, { status: 400 });
    const supportingLinks = (body.supportingLinks ?? []).filter((s) => typeof s === "string" && s.length <= 2000).slice(0, 10);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = serviceClient() as any;
    const pracRes = await withTimeout(
      (async () => svc.from("practitioners").select("id").eq("user_id", user.id).maybeSingle())(),
      8000,
      'api.practitioner.compliance.notices.appeal.practitioner-load',
    );
    const prac = pracRes.data;
    if (!prac?.id) return NextResponse.json({ error: "Practitioner profile required" }, { status: 403 });

    const noticeRes = await withTimeout(
      (async () => svc.from("practitioner_notices").select("id, practitioner_id").eq("id", id).maybeSingle())(),
      8000,
      'api.practitioner.compliance.notices.appeal.notice-load',
    );
    const notice = noticeRes.data;
    if (!notice || notice.practitioner_id !== prac.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const insertRes = await withTimeout(
      (async () => svc.from("practitioner_notice_appeals").insert({
        notice_id: id,
        rebuttal,
        supporting_links: supportingLinks,
        claim_type: claimType,
        submitted_by: user.id,
      }))(),
      8000,
      'api.practitioner.compliance.notices.appeal.insert',
    );
    const error = insertRes.error;
    if (error) {
      safeLog.error('api.practitioner.compliance.notices.appeal', 'insert failed', { requestId, error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Pause the clock: move status to appealed.
    await withTimeout(
      (async () => svc.from("practitioner_notices").update({ status: "appealed" }).eq("id", id))(),
      8000,
      'api.practitioner.compliance.notices.appeal.status-update',
    );

    await withTimeout(
      (async () => svc.from("compliance_audit_log").insert({
        event_type: "notice.appealed",
        actor_type: "user",
        actor_id: user.id,
        payload: { noticeId: id, claimType },
      }))(),
      5000,
      'api.practitioner.compliance.notices.appeal.audit-log',
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.compliance.notices.appeal', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: "Database operation timed out. Please try again." }, { status: 503 });
    }
    safeLog.error('api.practitioner.compliance.notices.appeal', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
