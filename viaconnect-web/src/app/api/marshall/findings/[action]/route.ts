import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { withTimeout, isTimeoutError } from '@/lib/utils/with-timeout';
import { safeLog } from '@/lib/utils/safe-log';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["acknowledge", "remediate", "waive", "escalate", "close"]);
const STATUS_MAP: Record<string, string> = {
  acknowledge: "acknowledged",
  remediate: "remediated",
  waive: "waived",
  escalate: "escalated",
  close: "closed",
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("missing supabase env");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await params;
    if (!ALLOWED.has(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

    const userClient = createServerClient();
    const { data: { user } } = await withTimeout(userClient.auth.getUser(), 5000, 'api.marshall.findings.auth');
    if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    const { data: profile } = await userClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!profile || !["admin", "superadmin", "compliance_officer", "compliance_admin"].includes(profile.role as string)) {
      return NextResponse.json({ error: "Compliance role required" }, { status: 403 });
    }

    const form = await req.formData().catch(() => null);
    const findingId = form?.get("findingId");
    if (!findingId || typeof findingId !== "string") {
      return NextResponse.json({ error: "findingId required" }, { status: 400 });
    }

    const svc = serviceClient();
    const { error } = await svc
      .from("compliance_findings")
      .update({
        status: STATUS_MAP[action],
        assigned_to: user.id,
        resolved_at: action === "close" || action === "remediate" ? new Date().toISOString() : null,
      })
      .eq("finding_id", findingId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    await svc.from("compliance_audit_log").insert({
      event_type: `finding.${action}`,
      actor_type: "user",
      actor_id: user.id,
      payload: { findingId, role: profile.role },
    });

    const redirectUrl = new URL(`/admin/marshall/findings/${findingId}`, req.url);
    return NextResponse.redirect(redirectUrl, { status: 303 });
  } catch (err) {
    if (isTimeoutError(err)) {
      safeLog.warn('api.marshall.findings', 'request timeout', { error: err });
      return NextResponse.json({ error: 'timeout' }, { status: 503 });
    }
    safeLog.error('api.marshall.findings', 'unexpected error', { error: err });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
