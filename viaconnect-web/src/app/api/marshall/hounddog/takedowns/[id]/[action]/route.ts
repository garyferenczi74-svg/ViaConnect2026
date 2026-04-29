import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIONS = new Set(["mark-submitted", "withdraw"]);

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  try {
    const { id, action } = await params;
    if (!ACTIONS.has(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

    const userClient = createServerClient();
    const { data: { user } } = await withTimeout(userClient.auth.getUser(), 5000, 'api.marshall.hounddog.takedowns.auth');
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !["admin", "superadmin", "compliance_officer", "compliance_admin"].includes(profile.role as string)) {
      return NextResponse.json({ error: "Compliance role required" }, { status: 403 });
    }

    const updateFields: Record<string, unknown> =
      action === "mark-submitted"
        ? { status: "submitted", submitted_at: new Date().toISOString(), submitted_by: user.id }
        : { status: "withdrawn" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = serviceClient() as any;
    await svc.from("takedown_requests").update(updateFields).eq("id", id);
    await svc.from("compliance_audit_log").insert({
      event_type: `takedown.${action.replace("-", "_")}`,
      actor_type: "user",
      actor_id: user.id,
      payload: { takedownId: id },
    });

    return NextResponse.redirect(new URL(`/admin/marshall/hounddog/takedowns/${id}`, req.url), { status: 303 });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.hounddog.takedowns', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.hounddog.takedowns', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
