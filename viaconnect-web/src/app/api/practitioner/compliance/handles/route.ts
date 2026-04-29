import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PLATFORMS = new Set(["instagram", "tiktok", "youtube", "x", "linkedin", "facebook", "substack", "podcast", "reddit", "website", "other"]);

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request) {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  try {
    const userClient = createServerClient();
    let user;
    try {
      const authResult = await withTimeout(
        userClient.auth.getUser(),
        5000,
        'api.practitioner.compliance.handles.auth',
      );
      user = authResult.data.user;
    } catch (err) {
      if (isTimeoutError(err)) {
        safeLog.error('api.practitioner.compliance.handles', 'auth timeout', { requestId, error: err });
        return NextResponse.json({ error: "Authentication timed out. Please try again." }, { status: 503 });
      }
      throw err;
    }
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    let body: { platform?: string; handle?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
    const platform = (body.platform ?? "").toLowerCase();
    const handle = (body.handle ?? "").trim();
    if (!PLATFORMS.has(platform)) return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
    if (!handle || handle.length > 256) return NextResponse.json({ error: "Invalid handle" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = serviceClient() as any;
    const pracRes = await withTimeout(
      (async () => svc.from("practitioners").select("id").eq("user_id", user.id).maybeSingle())(),
      8000,
      'api.practitioner.compliance.handles.practitioner-load',
    );
    const prac = pracRes.data;
    if (!prac?.id) return NextResponse.json({ error: "Practitioner profile required" }, { status: 403 });

    const insertRes = await withTimeout(
      (async () => svc.from("practitioner_social_handles").insert({
        practitioner_id: prac.id,
        platform,
        handle,
        verification_method: "self_registered",
        active: true,
      }))(),
      8000,
      'api.practitioner.compliance.handles.insert',
    );
    const error = insertRes.error;
    if (error) {
      safeLog.error('api.practitioner.compliance.handles', 'insert failed', { requestId, error });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await withTimeout(
      (async () => svc.from("compliance_audit_log").insert({
        event_type: "handle.self_registered",
        actor_type: "user",
        actor_id: user.id,
        payload: { practitionerId: prac.id, platform, handle },
      }))(),
      5000,
      'api.practitioner.compliance.handles.audit-log',
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.error('api.practitioner.compliance.handles', 'database timeout', { requestId, error: err });
      return NextResponse.json({ error: "Database operation timed out. Please try again." }, { status: 503 });
    }
    safeLog.error('api.practitioner.compliance.handles', 'unexpected error', { requestId, error: err });
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
