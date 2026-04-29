// Prompt #113 — Regulatory audit log search endpoint (admin only).

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withTimeout, isTimeoutError } from "@/lib/utils/with-timeout";
import { safeLog } from "@/lib/utils/safe-log";

export async function GET(request: Request) {
  try {
    const sb = createClient();
    const { data: { user } } = await withTimeout(sb.auth.getUser(), 5000, 'api.compliance.audit.auth');
    if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    const { data: profile } = await withTimeout(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (async () => (sb as any).from("profiles").select("role").eq("id", user.id).maybeSingle())(),
      8000,
      'api.compliance.audit.profile',
    );
    const role = (profile as { role?: string } | null)?.role;
    if (!role || !["admin", "compliance_admin"].includes(role)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const actorId = url.searchParams.get("actor_id");
    const targetType = url.searchParams.get("target_type");
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);

    const { data, error } = await withTimeout(
      (async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q = (sb as any).from("regulatory_audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
        if (action)     q = q.eq("action", action);
        if (actorId)    q = q.eq("actor_id", actorId);
        if (targetType) q = q.eq("target_type", targetType);
        return q;
      })(),
      8000,
      'api.compliance.audit.query',
    );
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rows: data ?? [] });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.compliance.audit', 'timeout', { error: err });
      return NextResponse.json({ ok: false, error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.compliance.audit', 'unexpected error', { error: err });
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 });
  }
}
